import { createFileRoute } from '@tanstack/react-router'

/**
 * Visible-tab activity beacon target (infra/aws/ARCHITECTURE.md): the
 * dashboard pings this every 5 minutes while visible so the scale-to-zero
 * idle cron sees `lastWebAt` move. Session-authenticated — anonymous pings
 * must not keep the stack awake. No-op when POWER_TABLE is unset.
 */
export const Route = createFileRoute('/api/activity')({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const [{ auth }, { stampWebActivity }] = await Promise.all([
					import('@/lib/auth'),
					import('@/server/power/activity'),
				])
				const session = await auth.api.getSession({ headers: request.headers })
				if (!session?.user) {
					return new Response('Unauthorized', { status: 401 })
				}
				await stampWebActivity(session.user.id)
				return new Response(null, {
					status: 204,
					headers: { 'Cache-Control': 'no-store' },
				})
			},
		},
	},
})
