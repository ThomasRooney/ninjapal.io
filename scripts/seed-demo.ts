/**
 * Seeds a demo account with mock devices and ~8h of brisket-cook telemetry
 * so the device dashboard and temperature graph can be validated without a
 * real Ninja account. Idempotent: re-running replaces the demo devices.
 *
 * Usage: bun scripts/seed-demo.ts   (requires the local dev stack: mise run dev)
 */
import {
	detectStall,
	stabilityScore,
	type TempPoint,
} from '@/lib/cook-analysis'
import { Client } from 'pg'

const DEMO_EMAIL = 'demo@pitminder.com'
const DEMO_PASSWORD = 'demo-smoker-2026'
const DEMO_NAME = 'Demo Pitmaster'

const DB_URL = process.env.ZERO_UPSTREAM_DB
// App server hosting the better-auth endpoints (override with APP_URL for prod seeding)
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'
if (!DB_URL) {
	console.error(
		'Missing ZERO_UPSTREAM_DB. Run via `bun scripts/seed-demo.ts` so .env is loaded.',
	)
	process.exit(1)
}

// Deterministic PRNG so re-seeding produces the same curve
function mulberry32(seed: number) {
	let a = seed
	return () => {
		a |= 0
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}
const rand = mulberry32(42)
const jitter = (range: number) => (rand() - 0.5) * 2 * range
const round1 = (n: number) => Math.round(n * 10) / 10

async function ensureAuthUser(db: Client): Promise<string> {
	// Sign up via better-auth (no email verification required)
	const res = await fetch(`${APP_URL}/api/auth/sign-up/email`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email: DEMO_EMAIL,
			password: DEMO_PASSWORD,
			name: DEMO_NAME,
		}),
	})
	if (!res.ok) {
		const body = await res.text()
		// Existing user is fine — we look the id up below either way
		if (!/already exist|USER_ALREADY_EXISTS/i.test(body)) {
			throw new Error(`Signup failed (${res.status}): ${body}`)
		}
	}
	const { rows } = await db.query(
		'select id from "user" where email = $1',
		[DEMO_EMAIL],
	)
	if (!rows[0]) throw new Error('Demo auth user not found after signup')
	return rows[0].id as string
}

export interface CookProfile {
	name: string
	mode: string
	setpoint: number // °C grill target
	probeStart: number
	probeFinal: number
	stall: { at: number; until: number } | null // probe °C plateau bounds (hours)
	lidDipsAtHours: number[]
	durationHours: number
	climbRate: number // probe approach-rate constant
}

export type CookPoint = {
	t: number
	temp_grill: number
	temp_air: number
	temp_smoke: number
	probe1_temp_a: number
	probe1_temp_b: number
	cook_state: string
	is_lid_open: boolean
}

/** Generates telemetry for a cook (all temps °C, 5-min cadence). */
export function generateCookTelemetry(
	startMs: number,
	profile: CookProfile,
): CookPoint[] {
	const stepMs = 5 * 60 * 1000
	const steps = Math.round((profile.durationHours * 3_600_000) / stepMs)
	const points: CookPoint[] = []

	const target = profile.setpoint
	let grill = 18 // ambient start
	let probe = profile.probeStart

	for (let i = 0; i <= steps; i++) {
		const t = startMs + i * stepMs
		const hours = (i * stepMs) / 3_600_000

		const lidOpen = profile.lidDipsAtHours.some(
			(h) => Math.abs(hours - h) < 0.05,
		)
		if (hours < 0.5) {
			grill += (target - grill) * 0.35 + jitter(1.5)
		} else {
			const dip = profile.lidDipsAtHours.some((h) => Math.abs(hours - h) < 0.1)
				? -12
				: 0
			grill = target + dip + jitter(3)
		}

		// Probe: climb toward final; optional stall plateau
		let probeRate: number
		const stallLow = profile.probeFinal * 0.72
		if (hours < 0.5) probeRate = 0.5
		else if (
			profile.stall &&
			hours >= profile.stall.at &&
			hours < profile.stall.until &&
			probe >= stallLow
		)
			probeRate = 0.12 // the stall
		else probeRate = (profile.probeFinal * 1.05 - probe) * profile.climbRate
		probe += probeRate * (stepMs / 600_000) * 2 + jitter(0.2)
		probe = Math.min(probe, profile.probeFinal)

		points.push({
			t,
			temp_grill: round1(grill),
			temp_air: round1(grill - 4 + jitter(2)),
			temp_smoke: round1(grill - 15 + jitter(4)),
			probe1_temp_a: round1(probe),
			probe1_temp_b: round1(probe - 1.5 + jitter(0.5)),
			cook_state: hours < 0.5 ? 'preheating' : 'cooking',
			is_lid_open: lidOpen,
		})
	}
	return points
}

