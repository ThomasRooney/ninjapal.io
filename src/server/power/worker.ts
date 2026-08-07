/**
 * Sync-worker → power-row stamps (infra/aws/ARCHITECTURE.md, canonical
 * contract in infra/aws/lambda/power/lib.ts): ONE generation-fenced update
 * per cycle carrying the worker heartbeat and — only when a NON-simulated
 * device reported Online (countsAsRealDeviceOnline is the caller's gate) —
 * `lastRealDeviceOnlineAt`. A superseded task (stale POWER_GENERATION
 * after a wake) loses the ConditionExpression and writes nothing.
 *
 * FENCING IS FAIL-CLOSED (CONTRACT.md writer 3): a worker that cannot
 * prove its generation must not perform side effects —
 *  - POWER_TABLE set but POWER_GENERATION missing is a deployment bug: the
 *    entry refuses to start (scripts/sync-worker-entry.ts exits 1);
 *  - every cycle STARTS with proveWorkerGeneration(); 'stale' means a newer
 *    wake superseded this task → the caller must drain and exit
 *    immediately (ECS restarts a fresh task that reads the current
 *    generation at boot);
 *  - a lost fence on the END-of-cycle stamp is surfaced as 'fence-lost'
 *    for the same drain-and-exit handling, never log-and-continue.
 */
import { createLogger } from '@/lib/log'
import { powerConfig, readPowerRow, stampWorkerCycle } from './power-row'

const log = createLogger('power-worker')

/** POWER_GENERATION env as a number, or null when unset/garbage. */
export function powerGeneration(
	env: Record<string, string | undefined> = process.env,
): number | null {
	const raw = env.POWER_GENERATION?.trim()
	if (!raw) return null
	const generation = Number(raw)
	if (!Number.isFinite(generation)) return null
	return generation
}

export type GenerationProof =
	| 'ok' // row generation matches ours — side effects may proceed
	| 'stale' // superseded (or unprovable-by-construction) — drain + exit
	| 'unavailable' // transient row-read failure — SKIP the cycle, retry
	| 'unconfigured' // no POWER_TABLE (Railway/local) — fencing not in play

/**
 * Prove this task's generation against the row BEFORE any side effects
 * (device commands, director runs, pushes). ConsistentRead via
 * readPowerRow; a transient read failure is 'unavailable' (skip the cycle
 * — no side effects without a proven fence), never silently 'ok'.
 */
export async function proveWorkerGeneration(): Promise<GenerationProof> {
	if (!powerConfig()) return 'unconfigured'
	const generation = powerGeneration()
	if (generation == null) return 'stale'
	const row = await readPowerRow()
	if (!row || row.generation == null) return 'unavailable'
	return row.generation === generation ? 'ok' : 'stale'
}

export type WorkerStampOutcome =
	| 'applied'
	| 'fence-lost' // generation superseded mid-cycle — drain + exit
	| 'skipped' // unconfigured / no generation (entry should have refused)
	| 'error' // transient write failure — retried next cycle

/**
 * The worker's single per-cycle power write. 'fence-lost' means a newer
 * wake cycle superseded this task while it worked — the caller must drain
 * and exit rather than keep producing side effects it can no longer stamp.
 */
export async function stampWorkerCyclePower(args: {
	realDeviceOnline: boolean
}): Promise<WorkerStampOutcome> {
	if (!powerConfig()) return 'skipped'
	const generation = powerGeneration()
	if (generation == null) {
		log.error(
			'POWER_TABLE is set but POWER_GENERATION is missing — the entry should have refused startup; skipping the stamp',
		)
		return 'skipped'
	}
	const result = await stampWorkerCycle({
		generation,
		realDeviceOnline: args.realDeviceOnline,
	})
	if (result === 'applied') return 'applied'
	if (result === 'condition-failed') {
		log.warn('worker cycle stamp lost its generation fence — superseded', {
			generation,
		})
		return 'fence-lost'
	}
	if (result === 'unconfigured') return 'skipped'
	return 'error'
}
