/**
 * Web-activity stamping for scale-to-zero idle detection
 * (infra/aws/ARCHITECTURE.md): authenticated requests refresh `lastWebAt`
 * on the DynamoDB power row so the 30-min idle cron knows a human (or MCP
 * agent) is around. Readiness polling must NEVER route through here — it
 * would defeat idle detection forever.
 *
 * No-op (debug log) when POWER_TABLE is unset, so Vercel/local behavior is
 * untouched. The canonical throttle (one write per 5 minutes) lives in the
 * DynamoDB ConditionExpression itself; the in-memory window here only
 * saves the DDB round-trips between stamps.
 */
import { createLogger } from '@/lib/log'
import {
	WEB_STAMP_THROTTLE_MS,
	powerConfig,
	stampWebActivityRow,
} from './power-row'

const log = createLogger('power-activity')

export const ACTIVITY_STAMP_INTERVAL_MS = WEB_STAMP_THROTTLE_MS

let lastStampMs = 0

/** Test hook: clear the per-process throttle window. */
export function __resetActivityThrottleForTests(): void {
	lastStampMs = 0
}

/**
 * Stamps `lastWebAt` on the power row. Best-effort and doubly throttled —
 * callers on the hot request path can await it without latency cost.
 */
export async function stampWebActivity(userId: string): Promise<void> {
	if (!powerConfig()) {
		log.debug('POWER_TABLE unset — web activity stamp skipped')
		return
	}
	const now = Date.now()
	if (now - lastStampMs < ACTIVITY_STAMP_INTERVAL_MS) return
	lastStampMs = now
	const result = await stampWebActivityRow(now)
	if (result === 'applied') {
		log.debug('stamped lastWebAt', { userId })
	} else if (result === 'error') {
		// Let the next request retry rather than sitting out the window.
		// ('condition-failed' = another process stamped within 5min — fine.)
		lastStampMs = 0
	}
}