export const COOK_PROFILES: Record<string, CookProfile> = {
	brisket: {
		name: 'Saturday Brisket',
		mode: 'smoker',
		setpoint: 107, // 225°F low and slow
		probeStart: 6,
		probeFinal: 96,
		stall: { at: 3.5, until: 5.5 },
		lidDipsAtHours: [3, 6],
		durationHours: 8,
		climbRate: 0.028,
	},
	ribs: {
		name: 'Baby Back Ribs',
		mode: 'smoker',
		setpoint: 121, // 250°F
		probeStart: 8,
		probeFinal: 93,
		stall: { at: 2, until: 3 },
		lidDipsAtHours: [2, 3.5], // wrap + sauce
		durationHours: 5,
		climbRate: 0.05,
	},
	chicken: {
		name: 'Beer Can Chicken',
		mode: 'grill',
		setpoint: 180, // hot roast
		probeStart: 7,
		probeFinal: 74,
		stall: null,
		lidDipsAtHours: [1],
		durationHours: 2,
		climbRate: 0.12,
	},
}

function deviceState(p: CookPoint, profile: CookProfile) {
	// Shape mirrors what syncRealDevices stores in history (drizzle field names)
	return {
		dsn: 'DEMO000000001',
		productName: 'Demo Smoker',
		model: 'OG901UK',
		connectionStatus: 'Online',
		cook_mode: profile.mode,
		cook_state: p.cook_state,
		cook_smoke_level: profile.mode === 'smoker' ? 1 : 0,
		power_state: 'on',
		gs_state: p.cook_state,
		is_lid_open: p.is_lid_open,
		is_probe1_installed: true,
		is_probe2_installed: false,
		temp_grill: p.temp_grill,
		temp_air: p.temp_air,
		temp_smoke: p.temp_smoke,
		probe1_temp_a: p.probe1_temp_a,
		probe1_temp_b: p.probe1_temp_b,
	}
}

/** Inserts hourly snapshots + 5-min patches for a cook's points. */
async function insertCookHistory(
	db: Client,
	deviceId: string,
	points: CookPoint[],
	profile: CookProfile,
): Promise<number> {
	let inserted = 0
	let prevState: Record<string, unknown> | null = null
	for (const [i, p] of points.entries()) {
		const state = deviceState(p, profile)
		const isSnapshot = i % 12 === 0
		let changes: Record<string, unknown>
		if (isSnapshot || !prevState) {
			changes = state
		} else {
			changes = {}
			for (const [k, v] of Object.entries(state)) {
				if (prevState[k] !== v) changes[k] = v
			}
			if (Object.keys(changes).length === 0) continue
		}
		await db.query(
			`insert into device_history (device_id, recorded_at, history_type, changes)
			 values ($1, to_timestamp($2 / 1000.0), $3, $4)`,
			[
				deviceId,
				p.t,
				isSnapshot || !prevState ? 'snapshot' : 'patch',
				JSON.stringify(changes),
			],
		)
		prevState = state
		inserted++
	}
	return inserted
}

