import { getSql } from './client'

/**
 * Trivial-SELECT liveness probe with a hard timeout, shared by /api/ready
 * and the wake path. Never throws — a sleeping RDS instance (stopped, AWS
 * scale-to-zero) must produce a fast `false`, not a hung request.
 *
 * On timeout the in-flight query is CANCELLED (postgres.js Query#cancel)
 * so it does not sit pending holding a pool slot. cancel() is a no-op
 * while the query is still waiting on a TCP connect (nothing can cancel a
 * connect besides connect_timeout), so the race below also guarantees the
 * probe itself answers within timeoutMs either way.
 */
export async function probeDb(timeoutMs = 4_000): Promise<boolean> {
	let timer: ReturnType<typeof setTimeout> | undefined
	try {
		const sql = getSql()
		const query = sql`select 1`
		const result = await Promise.race([
			query.then(
				() => true,
				() => false,
			),
			new Promise<boolean>((resolve) => {
				timer = setTimeout(() => {
					try {
						query.cancel()
					} catch {
						// best-effort; the race already resolves false
					}
					resolve(false)
				}, timeoutMs)
			}),
		])
		return result
	} catch {
		return false
	} finally {
		clearTimeout(timer)
	}
}
