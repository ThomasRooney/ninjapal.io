import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as authSchema from './schema/auth'

/**
 * Shared server-side Postgres client (postgres-js).
 * ZERO_UPSTREAM_DB is the single source of truth for the app's database;
 * sslmode in the connection string is respected (Neon requires it, local
 * Postgres omits it).
 */
let _sql: ReturnType<typeof postgres> | null = null

export function getSql() {
	if (!_sql) {
		const url = process.env.ZERO_UPSTREAM_DB
		if (!url) {
			throw new Error('ZERO_UPSTREAM_DB environment variable is not set')
		}
		_sql = postgres(url, {
			max: 10,
			idle_timeout: 30,
		})
	}
	return _sql
}

let _db: ReturnType<typeof createDb> | null = null

function createDb() {
	return drizzle(getSql(), { schema: authSchema })
}

/** Drizzle instance used by the better-auth adapter. */
export function getDb() {
	if (!_db) {
		_db = createDb()
	}
	return _db
}