/** Inserts a cook_sessions row; computes end-of-cook stats for finished cooks. */
async function insertSession(
	db: Client,
	deviceId: string,
	userId: string,
	points: CookPoint[],
	profile: CookProfile,
	active: boolean,
): Promise<void> {
	const grill: TempPoint[] = points.map((p) => ({ t: p.t, value: p.temp_grill }))
	const probe: TempPoint[] = points.map((p) => ({
		t: p.t,
		value: p.probe1_temp_a,
	}))
	const startedAt = points[0].t
	const endedAt = points[points.length - 1].t

	if (active) {
		await db.query(
			`insert into cook_sessions (device_id, user_id, name, cook_mode, started_at, setpoint)
			 values ($1, $2, $3, $4, to_timestamp($5 / 1000.0), $6)`,
			[deviceId, userId, profile.name, profile.mode, startedAt, profile.setpoint],
		)
		return
	}

	const stall = detectStall(probe)
	const stallTotal = stall.regions.reduce(
		(acc, r) => acc + (r.end - r.start),
		0,
	)
	let lidOpens = 0
	for (let i = 1; i < points.length; i++) {
		if (points[i].is_lid_open && !points[i - 1].is_lid_open) lidOpens++
	}
	await db.query(
		`insert into cook_sessions (
			device_id, user_id, name, cook_mode, started_at, ended_at, setpoint,
			max_temp_grill, avg_temp_grill, max_probe1_temp,
			stability_score, stall_seconds, lid_open_count
		) values ($1, $2, $3, $4, to_timestamp($5 / 1000.0), to_timestamp($6 / 1000.0), $7, $8, $9, $10, $11, $12, $13)`,
		[
			deviceId,
			userId,
			profile.name,
			profile.mode,
			startedAt,
			endedAt,
			profile.setpoint,
			Math.max(...grill.map((p) => p.value)).toFixed(1),
			(grill.reduce((a, p) => a + p.value, 0) / grill.length).toFixed(1),
			Math.max(...probe.map((p) => p.value)).toFixed(1),
			stabilityScore(grill, profile.setpoint),
			Math.round(stallTotal / 1000),
			lidOpens,
		],
	)
}

