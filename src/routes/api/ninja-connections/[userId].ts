import { db } from '@/server/db'
import { ninjaConnections } from '@/server/db/schema/ninja'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const APIRoute = createAPIFileRoute('/api/ninja-connections/[userId]')({
	GET: async ({ params }) => {
		try {
			const userId = z.string().uuid().parse(params.userId)

			const connection = await db
				.select()
				.from(ninjaConnections)
				.where(eq(ninjaConnections.userId, userId))
				.limit(1)

			if (connection.length === 0) {
				return Response.json(null)
			}

			// Return connection data but exclude sensitive tokens for this endpoint
			const {
				oauthAccessToken,
				oauthRefreshToken,
				aylaAccessToken,
				aylaRefreshToken,
				...safeData
			} = connection[0]

			return Response.json(safeData)
		} catch (error) {
			console.error('Error fetching ninja connection:', error)

			if (error instanceof z.ZodError) {
				return Response.json({ error: 'Invalid user ID' }, { status: 400 })
			}

			return Response.json(
				{ error: 'Failed to fetch ninja connection' },
				{ status: 500 },
			)
		}
	},
})
