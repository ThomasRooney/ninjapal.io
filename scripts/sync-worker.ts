/**
 * Headless device-sync worker — runs on Railway (Playwright available),
 * polling the SharkNinja/Ayla cloud for every connected account and writing
 * device state + history straight to Postgres. zero-cache picks the writes
 * up via logical replication, so clients update in real time.
 *
 * Env: ZERO_UPSTREAM_DB, AYLA_APP_SECRET, VITE_OAUTH_* / VITE_AYLA_* (same
 * values as the app), SYNC_INTERVAL_MS (default 60s).
 * PITMINDER_ALLOW_REMOTE_DB=true — required when ZERO_UPSTREAM_DB is not
 * local (prod sets this); otherwise the worker refuses to start.
 * PITMINDER_SYNC_ONCE=true — run one cycle then exit (0 on success).
 * PITMINDER_REAL_DEVICES_ONLY=true — skip sims + tokenless connections.
 *
 * Usage: bun scripts/sync-worker.ts
 */
import {
	detectStall,
	stabilityScore,
	type TempPoint,
} from '@/lib/cook-analysis'
import { createLogger } from '@/lib/log'
import { reconstructHistorySnapshots } from '@/lib/historyUtils'
import { hopperStatus } from '@/lib/pellet-model'
import { NinjaAuthManager } from '@/ninjaAuth/ninja-auth-manager'
import type { EnhancedAuthState } from '@/ninjaAuth/types'
import { type AylaDevice, buildDeviceData } from '@/server/db/build-device-data'
import {
	type AutopilotState,
	evaluateAutopilot,
} from '@/server/control/autopilot'
import {
	buildSetpointCommand,
	sendDatapoint,
} from '@/server/control/ayla-control'
import {
	DEFAULT_DIRECTOR_MODEL,
	type DirectorToolHandlers,
	runDirectorLoop,
} from '@/server/control/pit-director'
import {
	initialSimState,
	simDeviceData,
	type SimState,
	stepSim,
} from '@/server/control/sim-grill'
import { validateIntent } from '@/server/control/safety'
import {
	appConfig,
	cookMessages,
	cookPhotos,
	cookSessions,
	deviceCommands,
	deviceHistory,
	devices,
	directorRuns,
	ninjaConnections,
	pushSubscriptions,
} from '@/server/db/schema'
import Anthropic from '@anthropic-ai/sdk'
import { createJsonMergePatch } from '@/server/db/utils/json-merge-patch'
import {
	and,
	desc,
	eq,
	gt,
	gte,
	inArray,
	isNull,
	lte,
	max,
	sql as sqlExpr,
} from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import webPush from 'web-push'
import { del as blobDel } from '@vercel/blob'
import {
	deleteStoredPhotoObject,
	resolveStoredPhotoUrl,
} from '@/server/photo-storage'
import { stampWorkerCyclePower } from '@/server/power/worker'
import {
	assertSafeUpstream,
	backoffOnFailure,
	backoffOnSuccess,
	countsAsRealDeviceOnline,
	createDrainController,
	inBackoff,
	shouldRunDirector,
} from './sync-worker-lib'

const log = createLogger('sync-worker')

const DB_URL = process.env.ZERO_UPSTREAM_DB
if (!DB_URL) {
	console.error('ZERO_UPSTREAM_DB is not set')
	process.exit(1)
}
// Refuse remote upstreams unless explicitly allowed: this worker executes
// device controls and director runs, so a copied prod URL in a local .env
// would duplicate every prod side effect.
try {
	assertSafeUpstream(DB_URL, process.env)
} catch (error) {
	log.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
}
const INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS ?? 60_000)
const REAL_DEVICES_ONLY = process.env.PITMINDER_REAL_DEVICES_ONLY === 'true'
// Run exactly one cycle then exit — verification and CI without killing loops.
const SYNC_ONCE = process.env.PITMINDER_SYNC_ONCE === 'true'

const sql = postgres(DB_URL, {
	max: 5,
	idle_timeout: 30,
	connect_timeout: 20,
})
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

/** Executes one validated setpoint change against the device. */
async function executeSetpoint(
	device: { id: string; dsn: string; isSimulated?: boolean },
	userId: string,
	setpointC: number,
	reason: string,
	source: 'user' | 'autopilot' | 'director',
	kind: 'set_pit_temp' | 'hold_warm',
	headers: Record<string, string>,
	commandId?: string,
): Promise<void> {
	let result: { status: 'sent' | 'dry_run' | 'failed'; error?: string }
	if (device.isSimulated) {
		// Simulated grills execute for real: write the setpoint into sim_state
		const [row] = await db
			.select({ sim_state: devices.sim_state })
			.from(devices)
			.where(eq(devices.id, device.id))
		const sim = row?.sim_state as SimState | null
		if (sim) {
			await db
				.update(devices)
				.set({ sim_state: { ...sim, setpointC } })
				.where(eq(devices.id, device.id))
			result = { status: 'sent' }
		} else {
			result = { status: 'failed', error: 'sim device has no sim_state' }
		}
	} else {
		result = await sendDatapoint(
			device.dsn,
			'SET_Cook_Command',
			buildSetpointCommand(setpointC),
			headers,
		)
	}
	const status = result.status === 'sent' ? 'sent' : result.status
	if (commandId) {
		await db
			.update(deviceCommands)
			.set({ status, error: result.error ?? null, executedAt: new Date() })
			.where(eq(deviceCommands.id, commandId))
	} else {
		await db.insert(deviceCommands).values({
			deviceId: device.id,
			userId,
			kind,
			payload: { setpointC, reason },
			source,
			status,
			error: result.error ?? null,
			executedAt: new Date(),
		})
	}
	console.log(
		`[control] ${source} ${kind} ${setpointC}°C (${reason}) -> ${status}`,
	)
}

