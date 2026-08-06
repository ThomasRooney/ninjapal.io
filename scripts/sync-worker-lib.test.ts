import { describe, expect, it, vi } from 'vitest'
import {
	assertSafeUpstream,
	BACKOFF_CAP_MS,
	backoffDelayMs,
	backoffOnFailure,
	backoffOnSuccess,
	countsAsRealDeviceOnline,
	createDrainController,
	inBackoff,
	resolveWorkerGeneration,
	shouldRunDirector,
} from './sync-worker-lib'

describe('assertSafeUpstream', () => {
	it('allows localhost hosts without any override', () => {
		expect(() =>
			assertSafeUpstream('postgres://user:pass@localhost:54332/postgres', {}),
		).not.toThrow()
		expect(() =>
			assertSafeUpstream('postgres://user:pass@127.0.0.1:5432/db', {}),
		).not.toThrow()
		expect(() =>
			assertSafeUpstream('postgres://user@[::1]:5432/db', {}),
		).not.toThrow()
		expect(() =>
			assertSafeUpstream('postgresql://user@LOCALHOST/db', {}),
		).not.toThrow()
	})

	it('rejects remote hosts, naming the host in the error', () => {
		expect(() =>
			assertSafeUpstream('postgres://fake@evil.example.com/db', {}),
		).toThrow(/evil\.example\.com/)
		expect(() =>
			assertSafeUpstream(
				'postgres://u:p@ep-cool-cloud-123.eu-west-2.aws.neon.tech/neondb',
				{},
			),
		).toThrow(/neon\.tech/)
	})

	it('allows remote hosts when PITMINDER_ALLOW_REMOTE_DB=true', () => {
		expect(() =>
			assertSafeUpstream('postgres://u:p@db.neon.tech/neondb', {
				PITMINDER_ALLOW_REMOTE_DB: 'true',
			}),
		).not.toThrow()
	})

	it('does not accept non-"true" override values', () => {
		expect(() =>
			assertSafeUpstream('postgres://u:p@db.neon.tech/neondb', {
				PITMINDER_ALLOW_REMOTE_DB: '1',
			}),
		).toThrow(/neon\.tech/)
	})

	it('rejects unparseable URLs', () => {
		expect(() => assertSafeUpstream('not a url', {})).toThrow(/parseable/)
	})
})

describe('backoffDelayMs', () => {
	it('progresses exponentially from 60s', () => {
		expect(backoffDelayMs(0)).toBe(60_000)
		expect(backoffDelayMs(1)).toBe(120_000)
		expect(backoffDelayMs(2)).toBe(240_000)
		expect(backoffDelayMs(5)).toBe(1_920_000)
	})

	it('caps at 6 hours', () => {
		expect(backoffDelayMs(9)).toBe(BACKOFF_CAP_MS)
		expect(backoffDelayMs(50)).toBe(BACKOFF_CAP_MS)
		expect(backoffDelayMs(10_000)).toBe(BACKOFF_CAP_MS) // 2**n === Infinity
	})

	it('treats negative or fractional attempts as their floor at 0', () => {
		expect(backoffDelayMs(-3)).toBe(60_000)
		expect(backoffDelayMs(1.9)).toBe(120_000)
	})
})

describe('backoffOnFailure', () => {
	const now = new Date('2026-08-06T12:00:00Z')

	it('increments attempts and schedules the next attempt from the pre-increment count', () => {
		expect(backoffOnFailure(0, now)).toEqual({
			attempts: 1,
			lastErrorAt: now,
			nextAttemptAt: new Date(now.getTime() + 60_000),
		})
		expect(backoffOnFailure(3, now)).toEqual({
			attempts: 4,
			lastErrorAt: now,
			nextAttemptAt: new Date(now.getTime() + 480_000),
		})
	})

	it('never schedules further out than the cap', () => {
		const result = backoffOnFailure(40, now)
		expect(result.nextAttemptAt.getTime() - now.getTime()).toBe(BACKOFF_CAP_MS)
	})
})

describe('backoffOnSuccess', () => {
	it('resets attempts, stamps lastSuccessAt and clears nextAttemptAt', () => {
		const now = new Date('2026-08-06T12:00:00Z')
		expect(backoffOnSuccess(now)).toEqual({
			attempts: 0,
			lastSuccessAt: now,
			nextAttemptAt: null,
		})
	})
})

describe('inBackoff', () => {
	const now = new Date('2026-08-06T12:00:00Z')
	const future = new Date(now.getTime() + 60_000)
	const past = new Date(now.getTime() - 1)

	it('skips while attempts > 0 and nextAttemptAt is in the future', () => {
		expect(inBackoff({ attempts: 2, nextAttemptAt: future }, now)).toBe(true)
	})

	it('polls once the window has passed', () => {
		expect(inBackoff({ attempts: 2, nextAttemptAt: past }, now)).toBe(false)
	})

	it('polls immediately after a credential re-save resets attempts to 0', () => {
		// Re-save resets attempts but does not clear nextAttemptAt.
		expect(inBackoff({ attempts: 0, nextAttemptAt: future }, now)).toBe(false)
		expect(inBackoff({ attempts: null, nextAttemptAt: future }, now)).toBe(
			false,
		)
	})

	it('polls when no backoff was ever recorded', () => {
		expect(inBackoff({ attempts: 1, nextAttemptAt: null }, now)).toBe(false)
	})
})

