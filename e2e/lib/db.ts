import { Client } from 'pg'

const DB_URL =
	process.env.ZERO_UPSTREAM_DB ??
	'postgresql://postgres:postgres@127.0.0.1:54332/postgres'

/**
 * Inserts a device for the user with the given email (must exist already).
 * Returns the device id.
 */
export async function insertTestDevice(
	email: string,
	overrides: Record<string, string> = {},
) {
	const client = new Client({ connectionString: DB_URL })
	await client.connect()
	try {
		const userRes = await client.query(
			'select id from "user" where email = $1',
			[email],
		)
		const userId = userRes.rows[0]?.id
		if (!userId) throw new Error(`No auth user for ${email}`)
		const res = await client.query(
			`insert into devices (user_id, dsn, product_name, model, connection_status)
			 values ($1, $2, $3, $4, $5) returning id`,
			[
				userId,
				overrides.dsn ?? 'TEST123456',
				overrides.productName ?? 'Test Grill',
				overrides.model ?? 'TEST-MODEL',
				overrides.connectionStatus ?? 'Online',
			],
		)
		return res.rows[0].id as string
	} finally {
		await client.end()
	}
}

/**
 * Resets app data between tests. Truncates app + auth tables but leaves the
 * schema (and Zero's replication machinery) intact.
 */
export async function resetDatabase() {
	const client = new Client({ connectionString: DB_URL })
	await client.connect()
	try {
		await client.query(
			`truncate table device_history, devices, ninja_connections, users, "session", "account", "verification", "user" cascade`,
		)
	} finally {
		await client.end()
	}
}
