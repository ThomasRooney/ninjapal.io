import { db } from '@/server/db'
import { ninjaConnections } from '@/server/db/schema/ninja'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const upsertSchema = z.object({
	userId: z.string().uuid(),
	username: z.string().min(1),
	password: z.string().min(1),
})

export const APIRoute = createAPIFileRoute('/api/ninja-connections/upsert')({
	POST: async ({ request }) => {
		try {
			// Parse and validate request body
			const body = await request.json()
			const data = upsertSchema.parse(body)

			// Check if connection already exists
			const existing = await db
				.select()
				.from(ninjaConnections)
				.where(eq(ninjaConnections.userId, data.userId))
				.limit(1)

			if (existing.length > 0) {
				// Update existing connection
				await db
					.update(ninjaConnections)
					.set({
						username: data.username,
						password: data.password,
						updatedAt: new Date(),
					})
					.where(eq(ninjaConnections.userId, data.userId))
			} else {
				// Insert new connection
				await db.insert(ninjaConnections).values({
					userId: data.userId,
					username: data.username,
					password: data.password,
					attempts: 0,
				})
			}

			return Response.json({ success: true })
		} catch (error) {
			console.error('Error upserting ninja connection:', error)

			if (error instanceof z.ZodError) {
				return Response.json(
					{ error: 'Invalid request data', details: error.errors },
					{ status: 400 },
				)
			}

			return Response.json(
				{ error: 'Failed to save ninja connection' },
				{ status: 500 },
			)
		}
	},
})
