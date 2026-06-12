import { getSql } from '@/server/db/client'

export const ADMIN_EMAIL = 'thomas@resilientsoftware.co.uk'

export interface ProvisionedUser {
	whitelisted: boolean
	isAdmin: boolean
}

/**
 * Ensures the app `users` row exists for a session, stamps last_login_at
 * (throttled to one write per 15 min), and auto-grants the admin account
 * whitelist + better-auth admin role.
 */
export async function provisionUser(user: {
	id: string
	email: string
	name: string
}): Promise<ProvisionedUser> {
	const sql = getSql()
	const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL

	const rows = await sql`
		insert into users (id, email, name, whitelisted, last_login_at)
		values (${user.id}, ${user.email}, ${user.name}, ${isAdmin}, now())
		on conflict (id) do update set
			email = excluded.email,
			whitelisted = users.whitelisted or ${isAdmin},
			last_login_at = case
				when users.last_login_at is null
					or users.last_login_at < now() - interval '15 minutes'
				then now() else users.last_login_at end
		returning whitelisted
	`

	if (isAdmin) {
		await sql`update "user" set role = 'admin' where id = ${user.id} and (role is distinct from 'admin')`
	}

	return { whitelisted: rows[0]?.whitelisted === true, isAdmin }
}
