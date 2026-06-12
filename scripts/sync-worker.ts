/**
 * Headless device-sync worker — runs on Railway (Playwright available),
 * polling the SharkNinja/Ayla cloud for every connected account and writing
 * device state + history straight to Postgres. zero-cache picks the writes
 * up via logical replication, so clients update in real time.
 *
 * Env: ZERO_UPSTREAM_DB, AYLA_APP_SECRET, VITE_OAUTH_* / VITE_AYLA_* (same
 * values as the app), SYNC_INTERVAL_MS (default 60s).
 *
 * Usage: bun scripts/sync-worker.ts
 */
import {
	detectStall,
	stabilityScore,
	type TempPoint,
} from '@/lib/cook-analysis'
import { reconstructHistorySnapshots } from '@/lib/historyUtils'
import { NinjaAuthManager } from '@/ninjaAuth/ninja-auth-manager'
import type { EnhancedAuthState } from '@/ninjaAuth/types'
import { type AylaDevice, buildDeviceData } from '@/server/db/build-device-data'
import {
	cookMessages,
	cookSessions,
	deviceHistory,
	devices,
	ninjaConnections,
} from '@/server/db/schema'
import { createJsonMergePatch } from '@/server/db/utils/json-merge-patch'
import { and, eq, gte, isNull, lte } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const DB_URL = process.env.ZERO_UPSTREAM_DB
if (!DB_URL) {
	console.error('ZERO_UPSTREAM_DB is not set')
	process.exit(1)
}
const INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS ?? 60_000)

const sql = postgres(DB_URL, { max: 5, idle_timeout: 30 })
const db = drizzle(sql)

const AYLA_BASE = 'https://ads-eu.aylanetworks.com'
const USER_AGENT =
	'Dalvik/2.1.0 (Linux; U; Android 16; sdk_gphone64_arm64 Build/BP22.250325.006)'

/** Timestamp-typed device columns: worker writes Dates, not epoch ms. */
const TIMESTAMP_FIELDS = new Set([
	'estimated_end_at',
	'reset_wifi_commanded_at',
	'reset_factory_commanded_at',
])

function toRow(deviceData: Record<string, unknown>): Record<string, unknown> {
	const row: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(deviceData)) {
		if (k === 'id' || k === 'createdAt' || k === 'updatedAt') continue
		if (TIMESTAMP_FIELDS.has(k) && typeof v === 'number') {
			row[k] = new Date(v)
		} else {
			row[k] = v
		}
	}
	row.updatedAt = new Date()
	return row
}

/** History payload: plain JSON state (numbers/strings), no row metadata. */
function toHistoryState(
	deviceData: Record<string, unknown>,
): Record<string, unknown> {
	const state: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(deviceData)) {
		if (k === 'id' || k === 'userId' || k === 'createdAt' || k === 'updatedAt')
			continue
		state[k] = v instanceof Date ? v.toISOString() : v
	}
	return state
}

const COOKING_STATES = new Set(['preheating', 'cooking'])

function isCooking(state: unknown): boolean {
	return typeof state === 'string' && COOKING_STATES.has(state.toLowerCase())
}

function autoSessionName(mode: unknown, when: Date): string {
	const day = when.toLocaleDateString('en-GB', { weekday: 'long' })
	const m = typeof mode === 'string' && mode ? mode : 'cook'
	return `${day} ${m}`
}

function parseSetpoint(deviceData: Record<string, unknown>): number | null {
	try {
		const gs = deviceData.grill_state_raw
		if (typeof gs === 'string') {
			const parsed = JSON.parse(gs)
			if (typeof parsed.setpoint === 'number') return parsed.setpoint
		}
	} catch {}
	return null
}

async function emitMessage(args: {
	deviceId: string
	userId: string
	kind: string
	title: string
	body: string
	requiresAck?: boolean
	actions?: Array<{ id: string; label: string }>
}) {
	await db.insert(cookMessages).values({
		deviceId: args.deviceId,
		userId: args.userId,
		kind: args.kind,
		title: args.title,
		body: args.body,
		requiresAck: args.requiresAck ?? false,
		actions: args.actions ?? null,
	})
	console.log(`message [${args.kind}] for device ${args.deviceId}`)
}

