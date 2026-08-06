import { createFileRoute } from '@tanstack/react-router'

/**
 * Wake request for the scale-to-zero stack (infra/aws/ARCHITECTURE.md):
 * writes desiredState=AWAKE + wakeRequestedAt to the power row (rate-
 * limited DDB-side, ≥2 min between writes); the orchestrator does the
 * actual waking.
 *
 * Auth: the power row is consulted FIRST. While the state is non-AWAKE the
 * database is never probed or queried — authentication is the offline wake
 * grant (HMAC-signed {sub, iat, exp≤7d} cookie minted during a real
 * session validation; src/server/power/wake-grant.ts). Only when the row
 * claims AWAKE (or is absent/unconfigured) does a single, bounded session
 * lookup run. No-op (200, configured:false) when POWER_TABLE is unset.
 * Logic lives in src/server/power/wake-endpoint.ts (integration-tested).
 */
export const Route = createFileRoute('/api/wake')({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const { handleWakeRequest } = await import(
					'@/server/power/wake-endpoint'
				)
				return handleWakeRequest(request)
			},
		},
	},
})
