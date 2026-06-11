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
import { NinjaAuthManager } from '@/ninjaAuth/ninja-auth-manager'
import type { EnhancedAuthState } from '@/ninjaAuth/types'
import { type AylaDevice, buildDeviceData } from '@/server/db/build-device-data'
import {
	deviceHistory,
	devices,
	ninjaConnections,
} from '@/server/db/schema'
import { createJsonMergePatch } from '@/server/db/utils/json-merge-patch'
import { and, eq, gte } from 'drizzle-orm'
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
