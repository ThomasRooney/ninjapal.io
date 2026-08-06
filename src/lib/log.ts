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
    raw ??= (import.meta as { env?: Record<string, string> }).env?.VITE_PITMINDER_LOG_LEVEL
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

function emit(level: Exclude<LogLevel, 'silent'>, namespace: string, msg: string, data?: unknown): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel]) return
  const line = `${new Date().toISOString()} [${namespace}] ${msg}`
  const method = level === 'debug' ? 'log' : level
  if (data === undefined) {
    console[method](line)
  } else {
    console[method](line, data)
  }
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