/** Runs queued manual commands for a device through the safety envelope. */
async function executePendingCommands(
	device: { id: string; dsn: string },
	mode: string | null,
	currentSetpointC: number | null,
	headers: Record<string, string>,
) {
	const pending = await db
		.select()
		.from(deviceCommands)
		.where(
			and(
				eq(deviceCommands.deviceId, device.id),
				eq(deviceCommands.status, 'pending'),
			),
		)
	for (const command of pending) {
		const payload = command.payload as { setpointC?: number; reason?: string }
		if (typeof payload.setpointC !== 'number') {
			await db
				.update(deviceCommands)
				.set({ status: 'rejected', error: 'missing setpointC' })
				.where(eq(deviceCommands.id, command.id))
			continue
		}
		const verdict = validateIntent(
			{
				kind: command.kind as 'set_pit_temp' | 'hold_warm',
				setpointC: payload.setpointC,
				reason: payload.reason ?? 'manual',
			},
			{ mode, currentSetpointC },
		)
		if (!verdict.ok) {
			await db
				.update(deviceCommands)
				.set({ status: 'rejected', error: verdict.rejectReason })
				.where(eq(deviceCommands.id, command.id))
			continue
		}
		await executeSetpoint(
			device,
			command.userId,
			verdict.setpointC,
			payload.reason ?? 'manual',
			'user',
			command.kind as 'set_pit_temp' | 'hold_warm',
			headers,
			command.id,
		)
	}
}