async function hasRecentUnacked(deviceId: string, kind: string) {
	const [existing] = await db
		.select({ id: cookMessages.id })
		.from(cookMessages)
		.where(
			and(
				eq(cookMessages.deviceId, deviceId),
				eq(cookMessages.kind, kind),
				isNull(cookMessages.ackedAt),
				eq(cookMessages.requiresAck, true),
			),
		)
		.limit(1)
	return !!existing
}

/**
 * Telemetry-transition coaching messages — technical, with real numbers.
 * (AI-action messages join these once device control ships.)
 */
async function emitCookMessages(
	deviceId: string,
	userId: string,
	prev: typeof devices.$inferSelect,
	deviceData: Record<string, unknown>,
) {
	const setpoint = parseSetpoint(deviceData)
	const prevGrill = prev.temp_grill != null ? Number(prev.temp_grill) : null
	const nextGrill =
		typeof deviceData.temp_grill === 'number' ? deviceData.temp_grill : null
	const prevProbe =
		prev.probe1_temp_a != null ? Number(prev.probe1_temp_a) : null
	const nextProbe =
		typeof deviceData.probe1_temp_a === 'number'
			? deviceData.probe1_temp_a
			: null
	const target =
		prev.probe1_target_temp != null ? Number(prev.probe1_target_temp) : null

	// Doneness reached
	if (
		target != null &&
		prevProbe != null &&
		nextProbe != null &&
		prevProbe < target &&
		nextProbe >= target &&
		!(await hasRecentUnacked(deviceId, 'target_reached'))
	) {
		await emitMessage({
			deviceId,
			userId,
			kind: 'target_reached',
			title: `Probe 1 hit ${nextProbe.toFixed(1)}°C — target reached 🎉`,
			body: `Doneness target ${target.toFixed(0)}°C met (pit at ${nextGrill?.toFixed(1) ?? '—'}°C). Pull it to rest, or hold it warm.`,
			requiresAck: true,
			actions: [
				{ id: 'pulled', label: 'Pulled to rest 🍽️' },
				{ id: 'hold', label: 'Keep holding warm' },
			],
		})
	}

	// Pellet-hopper heuristic: pit falls hard with the setpoint unchanged
	if (
		setpoint != null &&
		prevGrill != null &&
		nextGrill != null &&
		prevGrill >= setpoint - 8 &&
		nextGrill < setpoint - 12 &&
		isCooking(deviceData.cook_state) &&
		!(await hasRecentUnacked(deviceId, 'pit_drop'))
	) {
		await emitMessage({
			deviceId,
			userId,
			kind: 'pit_drop',
			title: "We've likely run out of wood pellets. Refill! 🔥",
			body: `Pit fell ${prevGrill.toFixed(0)}→${nextGrill.toFixed(0)}°C in one sync cycle with setpoint ${setpoint.toFixed(0)}°C unchanged — classic empty-hopper curve. Refill within ~10 min to stay on plan.`,
			requiresAck: true,
			actions: [{ id: 'refilled', label: 'Refilled ✅' }],
		})
	}

	// Recovery
	if (
		setpoint != null &&
		prevGrill != null &&
		nextGrill != null &&
		prevGrill < setpoint - 12 &&
		nextGrill >= setpoint - 5
	) {
		await emitMessage({
			deviceId,
			userId,
			kind: 'pit_recovered',
			title: `Pit recovered — ${nextGrill.toFixed(1)}°C, back on plan`,
			body: `Holding ${setpoint.toFixed(0)}°C ±3° again. No action needed.`,
		})
	}
}

