/**
 * Register background work that must OUTLIVE the response but not the
 * invocation.
 *
 * On AWS Lambda the streaming entry (infra/aws/spike/lambda-entry.mjs) sets
 * callbackWaitsForEmptyEventLoop=false — the sandbox freezes the moment the
 * handler resolves, so a plain detached `void promise` is frozen mid-flight
 * and thaws minutes later inside an unrelated request (CloudWatch-proven:
 * the chat persistence tee streamed its response at 10:41:20 and its insert
 * thawed at 10:46:48 into ETIMEDOUT). The entry exposes a per-invocation
 * registry as `globalThis.__pitminderWaitUntil` and flushes it after the
 * response stream ends, before resolving the handler.
 *
 * Elsewhere (Vercel, local dev, tests) the global is absent and behavior
 * falls back to the detached promise exactly as before. Rejections are
 * swallowed here — logging failures is the registrant's job.
 */

declare global {
	// eslint-disable-next-line no-var
	var __pitminderWaitUntil: ((promise: Promise<unknown>) => void) | undefined
}

export function waitUntil(promise: Promise<unknown>): void {
	// Guard first so an unhandled rejection can never crash the process,
	// registered or not.
	const guarded = promise.catch(() => {})
	if (typeof globalThis.__pitminderWaitUntil === 'function') {
		globalThis.__pitminderWaitUntil(guarded)
	}
}
