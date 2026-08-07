// Per-invocation background-work registry for the Lambda streaming entry.
//
// Why this exists (P0, CloudWatch-proven 2026-08-07): the entry sets
// context.callbackWaitsForEmptyEventLoop = false so idle DB sockets cannot
// keep every invocation billed ~20s past its response — but that freezes the
// sandbox the moment the handler resolves, so any DETACHED promise (e.g. the
// chat persistence tee, `void (async ...)()` in src/routes/api/chat.ts) is
// frozen mid-flight and thaws minutes later inside some other request, where
// its writes time out. The response streamed at 10:41:20; the detached
// insert thawed at 10:46:48 and died with ETIMEDOUT.
//
// The fix is a waitUntil shape: app code registers background promises via
// `globalThis.__pitminderWaitUntil`; the entry flushes the registry AFTER the
// response stream has fully ended and BEFORE resolving the streamified
// handler. The client sees streaming latency; the sandbox stays alive only
// for registered work — never for idle sockets.
export function createWaitUntilRegistry() {
	/** @type {Promise<unknown>[]} */
	const pending = []
	return {
		/** @param {Promise<unknown>} promise */
		register(promise) {
			pending.push(promise)
		},
		size() {
			return pending.length
		},
		/**
		 * Await settlement (never rejection — failures are the registrant's
		 * job to log) of everything registered, INCLUDING work registered
		 * while a flush pass is already awaiting.
		 */
		async flush() {
			while (pending.length > 0) {
				const batch = pending.splice(0, pending.length)
				await Promise.allSettled(batch)
			}
		},
	}
}
