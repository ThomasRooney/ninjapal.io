/**
 * Offline session-cookie verification for the wake path.
 *
 * Sessions live in Postgres, so while the stack is asleep (RDS stopped)
 * `auth.api.getSession` cannot run — yet /api/wake must still be
 * authenticated. better-auth signs its session-token cookie as
 * `${token}.${base64(HMAC-SHA256(secret, token))}` (better-call
 * signCookieValue), so we can verify the cookie was minted by us without
 * touching the database. Bounded risk, accepted by the architecture: a
 * revoked-but-unexpired cookie can start the stack; it still cannot read
 * any data once awake.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getSessionCookie } from 'better-auth/cookies'

export function verifySessionCookieSignature(
	headers: Headers,
	secret: string | undefined = process.env.BETTER_AUTH_SECRET,
): boolean {
	if (!secret) return false
	// getSessionCookie handles the better-auth./__Secure- name variants and
	// URI-decodes the value.
	const raw = getSessionCookie(headers)
	if (!raw) return false
	const dot = raw.lastIndexOf('.')
	if (dot <= 0 || dot === raw.length - 1) return false
	const token = raw.slice(0, dot)
	const signature = raw.slice(dot + 1)
	const expected = createHmac('sha256', secret).update(token).digest()
	let presented: Buffer
	try {
		presented = Buffer.from(signature, 'base64')
	} catch {
		return false
	}
	return (
		presented.length === expected.length && timingSafeEqual(presented, expected)
	)
}
