import { getDb } from '@/server/db/client'
import * as authSchema from '@/server/db/schema/auth'
import {
	sendMagicLinkEmail,
	sendVerificationEmail,
} from '@/server/email/auth-emails'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, magicLink } from 'better-auth/plugins'

/**
 * Server-side better-auth instance. Sessions are cookie-based; the Zero JWT
 * is minted separately (see zero-jwt.ts) so zero-cache keeps validating with
 * ZERO_AUTH_SECRET exactly as before.
 *
 * Login methods: email+password, magic link (Resend), and Google OAuth
 * (callback URL: {BETTER_AUTH_URL}/api/auth/callback/google — must be
 * registered in the Google Cloud Console OAuth client).
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
	emailVerification: {
		// Verify-your-email mail goes out on signup, but login is not gated on
		// it (flipping requireEmailVerification on later is a one-liner).
		sendOnSignUp: true,
		sendVerificationEmail: async ({ user, url }) => {
			await sendVerificationEmail(user, url)
		},
	},
	...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
		? {
				socialProviders: {
					google: {
						clientId: process.env.GOOGLE_CLIENT_ID,
						clientSecret: process.env.GOOGLE_CLIENT_SECRET,
					},
				},
			}
		: {}),
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				await sendMagicLinkEmail(email, url)
			},
		}),
		admin(),
	],
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
