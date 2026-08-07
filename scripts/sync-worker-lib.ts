/**
 * Pure helpers for the sync worker, extracted from scripts/sync-worker.ts so
 * safety, backoff, drain and cadence behaviour are unit-testable without a
 * DB or the Ayla cloud.
 */
import { isDeviceOnline } from '@/lib/device-status'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

/**
 * Guards the worker against a mistakenly remote ZERO_UPSTREAM_DB: the worker
 * executes device controls, runs the director LLM, pushes notifications and
 * reaps rows, so pointing a local instance at prod would duplicate every prod
 * side effect. Throws (with the offending host in the message) unless the
 * upstream host is local or PITMINDER_ALLOW_REMOTE_DB=true is set — prod
 * deployments must set that env var.
 */
export function assertSafeUpstream(
	url: string,
	env: Record<string, string | undefined> = process.env,
): void {
	if (env.PITMINDER_ALLOW_REMOTE_DB === 'true') return
	let host: string
	try {
		// WHATWG URL keeps IPv6 hosts bracketed ("[::1]") — strip for comparison.
		host = new URL(url).hostname.replace(/^\[|\]$/g, '')
	} catch {
		throw new Error(
			'ZERO_UPSTREAM_DB is not a parseable URL — refusing to start ' +
				'(set PITMINDER_ALLOW_REMOTE_DB=true to override)',
		)
	}
	if (LOCAL_HOSTS.has(host.toLowerCase())) return
	throw new Error(
		`ZERO_UPSTREAM_DB points at remote host "${host}" — the worker executes ` +
			'device controls, director runs and row reaping, so a local instance ' +
			'must not target a remote database. Set PITMINDER_ALLOW_REMOTE_DB=true ' +
			'if this is intentional (prod does).',
	)
}

export const BACKOFF_BASE_MS = 60_000
export const BACKOFF_CAP_MS = 6 * 3_600_000

/**
 * Delay before the next auth attempt for a connection that has failed
 * `attempts` times already: min(2^attempts * 60s, 6h). Replaces the old
 * permanent stop at attempts >= 3 — stale credentials retry forever, just
 * increasingly slowly.
 */
export function backoffDelayMs(attempts: number): number {
	const n = Math.max(0, Math.floor(attempts))
	// 2**n saturates to Infinity for huge n; Math.min still yields the cap.
	return Math.min(BACKOFF_BASE_MS * 2 ** n, BACKOFF_CAP_MS)
}

/** ninja_connections column updates after a failed sync attempt. */
export function backoffOnFailure(
	attempts: number,
	now: Date,
): { attempts: number; lastErrorAt: Date; nextAttemptAt: Date } {
	const n = Math.max(0, Math.floor(attempts))
	return {
		attempts: n + 1,
		lastErrorAt: now,
		nextAttemptAt: new Date(now.getTime() + backoffDelayMs(n)),
	}
}

/** ninja_connections column updates after a successful sync. */
export function backoffOnSuccess(now: Date): {
	attempts: 0
	lastSuccessAt: Date
	nextAttemptAt: null
} {
	return { attempts: 0, lastSuccessAt: now, nextAttemptAt: null }
}

/**
 * Whether the cycle should skip this connection while its backoff window is
 * open. A user re-saving credentials resets attempts to 0 without clearing
 * next_attempt_at, so attempts > 0 is part of the condition — a fresh save
 * polls immediately.
 */
export function inBackoff(
	conn: { attempts: number | null; nextAttemptAt: Date | null },
	now: Date,
): boolean {
	return (
		(conn.attempts ?? 0) > 0 &&
		conn.nextAttemptAt !== null &&
		conn.nextAttemptAt.getTime() > now.getTime()
	)
}

/**
 * Graceful-shutdown coordinator (ECS SIGTERM → stopTimeout → SIGKILL): the
 * main loop checks `isDraining()` before starting a cycle and sleeps via
 * `sleep()`, which resolves immediately once a drain is requested so the
 * worker exits without waiting out the poll interval.
 */
export interface DrainController {
	isDraining(): boolean
	requestDrain(): void
	/** Delay that ends early (resolves) the moment a drain is requested. */
	sleep(ms: number): Promise<void>
}

export function createDrainController(): DrainController {
	let draining = false
	let wakers: Array<() => void> = []
	return {
		isDraining: () => draining,
		requestDrain() {
			if (draining) return
			draining = true
			const pending = wakers
			wakers = []
			for (const wake of pending) wake()
		},
		sleep(ms: number) {
			if (draining || ms <= 0) return Promise.resolve()
			return new Promise((resolve) => {
				const wake = () => {
					clearTimeout(timer)
					resolve()
				}
				const timer = setTimeout(() => {
					wakers = wakers.filter((w) => w !== wake)
					resolve()
				}, ms)
				wakers.push(wake)
			})
		},
	}
}

/**
 * Director cadence from persisted state: run when the device has no
 * director_runs row yet, or the newest one (ok OR error — failures insert a
 * row too) is at least `intervalMs` old. Replaces the in-memory map so a
 * worker restart/wake cannot double-fire check-ins.
 */
export function shouldRunDirector(
	lastRunAt: Date | null | undefined,
	nowMs: number,
	intervalMs: number,
): boolean {
	if (lastRunAt == null) return true
	return nowMs - lastRunAt.getTime() >= intervalMs
}

/**
 * Whether a device counts toward the `lastRealDeviceOnlineAt` idle signal:
 * NON-simulated and reporting Online. Simulated grills always report Online
 * and would keep the stack awake forever (codex-found trap in
 * infra/aws/ARCHITECTURE.md) — they must never count.
 */
export function countsAsRealDeviceOnline(device: {
	isSimulated?: boolean | null
	connectionStatus?: string | null
}): boolean {
	return device.isSimulated !== true && isDeviceOnline(device.connectionStatus)
}

/**
 * Resolve the POWER_GENERATION the worker should fence its power writes on
 * (CONTRACT.md writer 3: "the generation the worker was started for").
 *
 * On Fargate the task definition is static, so the generation cannot arrive
 * as a baked env var; the entrypoint (scripts/sync-worker-entry.ts) reads the
 * power row's CURRENT generation at boot instead — the orchestrator bumps
 * `generation` before scaling the service up, and force-redeploys the service
 * whenever a new wake cycle supersedes a still-running task, so "generation
 * at boot" IS "generation started for".
 *
 * Precedence:
 *  - explicit POWER_GENERATION env (Railway/manual override) wins untouched
 *  - no POWER_TABLE → power writes are disabled anyway → null (skip lookup)
 *  - otherwise the row's generation, or null when the row is unreadable
 *    (worker.ts then skips ALL power writes rather than writing unfenced)
 */
export async function resolveWorkerGeneration(
	env: Record<string, string | undefined>,
	readRowGeneration: () => Promise<number | null>,
): Promise<number | null> {
	const explicit = env.POWER_GENERATION?.trim()
	if (explicit) {
		const parsed = Number(explicit)
		return Number.isFinite(parsed) ? parsed : null
	}
	if (!env.POWER_TABLE?.trim()) return null
	try {
		const generation = await readRowGeneration()
		return typeof generation === 'number' && Number.isFinite(generation)
			? generation
			: null
	} catch {
		return null
	}
}