describe('createDrainController', () => {
	it('starts not draining and flips permanently on requestDrain', () => {
		const drain = createDrainController()
		expect(drain.isDraining()).toBe(false)
		drain.requestDrain()
		expect(drain.isDraining()).toBe(true)
		drain.requestDrain() // idempotent
		expect(drain.isDraining()).toBe(true)
	})

	it('sleep waits the full duration when no drain is requested', async () => {
		vi.useFakeTimers()
		try {
			const drain = createDrainController()
			let resolved = false
			void drain.sleep(10_000).then(() => {
				resolved = true
			})
			await vi.advanceTimersByTimeAsync(9_999)
			expect(resolved).toBe(false)
			await vi.advanceTimersByTimeAsync(1)
			expect(resolved).toBe(true)
		} finally {
			vi.useRealTimers()
		}
	})

	it('sleep resolves early the moment a drain is requested', async () => {
		vi.useFakeTimers()
		try {
			const drain = createDrainController()
			let resolved = false
			void drain.sleep(60_000).then(() => {
				resolved = true
			})
			await vi.advanceTimersByTimeAsync(1_000)
			expect(resolved).toBe(false)
			drain.requestDrain()
			await vi.advanceTimersByTimeAsync(0)
			expect(resolved).toBe(true)
		} finally {
			vi.useRealTimers()
		}
	})

	it('sleep after a drain resolves immediately', async () => {
		const drain = createDrainController()
		drain.requestDrain()
		await expect(drain.sleep(60_000)).resolves.toBeUndefined()
	})
})

describe('shouldRunDirector', () => {
	const INTERVAL = 10 * 60_000
	const now = Date.parse('2026-08-06T12:00:00Z')

	it('runs when the device has never had a director run', () => {
		expect(shouldRunDirector(null, now, INTERVAL)).toBe(true)
		expect(shouldRunDirector(undefined, now, INTERVAL)).toBe(true)
	})

	it('skips while the newest run is younger than the interval', () => {
		expect(shouldRunDirector(new Date(now - INTERVAL + 1), now, INTERVAL)).toBe(
			false,
		)
		expect(shouldRunDirector(new Date(now - 1_000), now, INTERVAL)).toBe(false)
	})

	it('runs once the newest run is at least one interval old', () => {
		expect(shouldRunDirector(new Date(now - INTERVAL), now, INTERVAL)).toBe(
			true,
		)
		expect(shouldRunDirector(new Date(now - INTERVAL * 5), now, INTERVAL)).toBe(
			true,
		)
	})
})

describe('countsAsRealDeviceOnline', () => {
	it('counts a real device reporting Online (any casing)', () => {
		expect(
			countsAsRealDeviceOnline({
				isSimulated: false,
				connectionStatus: 'Online',
			}),
		).toBe(true)
		expect(
			countsAsRealDeviceOnline({
				isSimulated: null,
				connectionStatus: 'online',
			}),
		).toBe(true)
	})

	it('NEVER counts simulated devices — they always report Online', () => {
		expect(
			countsAsRealDeviceOnline({
				isSimulated: true,
				connectionStatus: 'Online',
			}),
		).toBe(false)
	})

	it('does not count offline or unknown real devices', () => {
		expect(
			countsAsRealDeviceOnline({
				isSimulated: false,
				connectionStatus: 'Offline',
			}),
		).toBe(false)
		expect(
			countsAsRealDeviceOnline({ isSimulated: false, connectionStatus: null }),
		).toBe(false)
		expect(
			countsAsRealDeviceOnline({
				isSimulated: false,
				connectionStatus: 'unknown',
			}),
		).toBe(false)
	})
})

describe('resolveWorkerGeneration', () => {
	it('prefers an explicit POWER_GENERATION env without touching the row', async () => {
		const readRow = vi.fn()
		await expect(
			resolveWorkerGeneration(
				{ POWER_GENERATION: '7', POWER_TABLE: 'pitminder-power' },
				readRow,
			),
		).resolves.toBe(7)
		expect(readRow).not.toHaveBeenCalled()
	})

	it('returns null for a garbage explicit POWER_GENERATION (never guesses)', async () => {
		const readRow = vi.fn()
		await expect(
			resolveWorkerGeneration(
				{ POWER_GENERATION: 'banana', POWER_TABLE: 'pitminder-power' },
				readRow,
			),
		).resolves.toBeNull()
		expect(readRow).not.toHaveBeenCalled()
	})

	it('skips the lookup entirely when POWER_TABLE is unset (Railway/local)', async () => {
		const readRow = vi.fn()
		await expect(resolveWorkerGeneration({}, readRow)).resolves.toBeNull()
		expect(readRow).not.toHaveBeenCalled()
	})

	it('reads the row generation when POWER_TABLE is set', async () => {
		await expect(
			resolveWorkerGeneration(
				{ POWER_TABLE: 'pitminder-power' },
				async () => 3,
			),
		).resolves.toBe(3)
	})

	it('returns null when the row is unreadable or has no numeric generation', async () => {
		await expect(
			resolveWorkerGeneration(
				{ POWER_TABLE: 'pitminder-power' },
				async () => null,
			),
		).resolves.toBeNull()
		await expect(
			resolveWorkerGeneration({ POWER_TABLE: 'pitminder-power' }, async () => {
				throw new Error('ddb down')
			}),
		).resolves.toBeNull()
	})
})
