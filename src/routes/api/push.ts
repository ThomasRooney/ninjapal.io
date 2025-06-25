import { authMiddleware, corsMiddleware } from '@/lib/middleware'
import type { AuthData } from '@/server/db/zero-permissions.ts'
import { schema } from '@/server/db/zero-schema.gen'
import { createServerMutators } from '@/server/db/zero-server-mutators.ts'
import {
	PostgresJSConnection,
	PushProcessor,
	ZQLDatabase,
} from '@rocicorp/zero/pg'
import { createServerFileRoute } from '@tanstack/react-start/server'
import postgres from 'postgres'

// Create a single postgres client at module scope
// This client will be reused across all requests
const sql = process.env.ZERO_UPSTREAM_DB
	? postgres(process.env.ZERO_UPSTREAM_DB, {
			max: 10, // Increase pool size for better concurrency
			idle_timeout: 30, // Close idle connections after 30 seconds
			ssl: false,
		})
	: null

// Create a single PushProcessor instance at module scope
const database = sql
	? new ZQLDatabase(new PostgresJSConnection(sql), schema)
	: null
const processor = database ? new PushProcessor(database) : null

export const ServerRoute = createServerFileRoute('/api/push').methods(
	(api) => ({
		POST: api
			.middleware([corsMiddleware, authMiddleware])
			.handler(async ({ request, context }) => {
				try {
					// 1) Read query params + body
					const url = new URL(request.url)
					const query = Object.fromEntries(url.searchParams.entries())
					const bodyText = await request.text()
					const body = JSON.parse(bodyText)

					// 2) Validate SQL client is available
					if (!sql || !processor) {
						throw new Error(
							'Database client not initialized. Check ZERO_UPSTREAM_DB env variable.',
						)
					}

					// 3) Get auth data from context (set by authMiddleware)
					const authData = context.authData as AuthData

					// 4) Call process()
					const result = await processor.process(
						createServerMutators(authData),
						query,
						body,
					)

					// 5) Return JSON
					return new Response(JSON.stringify(result), {
						headers: {
							'Content-Type': 'application/json',
						},
					})
				} catch (error) {
					console.error('🟥 Push endpoint error:', error)
					return new Response(
						JSON.stringify({
							error: true,
							details: error instanceof Error ? error.message : 'Unknown error',
						}),
						{
							status: 500,
							headers: {
								'Content-Type': 'application/json',
							},
						},
					)
				}
			}),
	}),
)

export { processor, sql }
