/**
 * Sync-worker → power-row stamps (infra/aws/ARCHITECTURE.md): the worker is
 * the only writer of `lastRealDeviceOnlineAt` (idle signal — simulated
 * devices are excluded by the caller via countsAsRealDeviceOnline) and of
 * its own per-cycle heartbeat. `POWER_GENERATION` is stamped alongside so
 * the orchestrator can fence out writes from a superseded task after a
 * wake. Everything no-ops when POWER_TABLE is unset.
 */
import { createLogger } from '@/lib/log'
import type { AttributeValue } from '@aws-sdk/client-dynamodb'
import { updatePowerAttributes } from './power-row'

const log = createLogger('power-worker')

/** POWER_GENERATION env as a number, or null when unset/garbage. */
export function powerGeneration(
	env: Record<string, string | undefined> = process.env,
): number | null {
	const raw = env.POWER_GENERATION?.trim()
	if (!raw) return null
	const generation = Number(raw)
	if (!Number.isFinite(generation)) {
		log.warn('POWER_GENERATION is not numeric — ignoring', { raw })
		return null
	}
	return generation
}

function withGeneration(
	attrs: Record<string, AttributeValue>,
	generationKey: string,
): Record<string, AttributeValue> {
	const generation = powerGeneration()
	if (generation == null) return attrs
	return { ...attrs, [generationKey]: { N: String(generation) } }
}

/**
 * Stamps `lastRealDeviceOnlineAt` after a cycle that saw at least one
 * NON-simulated device reporting Online. Best-effort; no-op unconfigured.
 */
export async function stampRealDeviceOnline(): Promise<boolean> {
	return updatePowerAttributes(
		withGeneration(
			{ lastRealDeviceOnlineAt: { S: new Date().toISOString() } },
			'lastRealDeviceOnlineGeneration',
		),
	)
}

/** Per-cycle worker heartbeat (+ generation) for orchestrator visibility. */
export async function writeWorkerHeartbeat(): Promise<boolean> {
	return updatePowerAttributes(
		withGeneration(
			{ workerHeartbeatAt: { S: new Date().toISOString() } },
			'workerGeneration',
		),
	)
}
