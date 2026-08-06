import { createLogger } from '@/lib/log'
import { getPublicOrigin } from '@/lib/public-origin'
import { createFileRoute } from '@tanstack/react-router'

const log = createLogger('mcp-auth')

/** Stable cache key so the local JWKS fetch is cached between verifications. */
const jwksCacheKey = {}

function resourceMetadataUrl(request: Request): string {
	// PUBLIC_ORIGIN wins behind CloudFront; falls back to the request origin.
	return `${getPublicOrigin(request)}/.well-known/oauth-protected-resource/api/mcp`
}

function unauthorized(request: Request, opts?: { invalidToken?: boolean }) {
	const parts = [
		...(opts?.invalidToken ? ['error="invalid_token"'] : []),
		`resource_metadata="${resourceMetadataUrl(request)}"`,
	]
	return new Response('Unauthorized', {
		status: 401,
		headers: { 'WWW-Authenticate': `Bearer ${parts.join(', ')}` },
	})
}

/**
 * Retryable "stack is waking" answer for authenticated-but-asleep callers:
 * 503 + Retry-After for transport-level retry, with a JSON-RPC error body
 * for clients that surface it to the model instead.
 */
async function warmingResponse(request: Request): Promise<Response> {
	let id: string | number | null = null
	try {
		const body = (await request.json()) as { id?: string | number }
		if (body && typeof body === 'object') id = body.id ?? null
	} catch {
		// no parseable body — null id is fine for an error response
	}
	return Response.json(
		{
			jsonrpc: '2.0',
			id,
			error: {
				code: -32001,
				message:
					'PitMinder is waking from scale-to-zero sleep (takes 6-8 minutes from cold) — retry shortly.',
			},
		},
		{
			status: 503,
			headers: { 'Retry-After': '15', 'Cache-Control': 'no-store' },
		},
	)
}

/**
 * PitMinder MCP over streamable HTTP (stateless: one server instance per
 * request, scoped to the authenticated user).
 *
 * Auth is fail-closed:
 *  - Authorization header present → it MUST be a Bearer JWT that verifies
 *    against our JWKS with the exact issuer + audience. Any failure is 401.
 *    A request that sent a Bearer NEVER falls back to the session cookie.
 *  - No Authorization header → better-auth session cookie (full scopes).
 *  - Neither → 401 with WWW-Authenticate pointing at the RFC 9728 metadata.
 *
 * Scale-to-zero (infra/aws/ARCHITECTURE.md): a valid MCP credential must be
 * able to WAKE the sleeping stack even though better-auth's JWKS and
 * sessions live in the stopped Postgres. Every awake-path JWKS read is
 * mirrored (public keys only) onto the DynamoDB power row; when the DB
 * probe fails, bearers verify against that mirror and cookie callers fall
 * back to the offline wake grant — either requests a wake and answers with
 * a retryable warming response. Bootstrap constraint: before the first
 * awake-time mirror, offline bearer verification is impossible (warming
 * response without a wake).
 */
