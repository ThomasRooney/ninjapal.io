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

/**
 * Per-instance pool size: PG_POOL_MAX wins; otherwise 2 on Lambda
 * (AWS_LAMBDA_FUNCTION_NAME present — one request per instance, db.t4g.micro
 * upstream, so tiny pools keep aggregate connections bounded) and the
 * long-standing 4 everywhere else. A Lambda invoke never runs more than two
 * queries concurrently (request paths are sequential awaits; the Zero push
 * processor uses a single transaction), verified before lowering.
 */
export function resolvePoolMax(
	env: Record<string, string | undefined> = process.env,
): number {
	const fromEnv = Number(env.PG_POOL_MAX)
	if (Number.isFinite(fromEnv) && fromEnv >= 1) return Math.floor(fromEnv)
	return env.AWS_LAMBDA_FUNCTION_NAME ? 2 : 4
}

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
			max: resolvePoolMax(),
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