/** Phase-1 autopilot tick for a device. */
async function runAutopilot(
	deviceRow: typeof devices.$inferSelect,
	userId: string,
	deviceData: Record<string, unknown>,
	headers: Record<string, string>,
) {
	if (!deviceRow.autopilot_enabled) return
	const setpoint = parseSetpoint(deviceData)
	const nowMs = Date.now()

	// Lead-probe series from history (4h) for stall detection
	const since = new Date(nowMs - 4 * 3_600_000)
	const rows = await db
		.select()
		.from(deviceHistory)
		.where(
			and(
				eq(deviceHistory.deviceId, deviceRow.id),
				gte(deviceHistory.recordedAt, since),
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
	const probe1Series: TempPoint[] = snapshots
		.filter((s) => typeof s.state.probe1_temp_a === 'number' && s.recordedAt)
		.map((s) => ({
			t: s.recordedAt as number,
			value: s.state.probe1_temp_a as number,
		}))
		.sort((a, b) => a.t - b.t)

	const num = (v: unknown) => (typeof v === 'number' ? v : null)
	const result = evaluateAutopilot({
		nowMs,
		cooking: isCooking(deviceData.cook_state),
		mode: (deviceData.cook_mode as string) ?? null,
		setpointC: setpoint,
		probes: [
			{
				index: 1,
				tempC: num(deviceData.probe1_temp_a),
				targetC:
					deviceRow.probe1_target_temp != null
						? Number(deviceRow.probe1_target_temp)
						: null,
			},
			{
				index: 2,
				tempC: num(deviceData.probe2_temp_a),
				targetC:
					deviceRow.probe2_target_temp != null
						? Number(deviceRow.probe2_target_temp)
						: null,
			},
		],
		probe1Series,
		state: (deviceRow.autopilot_state as AutopilotState) ?? {},
	})

	for (const intent of result.intents) {
		const verdict = validateIntent(intent, {
			mode: (deviceData.cook_mode as string) ?? null,
			currentSetpointC: setpoint,
		})
		if (!verdict.ok) {
			console.warn(`[autopilot] intent rejected: ${verdict.rejectReason}`)
			continue
		}
		await executeSetpoint(
			{
				id: deviceRow.id,
				dsn: deviceRow.dsn,
				isSimulated: deviceRow.is_simulated === true,
			},
			userId,
			verdict.setpointC,
			intent.reason,
			'autopilot',
			intent.kind,
			headers,
		)
	}
	for (const m of result.messages) {
		await emitMessage({
			deviceId: deviceRow.id,
			userId,
			kind: m.kind,
			title: m.title,
			body: m.body,
			requiresAck: m.requiresAck,
			actions: m.actions,
		})
	}
	if (
		JSON.stringify(result.state) !==
		JSON.stringify(deviceRow.autopilot_state ?? {})
	) {
		await db
			.update(devices)
			.set({ autopilot_state: result.state })
			.where(eq(devices.id, deviceRow.id))
	}
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

const pushEnabled = !!(
	process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
)
if (pushEnabled) {
	webPush.setVapidDetails(
		process.env.VAPID_SUBJECT ?? 'mailto:thomas@resilientsoftware.co.uk',
		process.env.VAPID_PUBLIC_KEY as string,
		process.env.VAPID_PRIVATE_KEY as string,
	)
}

/** Pushes a message to every browser the user subscribed. Best-effort. */
async function sendPush(userId: string, title: string, body: string) {
	if (!pushEnabled) return
	const subs = await db
		.select()
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.userId, userId))
	const payload = JSON.stringify({ title, body, url: '/app/messages' })
	for (const sub of subs) {
		try {
			await webPush.sendNotification(
				{
					endpoint: sub.endpoint,
					keys: { p256dh: sub.p256dh, auth: sub.auth },
				},
				payload,
				{ TTL: 3600 },
			)
			if (sub.failCount > 0) {
				await db
					.update(pushSubscriptions)
					.set({ failCount: 0 })
					.where(eq(pushSubscriptions.id, sub.id))
			}
		} catch (error) {
			const statusCode = (error as { statusCode?: number }).statusCode
			// Gone/expired endpoints get pruned; transient failures accumulate
			if (statusCode === 404 || statusCode === 410 || sub.failCount >= 4) {
				await db
					.delete(pushSubscriptions)
					.where(eq(pushSubscriptions.id, sub.id))
				console.log(`push: pruned dead subscription ${sub.id}`)
			} else {
				await db
					.update(pushSubscriptions)
					.set({ failCount: sub.failCount + 1 })
					.where(eq(pushSubscriptions.id, sub.id))
			}
		}
	}
}

/** Marks every pending ack-message for a device as implicitly skipped. */
async function skipPendingMessages(deviceId: string) {
	const skipped = await db
		.update(cookMessages)
		.set({ response: 'skipped', ackedAt: new Date() })
		.where(
			and(
				eq(cookMessages.deviceId, deviceId),
				eq(cookMessages.requiresAck, true),
				isNull(cookMessages.ackedAt),
			),
		)
		.returning({ id: cookMessages.id })
	if (skipped.length) {
		console.log(`messages: auto-skipped ${skipped.length} for ${deviceId}`)
	}
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
	// Only the LATEST message carries live actions: a new ack-required
	// message supersedes anything still pending (the moment has passed).
	if (args.requiresAck) {
		await skipPendingMessages(args.deviceId)
	}
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
	await sendPush(args.userId, args.title, args.body)
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

const PELLET_MESSAGE_KINDS = ['pellet_low', 'pit_drop']

/**
 * Pellet hopper model: integrates burn over the pit-temperature history
 * since the last load, and warns ahead of time (vs. pit_drop, which only
 * fires after the fire is already dying). A "Refilled ✅" button response
 * on either message kind resets the load clock.
 */
async function runPelletForecast(
	deviceRow: typeof devices.$inferSelect,
	userId: string,
	deviceData: Record<string, unknown>,
) {
	const capacityKg =
		deviceRow.hopper_capacity_kg != null
			? Number(deviceRow.hopper_capacity_kg)
			: null
	let loadedAtMs = deviceRow.pellets_loaded_at?.getTime() ?? null
	if (!capacityKg || !loadedAtMs || !isCooking(deviceData.cook_state)) return

	// Refill acknowledgements reset the load clock
	const [refill] = await db
		.select({ ackedAt: cookMessages.ackedAt })
		.from(cookMessages)
		.where(
			and(
				eq(cookMessages.deviceId, deviceRow.id),
				inArray(cookMessages.kind, PELLET_MESSAGE_KINDS),
				eq(cookMessages.response, 'refilled'),
				gt(cookMessages.ackedAt, new Date(loadedAtMs)),
			),
		)
		.orderBy(desc(cookMessages.ackedAt))
		.limit(1)
	if (refill?.ackedAt) {
		loadedAtMs = refill.ackedAt.getTime()
		await db
			.update(devices)
			.set({ pellets_loaded_at: refill.ackedAt })
			.where(eq(devices.id, deviceRow.id))
	}

	const rows = await db
		.select()
		.from(deviceHistory)
		.where(
			and(
				eq(deviceHistory.deviceId, deviceRow.id),
				gte(deviceHistory.recordedAt, new Date(loadedAtMs)),
			),
		)
	const grillSeries: TempPoint[] = reconstructHistorySnapshots(
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
		.filter((s) => typeof s.state.temp_grill === 'number' && s.recordedAt)
		.map((s) => ({
			t: s.recordedAt as number,
			value: s.state.temp_grill as number,
		}))
	if (typeof deviceData.temp_grill === 'number') {
		grillSeries.push({ t: Date.now(), value: deviceData.temp_grill })
	}
	if (grillSeries.length < 2) return

	const status = hopperStatus({
		capacityKg,
		loadedAtMs,
		grillSeries,
		nowMs: Date.now(),
	})

	if (
		status.refillSoon &&
		status.emptyAtMs != null &&
		!(await hasRecentUnacked(deviceRow.id, 'pellet_low'))
	) {
		const emptyAt = new Date(status.emptyAtMs).toLocaleTimeString('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: process.env.COOK_TZ ?? 'Europe/London',
		})
		await emitMessage({
			deviceId: deviceRow.id,
			userId,
			kind: 'pellet_low',
			title: `Pellets low — ~${status.remainingKg.toFixed(1)} kg left 🪵`,
			body: `Burning ${status.currentRateKgPerHour.toFixed(2)} kg/h at the current pit temp; the hopper runs dry around ${emptyAt}. Top it up now to avoid a temperature crash.`,
			requiresAck: true,
			actions: [{ id: 'refilled', label: 'Refilled ✅' }],
		})
	}
}

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null
const DIRECTOR_INTERVAL_MS = Number(
	process.env.PIT_DIRECTOR_INTERVAL_MS ?? 10 * 60_000,
)

/**
 * Advisory cadence read: the newest director_runs row (claimed, ok or
 * error). Cheap spacing check only — the ATOMIC fence is claimDirectorRun.
 */
async function lastDirectorRunAt(deviceId: string): Promise<Date | null> {
	const [row] = await db
		.select({ last: max(directorRuns.createdAt) })
		.from(directorRuns)
		.where(eq(directorRuns.deviceId, deviceId))
	return row?.last ?? null
}

/**
 * Atomic per-interval cadence lease, taken BEFORE any LLM spend: INSERT a
 * 'claimed' row keyed on (device_id, interval_bucket) with the bucket
 * computed from DATABASE time (never the worker clock), ON CONFLICT DO
 * NOTHING. Exactly one task can own a device's bucket — overlapping tasks
 * during a deploy/wake and check-then-act races cannot double-run, and a
 * crash after side effects (row left 'claimed') still consumes the bucket
 * so the spend is never repeated. Returns the claimed row id, or null when
 * the bucket is already owned.
 */
async function claimDirectorRun(
	deviceId: string,
	userId: string,
	model: string,
): Promise<string | null> {
	const intervalSec = Math.max(1, Math.round(DIRECTOR_INTERVAL_MS / 1000))
	const rows = await db
		.insert(directorRuns)
		.values({
			userId,
			deviceId,
			model,
			status: 'claimed',
			intervalBucket: sqlExpr`to_timestamp(floor(extract(epoch from now()) / ${intervalSec}) * ${intervalSec})`,
		})
		.onConflictDoNothing({
			target: [directorRuns.deviceId, directorRuns.intervalBucket],
		})
		.returning({ id: directorRuns.id })
	return rows[0]?.id ?? null
}

async function configValue(key: string): Promise<string | null> {
	const [row] = await db
		.select({ value: appConfig.value })
		.from(appConfig)
		.where(eq(appConfig.key, key))
	if (!row) return null
	return typeof row.value === 'string' ? row.value : JSON.stringify(row.value)
}

/** Reconstructs full state snapshots from history rows since `since`. */
async function loadSnapshots(deviceId: string, since: Date) {
	const rows = await db
		.select()
		.from(deviceHistory)
		.where(
			and(
				eq(deviceHistory.deviceId, deviceId),
				gte(deviceHistory.recordedAt, since),
			),
		)
	return reconstructHistorySnapshots(
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
}

/**
 * The agentic judgment layer: every ~10 min per active cook, an LLM
 * inspects the cook through tools and may message the user or adjust the
 * pit (through the same safety envelope as everything else).
 */
async function runPitDirector(
	deviceRow: typeof devices.$inferSelect,
	userId: string,
	deviceData: Record<string, unknown>,
	headers: Record<string, string>,
) {
	if (!anthropic || !deviceRow.autopilot_enabled) return
	if (!isCooking(deviceData.cook_state)) return
	// Advisory spacing (cheap, avoids claim-insert churn every cycle) …
	const last = await lastDirectorRunAt(deviceRow.id)
	if (!shouldRunDirector(last, Date.now(), DIRECTOR_INTERVAL_MS)) return
	if ((await configValue('pit_director_enabled')) === 'false') return

	const model = (await configValue('pit_director_model')) ?? DEFAULT_DIRECTOR_MODEL
	// … and the ATOMIC per-bucket claim before any LLM spend.
	const claimedRunId = await claimDirectorRun(deviceRow.id, userId, model)
	if (!claimedRunId) return
	const num = (v: unknown) => (typeof v === 'number' ? v : null)
	const setpoint = parseSetpoint(deviceData)

	const handlers: DirectorToolHandlers = {
		get_telemetry: async () => ({
			cookState: deviceData.cook_state,
			mode: deviceData.cook_mode,
			setpointC: setpoint,
			pitC: num(deviceData.temp_grill),
			airC: num(deviceData.temp_air),
			smokeC: num(deviceData.temp_smoke),
			lidOpen: deviceData.is_lid_open === true,
			probes: [
				{
					probe: 1,
					installed: deviceData.is_probe1_installed === true,
					tempC: num(deviceData.probe1_temp_a),
					targetC:
						deviceRow.probe1_target_temp != null
							? Number(deviceRow.probe1_target_temp)
							: null,
				},
				{
					probe: 2,
					installed: deviceData.is_probe2_installed === true,
					tempC: num(deviceData.probe2_temp_a),
					targetC:
						deviceRow.probe2_target_temp != null
							? Number(deviceRow.probe2_target_temp)
							: null,
				},
			],
		}),
		get_cook_history: async ({ hours }) => {
			const h = Math.min(Math.max(hours ?? 6, 1), 24)
			const snapshots = await loadSnapshots(
				deviceRow.id,
				new Date(Date.now() - h * 3_600_000),
			)
			const points = snapshots
				.filter((s) => s.recordedAt)
				.map((s) => ({
					t: new Date(s.recordedAt as number).toISOString(),
					pitC: num(s.state.temp_grill),
					probe1C: num(s.state.probe1_temp_a),
					probe2C: num(s.state.probe2_temp_a),
				}))
				.sort((a, b) => a.t.localeCompare(b.t))
			// Downsample to ≤48 points so the context stays small
			const step = Math.max(1, Math.ceil(points.length / 48))
			return points.filter((_, i) => i % step === 0 || i === points.length - 1)
		},
		list_past_sessions: async () => {
			const rows = await db
				.select()
				.from(cookSessions)
				.where(eq(cookSessions.deviceId, deviceRow.id))
				.orderBy(desc(cookSessions.startedAt))
				.limit(6)
			return rows
				.filter((s) => s.endedAt != null)
				.map((s) => ({
					name: s.name,
					mode: s.cook_mode,
					startedAt: s.startedAt.toISOString(),
					hours:
						s.endedAt != null
							? Math.round(
									((s.endedAt.getTime() - s.startedAt.getTime()) / 3_600_000) *
										10,
								) / 10
							: null,
					setpointC: s.setpoint != null ? Number(s.setpoint) : null,
					avgPitC: s.avg_temp_grill != null ? Number(s.avg_temp_grill) : null,
					maxProbeC:
						s.max_probe1_temp != null ? Number(s.max_probe1_temp) : null,
					stabilityScore: s.stability_score,
					stallSeconds: s.stall_seconds,
				}))
		},
		get_recent_messages: async () => {
			const rows = await db
				.select()
				.from(cookMessages)
				.where(eq(cookMessages.deviceId, deviceRow.id))
				.orderBy(desc(cookMessages.createdAt))
				.limit(15)
			return rows.map((m) => ({
				at: m.createdAt.toISOString(),
				kind: m.kind,
				title: m.title,
				body: m.body,
				requiresAck: m.requiresAck,
				userResponse: m.response,
				acked: m.ackedAt != null,
			}))
		},
		get_pellet_status: async () => {
			const capacityKg =
				deviceRow.hopper_capacity_kg != null
					? Number(deviceRow.hopper_capacity_kg)
					: null
			const loadedAtMs = deviceRow.pellets_loaded_at?.getTime() ?? null
			if (!capacityKg || !loadedAtMs)
				return { configured: false, note: 'no hopper capacity/load time set' }
			const snapshots = await loadSnapshots(deviceRow.id, new Date(loadedAtMs))
			const grillSeries: TempPoint[] = snapshots
				.filter((s) => typeof s.state.temp_grill === 'number' && s.recordedAt)
				.map((s) => ({
					t: s.recordedAt as number,
					value: s.state.temp_grill as number,
				}))
			const status = hopperStatus({
				capacityKg,
				loadedAtMs,
				grillSeries,
				nowMs: Date.now(),
			})
			return {
				configured: true,
				capacityKg,
				...status,
				emptyAt: status.emptyAtMs
					? new Date(status.emptyAtMs).toISOString()
					: null,
			}
		},
		list_photos: async () => {
			const rows = await db
				.select({ url: cookPhotos.url, createdAt: cookPhotos.createdAt })
				.from(cookPhotos)
				.where(eq(cookPhotos.userId, userId))
				.orderBy(desc(cookPhotos.createdAt))
				.limit(10)
			// S3-backed rows store an s3:// marker — the model needs a
			// fetchable presigned URL; unresolvable photos are skipped.
			const photos: Array<{ url: string; at: string }> = []
			for (const p of rows) {
				try {
					photos.push({
						url: await resolveStoredPhotoUrl(p.url, userId),
						at: p.createdAt.toISOString(),
					})
				} catch (error) {
					console.warn(
						'[director] skipping unresolvable photo:',
						error instanceof Error ? error.message : error,
					)
				}
			}
			return photos
		},
		set_pit_temp: async ({ setpointC, reason }) => {
			const verdict = validateIntent(
				{ kind: 'set_pit_temp', setpointC, reason },
				{
					mode: (deviceData.cook_mode as string) ?? null,
					currentSetpointC: setpoint,
				},
			)
			if (!verdict.ok) return { ok: false, rejected: verdict.rejectReason }
			await executeSetpoint(
				{
					id: deviceRow.id,
					dsn: deviceRow.dsn,
					isSimulated: deviceRow.is_simulated === true,
				},
				userId,
				verdict.setpointC,
				reason,
				'director',
				'set_pit_temp',
				headers,
			)
			return {
				ok: true,
				appliedC: verdict.setpointC,
				clamped: verdict.setpointC !== setpointC,
			}
		},
		send_message: async (args) => {
			await emitMessage({
				deviceId: deviceRow.id,
				userId,
				kind: 'director',
				title: args.title,
				body: args.body,
				requiresAck: args.requiresAck ?? false,
				actions: args.actions,
			})
			return { ok: true }
		},
	}

	try {
		const result = await runDirectorLoop({
			client: anthropic,
			model,
			contextNote: `Smoker: ${deviceRow.productName ?? deviceRow.dsn}. Local time: ${new Date().toLocaleString('en-GB', { timeZone: process.env.COOK_TZ ?? 'Europe/London' })}.`,
			handlers,
		})
		console.log(
			`[director] ${deviceRow.id} model=${model} iters=${result.iterations} setpoints=${result.setpointChanges} msgs=${result.messagesSent} :: ${result.summary.slice(0, 200)}`,
		)
		// Fill in the claimed lease row rather than inserting a second one.
		await db
			.update(directorRuns)
			.set({
				status: 'ok',
				summary: result.summary || null,
				iterations: result.iterations,
				setpointChanges: result.setpointChanges,
				messagesSent: result.messagesSent,
				toolCalls: result.toolCalls,
			})
			.where(eq(directorRuns.id, claimedRunId))
	} catch (error) {
		console.error(
			`[director] failed for device ${deviceRow.id}:`,
			error instanceof Error ? error.message : error,
		)
		await db
			.update(directorRuns)
			.set({
				status: 'error',
				error: error instanceof Error ? error.message : String(error),
			})
			.where(eq(directorRuns.id, claimedRunId))
			.catch(() => {})
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
	const [active] = await db
		.select()
		.from(cookSessions)
		.where(
			and(eq(cookSessions.deviceId, deviceId), isNull(cookSessions.endedAt)),
		)
		.limit(1)

	if (nowCooking) {
		if (active) return
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

	if (!wasCooking && !active) return

	// Cook ended: any still-pending decision is moot now
	await skipPendingMessages(deviceId)

	// Cook ended: close the active session and compute stats from history
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

/**
 * Polls one Ayla account; returns the number of devices written plus how
 * many were NON-simulated and Online (the lastRealDeviceOnlineAt signal —
 * sims are stepped elsewhere and must never count).
 */
async function syncConnection(
	conn: typeof ninjaConnections.$inferSelect,
): Promise<{ devices: number; realOnline: number }> {
	if (!conn.username || !conn.password) return { devices: 0, realOnline: 0 }

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

	let realOnline = 0
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

		if (
			countsAsRealDeviceOnline({
				isSimulated: existing?.is_simulated === true,
				connectionStatus:
					typeof deviceData.connectionStatus === 'string'
						? deviceData.connectionStatus
						: null,
			})
		) {
			realOnline++
		}

		if (existing) {
			await db.update(devices).set(row).where(eq(devices.id, existing.id))
			await handleSessionTransition(
				existing.id,
				conn.userId,
				existing.cook_state,
				deviceData,
			)
			await emitCookMessages(existing.id, conn.userId, existing, deviceData)
			await runPelletForecast(existing, conn.userId, deviceData)
			await executePendingCommands(
				{ id: existing.id, dsn: existing.dsn },
				(deviceData.cook_mode as string) ?? null,
				parseSetpoint(deviceData),
				headers,
			)
			await runAutopilot(existing, conn.userId, deviceData, headers)
			await runPitDirector(existing, conn.userId, deviceData, headers)

			// Minute snapshot, otherwise a merge patch against the previous state.
			const minuteStart = new Date()
			minuteStart.setSeconds(0, 0)
			const [snapshotThisMinute] = await db
				.select({ id: deviceHistory.id })
				.from(deviceHistory)
				.where(
					and(
						eq(deviceHistory.deviceId, existing.id),
						eq(deviceHistory.historyType, 'snapshot'),
						gte(deviceHistory.recordedAt, minuteStart),
					),
				)
				.limit(1)

			if (snapshotThisMinute) {
				const previousState = toHistoryState(
					existing as unknown as Record<string, unknown>,
				)
				const patch = createJsonMergePatch(previousState, historyState)
				if (Object.keys(patch).length > 0) {
					await db.insert(deviceHistory).values({
						deviceId: existing.id,
						userId: conn.userId,
						historyType: 'patch',
						changes: patch,
					})
				}
			} else {
				await db.insert(deviceHistory).values({
					deviceId: existing.id,
					userId: conn.userId,
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
					userId: conn.userId,
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
			log.info('new device discovered', {
				dsn: device.dsn,
				userId: conn.userId,
			})
		}
	}

	log.debug('synced connection', {
		userId: conn.userId,
		devices: devicesData.length,
		realOnline,
	})
	return { devices: devicesData.length, realOnline }
}

/**
 * Steps every simulated device through the same pipeline as real ones.
 * Returns the number of simulated devices stepped (written).
 */
async function stepSimulatedDevices(): Promise<number> {
	const sims = await db
		.select()
		.from(devices)
		.where(eq(devices.is_simulated, true))

	let stepped = 0
	for (const device of sims) {
		try {
			const now = Date.now()
			let sim = device.sim_state as SimState | null

			// Process control commands first (start/stop/setpoints)
			const pending = await db
				.select()
				.from(deviceCommands)
				.where(
					and(
						eq(deviceCommands.deviceId, device.id),
						eq(deviceCommands.status, 'pending'),
					),
				)
			for (const command of pending) {
				const payload = command.payload as {
					setpointC?: number
					reason?: string
				}
				if (command.kind === 'start_sim_cook') {
					sim = initialSimState({
						setpointC: payload.setpointC ?? 107,
						nowMs: now,
					})
					await db
						.update(devices)
						.set({
							sim_state: sim,
							pellets_loaded_at: new Date(),
							autopilot_state: null,
						})
						.where(eq(devices.id, device.id))
					await db
						.update(deviceCommands)
						.set({ status: 'sent', executedAt: new Date() })
						.where(eq(deviceCommands.id, command.id))
					continue
				}
				if (command.kind === 'stop_sim_cook') {
					if (sim) sim = { ...sim, cooking: false }
					await db
						.update(devices)
						.set({ sim_state: sim })
						.where(eq(devices.id, device.id))
					await db
						.update(deviceCommands)
						.set({ status: 'sent', executedAt: new Date() })
						.where(eq(deviceCommands.id, command.id))
					continue
				}
				if (typeof payload.setpointC !== 'number') {
					await db
						.update(deviceCommands)
						.set({ status: 'rejected', error: 'missing setpointC' })
						.where(eq(deviceCommands.id, command.id))
					continue
				}
				const verdict = validateIntent(
					{
						kind: command.kind as 'set_pit_temp' | 'hold_warm',
						setpointC: payload.setpointC,
						reason: payload.reason ?? 'manual',
					},
					{ mode: sim?.mode ?? 'smoker', currentSetpointC: sim?.setpointC ?? null },
				)
				if (!verdict.ok) {
					await db
						.update(deviceCommands)
						.set({ status: 'rejected', error: verdict.rejectReason })
						.where(eq(deviceCommands.id, command.id))
					continue
				}
				await executeSetpoint(
					{ id: device.id, dsn: device.dsn, isSimulated: true },
					command.userId,
					verdict.setpointC,
					payload.reason ?? 'manual',
					'user',
					command.kind as 'set_pit_temp' | 'hold_warm',
					{},
					command.id,
				)
				if (sim) sim = { ...sim, setpointC: verdict.setpointC }
			}

			if (!sim) continue

			// Physics step + write through the normal pipeline
			sim = stepSim(sim, now)
			await db
				.update(devices)
				.set({ sim_state: sim })
				.where(eq(devices.id, device.id))

			const deviceData = simDeviceData(sim, device.dsn, device.productName)
			const row = toRow(deviceData)
			const historyState = toHistoryState(deviceData)
			await db.update(devices).set(row).where(eq(devices.id, device.id))
			stepped++

			// Minute snapshot / per-cycle patch (same scheme as real devices)
			const minuteStart = new Date()
			minuteStart.setSeconds(0, 0)
			const [snapshotThisMinute] = await db
				.select({ id: deviceHistory.id })
				.from(deviceHistory)
				.where(
					and(
						eq(deviceHistory.deviceId, device.id),
						eq(deviceHistory.historyType, 'snapshot'),
						gte(deviceHistory.recordedAt, minuteStart),
					),
				)
				.limit(1)
			if (snapshotThisMinute) {
				const previousState = toHistoryState(
					device as unknown as Record<string, unknown>,
				)
				const patch = createJsonMergePatch(previousState, historyState)
				if (Object.keys(patch).length > 0) {
					await db.insert(deviceHistory).values({
						deviceId: device.id,
						userId: device.userId,
						historyType: 'patch',
						changes: patch,
					})
				}
			} else {
				await db.insert(deviceHistory).values({
					deviceId: device.id,
					userId: device.userId,
					historyType: 'snapshot',
					changes: historyState,
				})
			}

			await handleSessionTransition(
				device.id,
				device.userId,
				device.cook_state,
				deviceData,
			)
			await emitCookMessages(device.id, device.userId, device, deviceData)
			await runPelletForecast(device, device.userId, deviceData)
			await runAutopilot(
				{ ...device, sim_state: sim },
				device.userId,
				deviceData,
				{},
			)
			await runPitDirector(
				{ ...device, sim_state: sim },
				device.userId,
				deviceData,
				{},
			)
		} catch (error) {
			log.error('sim step failed for device', {
				deviceId: device.id,
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}
	return stepped
}

const PHOTO_TTL_DAYS = 60
const DIRECTOR_RUN_TTL_DAYS = 30
let lastPhotoReapMs = 0

/**
 * Reaps aged director_runs (check-in transcripts have no value after the
 * cook is long over). Cadence reads max(created_at) per device, so a fully
 * reaped device simply runs its next check-in immediately — correct, since
 * its last one was ≥30 days ago.
 */
async function reapDirectorRuns() {
	const cutoff = new Date(Date.now() - DIRECTOR_RUN_TTL_DAYS * 24 * 3_600_000)
	const gone = await db
		.delete(directorRuns)
		.where(lte(directorRuns.createdAt, cutoff))
	if (Array.isArray(gone) && gone.length) {
		console.log(`director: reaped ${gone.length} aged runs`)
	}
}

/** Reaps cook photos past their 60-day TTL: blob first, then the row. */
async function reapExpiredPhotos() {
	if (Date.now() - lastPhotoReapMs < 6 * 3_600_000) return
	lastPhotoReapMs = Date.now()
	await reapDirectorRuns().catch((error) =>
		console.error('director reap failed:', error),
	)
	const cutoff = new Date(Date.now() - PHOTO_TTL_DAYS * 24 * 3_600_000)
	const expired = await db
		.select({
			id: cookPhotos.id,
			url: cookPhotos.url,
			userId: cookPhotos.userId,
		})
		.from(cookPhotos)
		.where(lte(cookPhotos.createdAt, cutoff))
		.limit(100)
	for (const photo of expired) {
		try {
			// S3 rows (s3:// marker) delete their object here too — idempotent
			// with the bucket lifecycle rule; Blob rows keep the old path.
			// Bucket + owner-namespace enforced against the row's own user.
			const wasS3 = await deleteStoredPhotoObject(photo.url, photo.userId)
			if (!wasS3 && process.env.BLOB_READ_WRITE_TOKEN) await blobDel(photo.url)
			await db.delete(cookPhotos).where(eq(cookPhotos.id, photo.id))
			console.log(`photos: reaped expired ${photo.id}`)
		} catch (error) {
			console.error(
				`photos: failed to reap ${photo.id}:`,
				error instanceof Error ? error.message : error,
			)
		}
	}
}

async function cycle() {
	await reapExpiredPhotos()

	// Simulated grills first: cheap, high-value, and must never be starved
	// by slow browser-auth attempts against stale real connections.
	let simDevices = 0
	if (!REAL_DEVICES_ONLY) {
		simDevices = await stepSimulatedDevices()
	}

	const stats = {
		polled: 0,
		skippedBackoff: 0,
		// Named to dodge the logger's secret-key redaction ("token" matches).
		skippedRealOnly: 0,
		skippedNoCredentials: 0,
		devicesUpdated: simDevices,
		realDevicesOnline: 0,
	}

	const connections = await db.select().from(ninjaConnections)
	for (const conn of connections) {
		if (
			REAL_DEVICES_ONLY &&
			!conn.aylaAccessToken &&
			!conn.aylaRefreshToken
		) {
			stats.skippedRealOnly++
			continue
		}
		if (!conn.username || !conn.password) {
			// Would no-op inside syncConnection; skip so the success path
			// doesn't stamp last_success_at for a connection it never polled.
			stats.skippedNoCredentials++
			continue
		}
		// Timed exponential backoff for connections that keep failing auth
		// (e2e leftovers, changed passwords) — they retry forever, just
		// increasingly slowly. A credential re-save resets attempts to 0 and
		// polls immediately (inBackoff requires attempts > 0).
		if (inBackoff(conn, new Date())) {
			log.debug('skipping connection: auth backoff window open', {
				userId: conn.userId,
				attempts: conn.attempts,
				retryAt: conn.nextAttemptAt?.toISOString(),
			})
			stats.skippedBackoff++
			continue
		}
		// Effective cadence: the owner's complaint was multi-minute history
		// gaps, so surface any poll-to-poll gap beyond 1.5x the interval.
		const nowMs = Date.now()
		const prevPolledMs = lastPolledAt.get(conn.userId)
		if (
			prevPolledMs !== undefined &&
			nowMs - prevPolledMs > 1.5 * INTERVAL_MS
		) {
			log.warn('connection poll gap exceeded 1.5x interval', {
				userId: conn.userId,
				gapMs: nowMs - prevPolledMs,
				intervalMs: INTERVAL_MS,
			})
		}
		lastPolledAt.set(conn.userId, nowMs)
		try {
			const result = await syncConnection(conn)
			stats.devicesUpdated += result.devices
			stats.realDevicesOnline += result.realOnline
			stats.polled++
			await db
				.update(ninjaConnections)
				.set(backoffOnSuccess(new Date()))
				.where(eq(ninjaConnections.userId, conn.userId))
		} catch (error) {
			const failure = backoffOnFailure(conn.attempts ?? 0, new Date())
			await db
				.update(ninjaConnections)
				.set(failure)
				.where(eq(ninjaConnections.userId, conn.userId))
			log.error('sync failed for connection', {
				userId: conn.userId,
				attempt: failure.attempts,
				retryAt: failure.nextAttemptAt.toISOString(),
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	// Scale-to-zero signals as ONE generation-fenced write per cycle
	// (no-op when POWER_TABLE is unset; skipped+warned if POWER_GENERATION
	// is missing): heartbeat always, lastRealDeviceOnlineAt only when a
	// NON-simulated device reported Online — sims never count.
	await stampWorkerCyclePower({
		realDeviceOnline: stats.realDevicesOnline > 0,
	})

	return stats
}

/** Last poll start per connection (userId → epoch ms) for cadence warnings. */
const lastPolledAt = new Map<string, number>()

log.info('sync-worker starting', {
	intervalMs: INTERVAL_MS,
	db: DB_URL.replace(/:[^:@/]+@/, ':***@'),
	realDevicesOnly: REAL_DEVICES_ONLY,
})

// Graceful shutdown (ECS sends SIGTERM, then SIGKILL at stopTimeout=60s):
// stop starting new cycles, let the in-flight cycle finish its side
// effects, flush the pool, exit 0. A hard 45s deadline beats the SIGKILL;
// a second signal forces an immediate exit.
const drain = createDrainController()
const DRAIN_DEADLINE_MS = 45_000
function requestShutdown(signal: string) {
	if (drain.isDraining()) {
		log.warn(`second ${signal} — forcing immediate exit`)
		process.exit(1)
	}
	log.info(
		`${signal} received — draining: finishing the in-flight cycle, no new cycles`,
	)
	drain.requestDrain()
	const deadline = setTimeout(() => {
		log.warn(`drain deadline (${DRAIN_DEADLINE_MS}ms) reached — exiting now`)
		process.exit(0)
	}, DRAIN_DEADLINE_MS)
	deadline.unref()
}
process.on('SIGTERM', () => requestShutdown('SIGTERM'))
process.on('SIGINT', () => requestShutdown('SIGINT'))

let cycleCount = 0
while (!drain.isDraining()) {
	const start = Date.now()
	let cycleFailed = false
	try {
		const stats = await cycle()
		cycleCount++
		log.info('cycle complete', {
			cycle: cycleCount,
			...stats,
			durationMs: Date.now() - start,
		})
		// Heartbeat: first cycle, then every ~10 min, so a silent hang is visible
		if (cycleCount === 1 || cycleCount % 10 === 0) {
			log.info(`cycle ${cycleCount} ok (${Date.now() - start}ms)`)
		}
	} catch (error) {
		cycleFailed = true
		log.error(`cycle ${cycleCount + 1} failed`, {
			error:
				error instanceof Error ? (error.stack ?? error.message) : String(error),
		})
	}
	if (SYNC_ONCE) {
		log.info('PITMINDER_SYNC_ONCE set — exiting after one cycle', {
			ok: !cycleFailed,
		})
		process.exit(cycleFailed ? 1 : 0)
	}
	const elapsed = Date.now() - start
	// Resolves early the moment a drain is requested.
	await drain.sleep(Math.max(5_000, INTERVAL_MS - elapsed))
}

log.info('drained — closing the db pool and exiting 0', {
	cyclesCompleted: cycleCount,
})
await sql.end({ timeout: 5 }).catch(() => {})
process.exit(0)
