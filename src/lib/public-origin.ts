/**
 * Canonical public origin for issuer/resource metadata.
 *
 * Behind CloudFront + API Gateway the Lambda sees the gateway's host in
 * request.url, so anything that derives OAuth issuer / resource metadata
 * from the request would advertise the wrong origin. `PUBLIC_ORIGIN`
 * (e.g. https://app.pitminder.com) pins it; when unset (Vercel, local dev)
 * behavior falls back to the request's own origin exactly as before.
 */

/**
 * PUBLIC_ORIGIN env, normalized (no trailing slash), or null when unset.
 * Configured-but-INVALID throws: silently falling back to request-derived
 * origins would advertise a wrong OAuth issuer in production — better to
 * die at startup (this is evaluated at module load via MCP_RESOURCE).
 */
export function publicOriginEnv(): string | null {
	const raw = process.env.PUBLIC_ORIGIN
	if (!raw || !raw.trim()) return null
	const trimmed = raw.trim().replace(/\/+$/, '')
	let origin: string
	try {
		// Canonicalize (lowercases host, drops default ports).
		origin = new URL(trimmed).origin
	} catch {
		throw new Error(
			`PUBLIC_ORIGIN is set but is not a valid URL: ${JSON.stringify(raw)}`,
		)
	}
	if (origin === 'null') {
		throw new Error(
			`PUBLIC_ORIGIN is set but has no usable origin: ${JSON.stringify(raw)}`,
		)
	}
	return origin
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
