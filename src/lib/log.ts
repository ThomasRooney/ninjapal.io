/**
 * Minimal namespaced, leveled logger shared by the server (Bun/Node), the
 * sync worker, and the browser. No dependencies.
 *
 * Level resolution (first match wins):
 *  - browser: localStorage.PITMINDER_LOG_LEVEL, then import.meta.env.VITE_PITMINDER_LOG_LEVEL
 *  - server/worker: process.env.PITMINDER_LOG_LEVEL
 *  - default: 'info'
 *
 * Usage:
 *   const log = createLogger('sync-worker')
 *   log.info('cycle ok', { cycle: 12, ms: 840 })
 *   log.debug(...) // only at PITMINDER_LOG_LEVEL=debug
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LEVEL_ORDER: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
	silent: 99,
}

function resolveLevel(): LogLevel {
	let raw: string | undefined
	if (typeof window !== 'undefined') {
		try {
			raw = window.localStorage?.getItem('PITMINDER_LOG_LEVEL') ?? undefined
		} catch {
			// storage unavailable (private mode etc.)
		}
		raw ??= (import.meta as { env?: Record<string, string> }).env
			?.VITE_PITMINDER_LOG_LEVEL
	} else if (typeof process !== 'undefined') {
		raw = process.env.PITMINDER_LOG_LEVEL
	}
	return raw && raw in LEVEL_ORDER ? (raw as LogLevel) : 'info'
}

let currentLevel = resolveLevel()

/** Override at runtime (e.g. from a debug console: `setLogLevel('debug')`). */
export function setLogLevel(level: LogLevel): void {
	currentLevel = level
}

export interface Logger {
	debug: (msg: string, data?: unknown) => void
	info: (msg: string, data?: unknown) => void
	warn: (msg: string, data?: unknown) => void
	error: (msg: string, data?: unknown) => void
	/** Child logger with a nested namespace: log.child('cycle') → "sync-worker:cycle". */
	child: (namespace: string) => Logger
}

function emit(
	level: Exclude<LogLevel, 'silent'>,
	namespace: string,
	msg: string,
	data?: unknown,
): void {
	if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel]) return
	const line = `${new Date().toISOString()} [${namespace}] ${msg}`
	const method = level === 'debug' ? 'log' : level
	if (data === undefined) {
		console[method](line)
	} else {
		console[method](line, redactSecrets(data))
	}
}

const SECRET_KEY_PATTERN =
	/password|token|secret|authorization|cookie|apikey|api_key|bearer/i

/**
 * Recursively redact secret-looking keys. Applied to every `data` payload
 * before emit so credentials can never leak into logs.
 */
export function redactSecrets(value: unknown, depth = 0): unknown {
	if (depth > 6 || value === null || typeof value !== 'object') return value
	if (Array.isArray(value)) return value.map((v) => redactSecrets(v, depth + 1))
	const out: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
		out[k] = SECRET_KEY_PATTERN.test(k)
			? '[redacted]'
			: redactSecrets(v, depth + 1)
	}
	return out
}

export function createLogger(namespace: string): Logger {
	return {
		debug: (msg, data) => emit('debug', namespace, msg, data),
		info: (msg, data) => emit('info', namespace, msg, data),
		warn: (msg, data) => emit('warn', namespace, msg, data),
		error: (msg, data) => emit('error', namespace, msg, data),
		child: (ns) => createLogger(`${namespace}:${ns}`),
	}
}
