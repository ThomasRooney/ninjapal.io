import { createFileRoute } from '@tanstack/react-router'

/**
 * Readiness for the scale-to-zero warming UX (infra/aws/ARCHITECTURE.md).
 *
 *  - 200 {ready:true}   — trivial SELECT succeeded and (when POWER_TABLE is
 *    set) the power row reports AWAKE or is absent (fail-open).
 *  - 202 {state, progress, generation} + Retry-After — warming; the
 *    orchestrator owns the state machine, this endpoint just reads the row
 *    and probes the DB.
 *  - 503 — power row in ERROR, or (unconfigured) the DB is unreachable.
 *
 * Unauthenticated by design (it must answer while auth's DB is down) and it
 * must NEVER stamp lastWebAt — readiness polling is not human activity.
 */

function json(
	status: number,
	body: Record<string, unknown>,
	extraHeaders?: Record<string, string>,
): Response {
	return Response.json(body, {
		status,
		headers: { 'Cache-Control': 'no-store', ...extraHeaders },
	})
}

export const Route = createFileRoute('/api/ready')({
	server: {
		handlers: {
			GET: async () => {
				const [{ probeDb }, { powerConfig, readPowerRow }] = await Promise.all([
					import('@/server/db/probe'),
					import('@/server/power/power-row'),
				])
				const dbOk = await probeDb()

				if (!powerConfig()) {
					// Vercel/local: no orchestrator — the DB probe is the whole story.
					return dbOk
						? json(200, { ready: true })
						: json(503, { ready: false, error: 'database unavailable' })
				}

				const row = await readPowerRow()
				const state = row?.state ?? null
				const passthrough = {
					state,
					progress: row?.progress ?? null,
					generation: row?.generation ?? null,
				}
				if (state === 'ERROR') {
					return json(503, { ready: false, ...passthrough })
				}
				// Row absent or state unknown → fail open on the DB probe alone.
				if (dbOk && (state === null || state === 'AWAKE')) {
					return json(200, { ready: true, ...passthrough })
				}
				return json(
					202,
					{ ready: false, ...passthrough },
					{ 'Retry-After': '2' },
				)
			},
		},
	},
})
