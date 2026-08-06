import { getSql } from './client'

/**
 * Trivial-SELECT liveness probe with a hard timeout, shared by /api/ready
 * and the wake path. Never throws — a sleeping RDS instance (stopped, AWS
 * scale-to-zero) must produce a fast `false`, not a hung request.
 */
export async function probeDb(timeoutMs = 4_000): Promise<boolean> {
	let timer: ReturnType<typeof setTimeout> | undefined
	try {
		const sql = getSql()
		await Promise.race([
			sql`select 1`,
			new Promise((_, reject) => {
				timer = setTimeout(
					() => reject(new Error('db probe timed out')),
					timeoutMs,
				)
			}),
		])
		return true
	} catch {
		return false
	} finally {
		clearTimeout(timer)
	}
}
