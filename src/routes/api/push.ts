import { authMiddleware, corsMiddleware } from '@/lib/middleware'
import { getSql } from '@/server/db/client'
import type { AuthData } from '@/server/db/zero-permissions.ts'
import { schema } from '@/server/db/zero-schema.gen'
import { createServerMutators } from '@/server/db/zero-server-mutators.ts'
import {
	PostgresJSConnection,
	PushProcessor,
	ZQLDatabase,
} from '@rocicorp/zero/pg'
import { createFileRoute } from '@tanstack/react-router'

// Create a single postgres client at module scope
// This client will be reused across all requests
// (sslmode comes from the connection string — required for Neon, absent locally)
const sql = process.env.ZERO_UPSTREAM_DB ? getSql() : null

// Create a single PushProcessor instance at module scope
const database = sql
	? new ZQLDatabase(new PostgresJSConnection(sql), schema)
	: null
const processor = database ? new PushProcessor(database) : null

export const Route = createFileRoute('/api/push')({
	server: {
		middleware: [corsMiddleware, authMiddleware],
		handlers: {
			POST: async ({ request, context }) => {
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
			},
		},
	},
})

export { processor, sql }
