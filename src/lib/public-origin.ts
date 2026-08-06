/**
 * Canonical public origin for issuer/resource metadata.
 *
 * Behind CloudFront + API Gateway the Lambda sees the gateway's host in
 * request.url, so anything that derives OAuth issuer / resource metadata
 * from the request would advertise the wrong origin. `PUBLIC_ORIGIN`
 * (e.g. https://app.pitminder.com) pins it; when unset (Vercel, local dev)
 * behavior falls back to the request's own origin exactly as before.
 */

/** PUBLIC_ORIGIN env, normalized (no trailing slash), or null when unset. */
export function publicOriginEnv(): string | null {
	const raw = process.env.PUBLIC_ORIGIN
	if (!raw) return null
	const trimmed = raw.trim().replace(/\/+$/, '')
	if (!trimmed) return null
	try {
		// Validate + canonicalize (lowercases host, drops default ports).
		return new URL(trimmed).origin
	} catch {
		return null
	}
}

/**
 * Origin to advertise in issuer/resource metadata for this request:
 * PUBLIC_ORIGIN when configured, otherwise the request's own origin.
 */
export function getPublicOrigin(request: Request): string {
	return publicOriginEnv() ?? new URL(request.url).origin
}

/**
 * Returns a request whose URL origin is rewritten to PUBLIC_ORIGIN (when
 * set) so downstream handlers that derive metadata from request.url see
 * the canonical origin. Unconfigured → the original request, untouched.
 */
export function withPublicOrigin(request: Request): Request {
	const origin = publicOriginEnv()
	if (!origin) return request
	const url = new URL(request.url)
	const pub = new URL(origin)
	if (url.protocol === pub.protocol && url.host === pub.host) return request
	url.protocol = pub.protocol
	url.host = pub.host
	// Body is irrelevant for the GET metadata handlers this wraps; keep
	// method + headers so cookie/accept negotiation behaves identically.
	return new Request(url, {
		method: request.method,
		headers: request.headers,
	})
}