async function main() {
	const db = new Client({ connectionString: DB_URL })
	await db.connect()

	const userId = await ensureAuthUser(db)
	console.log(`Auth user ready: ${DEMO_EMAIL} (${userId})`)

	await db.query(
		`insert into users (id, email, name, prefers_celsius)
		 values ($1, $2, $3, true)
		 on conflict (id) do update set email = $2, name = $3`,
		[userId, DEMO_EMAIL, DEMO_NAME],
	)

	// Replace previous demo devices (history cascades)
	await db.query(`delete from devices where user_id = $1 and dsn like 'DEMO%'`, [userId])

	const now = Date.now()
	const HOUR = 3_600_000

	// Active brisket cook: started 8h ago, still going
	const brisket = COOK_PROFILES.brisket
	const brisketStart = now - brisket.durationHours * HOUR
	const points = generateCookTelemetry(brisketStart, brisket)
	const latest = points[points.length - 1]

	// Two finished historical cooks (well-separated windows)
	const ribs = COOK_PROFILES.ribs
	const ribsStart = now - 2 * 24 * HOUR - ribs.durationHours * HOUR
	const ribsPoints = generateCookTelemetry(ribsStart, ribs)

	const chicken = COOK_PROFILES.chicken
	const chickenStart = now - 1 * 24 * HOUR - chicken.durationHours * HOUR
	const chickenPoints = generateCookTelemetry(chickenStart, chicken)

	// Raw JSON blobs the overview/status pages parse (mirrors GET_GrillState shape)
	const grillStateRaw = JSON.stringify({
		id: 1,
		state: latest.cook_state,
		mode: 'smoker',
		setpoint: 107,
		'seconds set': 43200,
		endtimeutc: Math.floor((now + 4 * 3_600_000) / 1000),
		'seconds left': 14400,
		'probes active': 1,
		smoke: 1,
		error: 0,
		message: '',
		eventmask: '0',
		sim: 0,
		inputs: {
			temps: {
				grill: latest.temp_grill,
				air: latest.temp_air,
				smoke: latest.temp_smoke,
				probe0_a: latest.probe1_temp_a,
				probe0_b: latest.probe1_temp_b,
				probe1_a: 0,
				probe1_b: 0,
				main: 38.2,
				ui: 31.5,
				id: 1,
			},
			io: { 'lid open': 0, id: 1 },
			id: 1,
		},
	})
	const probeStateRaw = JSON.stringify({
		id: 1,
		probes: [
			{
				name: 'Probe 1',
				'plugged in': 1,
				active: 1,
				temp: latest.probe1_temp_a,
				progress: Math.min(99, Math.round((latest.probe1_temp_a / 95) * 100)),
			},
			{ name: 'Probe 2', 'plugged in': 0, active: 0, temp: 0, progress: 0 },
		],
	})

	// Active smoker, mid-cook
	const smokerRes = await db.query(
		`insert into devices (
			user_id, dsn, product_name, model, mac, lan_ip, connection_status,
			rssi, cook_mode, cook_state, cook_smoke_level, power_state, gs_state,
			is_lid_open, is_probe1_installed, is_probe2_installed,
			temp_grill, temp_air, temp_smoke, probe1_temp_a, probe1_temp_b,
			probe1_target_temp,
			seconds_left_on_timer, estimated_end_at,
			grill_state_raw, probe_state_raw,
			ota_fw_version, device_serial_num, created_at, updated_at
		) values (
			$1, 'DEMO000000001', 'Demo Smoker', 'OG901UK', 'DE:MO:00:00:00:01', '192.168.1.42', 'Online',
			-52, 'smoker', $2, 1, 'on', $2,
			false, true, false,
			$3, $4, $5, $6, $7,
			96,
			14400, to_timestamp($8 / 1000.0),
			$10, $11,
			'2.1.4', 'DEMO-SN-0001', to_timestamp($9 / 1000.0), now()
		) returning id`,
		[
			userId,
			latest.cook_state,
			latest.temp_grill,
			latest.temp_air,
			latest.temp_smoke,
			latest.probe1_temp_a,
			latest.probe1_temp_b,
			now + 4 * 3_600_000,
			brisketStart,
			grillStateRaw,
			probeStateRaw,
		],
	)
	const smokerId = smokerRes.rows[0].id as string

	// Offline second device (validates offline-state UI)
	await db.query(
		`insert into devices (user_id, dsn, product_name, model, connection_status, power_state, created_at, updated_at)
		 values ($1, 'DEMO000000002', 'Backyard Beast', 'OG701UK', 'Offline', 'off', now() - interval '30 days', now() - interval '2 days')`,
		[userId],
	)

	// Telemetry + sessions for all three cooks (ribs/chicken finished, brisket live)
	let inserted = 0
	inserted += await insertCookHistory(db, smokerId, ribsPoints, ribs)
	await insertSession(db, smokerId, userId, ribsPoints, ribs, false)
	inserted += await insertCookHistory(db, smokerId, chickenPoints, chicken)
	await insertSession(db, smokerId, userId, chickenPoints, chicken, false)
	inserted += await insertCookHistory(db, smokerId, points, brisket)
	await insertSession(db, smokerId, userId, points, brisket, true)

	console.log(
		`Seeded ${inserted} history records across 3 cooks for device ${smokerId}`,
	)
	console.log('')
	console.log('Demo login:')
	console.log(`  email:    ${DEMO_EMAIL}`)
	console.log(`  password: ${DEMO_PASSWORD}`)
	console.log('URLs:')
	console.log(`  devices:  ${APP_URL}/app/devices`)
	console.log(`  smoker:   ${APP_URL}/app/device/${smokerId}`)

	await db.end()
}

if (import.meta.main) {
	main().catch((e) => {
		console.error(e)
		process.exit(1)
	})
}
