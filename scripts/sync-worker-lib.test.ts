import { describe, expect, it } from 'vitest'
import {
	assertSafeUpstream,
	BACKOFF_CAP_MS,
	backoffDelayMs,
	backoffOnFailure,
	backoffOnSuccess,
	inBackoff,
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
