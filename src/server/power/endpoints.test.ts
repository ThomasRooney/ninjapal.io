/**
 * Integration tests for the ready/wake endpoint logic simulating a
 * CONFIGURED power table with a failing (stopped) database — the exact
 * scale-to-zero scenario the e2e suite cannot reach locally. The DB probe
 * and power row are mocked; auth is mocked to THROW if the sleeping path
 * ever touches it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { probeDb, readPowerRow, requestWake, powerConfigured, getSessionMock } =
	vi.hoisted(() => ({
		probeDb: vi.fn(async () => true),
		readPowerRow: vi.fn(
			async (): Promise<Record<string, unknown> | null> => null,
		),
		requestWake: vi.fn(async (_by: string) => true),
		powerConfigured: { value: true },
		getSessionMock: vi.fn(
			async (): Promise<{ user: { id: string } } | null> => null,
		),
	}))

vi.mock('@/server/db/probe', () => ({ probeDb }))

vi.mock('./power-row', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./power-row')>()
	return {
		...actual,
		powerConfig: () =>
			powerConfigured.value
				? {
						table: 'pitminder-power',
						region: 'eu-west-2',
						rowKey: 'POWER#prod',
					}
				: null,
		readPowerRow,
		requestWake,
	}
})

vi.mock('@/lib/auth', () => ({
	auth: { api: { getSession: getSessionMock } },
}))

import { handleReadyRequest } from './ready-endpoint'
import { handleWakeRequest } from './wake-endpoint'
import { WAKE_GRANT_COOKIE, mintWakeGrant } from './wake-grant'

const SECRET = 'endpoint-test-secret'

function wakeRequest(cookie?: string): Request {
	return new Request('http://localhost/api/wake', {
		method: 'POST',
		headers: cookie ? { cookie } : {},
	})
}

beforeEach(() => {
	powerConfigured.value = true
	probeDb.mockClear()
	probeDb.mockResolvedValue(true)
	readPowerRow.mockClear()
	readPowerRow.mockResolvedValue(null)
	requestWake.mockClear()
	requestWake.mockResolvedValue(true)
	getSessionMock.mockClear()
	getSessionMock.mockResolvedValue(null)
	vi.stubEnv('BETTER_AUTH_SECRET', SECRET)
})

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('handleReadyRequest — configured power table', () => {
	it('answers 202 from DynamoDB alone while warming: SQL is NEVER touched', async () => {
		readPowerRow.mockResolvedValue({
			state: 'WAKING_DB',
			progress: 'starting RDS',
			generation: 3,
			keepWarmUntil: null,
		})
		const res = await handleReadyRequest()
		expect(res.status).toBe(202)
		// Phase-aware Retry-After (P1-d): WAKING_DB is the minutes-long RDS
		// start — poll slowly there.
		expect(res.headers.get('retry-after')).toBe('8')
		expect(await res.json()).toMatchObject({
			ready: false,
			state: 'WAKING_DB',
			progress: 'starting RDS',
			generation: 3,
		})
		expect(probeDb).not.toHaveBeenCalled()
	})

	it('polls the fast service phases quicker (Retry-After 3)', async () => {
		readPowerRow.mockResolvedValue({
			state: 'WAKING_SERVICES',
			generation: 3,
		})
		const res = await handleReadyRequest()
		expect(res.status).toBe(202)
		expect(res.headers.get('retry-after')).toBe('3')
	})

	it('503 on ERROR without touching SQL', async () => {
		readPowerRow.mockResolvedValue({ state: 'ERROR' })
		const res = await handleReadyRequest()
		expect(res.status).toBe(503)
		expect(probeDb).not.toHaveBeenCalled()
	})

	it('AWAKE + healthy DB → 200 with keepWarmUntil surfaced', async () => {
		readPowerRow.mockResolvedValue({
			state: 'AWAKE',
			generation: 4,
			keepWarmUntil: 1786100000000,
		})
		const res = await handleReadyRequest()
		expect(res.status).toBe(200)
		expect(await res.json()).toMatchObject({
			ready: true,
			state: 'AWAKE',
			keepWarmUntil: 1786100000000,
		})
		expect(probeDb).toHaveBeenCalledTimes(1)
	})

	it('AWAKE row but DB probe fails (freshly stopped) → 202', async () => {
		readPowerRow.mockResolvedValue({ state: 'AWAKE' })
		probeDb.mockResolvedValue(false)
		const res = await handleReadyRequest()
		expect(res.status).toBe(202)
	})

	it('unconfigured: probe alone decides', async () => {
		powerConfigured.value = false
		probeDb.mockResolvedValue(true)
		expect((await handleReadyRequest()).status).toBe(200)
		probeDb.mockResolvedValue(false)
		expect((await handleReadyRequest()).status).toBe(503)
		expect(readPowerRow).not.toHaveBeenCalled()
	})
})

describe('handleWakeRequest — configured power table, stack asleep', () => {
	beforeEach(() => {
		readPowerRow.mockResolvedValue({ state: 'SLEEPING' })
		// Sleeping path must NEVER call DB-backed auth or the probe.
		getSessionMock.mockImplementation(async () => {
			throw new Error('DB-backed auth called while asleep')
		})
	})

	it('valid wake grant → 200 + requestWake, without any DB access', async () => {
		const grant = mintWakeGrant('user-9', SECRET, Date.now()) as string
		const res = await handleWakeRequest(
			wakeRequest(`${WAKE_GRANT_COOKIE}=${grant}`),
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ ok: true, configured: true })
		expect(requestWake).toHaveBeenCalledWith('user-9')
		expect(getSessionMock).not.toHaveBeenCalled()
		expect(probeDb).not.toHaveBeenCalled()
	})

	it('no grant → 401 (still no DB access)', async () => {
		const res = await handleWakeRequest(wakeRequest())
		expect(res.status).toBe(401)
		expect(requestWake).not.toHaveBeenCalled()
		expect(getSessionMock).not.toHaveBeenCalled()
	})

	it('expired grant → 401', async () => {
		const grant = mintWakeGrant(
			'user-9',
			SECRET,
			Date.now() - 8 * 24 * 3_600_000,
		) as string
		const res = await handleWakeRequest(
			wakeRequest(`${WAKE_GRANT_COOKIE}=${grant}`),
		)
		expect(res.status).toBe(401)
	})
})

describe('handleWakeRequest — row claims AWAKE', () => {
	it('does ONE bounded session lookup', async () => {
		readPowerRow.mockResolvedValue({ state: 'AWAKE' })
		getSessionMock.mockResolvedValue({ user: { id: 'user-2' } })
		const res = await handleWakeRequest(wakeRequest())
		expect(res.status).toBe(200)
		expect(getSessionMock).toHaveBeenCalledTimes(1)
		expect(requestWake).toHaveBeenCalledWith('user-2')
	})

	it('falls back to the grant when the lookup dies mid-claim', async () => {
		readPowerRow.mockResolvedValue({ state: 'AWAKE' })
		getSessionMock.mockRejectedValue(new Error('connection refused'))
		const grant = mintWakeGrant('user-3', SECRET, Date.now()) as string
		const res = await handleWakeRequest(
			wakeRequest(`${WAKE_GRANT_COOKIE}=${grant}`),
		)
		expect(res.status).toBe(200)
		expect(requestWake).toHaveBeenCalledWith('user-3')
	})
})

describe('handleWakeRequest — unconfigured', () => {
	beforeEach(() => {
		powerConfigured.value = false
	})

	it('session-authenticated → no-op success', async () => {
		getSessionMock.mockResolvedValue({ user: { id: 'user-4' } })
		const res = await handleWakeRequest(wakeRequest())
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ ok: true, configured: false })
		expect(requestWake).not.toHaveBeenCalled()
	})

	it('anonymous → 401', async () => {
		const res = await handleWakeRequest(wakeRequest())
		expect(res.status).toBe(401)
	})
})
