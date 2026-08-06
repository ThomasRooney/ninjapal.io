import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/log'
import { getSql } from '@/server/db/client'
import { getRequest } from '@tanstack/react-start/server'

const log = createLogger('steer-threads')

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireSession(): Promise<{ id: string }> {
	const request = getRequest()
	if (!request) throw new Error('No request')
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session?.user) throw new Error('Not authenticated')
	return { id: session.user.id }
}

async function requireOwnedDevice(userId: string, deviceId: string) {
	if (!UUID_PATTERN.test(deviceId)) throw new Error('Device not found')
	const sql = getSql()
	const [device] = await sql`
		select id from devices
		where id = ${deviceId}::uuid and user_id = ${userId}::uuid
	`
	if (!device) throw new Error('Device not found')
}

/**
 * Returns the open steer thread for (user, device), creating one when
 * none exists. The active thread is defined as the NEWEST open row, so a
 * rare double-create (two tabs racing) degrades gracefully — the older
 * duplicate is simply never used and gets closed by the next reset.
 */
export async function ensureOpenSteerThread(
	deviceId: string,
): Promise<{ id: string }> {
	const user = await requireSession()
	await requireOwnedDevice(user.id, deviceId)
	const sql = getSql()

	const [open] = await sql`
		select id from steer_threads
		where user_id = ${user.id}::uuid and device_id = ${deviceId}::uuid
			and closed_at is null
		order by created_at desc limit 1
	`
	if (open) return { id: open.id as string }

	const [created] = await sql`
		insert into steer_threads (user_id, device_id)
		values (${user.id}::uuid, ${deviceId}::uuid)
		returning id
	`
	log.info('thread created', {
		userId: user.id,
		deviceId,
		threadId: created.id,
	})
	return { id: created.id as string }
}

/**
 * Manual reset: close every open thread for (user, device) and start a
 * fresh one. History stays in the closed threads — nothing is deleted.
 * In-flight completions keep writing against the thread captured at
 * request start, so a reset during streaming never resurrects the old
 * conversation in the UI; it just finishes archiving it.
 */
export async function resetSteerThread(
	deviceId: string,
): Promise<{ id: string }> {
	const user = await requireSession()
	await requireOwnedDevice(user.id, deviceId)
	const sql = getSql()

	const closed = await sql`
		update steer_threads set closed_at = now()
		where user_id = ${user.id}::uuid and device_id = ${deviceId}::uuid
			and closed_at is null
		returning id
	`
	const [created] = await sql`
		insert into steer_threads (user_id, device_id)
		values (${user.id}::uuid, ${deviceId}::uuid)
		returning id
	`
	log.info('thread reset', {
		userId: user.id,
		deviceId,
		closedThreadIds: closed.map((t) => t.id),
		threadId: created.id,
	})
	return { id: created.id as string }
}
