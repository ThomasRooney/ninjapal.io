/**
 * Fargate/container entrypoint for the sync worker (Dockerfile.sync CMD).
 *
 * Resolves POWER_GENERATION from the power row at boot (the task definition
 * is static — a per-wake generation cannot be baked into env), then starts
 * scripts/sync-worker.ts. See resolveWorkerGeneration in sync-worker-lib.ts
 * for why "row generation at boot" is the generation this task was started
 * for, and how the orchestrator force-redeploys superseded tasks.
 *
 * Without POWER_TABLE (Railway, local dev) this is a passthrough: no lookup,
 * the worker runs with power writes disabled exactly as before.
 */
import { resolveWorkerGeneration } from './sync-worker-lib'

async function main(): Promise<void> {
	const generation = await resolveWorkerGeneration(process.env, async () => {
		const { readPowerRow } = await import('@/server/power/power-row')
		const row = await readPowerRow()
		return row?.generation ?? null
	})
	if (generation != null) {
		process.env.POWER_GENERATION = String(generation)
		console.log(
			`sync-worker-entry: POWER_GENERATION=${generation} (from power row)`,
		)
	} else if (process.env.POWER_TABLE?.trim()) {
		console.warn(
			'sync-worker-entry: POWER_TABLE is set but no generation was readable from the power row — power writes will be skipped (worker.ts refuses unfenced writes)',
		)
	}
	await import('./sync-worker')
}

main().catch((error) => {
	console.error('sync-worker-entry failed', error)
	process.exit(1)
})
