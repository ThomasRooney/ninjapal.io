/**
 * Removes seeded/demo/test device data from the local database so real
 * hardware validation is not mixed with mock rows.
 *
 * This intentionally refuses non-local database hosts.
 */
import { Client } from 'pg'

const DB_URL = process.env.ZERO_UPSTREAM_DB
if (!DB_URL) {
	console.error('ZERO_UPSTREAM_DB is not set')
	process.exit(1)
}

const parsed = new URL(DB_URL)
const localHosts = new Set(['localhost', '127.0.0.1', '::1'])
if (!localHosts.has(parsed.hostname)) {
	console.error(
		`Refusing to clean non-local database host: ${parsed.hostname}`,
	)
	process.exit(1)
}

const db = new Client({ connectionString: DB_URL })
await db.connect()

try {
	await db.query('begin')

	const { rows } = await db.query(`
		delete from devices
		where is_simulated is true
			or dsn like 'DEMO%'
			or dsn like 'TEST%'
			or product_name in ('Demo Smoker', 'Backyard Beast', 'Test Grill')
		returning id, dsn, product_name
	`)

	await db.query('commit')

	console.log(`removed ${rows.length} mock device row(s)`)
	for (const row of rows) {
		console.log(`  ${row.dsn} ${row.product_name ?? ''}`.trim())
	}
} catch (error) {
	await db.query('rollback')
	throw error
} finally {
	await db.end()
}
