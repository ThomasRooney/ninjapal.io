import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	WAKE_GRANT_COOKIE,
	WAKE_GRANT_REFRESH_AFTER_MS,
	WAKE_GRANT_TTL_MS,
	mintWakeGrant,
	shouldRefreshWakeGrant,
	verifyWakeGrantCookie,
	verifyWakeGrantValue,
} from './wake-grant'

const SECRET = 'test-wake-secret'
const NOW = Date.parse('2026-08-06T12:00:00Z')

beforeEach(() => {
	vi.useRealTimers()
})

describe('mint + verify round-trip', () => {
	it('verifies a freshly minted grant', () => {
		const value = mintWakeGrant('user-1', SECRET, NOW)
		expect(value).not.toBeNull()
		const grant = verifyWakeGrantValue(value, SECRET, NOW + 1000)
		expect(grant).toEqual({
			sub: 'user-1',
			iat: NOW,
			exp: NOW + WAKE_GRANT_TTL_MS,
		})
	})

	it('expires after 7 days — a revoked user cannot wake forever', () => {
		const value = mintWakeGrant('user-1', SECRET, NOW)
		expect(
			verifyWakeGrantValue(value, SECRET, NOW + WAKE_GRANT_TTL_MS + 1),
		).toBeNull()
	})

	it('rejects a tampered payload', () => {
		const value = mintWakeGrant('user-1', SECRET, NOW) as string
		const [payload, signature] = value.split('.')
		const forged = `${Buffer.from(
			JSON.stringify({
				sub: 'attacker',
				iat: NOW,
				exp: NOW + WAKE_GRANT_TTL_MS,
			}),
		).toString('base64url')}.${signature}`
		expect(verifyWakeGrantValue(forged, SECRET, NOW)).toBeNull()
		expect(payload).not.toBe(forged.split('.')[0])
	})

	it('rejects a grant signed with another secret', () => {
		const value = mintWakeGrant('user-1', 'other-secret', NOW)
		expect(verifyWakeGrantValue(value, SECRET, NOW)).toBeNull()
	})

	it('rejects grants claiming a longer life than we ever mint', () => {
		// Hand-craft a payload with exp far beyond iat + TTL, signed correctly.
		const payload = Buffer.from(
			JSON.stringify({
				sub: 'user-1',
				iat: NOW,
				exp: NOW + WAKE_GRANT_TTL_MS * 10,
			}),
		).toString('base64url')
		const signature = createHmac('sha256', SECRET)
			.update(payload)
			.digest('base64url')
		expect(
			verifyWakeGrantValue(`${payload}.${signature}`, SECRET, NOW),
		).toBeNull()
	})

	it('returns null without a secret', () => {
		// Explicit undefined falls back to BETTER_AUTH_SECRET — blank it out.
		vi.stubEnv('BETTER_AUTH_SECRET', '')
		try {
			expect(mintWakeGrant('user-1')).toBeNull()
			const value = mintWakeGrant('user-1', SECRET, NOW)
			expect(verifyWakeGrantValue(value, undefined, NOW)).toBeNull()
		} finally {
			vi.unstubAllEnvs()
		}
	})
})

describe('verifyWakeGrantCookie', () => {
	it('extracts the grant from a Cookie header', () => {
		const value = mintWakeGrant('user-1', SECRET, NOW) as string
		const header = `other=1; ${WAKE_GRANT_COOKIE}=${value}; foo=bar`
		expect(verifyWakeGrantCookie(header, SECRET, NOW)?.sub).toBe('user-1')
	})

	it('is null when the cookie is absent or the header empty', () => {
		expect(verifyWakeGrantCookie('other=1', SECRET, NOW)).toBeNull()
		expect(verifyWakeGrantCookie(null, SECRET, NOW)).toBeNull()
	})
})

describe('shouldRefreshWakeGrant', () => {
	it('refreshes when absent or invalid', () => {
		expect(shouldRefreshWakeGrant(null, SECRET, NOW)).toBe(true)
		expect(
			shouldRefreshWakeGrant(`${WAKE_GRANT_COOKIE}=garbage`, SECRET, NOW),
		).toBe(true)
	})

	it('keeps a fresh grant, refreshes a day-old one', () => {
		const value = mintWakeGrant('user-1', SECRET, NOW) as string
		const header = `${WAKE_GRANT_COOKIE}=${value}`
		expect(shouldRefreshWakeGrant(header, SECRET, NOW + 60_000)).toBe(false)
		expect(
			shouldRefreshWakeGrant(
				header,
				SECRET,
				NOW + WAKE_GRANT_REFRESH_AFTER_MS + 1,
			),
		).toBe(true)
	})
})
