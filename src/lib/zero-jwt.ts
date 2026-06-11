import { SignJWT, jwtVerify } from 'jose'

/**
 * Zero auth tokens: HS256 JWTs signed with ZERO_AUTH_SECRET — the same
 * secret zero-cache validates with (ZERO_AUTH_SECRET env on the cache).
 */

function getSecret(): Uint8Array {
	const secret = process.env.ZERO_AUTH_SECRET
	if (!secret) {
		throw new Error('ZERO_AUTH_SECRET environment variable is not set')
	}
	return new TextEncoder().encode(secret)
}

export async function signZeroToken(user: {
	id: string
	email: string
	name: string
}): Promise<string> {
	return await new SignJWT({ email: user.email, name: user.name })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(user.id)
		.setIssuedAt()
		.setExpirationTime('24h')
		.sign(getSecret())
}

/** Verifies a Zero JWT and returns its subject (user id), or null. */
export async function verifyZeroToken(token: string): Promise<string | null> {
	try {
		const { payload } = await jwtVerify(token, getSecret(), {
			algorithms: ['HS256'],
		})
		return payload.sub ?? null
	} catch {
		return null
	}
}
