/**
 * /api/ready handler body, extracted so the DDB-first ordering is
 * integration-testable (configured power + failing DB) without a route
 * harness. See src/routes/api/ready.ts for the contract.
 */
import { powerConfig, readPowerRow } from './power-row'

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

export async function handleReadyRequest(): Promise<Response> {
	if (!powerConfig()) {
		// Vercel/local: no orchestrator — the DB probe is the whole story.
		const { probeDb } = await import('@/server/db/probe')
		return (await probeDb())
			? json(200, { ready: true })
			: json(503, { ready: false, error: 'database unavailable' })
	}

	const row = await readPowerRow()
	const state = row?.state ?? null
	const passthrough = {
		state,
		progress: row?.progress ?? null,
		generation: row?.generation ?? null,
		// Orchestrator-owned (epoch ms); surfaced so the UI can render
		// "staying warm until HH:MM". Writers here never touch it.
		keepWarmUntil: row?.keepWarmUntil ?? null,
	}
	if (state === 'ERROR') {
		return json(503, { ready: false, ...passthrough })
	}
	if (state !== null && state !== 'AWAKE') {
		// Known non-AWAKE: answer from DynamoDB alone — thousands of warming
		// polls must never amplify into SQL attempts against a stopped RDS.
		return json(202, { ready: false, ...passthrough }, { 'Retry-After': '2' })
	}
	// AWAKE or row absent/unknown → verify with the DB probe.
	const { probeDb } = await import('@/server/db/probe')
	if (await probeDb()) {
		return json(200, { ready: true, ...passthrough })
	}
	return json(202, { ready: false, ...passthrough }, { 'Retry-After': '2' })
}
