import { createFileRoute } from '@tanstack/react-router'

/**
 * Wake request for the scale-to-zero stack (infra/aws/ARCHITECTURE.md):
 * writes desiredState=AWAKE + wakeRequestedAt to the power row; the
 * orchestrator does the actual waking. Auth required — but sessions live in
 * Postgres, which is exactly what's asleep, so when getSession cannot reach
 * the DB we fall back to offline HMAC verification of the session cookie.
 * No-op (200, configured:false) when POWER_TABLE is unset.
 */
export const Route = createFileRoute('/api/wake')({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const [
					{ auth },
					{ powerConfig, requestWake },
					{ verifySessionCookieSignature },
					{ probeDb },
				] = await Promise.all([
					import('@/lib/auth'),
					import('@/server/power/power-row'),
					import('@/server/power/session-cookie'),
					import('@/server/db/probe'),
				])

				let userId: string | null = null
				let authed = false
				try {
					const session = await auth.api.getSession({
						headers: request.headers,
					})
					if (session?.user) {
						authed = true
						userId = session.user.id
					}
				} catch {
					// DB unreachable — the case wake exists for. Verified below.
				}
				if (!authed && verifySessionCookieSignature(request.headers)) {
					// A signed cookie only substitutes for a session lookup while
					// the DB is actually down; with a healthy DB, getSession is
					// authoritative (revocation must keep working).
					authed = !(await probeDb())
				}
				if (!authed) {
					return new Response('Unauthorized', {
						status: 401,
						headers: { 'Cache-Control': 'no-store' },
					})
				}

				if (!powerConfig()) {
					return Response.json(
						{ ok: true, configured: false },
						{ headers: { 'Cache-Control': 'no-store' } },
					)
				}
				const ok = await requestWake(userId ?? 'session-cookie')
				return Response.json(
					{ ok, configured: true },
					{ headers: { 'Cache-Control': 'no-store' } },
				)
			},
		},
	},
})