export const Route = createFileRoute('/api/mcp')({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const [authMod, { createPitMinderMcpServer }, { InMemoryTransport }] =
					await Promise.all([
						import('@/lib/auth'),
						import('@/server/mcp/pitminder-server'),
						import('@modelcontextprotocol/sdk/inMemory.js'),
					])
				const { auth, getAuthIssuer, MCP_RESOURCE, MCP_SCOPES } = authMod

				let userId: string
				let scopes: Set<string>

				const authorization = request.headers.get('authorization')
				if (authorization !== null) {
					// Bearer path — a presented credential must verify; no fallback.
					const [scheme, token, ...rest] = authorization.split(' ')
					if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) {
						log.warn('rejected: malformed Authorization header')
						return unauthorized(request, { invalidToken: true })
					}
					const verifyOptions = {
						// Exact single audience — see the validAudiences invariant
						// in src/lib/auth.ts (GHSA-p2fr-6hmx-4528).
						audience: MCP_RESOURCE,
						issuer: getAuthIssuer(),
					}
					try {
						const { verifyJwsAccessToken } = await import('better-auth/oauth2')
						const payload = await verifyJwsAccessToken(token, {
							jwksFetch: async () => {
								const jwks = (await auth.api.getJwks()) as {
									keys: JsonWebKey[]
								}
								// Awake-path mirror (throttled): the sleeping stack can
								// only verify wake bearers against this copy.
								const { mirrorJwks } = await import('@/server/power/jwks-cache')
								await mirrorJwks(jwks)
								return jwks
							},
							jwksCacheKey,
							verifyOptions,
						})
						if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
							throw new Error('token has no sub claim')
						}
						userId = payload.sub
						scopes = new Set(
							typeof payload.scope === 'string'
								? payload.scope.split(' ').filter(Boolean)
								: [],
						)
						log.info('bearer auth ok', {
							sub: userId,
							scopes: [...scopes],
							client: payload.azp,
						})
					} catch (error) {
						// Bad token OR unreachable DB (sleeping stack) — only the
						// probe can tell them apart.
						const { probeDb } = await import('@/server/db/probe')
						if (!(await probeDb())) {
							const [{ readMirroredJwks }, { requestWake }] = await Promise.all(
								[
									import('@/server/power/jwks-cache'),
									import('@/server/power/power-row'),
								],
							)
							const mirrored = await readMirroredJwks()
							if (mirrored) {
								try {
									const { verifyJwsAccessToken } = await import(
										'better-auth/oauth2'
									)
									const payload = await verifyJwsAccessToken(token, {
										jwksFetch: async () => mirrored,
										verifyOptions,
									})
									if (
										typeof payload.sub === 'string' &&
										payload.sub.length > 0
									) {
										await requestWake(payload.sub)
										log.info('valid bearer while asleep — wake requested', {
											sub: payload.sub,
										})
										return warmingResponse(request)
									}
								} catch (offlineError) {
									log.warn('offline bearer verification failed', {
										reason:
											offlineError instanceof Error
												? offlineError.message
												: String(offlineError),
									})
								}
								return unauthorized(request, { invalidToken: true })
							}
							// Bootstrap: DB down and nothing mirrored yet — cannot
							// verify, therefore cannot wake. Retryable, not a 401.
							log.warn(
								'DB down and no mirrored JWKS — cannot verify bearer (bootstrap constraint)',
							)
							return warmingResponse(request)
						}
						log.warn('rejected: bearer verification failed', {
							reason: error instanceof Error ? error.message : String(error),
						})
						return unauthorized(request, { invalidToken: true })
					}
				} else {
					// Cookie path — session lookup, with the offline wake grant as
					// the DB-down fallback.
					try {
						const session = await auth.api.getSession({
							headers: request.headers,
						})
						if (!session?.user) {
							log.info('rejected: no credentials')
							return unauthorized(request)
						}
						userId = session.user.id
						scopes = new Set(MCP_SCOPES)
						log.info('cookie auth ok', { sub: userId })
					} catch (error) {
						const { probeDb } = await import('@/server/db/probe')
						if (await probeDb()) throw error
						const [{ verifyWakeGrantCookie }, { requestWake }] =
							await Promise.all([
								import('@/server/power/wake-grant'),
								import('@/server/power/power-row'),
							])
						const grant = verifyWakeGrantCookie(request.headers.get('cookie'))
						if (!grant) {
							log.info('rejected: DB down and no wake grant')
							return unauthorized(request)
						}
						await requestWake(grant.sub)
						log.info('valid wake grant while asleep — wake requested', {
							sub: grant.sub,
						})
						return warmingResponse(request)
					}
				}

				// Authenticated but the stack is not AWAKE (e.g. warm-cached JWKS
				// verified the bearer while the DB is already stopped): wake and
				// answer retryably instead of running tools into a dead database.
				const { powerConfig, readPowerRow, requestWake } = await import(
					'@/server/power/power-row'
				)
				if (powerConfig()) {
					const row = await readPowerRow()
					const state = row?.state ?? null
					if (state !== null && state !== 'AWAKE') {
						await requestWake(userId)
						return warmingResponse(request)
					}
				}

				// A valid MCP credential counts as web activity for the
				// scale-to-zero idle signal (ARCHITECTURE.md). No-op off AWS.
				const { stampWebActivity } = await import('@/server/power/activity')
				await stampWebActivity(userId)

				// Stateless streamable HTTP: one JSON-RPC message in, one JSON
				// response out, bridged over an in-memory transport pair.
				// (fetch-to-node + StreamableHTTPServerTransport double-closes its
				// response stream on current Node and kills the process — avoided.)
				let body: unknown
				try {
					body = await request.json()
				} catch {
					return new Response('Bad Request', { status: 400 })
				}
				if (typeof body !== 'object' || body === null || Array.isArray(body)) {
					return new Response('Bad Request', { status: 400 })
				}
				const message = body as {
					jsonrpc?: string
					id?: string | number
					method?: string
				}

				const server = createPitMinderMcpServer(userId, { scopes })
				const [clientTransport, serverTransport] =
					InMemoryTransport.createLinkedPair()
				await server.connect(serverTransport)
				const close = async () => {
					await clientTransport.close().catch(() => {})
					await server.close().catch(() => {})
				}

				// Notifications / client responses expect no reply → 202 (spec MUST)
				if (message.method === undefined || message.id === undefined) {
					// biome-ignore lint/suspicious/noExplicitAny: raw JSON-RPC boundary
					await clientTransport.send(message as any).catch(() => {})
					await close()
					return new Response(null, { status: 202 })
				}

				try {
					const response = await new Promise<unknown>((resolve, reject) => {
						const timer = setTimeout(
							() => reject(new Error('MCP request timed out')),
							30_000,
						)
						clientTransport.onmessage = (msg) => {
							const m = msg as { id?: string | number; method?: string }
							// The reply to our request carries the same id and no method
							if (m.method === undefined && m.id === message.id) {
								clearTimeout(timer)
								resolve(msg)
							}
						}
						clientTransport.onerror = (err) => {
							clearTimeout(timer)
							reject(err)
						}
						// biome-ignore lint/suspicious/noExplicitAny: raw JSON-RPC boundary
						clientTransport.send(message as any).catch(reject)
					})
					return Response.json(response)
				} catch (error) {
					log.error('mcp request failed', {
						reason: error instanceof Error ? error.message : String(error),
					})
					return Response.json(
						{
							jsonrpc: '2.0',
							id: message.id,
							error: { code: -32603, message: 'Internal error' },
						},
						{ status: 500 },
					)
				} finally {
					await close()
				}
			},
			GET: async () =>
				new Response('Method Not Allowed', {
					status: 405,
					headers: { Allow: 'POST' },
				}),
		},
	},
})
