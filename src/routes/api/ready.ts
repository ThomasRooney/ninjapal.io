import { createFileRoute } from '@tanstack/react-router'

/**
 * Readiness for the scale-to-zero warming UX (infra/aws/ARCHITECTURE.md).
 *
 * Order matters: the power row is read FIRST, and a known non-AWAKE state
 * answers 202/503 WITHOUT touching SQL — warming polls must not amplify
 * into connection attempts against a stopped RDS. The DB probe (hard 4s
 * timeout, query cancelled on expiry) only runs when the row claims AWAKE,
 * is absent, or POWER_TABLE is unconfigured.
 *
 *  - 200 {ready:true}  — SELECT succeeded and the power row (if any) is AWAKE
 *  - 202 + Retry-After — warming; passthrough of {state, progress, generation}
 *  - 503               — power row ERROR, or (unconfigured) DB unreachable
 *
 * Unauthenticated by design and it must NEVER stamp lastWebAt — readiness
 * polling is not human activity. Logic lives in
 * src/server/power/ready-endpoint.ts (integration-tested).
 */
export const Route = createFileRoute('/api/ready')({
	server: {
		handlers: {
			GET: async () => {
				const { handleReadyRequest } = await import(
					'@/server/power/ready-endpoint'
				)
				return handleReadyRequest()
			},
		},
	},
})
