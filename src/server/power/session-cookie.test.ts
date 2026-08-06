import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifySessionCookieSignature } from './session-cookie'

const SECRET = 'test-better-auth-secret'

/** Mirrors better-call signCookieValue: `${value}.${base64 hmac}`, URI-encoded. */
function signedCookieValue(token: string, secret: string): string {
	const signature = createHmac('sha256', secret).update(token).digest('base64')
	return encodeURIComponent(`${token}.${signature}`)
}

function headersWithCookie(cookie: string): Headers {
	return new Headers({ cookie })
}

describe('verifySessionCookieSignature', () => {
	it('accepts a cookie signed with the configured secret', () => {
		const value = signedCookieValue('session-token-123', SECRET)
		const headers = headersWithCookie(`better-auth.session_token=${value}`)
		expect(verifySessionCookieSignature(headers, SECRET)).toBe(true)
	})

	it('accepts the __Secure- prefixed production cookie name', () => {
		const value = signedCookieValue('prod-token', SECRET)
		const headers = headersWithCookie(
			`__Secure-better-auth.session_token=${value}`,
		)
		expect(verifySessionCookieSignature(headers, SECRET)).toBe(true)
	})

	it('rejects a tampered token', () => {
		const value = signedCookieValue('session-token-123', SECRET)
		const [token, signature] = decodeURIComponent(value).split('.')
		const forged = encodeURIComponent(`${token}x.${signature}`)
		const headers = headersWithCookie(`better-auth.session_token=${forged}`)
		expect(verifySessionCookieSignature(headers, SECRET)).toBe(false)
	})

	it('rejects a cookie signed with a different secret', () => {
		const value = signedCookieValue('session-token-123', 'other-secret')
		const headers = headersWithCookie(`better-auth.session_token=${value}`)
		expect(verifySessionCookieSignature(headers, SECRET)).toBe(false)
	})

	it('rejects when the cookie is absent', () => {
		expect(
			verifySessionCookieSignature(headersWithCookie('unrelated=1'), SECRET),
		).toBe(false)
	})

	it('rejects an unsigned bare token', () => {
		const headers = headersWithCookie('better-auth.session_token=raw-token')
		expect(verifySessionCookieSignature(headers, SECRET)).toBe(false)
	})

	it('rejects everything when no secret is configured', () => {
		const value = signedCookieValue('session-token-123', SECRET)
		const headers = headersWithCookie(`better-auth.session_token=${value}`)
		expect(verifySessionCookieSignature(headers, undefined)).toBe(false)
	})
})
