/**
 * Allowlists YOUR current public IP for the admin dashboard (24h TTL) and
 * opens it. Network-level-ish defense in depth on top of the admin-email
 * session check — admin server functions reject all other IPs.
 *
 * Usage:
 *   bun scripts/admin-access.ts            # production (Neon)
 *   bun scripts/admin-access.ts --local    # local dev DB
 */
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const local = process.argv.includes('--local')

function prodDbUrl(): string {
	const env = readFileSync('.env', 'utf8')
	const m = env.match(/^# NEON_DATABASE_URL=(.+)$/m)
	if (!m) throw new Error('NEON_DATABASE_URL not found in .env')
	return m[1].trim()
}

const DB_URL = local ? process.env.ZERO_UPSTREAM_DB : prodDbUrl()
const ADMIN_URL = local
	? 'http://localhost:5173/app/admin'
	: 'https://app.pitminder.com/app/admin'

async function main() {
	const ipRes = await fetch('https://api.ipify.org?format=json')
	const { ip } = (await ipRes.json()) as { ip: string }
	console.log(`public IP: ${ip}`)

	const db = new Client({ connectionString: DB_URL })
	await db.connect()
	await db.query('delete from admin_ip_allowlist where expires_at < now()')
	await db.query(
		`insert into admin_ip_allowlist (ip, expires_at)
		 values ($1, now() + interval '24 hours')
		 on conflict (ip) do update set expires_at = now() + interval '24 hours'`,
		[ip],
	)
	const { rows } = await db.query(
		'select ip, expires_at from admin_ip_allowlist order by expires_at desc',
	)
	console.log('allowlist:')
	for (const r of rows) console.log(`  ${r.ip} until ${r.expires_at}`)
	await db.end()

	console.log(`opening ${ADMIN_URL}`)
	spawn('open', [ADMIN_URL], { detached: true, stdio: 'ignore' })
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