/** Creates/ends cook_sessions on cook_state transitions. */
async function handleSessionTransition(
	deviceId: string,
	userId: string,
	prevState: unknown,
	deviceData: Record<string, unknown>,
) {
	const nowCooking = isCooking(deviceData.cook_state)
	const wasCooking = isCooking(prevState)
	if (nowCooking === wasCooking) return

	if (nowCooking) {
		const now = new Date()
		await db.insert(cookSessions).values({
			deviceId,
			userId,
			name: autoSessionName(deviceData.cook_mode, now),
			cook_mode: (deviceData.cook_mode as string) ?? null,
			startedAt: now,
			setpoint: parseSetpoint(deviceData)?.toString() ?? null,
		})
		console.log(`session started for device ${deviceId}`)
		const sp = parseSetpoint(deviceData)
		await emitMessage({
			deviceId,
			userId,
			kind: 'session_start',
			title: `Cook started — ${(deviceData.cook_mode as string) ?? 'cook'} mode${sp ? `, pit → ${sp.toFixed(0)}°C` : ''}`,
			body: 'Telemetry is recording. Session stats land when the cook ends.',
		})
		return
	}

	// Cook ended: close the active session and compute stats from history
	const [active] = await db
		.select()
		.from(cookSessions)
		.where(
			and(eq(cookSessions.deviceId, deviceId), isNull(cookSessions.endedAt)),
		)
		.limit(1)
	if (!active) return

	const endedAt = new Date()
	const rows = await db
		.select()
		.from(deviceHistory)
		.where(
			and(
				eq(deviceHistory.deviceId, deviceId),
				gte(deviceHistory.recordedAt, active.startedAt),
				lte(deviceHistory.recordedAt, endedAt),
			),
		)
	const snapshots = reconstructHistorySnapshots(
		rows
			.map((r) => ({
				id: Number(r.id),
				historyType: r.historyType,
				recordedAt: r.recordedAt?.getTime() ?? null,
				changedBy: r.changedBy,
				changes: r.changes as never,
			}))
			.sort((a, b) => (b.recordedAt ?? 0) - (a.recordedAt ?? 0)),
	)
	const seriesOf = (key: string): TempPoint[] =>
		snapshots
			.filter((s) => typeof s.state[key] === 'number' && s.recordedAt)
			.map((s) => ({ t: s.recordedAt as number, value: s.state[key] as number }))
			.sort((a, b) => a.t - b.t)

	const grill = seriesOf('temp_grill')
	const probe = seriesOf('probe1_temp_a')
	const setpoint = active.setpoint ? Number(active.setpoint) : null
	const stall = detectStall(probe)
	const stallTotal = stall.regions.reduce((acc, r) => acc + (r.end - r.start), 0)
	let lidOpens = 0
	let prevOpen = false
	for (const s of [...snapshots].sort(
		(a, b) => (a.recordedAt ?? 0) - (b.recordedAt ?? 0),
	)) {
		const open = s.state.is_lid_open === true
		if (open && !prevOpen) lidOpens++
		prevOpen = open
	}

	await db
		.update(cookSessions)
		.set({
			endedAt,
			max_temp_grill: grill.length
				? Math.max(...grill.map((p) => p.value)).toFixed(1)
				: null,
			avg_temp_grill: grill.length
				? (grill.reduce((a, p) => a + p.value, 0) / grill.length).toFixed(1)
				: null,
			max_probe1_temp: probe.length
				? Math.max(...probe.map((p) => p.value)).toFixed(1)
				: null,
			stability_score: setpoint ? stabilityScore(grill, setpoint) : null,
			stall_seconds: Math.round(stallTotal / 1000),
			lid_open_count: lidOpens,
		})
		.where(eq(cookSessions.id, active.id))
	console.log(`session ${active.id} ended for device ${deviceId}`)
}

