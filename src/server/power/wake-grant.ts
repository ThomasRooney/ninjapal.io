/**
 * Wake grant — the offline credential for /api/wake and the cold-start
 * shell (infra/aws/ARCHITECTURE.md).
 *
 * Sessions live in Postgres, so nothing DB-backed can authenticate a wake
 * while the stack is asleep. Instead: whenever a session IS validated with
 * the database up, we mint a dedicated HMAC-signed grant cookie
 * `{sub, iat, exp≤7d}`. Waking verifies signature + expiry offline. Unlike
 * verifying the raw session cookie (which never expires and would let a
 * revoked user wake the stack forever), the grant self-expires within 7
 * days of the last real session validation, and wake writes are further
 * rate-limited DDB-side (see requestWake).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export const WAKE_GRANT_COOKIE = 'pitminder_wake_grant'
export const WAKE_GRANT_TTL_MS = 7 * 24 * 3_600_000
/** Re-mint once a day so an active user's grant never nears expiry. */
export const WAKE_GRANT_REFRESH_AFTER_MS = 24 * 3_600_000

export interface WakeGrant {
	sub: string
	iat: number
	exp: number
}

function signPayload(payload: string, secret: string): string {
	return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** Mints a signed grant value for the cookie; null without a secret. */
export function mintWakeGrant(
	sub: string,
	secret: string | undefined = process.env.BETTER_AUTH_SECRET,
	nowMs: number = Date.now(),
): string | null {
	if (!secret || !sub) return null
	const payload = Buffer.from(
		JSON.stringify({ sub, iat: nowMs, exp: nowMs + WAKE_GRANT_TTL_MS }),
	).toString('base64url')
	return `${payload}.${signPayload(payload, secret)}`
}

/** Parses + verifies a grant value (signature, shape, expiry). */
export function verifyWakeGrantValue(
	value: string | null | undefined,
	secret: string | undefined = process.env.BETTER_AUTH_SECRET,
	nowMs: number = Date.now(),
): WakeGrant | null {
	if (!secret || !value) return null
	const dot = value.lastIndexOf('.')
	if (dot <= 0 || dot === value.length - 1) return null
	const payload = value.slice(0, dot)
	const signature = value.slice(dot + 1)
	const expected = Buffer.from(signPayload(payload, secret))
	const presented = Buffer.from(signature)
	if (
		presented.length !== expected.length ||
		!timingSafeEqual(presented, expected)
	) {
		return null
	}
	let grant: unknown
	try {
		grant = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
	} catch {
		return null
	}
	if (typeof grant !== 'object' || grant === null) return null
	const { sub, iat, exp } = grant as Record<string, unknown>
	if (typeof sub !== 'string' || sub.length === 0) return null
	if (typeof iat !== 'number' || typeof exp !== 'number') return null
	if (exp <= nowMs) return null
	// Reject grants claiming a longer life than we ever mint (forged exp
	// with a stolen key is out of scope, but clock-skewed junk is not).
	if (exp - iat > WAKE_GRANT_TTL_MS) return null
	return { sub, iat, exp }
}

/** Extracts + verifies the grant from a Cookie header. */
export function verifyWakeGrantCookie(
	cookieHeader: string | null | undefined,
	secret: string | undefined = process.env.BETTER_AUTH_SECRET,
	nowMs: number = Date.now(),
): WakeGrant | null {
	if (!cookieHeader) return null
	for (const part of cookieHeader.split(';')) {
		const eq = part.indexOf('=')
		if (eq < 0) continue
		if (part.slice(0, eq).trim() !== WAKE_GRANT_COOKIE) continue
		let value = part.slice(eq + 1).trim()
		try {
			value = decodeURIComponent(value)
		} catch {
			// not URI-encoded — use as-is
		}
		return verifyWakeGrantValue(value, secret, nowMs)
	}
	return null
}

/**
 * Whether the request should get a fresh grant: absent/invalid, or minted
 * more than a day ago. Called only after a real session validation.
 */
export function shouldRefreshWakeGrant(
	cookieHeader: string | null | undefined,
	secret: string | undefined = process.env.BETTER_AUTH_SECRET,
	nowMs: number = Date.now(),
): boolean {
	const grant = verifyWakeGrantCookie(cookieHeader, secret, nowMs)
	if (!grant) return true
	return nowMs - grant.iat >= WAKE_GRANT_REFRESH_AFTER_MS
}
