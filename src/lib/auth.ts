import { getDb } from '@/server/db/client'
import * as authSchema from '@/server/db/schema/auth'
import {
	sendMagicLinkEmail,
	sendVerificationEmail,
} from '@/server/email/auth-emails'
import { oauthProvider } from '@better-auth/oauth-provider'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, jwt, magicLink } from 'better-auth/plugins'

/** OAuth scopes external MCP clients can request. */
export const MCP_SCOPES = ['pitminder:read', 'pitminder:control'] as const

/**
 * The single OAuth resource identifier (JWT audience) for the MCP endpoint.
 * Per environment: prod default below, dev overrides via PITMINDER_MCP_RESOURCE
 * (http://localhost:5173/api/mcp in .env).
 */
export const MCP_RESOURCE =
	process.env.PITMINDER_MCP_RESOURCE ?? 'https://app.pitminder.com/api/mcp'

/**
 * OAuth issuer — better-auth's baseURL (origin + basePath). Must match the
 * `iss` claim the jwt plugin signs into access tokens.
 */
export function getAuthIssuer(): string {
	const origin = process.env.BETTER_AUTH_URL ?? new URL(MCP_RESOURCE).origin
	return `${origin.replace(/\/+$/, '')}/api/auth`
}

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
		// jwt() supplies the JWKS the oauthProvider signs access tokens with
		// (served at /api/auth/jwks). Keys live in the jwks table.
		jwt(),
		oauthProvider({
			loginPage: '/auth/login',
			consentPage: '/consent',
			scopes: [...MCP_SCOPES],
			allowDynamicClientRegistration: true,
			allowUnauthenticatedClientRegistration: true,
			clientRegistrationDefaultScopes: ['pitminder:read'],
			clientRegistrationAllowedScopes: [...MCP_SCOPES],
			// SECURITY INVARIANT (GHSA-p2fr-6hmx-4528, unpatched on 1.6.x): the
			// advisory's own workaround is a single-entry validAudiences list.
			// With multiple audiences a token minted for one resource can be
			// replayed against another. This list MUST contain exactly ONE
			// entry — the MCP resource for this environment. Never add a second.
			validAudiences: [MCP_RESOURCE],
			// Root well-known routes are mounted explicitly in
			// src/routes/[.]well-known/ — silence the startup reminder.
			silenceWarnings: { oauthAuthServerConfig: true },
		}),
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
