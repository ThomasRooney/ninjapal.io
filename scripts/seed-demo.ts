/**
 * Seeds a demo account with mock devices and ~8h of brisket-cook telemetry
 * so the device dashboard and temperature graph can be validated without a
 * real Ninja account. Idempotent: re-running replaces the demo devices.
 *
 * Usage: bun scripts/seed-demo.ts   (requires the local dev stack: mise run dev)
 */
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

/**
 * Generates an ~8h "low and slow" brisket cook (all temps °C):
 * preheat → 107°C hold; probe1 climbs, stalls ~68°C, then pushes to ~88°C.
 */
function generateCookTelemetry(startMs: number, stepMs: number, steps: number) {
	const points: Array<{
		t: number
		temp_grill: number
		temp_air: number
		temp_smoke: number
		probe1_temp_a: number
		probe1_temp_b: number
		cook_state: string
	}> = []

	const target = 107 // 225°F
	let grill = 18 // ambient start
	let probe = 6 // fridge-cold brisket

	for (let i = 0; i <= steps; i++) {
		const t = startMs + i * stepMs
		const hours = (i * stepMs) / 3_600_000

		if (hours < 0.5) {
			// Preheat: rise toward target
			grill += (target - grill) * 0.35 + jitter(1.5)
		} else {
			// Hold with lid-open dips around hours 3 and 6 (spritzing)
			const dip = Math.abs(hours - 3) < 0.1 || Math.abs(hours - 6) < 0.1 ? -12 : 0
			grill = target + dip + jitter(3)
		}

		// Brisket internal: climb, stall at ~68°C between h3.5 and h5.5, then climb
		let probeRate: number
		if (hours < 0.5) probeRate = 0.5
		else if (probe < 65) probeRate = (72 - probe) * 0.045
		else if (hours < 5.5 && probe < 70) probeRate = 0.12 // the stall
		else probeRate = (95 - probe) * 0.035
		probe += probeRate * (stepMs / 600_000) * 2 + jitter(0.2)

		points.push({
			t,
			temp_grill: round1(grill),
			temp_air: round1(grill - 4 + jitter(2)),
			temp_smoke: round1(grill - 15 + jitter(4)),
			probe1_temp_a: round1(probe),
			probe1_temp_b: round1(probe - 1.5 + jitter(0.5)),
			cook_state: hours < 0.5 ? 'preheating' : 'cooking',
		})
	}
	return points
}

function deviceState(p: ReturnType<typeof generateCookTelemetry>[number]) {
	// Shape mirrors what syncRealDevices stores in history (drizzle field names)
	return {
		dsn: 'DEMO000000001',
		productName: 'Demo Smoker (Brisket Cook)',
		model: 'OG901UK',
		connectionStatus: 'Online',
		cook_mode: 'smoker',
		cook_state: p.cook_state,
		cook_smoke_level: 1,
		power_state: 'on',
		gs_state: p.cook_state,
		is_lid_open: false,
		is_probe1_installed: true,
		is_probe2_installed: false,
		temp_grill: p.temp_grill,
		temp_air: p.temp_air,
		temp_smoke: p.temp_smoke,
		probe1_temp_a: p.probe1_temp_a,
		probe1_temp_b: p.probe1_temp_b,
	}
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
	const stepMs = 5 * 60 * 1000
	const steps = 96 // 8 hours
	const startMs = now - steps * stepMs
	const points = generateCookTelemetry(startMs, stepMs, steps)
	const latest = points[points.length - 1]

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
			seconds_left_on_timer, estimated_end_at,
			grill_state_raw, probe_state_raw,
			ota_fw_version, device_serial_num, created_at, updated_at
		) values (
			$1, 'DEMO000000001', 'Demo Smoker (Brisket Cook)', 'OG901UK', 'DE:MO:00:00:00:01', '192.168.1.42', 'Online',
			-52, 'smoker', $2, 1, 'on', $2,
			false, true, false,
			$3, $4, $5, $6, $7,
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
			startMs,
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

	// History: snapshot at each hour boundary, patches every 5 minutes between
	let inserted = 0
	let prevState: Record<string, unknown> | null = null
	for (const [i, p] of points.entries()) {
		const state = deviceState(p)
		const isSnapshot = i % 12 === 0 // every hour
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
			[smokerId, p.t, isSnapshot || !prevState ? 'snapshot' : 'patch', JSON.stringify(changes)],
		)
		prevState = state
		inserted++
	}

	console.log(`Seeded ${inserted} history records over 8h for device ${smokerId}`)
	console.log('')
	console.log('Demo login:')
	console.log(`  email:    ${DEMO_EMAIL}`)
	console.log(`  password: ${DEMO_PASSWORD}`)
	console.log('URLs:')
	console.log('  devices:  http://localhost:5173/app/devices')
	console.log(`  smoker:   http://localhost:5173/app/device/${smokerId}`)

	await db.end()
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
