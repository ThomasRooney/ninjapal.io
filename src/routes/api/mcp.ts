import { createLogger } from '@/lib/log'
import { createFileRoute } from '@tanstack/react-router'

const log = createLogger('mcp-auth')

/** Stable cache key so the local JWKS fetch is cached between verifications. */
const jwksCacheKey = {}

function resourceMetadataUrl(request: Request): string {
	return `${new URL(request.url).origin}/.well-known/oauth-protected-resource/api/mcp`
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
 * PitMinder MCP over streamable HTTP (stateless: one server instance per
 * request, scoped to the authenticated user).
 *
 * Auth is fail-closed:
 *  - Authorization header present → it MUST be a Bearer JWT that verifies
 *    against our JWKS with the exact issuer + audience. Any failure is 401.
 *    A request that sent a Bearer NEVER falls back to the session cookie.
 *  - No Authorization header → better-auth session cookie (full scopes).
 *  - Neither → 401 with WWW-Authenticate pointing at the RFC 9728 metadata.
 */
export const Route = createFileRoute('/api/mcp')({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const [
					authMod,
					{ createPitMinderMcpServer },
					{ StreamableHTTPServerTransport },
					{ toFetchResponse, toReqRes },
				] = await Promise.all([
					import('@/lib/auth'),
					import('@/server/mcp/pitminder-server'),
					import('@modelcontextprotocol/sdk/server/streamableHttp.js'),
					import('fetch-to-node'),
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
					try {
						const { verifyJwsAccessToken } = await import('better-auth/oauth2')
						const payload = await verifyJwsAccessToken(token, {
							jwksFetch: async () => {
								const jwks = await auth.api.getJwks()
								return jwks as { keys: JsonWebKey[] }
							},
							jwksCacheKey,
							verifyOptions: {
								// Exact single audience — see the validAudiences invariant
								// in src/lib/auth.ts (GHSA-p2fr-6hmx-4528).
								audience: MCP_RESOURCE,
								issuer: getAuthIssuer(),
							},
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
						log.warn('rejected: bearer verification failed', {
							reason: error instanceof Error ? error.message : String(error),
						})
						return unauthorized(request, { invalidToken: true })
					}
				} else {
					// Cookie path — unchanged behaviour for the in-app session.
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
				}

				const { req, res } = toReqRes(request)
				const server = createPitMinderMcpServer(userId, scopes)
				const transport = new StreamableHTTPServerTransport({
					sessionIdGenerator: undefined, // stateless
				})
				await server.connect(transport)
				await transport.handleRequest(req, res, await request.json())
				res.on('close', () => {
					transport.close()
					server.close()
				})
				return toFetchResponse(res)
			},
			GET: async () =>
				new Response('Method Not Allowed', {
					status: 405,
					headers: { Allow: 'POST' },
				}),
		},
	},
})