async function syncConnection(conn: typeof ninjaConnections.$inferSelect) {
	if (!conn.username || !conn.password) return

	const initialState: EnhancedAuthState = {}
	if (conn.oauthAccessToken && conn.oauthRefreshToken && conn.oauthExpiresAt) {
		initialState.oauthTokens = {
			accessToken: conn.oauthAccessToken,
			idToken: '',
			refreshToken: conn.oauthRefreshToken,
			expiresAt: conn.oauthExpiresAt.getTime(),
		}
	}
	if (conn.aylaAccessToken && conn.aylaExpiresAt) {
		initialState.aylaToken = {
			accessToken: conn.aylaAccessToken,
			refreshToken: conn.aylaRefreshToken || undefined,
			expiresAt: conn.aylaExpiresAt.getTime(),
		}
	}

	const authManager = NinjaAuthManager.create(
		{ email: conn.username, password: conn.password },
		initialState,
	)

	const apiToken = await authManager.getAPIToken()

	// Persist refreshed tokens so the next cycle (and the app) reuse them
	const newState = authManager.getState()
	if (
		newState.aylaToken?.accessToken !== conn.aylaAccessToken ||
		newState.aylaToken?.expiresAt !== conn.aylaExpiresAt?.getTime()
	) {
		await db
			.update(ninjaConnections)
			.set({
				aylaAccessToken: newState.aylaToken?.accessToken || null,
				aylaRefreshToken: newState.aylaToken?.refreshToken || null,
				aylaExpiresAt: newState.aylaToken?.expiresAt
					? new Date(newState.aylaToken.expiresAt)
					: null,
				updatedAt: new Date(),
			})
			.where(eq(ninjaConnections.userId, conn.userId))
	}

	const headers = {
		authorization: `auth_token ${apiToken}`,
		accept: 'application/json',
		'user-agent': USER_AGENT,
	}

	const devicesResponse = await fetch(`${AYLA_BASE}/apiv1/devices.json`, {
		headers,
	})
	if (!devicesResponse.ok) {
		throw new Error(`devices.json failed: ${devicesResponse.status}`)
	}
	const devicesData: Array<{ device: AylaDevice }> =
		await devicesResponse.json()

	for (const wrapper of devicesData) {
		const device = wrapper.device
		let properties: unknown = null
		try {
			const propsResponse = await fetch(
				`${AYLA_BASE}/apiv1/dsns/${device.dsn}/properties.json`,
				{ headers },
			)
			if (propsResponse.ok) properties = await propsResponse.json()
		} catch (error) {
			console.warn(`properties fetch failed for ${device.dsn}:`, error)
		}

		const deviceData = buildDeviceData(device, properties, conn.userId)
		const row = toRow(deviceData)
		const historyState = toHistoryState(deviceData)

		const [existing] = await db
			.select()
			.from(devices)
			.where(and(eq(devices.dsn, device.dsn), eq(devices.userId, conn.userId)))
			.limit(1)

		if (existing) {
			await db.update(devices).set(row).where(eq(devices.id, existing.id))
			await handleSessionTransition(
				existing.id,
				conn.userId,
				existing.cook_state,
				deviceData,
			)
			await emitCookMessages(existing.id, conn.userId, existing, deviceData)

			// Hourly snapshot, otherwise a merge patch against the previous state
			const hourStart = new Date()
			hourStart.setMinutes(0, 0, 0)
			const [snapshotThisHour] = await db
				.select({ id: deviceHistory.id })
				.from(deviceHistory)
				.where(
					and(
						eq(deviceHistory.deviceId, existing.id),
						eq(deviceHistory.historyType, 'snapshot'),
						gte(deviceHistory.recordedAt, hourStart),
					),
				)
				.limit(1)

			if (snapshotThisHour) {
				const previousState = toHistoryState(
					existing as unknown as Record<string, unknown>,
				)
				const patch = createJsonMergePatch(previousState, historyState)
				if (Object.keys(patch).length > 0) {
					await db.insert(deviceHistory).values({
						deviceId: existing.id,
						historyType: 'patch',
						changes: patch,
					})
				}
			} else {
				await db.insert(deviceHistory).values({
					deviceId: existing.id,
					historyType: 'snapshot',
					changes: historyState,
				})
			}
		} else {
			const [inserted] = await db
				.insert(devices)
				.values({
					...row,
					userId: conn.userId,
					dsn: device.dsn,
				} as typeof devices.$inferInsert)
				.returning({ id: devices.id })
			if (inserted) {
				await db.insert(deviceHistory).values({
					deviceId: inserted.id,
					historyType: 'snapshot',
					changes: historyState,
				})
				await handleSessionTransition(
					inserted.id,
					conn.userId,
					null,
					deviceData,
				)
			}
			console.log(`new device ${device.dsn} for user ${conn.userId}`)
		}
	}

	console.log(
		`synced ${devicesData.length} device(s) for user ${conn.userId}`,
	)
}

async function cycle() {
	const connections = await db.select().from(ninjaConnections)
	for (const conn of connections) {
		try {
			await syncConnection(conn)
		} catch (error) {
			console.error(
				`sync failed for user ${conn.userId}:`,
				error instanceof Error ? error.message : error,
			)
		}
	}
}

console.log(
	`sync-worker starting: interval ${INTERVAL_MS}ms, db ${DB_URL.replace(/:[^:@/]+@/, ':***@')}`,
)
while (true) {
	const start = Date.now()
	await cycle()
	const elapsed = Date.now() - start
	await new Promise((r) => setTimeout(r, Math.max(5_000, INTERVAL_MS - elapsed)))
}
