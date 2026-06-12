import { auth } from '@/lib/auth'
import { getSql } from '@/server/db/client'
import { getWebRequest } from '@tanstack/react-start/server'

async function requireSession(): Promise<{ id: string }> {
	const request = getWebRequest()
	if (!request) throw new Error('No request')
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session?.user) throw new Error('Not authenticated')
	return { id: session.user.id }
}

export interface PushSubscriptionInput {
	endpoint: string
	keys: { p256dh: string; auth: string }
}

export async function saveSubscription(
	sub: PushSubscriptionInput,
	userAgent: string | null,
): Promise<void> {
	const user = await requireSession()
	if (!sub.endpoint.startsWith('https://')) {
		throw new Error('Invalid push endpoint')
	}
	const sql = getSql()
	await sql`
		insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
		values (${user.id}, ${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${userAgent})
		on conflict (endpoint) do update set
			user_id = excluded.user_id,
			p256dh = excluded.p256dh,
			auth = excluded.auth,
			fail_count = 0
	`
}

export async function removeSubscription(endpoint: string): Promise<void> {
	const user = await requireSession()
	const sql = getSql()
	await sql`
		delete from push_subscriptions
		where endpoint = ${endpoint} and user_id = ${user.id}
	`
}
