import { auth } from '@/lib/auth'
import { getSql } from '@/server/db/client'
import { ADMIN_EMAIL } from '@/server/user-provision'
import { getWebRequest } from '@tanstack/react-start/server'

function clientIp(request: Request): string | null {
	const headers = request.headers
	const fwd =
		headers.get('x-vercel-forwarded-for') ??
		headers.get('x-real-ip') ??
		headers.get('x-forwarded-for')
	if (!fwd) return null
	return fwd.split(',')[0].trim()
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

/**
 * Throws unless the current session belongs to the admin account AND the
 * request originates from an allowlisted IP (24h TTL, managed by
 * `bun scripts/admin-access.ts`). Loopback is exempt for local dev.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
	const request = getWebRequest()
	if (!request) throw new Error('No request')
	const session = await auth.api.getSession({ headers: request.headers })
	const email = session?.user?.email?.toLowerCase()
	if (!session || email !== ADMIN_EMAIL) {
		throw new Error('Admin only')
	}

	const ip = clientIp(request)
	if (ip && !LOOPBACK.has(ip)) {
		const sql = getSql()
		await sql`delete from admin_ip_allowlist where expires_at < now()`
		const rows = await sql`
			select 1 from admin_ip_allowlist
			where ip = ${ip} and expires_at > now() limit 1
		`
		if (rows.length === 0) {
			throw new Error(
				`Admin IP ${ip} not allowlisted — run \`bun scripts/admin-access.ts\` from your machine`,
			)
		}
	}

	return { id: session.user.id, email: session.user.email }
}

export interface AdminUserRow {
	id: string
	email: string
	name: string
	whitelisted: boolean
	lastLoginAt: string | null
	createdAt: string | null
	role: string | null
	deviceCount: number
	cookCount: number
	messageCount: number
}

export async function listUsersWithStats(): Promise<AdminUserRow[]> {
	const sql = getSql()
	const rows = await sql`
		select
			u.id, u.email, u.name,
			coalesce(u.whitelisted, false) as whitelisted,
			u.last_login_at,
			au.created_at,
			au.role,
			(select count(*) from devices d where d.user_id = u.id::uuid) as device_count,
			(select count(*) from cook_sessions cs where cs.user_id = u.id::uuid) as cook_count,
			(select count(*) from cook_messages cm where cm.user_id = u.id::uuid) as message_count
		from users u
		left join "user" au on au.id = u.id
		order by u.last_login_at desc nulls last
	`
	return rows.map((r) => ({
		id: r.id as string,
		email: r.email as string,
		name: r.name as string,
		whitelisted: r.whitelisted as boolean,
		lastLoginAt: r.last_login_at ? String(r.last_login_at) : null,
		createdAt: r.created_at ? String(r.created_at) : null,
		role: (r.role as string) ?? null,
		deviceCount: Number(r.device_count),
		cookCount: Number(r.cook_count),
		messageCount: Number(r.message_count),
	}))
}

export async function setWhitelisted(
	userId: string,
	whitelisted: boolean,
): Promise<void> {
	const sql = getSql()
	await sql`update users set whitelisted = ${whitelisted} where id = ${userId}`
}

export async function getAppConfig(): Promise<Record<string, unknown>> {
	const sql = getSql()
	const rows = await sql`select key, value from app_config`
	const config: Record<string, unknown> = {}
	for (const r of rows) config[r.key as string] = r.value
	return config
}

export async function setAppConfig(key: string, value: unknown): Promise<void> {
	const sql = getSql()
	await sql`
		insert into app_config (key, value, updated_at)
		values (${key}, ${sql.json(value as never)}, now())
		on conflict (key) do update set value = excluded.value, updated_at = now()
	`
}
