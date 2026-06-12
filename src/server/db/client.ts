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
			// Serverless-friendly: small per-instance pool, fail fast instead
			// of hanging on dead frozen-instance connections, and no prepared
			// statements so the Neon pgbouncer (pooled) endpoint works.
			max: 4,
			idle_timeout: 20,
			connect_timeout: 10,
			prepare: false,
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
