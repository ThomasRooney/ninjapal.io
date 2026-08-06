/**
 * Sync-worker → power-row stamps (infra/aws/ARCHITECTURE.md, canonical
 * contract in infra/aws/lambda/power/lib.ts): ONE generation-fenced update
 * per cycle carrying the worker heartbeat and — only when a NON-simulated
 * device reported Online (countsAsRealDeviceOnline is the caller's gate) —
 * `lastRealDeviceOnlineAt`. A superseded task (stale POWER_GENERATION
 * after a wake) loses the ConditionExpression and writes nothing.
 *
 * POWER_TABLE set but POWER_GENERATION missing is a deployment bug: the
 * worker skips power writes entirely and warns (once) rather than writing
 * unfenced.
 */
import { createLogger } from '@/lib/log'
import { powerConfig, stampWorkerCycle } from './power-row'

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

let warnedMissingGeneration = false

/** Test hook: re-arm the one-shot missing-generation warning. */
export function __resetWorkerPowerWarningsForTests(): void {
	warnedMissingGeneration = false
}

/**
 * The worker's single per-cycle power write. Returns true when the fenced
 * update applied; false on skip/no-op/lost fence.
 */
export async function stampWorkerCyclePower(args: {
	realDeviceOnline: boolean
}): Promise<boolean> {
	if (!powerConfig()) return false
	const generation = powerGeneration()
	if (generation == null) {
		if (!warnedMissingGeneration) {
			warnedMissingGeneration = true
			log.warn(
				'POWER_TABLE is set but POWER_GENERATION is missing/non-numeric — skipping ALL power writes (unfenced writes are forbidden)',
			)
		}
		return false
	}
	const result = await stampWorkerCycle({
		generation,
		realDeviceOnline: args.realDeviceOnline,
	})
	if (result === 'condition-failed') {
		log.warn(
			'worker cycle stamp lost its generation fence — superseded task?',
			{
				generation,
			},
		)
	}
	return result === 'applied'
}
