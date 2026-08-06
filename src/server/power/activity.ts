/**
 * Web-activity stamping for scale-to-zero idle detection
 * (infra/aws/ARCHITECTURE.md): authenticated requests refresh `lastWebAt`
 * on the DynamoDB power row so the 30-min idle cron knows a human (or MCP
 * agent) is around. Readiness polling must NEVER route through here — it
 * would defeat idle detection forever.
 *
 * No-op (debug log) when POWER_TABLE is unset, so Vercel/local behavior is
 * untouched. Throttled in-memory to one write per 5 minutes per process.
 */
import { createLogger } from '@/lib/log'
import { powerConfig, updatePowerAttributes } from './power-row'

const log = createLogger('power-activity')

export const ACTIVITY_STAMP_INTERVAL_MS = 5 * 60_000

let lastStampMs = 0

/** Test hook: clear the per-process throttle window. */
export function __resetActivityThrottleForTests(): void {
	lastStampMs = 0
}

/**
 * Stamps `lastWebAt` (+ the stamping user for observability) on the power
 * row. Best-effort and throttled — callers on the hot request path can
 * await it without meaningful latency cost.
 */
export async function stampWebActivity(userId: string): Promise<void> {
	if (!powerConfig()) {
		log.debug('POWER_TABLE unset — web activity stamp skipped')
		return
	}
	const now = Date.now()
	if (now - lastStampMs < ACTIVITY_STAMP_INTERVAL_MS) return
	lastStampMs = now
	const ok = await updatePowerAttributes({
		lastWebAt: { S: new Date(now).toISOString() },
		lastWebBy: { S: userId },
	})
	if (ok) {
		log.debug('stamped lastWebAt', { userId })
	} else {
		// Let the next request retry rather than sitting out the window.
		lastStampMs = 0
	}
}
