import { getDb } from '@/server/db/client'
import * as authSchema from '@/server/db/schema/auth'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

/**
 * Server-side better-auth instance. Sessions are cookie-based; the Zero JWT
 * is minted separately (see zero-jwt.ts) so zero-cache keeps validating with
 * ZERO_AUTH_SECRET exactly as before.
 */
export const auth = betterAuth({
	database: drizzleAdapter(getDb(), {
		provider: 'pg',
		schema: authSchema,
	}),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
	},
	user: {
		deleteUser: {
			enabled: true,
		},
	},
	advanced: {
		database: {
			// UUIDs keep authData.sub compatible with uuid columns (devices.user_id)
			generateId: () => crypto.randomUUID(),
		},
	},
})
