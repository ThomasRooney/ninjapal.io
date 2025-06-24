import type { AuthData } from '@/server/db/zero-permissions.ts'
import type { Schema } from '@/server/db/zero-schema.gen'
import { createSharedMutators } from '@/server/db/zero-shared-mutators.ts'
import type { CustomMutatorDefs, Transaction } from '@rocicorp/zero'

/**
 * Server mutators that extend shared mutators with server-specific logic
 * Following the zbugs pattern of delegation + additional server operations
 */
export function createServerMutators(
	authData: AuthData,
): CustomMutatorDefs<Schema> {
	const sharedMutators = createSharedMutators(authData)

	return {
		persons: {
			async insert(
				tx: Transaction<Schema>,
				args: { id: string; name: string },
			) {
				// Delegate to shared mutator for core logic
				await sharedMutators.persons.insert(tx, args)

				// Add server-specific logic here if needed
				// e.g. logging, notifications, analytics, etc.
				console.log(`[Server] Person created: ${args.name} (${args.id})`)
			},
			async delete(tx: Transaction<Schema>, args: { id: string }) {
				// Delegate to shared mutator
				await sharedMutators.persons.delete(tx, args)

				// Add server-specific logic
				console.log(`[Server] Person deleted: ${args.id}`)
			},
			async deleteMany(tx: Transaction<Schema>, args: { ids: string[] }) {
				// Delegate to shared mutator
				await sharedMutators.persons.deleteMany(tx, args)

				// Add server-specific logic
				console.log(`[Server] Persons deleted: ${args.ids.length} items`)
			},
		},
		users: {
			async create(
				tx: Transaction<Schema>,
				u: { id: string; email: string; name: string },
			) {
				// Delegate to shared mutator
				await sharedMutators.users.create(tx, u)

				// Add server-specific logic
				console.log(`[Server] User created: ${u.email} (${u.id})`)
			},
			async delete(tx: Transaction<Schema>, args: { id: string }) {
				// Delegate to shared mutator
				await sharedMutators.users.delete(tx, args)

				// Add server-specific logic
				console.log(`[Server] User deleted: ${args.id}`)
			},
			async upsert(
				tx: Transaction<Schema>,
				args: { id: string; email: string; name: string },
			) {
				// Delegate to shared mutator
				await sharedMutators.users.upsert(tx, args)

				// Add server-specific logic
				console.log(`[Server] User upserted: ${args.email} (${args.id})`)
			},
		},
		ninjaConnections: {
			async upsert(
				tx: Transaction<Schema>,
				args: {
					userId: string
					username: string
					password: string
					attempts?: number
				},
			) {
				// Delegate to shared mutator
				await sharedMutators.ninjaConnections.upsert(tx, args)

				// Add server-specific logic
				console.log(
					`[Server] Ninja connection upserted for user: ${args.userId}`,
				)
			},
			async updateTokens(
				tx: Transaction<Schema>,
				args: {
					userId: string
					oauthAccessToken?: string | null
					oauthRefreshToken?: string | null
					oauthExpiresAt?: number | null
					aylaAccessToken?: string | null
					aylaRefreshToken?: string | null
					aylaExpiresAt?: number | null
				},
			) {
				// Delegate to shared mutator
				await sharedMutators.ninjaConnections.updateTokens(tx, args)

				// Add server-specific logic
				console.log(`[Server] Ninja tokens updated for user: ${args.userId}`)
			},
			async incrementAttempts(
				tx: Transaction<Schema>,
				args: { userId: string },
			) {
				// Delegate to shared mutator
				await sharedMutators.ninjaConnections.incrementAttempts(tx, args)

				// Add server-specific logic
				console.log(
					`[Server] Ninja connection attempts incremented for user: ${args.userId}`,
				)
			},
			async validateAndRefreshCredentials(
				tx: Transaction<Schema>,
				args: { userId: string },
			) {
				// Import the NinjaAuthManager
				const { NinjaAuthManager } = await import(
					'@/ninjaAuth/ninja-auth-manager.ts'
				)

				// Get the connection from the database
				const connection = await tx.query.ninjaConnections
					.where('userId', args.userId)
					.one()
					.run()
				if (!connection) {
					throw new Error('No connection found for user')
				}

				if (!connection.username || !connection.password) {
					throw new Error('Credentials not set')
				}

				try {
					// Create auth manager instance with the user's credentials
					const authManager = NinjaAuthManager.getInstance({
						email: connection.username,
						password: connection.password,
					})

					// Clear any existing state to force fresh authentication
					await authManager.clearState()

					// First attempt to get ID token (OAuth) - this tests login credentials
					await authManager.getIDToken()

					// Login credentials work! Save OAuth tokens
					let authState = authManager.getState()
					await sharedMutators.ninjaConnections.updateTokens(tx, {
						userId: args.userId,
						oauthAccessToken: authState.oauthTokens?.accessToken || null,
						oauthRefreshToken: authState.oauthTokens?.refreshToken || null,
						oauthExpiresAt: authState.oauthTokens?.expiresAt || null,
					})

					// Reset attempts since login worked
					await tx.mutate.ninjaConnections.update({
						userId: args.userId,
						attempts: 0,
					})

					// If ID token succeeds, then try to get API token
					try {
						await authManager.getAPIToken()

						// Get updated state with Ayla tokens
						authState = authManager.getState()

						// Save Ayla tokens
						await sharedMutators.ninjaConnections.updateTokens(tx, {
							userId: args.userId,
							aylaAccessToken: authState.aylaToken?.accessToken || null,
							aylaRefreshToken: authState.aylaToken?.refreshToken || null,
							aylaExpiresAt: authState.aylaToken?.expiresAt || null,
						})
					} catch (aylaError) {
						// Log Ayla error but don't fail - OAuth login still worked
						console.warn(
							`[Server] Ayla token acquisition failed for user ${args.userId}, but OAuth succeeded`,
							aylaError,
						)
					}

					console.log(
						`[Server] Ninja connection tested successfully for user: ${args.userId}`,
					)
				} catch (error) {
					// Increment attempts on failure
					await tx.mutate.ninjaConnections.update({
						userId: args.userId,
						attempts: (connection.attempts || 0) + 1,
						updatedAt: Date.now(),
					})

					console.error(
						`[Server] Ninja connection test failed for user: ${args.userId}`,
						error,
					)

					throw new Error(
						`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					)
				}
			},
		},
	}
}
