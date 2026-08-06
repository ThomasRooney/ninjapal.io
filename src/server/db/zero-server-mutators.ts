import { createLogger } from '@/lib/log.ts'
import type { EnhancedAuthState } from '@/ninjaAuth/types.ts'
import { buildDeviceData } from '@/server/db/build-device-data'
import { createJsonMergePatch } from '@/server/db/utils/json-merge-patch'
import type { AuthData } from '@/server/db/zero-permissions.ts'
import type { Schema } from '@/server/db/zero-schema.gen'
import { createSharedMutators } from '@/server/db/zero-shared-mutators.ts'
import type {
	CustomMutatorDefs,
	ServerTransaction,
	Transaction,
} from '@rocicorp/zero'

const log = createLogger('zero-server-mutators')

/**
 * Narrows a mutator transaction to the server transaction so we can run raw
 * SQL against the upstream Postgres. Ninja credentials and cloud tokens are
 * excluded from the Zero schema (they must never sync to browsers), so all
 * server-side reads/writes of those columns go through this escape hatch.
 */
function asServerTx(
	tx: Transaction<Schema>,
): ServerTransaction<Schema, unknown> {
	if (tx.location !== 'server') {
		throw new Error('This mutator only runs on the server')
	}
	return tx
}

type NinjaCredentialRow = {
	username: string
	password: string
	attempts: number
	oauthAccessToken: string | null
	oauthRefreshToken: string | null
	oauthExpiresAt: number | null
	aylaAccessToken: string | null
	aylaRefreshToken: string | null
	aylaExpiresAt: number | null
}

/** Epoch millis from a Postgres timestamptz value (Date or string), else null. */
function toMillis(value: unknown): number | null {
	if (value == null) return null
	const ms = new Date(value as string | Date).getTime()
	return Number.isNaN(ms) ? null : ms
}

/**
 * Reads the full credential row (including the Zero-excluded password/token
 * columns) with raw SQL inside the mutator's transaction.
 * Exported for unit tests.
 */
export async function readNinjaCredentials(
	tx: Transaction<Schema>,
	userId: string,
): Promise<NinjaCredentialRow | null> {
	const rows = await asServerTx(tx).dbTransaction.query(
		`select username, password, attempts,
		        oauth_access_token, oauth_refresh_token, oauth_expires_at,
		        ayla_access_token, ayla_refresh_token, ayla_expires_at
		   from ninja_connections
		  where user_id = $1`,
		[userId],
	)
	const row = [...rows][0]
	if (!row) return null
	return {
		username: row.username as string,
		password: row.password as string,
		attempts: (row.attempts as number | null) ?? 0,
		oauthAccessToken: (row.oauth_access_token as string | null) ?? null,
		oauthRefreshToken: (row.oauth_refresh_token as string | null) ?? null,
		oauthExpiresAt: toMillis(row.oauth_expires_at),
		aylaAccessToken: (row.ayla_access_token as string | null) ?? null,
		aylaRefreshToken: (row.ayla_refresh_token as string | null) ?? null,
		aylaExpiresAt: toMillis(row.ayla_expires_at),
	}
}

const TOKEN_COLUMNS = {
	oauthAccessToken: { column: 'oauth_access_token', timestamp: false },
	oauthRefreshToken: { column: 'oauth_refresh_token', timestamp: false },
	oauthExpiresAt: { column: 'oauth_expires_at', timestamp: true },
	aylaAccessToken: { column: 'ayla_access_token', timestamp: false },
	aylaRefreshToken: { column: 'ayla_refresh_token', timestamp: false },
	aylaExpiresAt: { column: 'ayla_expires_at', timestamp: true },
} as const

type NinjaTokenUpdate = {
	[K in keyof typeof TOKEN_COLUMNS]?: (typeof TOKEN_COLUMNS)[K] extends {
		timestamp: true
	}
		? number | null
		: string | null
}

/**
 * Writes OAuth/Ayla tokens with raw SQL. Only keys present in `updates` are
 * written; expiry values are epoch millis. Replaces the old shared-mutator
 * `updateTokens` path — tokens are no longer part of the Zero schema.
 * Exported for unit tests.
 */
export async function writeNinjaTokens(
	tx: Transaction<Schema>,
	userId: string,
	updates: NinjaTokenUpdate,
): Promise<void> {
	const sets: string[] = ['updated_at = now()']
	const params: (string | number | null)[] = [userId]
	for (const [key, spec] of Object.entries(TOKEN_COLUMNS)) {
		const value = updates[key as keyof NinjaTokenUpdate]
		if (value === undefined) continue
		params.push(value)
		sets.push(
			spec.timestamp
				? `${spec.column} = to_timestamp($${params.length} / 1000.0)`
				: `${spec.column} = $${params.length}`,
		)
	}
	await asServerTx(tx).dbTransaction.query(
		`update ninja_connections set ${sets.join(', ')} where user_id = $1`,
		params,
	)
}

/**
 * Server mutators that extend shared mutators with server-specific logic
 * Following the zbugs pattern of delegation + additional server operations
 */
export function createServerMutators(
	authData: AuthData,
): CustomMutatorDefs<Schema> {
	const sharedMutators = createSharedMutators(authData)

	return {
		deviceCommands: {
			async create(
				tx,
				args: {
					id: string
					deviceId: string
					kind:
						| 'set_pit_temp'
						| 'hold_warm'
						| 'start_sim_cook'
						| 'stop_sim_cook'
					payload: { setpointC?: number; reason?: string }
				},
			) {
				await sharedMutators.deviceCommands.create(tx, args)
			},
		},
		cookMessages: {
			async respond(tx, args: { id: string; response?: string }) {
				await sharedMutators.cookMessages.respond(tx, args)
			},
		},
		cookSessions: {
			async rename(tx, args: { id: string; name: string }) {
				await sharedMutators.cookSessions.rename(tx, args)
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
				args: { email: string; name: string; prefers_celsius?: boolean },
			) {
				// Delegate to shared mutator
				await sharedMutators.users.upsert(tx, args)

				// Add server-specific logic
				console.log(`[Server] User upserted: ${args.email} (${authData.sub})`)
			},
			async update(
				tx: Transaction<Schema>,
				args: { id: string; name?: string; prefers_celsius?: boolean },
			) {
				// Delegate to shared mutator
				await sharedMutators.users.update(tx, args)

				// Add server-specific logic
				const updatedFields = Object.keys(args).join(', ')
				console.log(
					`[Server] User updated fields: ${updatedFields} for user: ${authData.sub}`,
				)
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
				if (!authData.sub) throw new Error('Not authenticated')

				// Ensure users can only upsert their own connection
				if (args.userId !== authData.sub) {
					throw new Error("Cannot modify another user's connection.")
				}

				// The password column is excluded from the Zero schema (never
				// synced to browsers), so the whole upsert happens with raw SQL —
				// a ZQL insert without the NOT NULL password would fail anyway.
				await asServerTx(tx).dbTransaction.query(
					`insert into ninja_connections (user_id, username, password, attempts, updated_at)
					 values ($1, $2, $3, $4, now())
					 on conflict (user_id) do update
					    set username = excluded.username,
					        password = excluded.password,
					        attempts = excluded.attempts,
					        updated_at = now()`,
					[args.userId, args.username, args.password, args.attempts ?? 0],
				)

				log.info('ninja connection upserted', { userId: args.userId })
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
				// Delegate to shared mutator for the own-connection permission check
				await sharedMutators.ninjaConnections.validateAndRefreshCredentials(
					tx,
					args,
				)

				// Import the NinjaAuthManager
				const { NinjaAuthManager } = await import(
					'@/ninjaAuth/ninja-auth-manager.ts'
				)

				// Credentials are excluded from the Zero schema, so read them with
				// raw SQL inside this transaction.
				const connection = await readNinjaCredentials(tx, args.userId)
				if (!connection) {
					throw new Error('No connection found for user')
				}

				if (!connection.username || !connection.password) {
					throw new Error('Credentials not set')
				}

				try {
					// Create auth manager instance with the user's credentials
					const authManager = NinjaAuthManager.create({
						email: connection.username,
						password: connection.password,
					})

					// Clear any existing state to force fresh authentication
					await authManager.clearState()

					// First attempt to get ID token (OAuth) - this tests login credentials
					await authManager.getIDToken()

					// Login credentials work! Save OAuth tokens
					let authState = authManager.getState()
					await writeNinjaTokens(tx, args.userId, {
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
						await writeNinjaTokens(tx, args.userId, {
							aylaAccessToken: authState.aylaToken?.accessToken || null,
							aylaRefreshToken: authState.aylaToken?.refreshToken || null,
							aylaExpiresAt: authState.aylaToken?.expiresAt || null,
						})
					} catch (aylaError) {
						// Log Ayla error but don't fail - OAuth login still worked
						log.warn(
							`Ayla token acquisition failed for user ${args.userId}, but OAuth succeeded`,
							aylaError,
						)
					}

					log.info(
						`ninja connection tested successfully for user: ${args.userId}`,
					)
				} catch (error) {
					// Increment attempts on failure
					await tx.mutate.ninjaConnections.update({
						userId: args.userId,
						attempts: (connection.attempts || 0) + 1,
						updatedAt: Date.now(),
					})

					log.error(
						`ninja connection test failed for user: ${args.userId}`,
						error,
					)

					throw new Error(
						`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					)
				}
			},
		},
		devices: {
			async refreshFakeData(tx: Transaction<Schema>) {
				// Delegate to shared mutator
				await sharedMutators.devices.refreshFakeData(tx)

				// Add server-specific logic
				console.log(`[Server] Fake devices refreshed for user: ${authData.sub}`)
			},
			async syncRealDevices(tx: Transaction<Schema>) {
				if (!authData.sub) {
					throw new Error('Not authenticated')
				}
				const userId = authData.sub // TypeScript now knows this is not null

				try {
					// Get the connection from the database. Credentials/tokens are
					// excluded from the Zero schema, so read them with raw SQL.
					const connection = await readNinjaCredentials(tx, userId)

					if (!connection) {
						throw new Error('No connection found for user')
					}

					if (!connection.username || !connection.password) {
						throw new Error('Credentials not set')
					}

					// Import the NinjaAuthManager and property mappings
					const { NinjaAuthManager } = await import(
						'@/ninjaAuth/ninja-auth-manager.ts'
					)

					// Create auth manager instance with stored state if available
					const initialState: EnhancedAuthState = {}

					if (
						connection.oauthAccessToken &&
						connection.oauthRefreshToken &&
						connection.oauthExpiresAt
					) {
						initialState.oauthTokens = {
							accessToken: connection.oauthAccessToken,
							idToken: '', // We don't store this, will be refreshed
							refreshToken: connection.oauthRefreshToken,
							expiresAt: connection.oauthExpiresAt,
						}
					}

					if (connection.aylaAccessToken && connection.aylaExpiresAt) {
						initialState.aylaToken = {
							accessToken: connection.aylaAccessToken,
							refreshToken: connection.aylaRefreshToken || undefined,
							expiresAt: connection.aylaExpiresAt,
						}
					}

					const authManager = NinjaAuthManager.create(
						{
							email: connection.username,
							password: connection.password,
						},
						initialState,
					)

					// Get API token (will refresh if expired)
					const apiToken = await authManager.getAPIToken()

					// Check if state changed and update DB if needed
					const newState = authManager.getState()
					if (
						newState.aylaToken?.accessToken !== connection.aylaAccessToken ||
						newState.aylaToken?.expiresAt !== connection.aylaExpiresAt
					) {
						await writeNinjaTokens(tx, userId, {
							aylaAccessToken: newState.aylaToken?.accessToken || null,
							aylaRefreshToken: newState.aylaToken?.refreshToken || null,
							aylaExpiresAt: newState.aylaToken?.expiresAt || null,
						})
					}

					// Prepare headers for API calls
					const headers = {
						authorization: `auth_token ${apiToken}`,
						accept: 'application/json',
						'user-agent':
							'Dalvik/2.1.0 (Linux; U; Android 16; sdk_gphone64_arm64 Build/BP22.250325.006)',
					}

					// Fetch devices
					const devicesResponse = await fetch(
						'https://ads-eu.aylanetworks.com/apiv1/devices.json',
						{ headers },
					)

					if (!devicesResponse.ok) {
						throw new Error(
							`Failed to fetch devices: ${devicesResponse.status} ${devicesResponse.statusText}`,
						)
					}

					const devicesData = await devicesResponse.json()

					// Fetch properties for each device concurrently
					interface DeviceWrapper {
						device: {
							dsn: string
							product_name?: string
							model?: string
							mac?: string
							lan_ip?: string
							connection_status?: string
							[key: string]: unknown
						}
					}
					const propertyPromises = devicesData.map(
						async (deviceWrapper: DeviceWrapper) => {
							const device = deviceWrapper.device
							try {
								const propsResponse = await fetch(
									`https://ads-eu.aylanetworks.com/apiv1/dsns/${device.dsn}/properties.json`,
									{ headers },
								)
								if (propsResponse.ok) {
									const propsData = await propsResponse.json()
									return { device, properties: propsData }
								}
								return { device, properties: null }
							} catch (error) {
								console.warn(
									`Failed to fetch properties for device ${device.dsn}:`,
									error,
								)
								return { device, properties: null }
							}
						},
					)

					const propertyResults = await Promise.allSettled(propertyPromises)

					// Log any failures
					const failedCount = propertyResults.filter(
						(r) => r.status === 'rejected',
					).length
					if (failedCount > 0) {
						console.warn(
							`[Server] Failed to fetch properties for ${failedCount} devices`,
						)
					}

					// Extract successful results
					const devicesWithProperties = propertyResults
						.filter(
							(
								result,
							): result is PromiseFulfilledResult<{
								device: DeviceWrapper['device']
								properties: unknown
							}> => result.status === 'fulfilled',
						)
						.map((result) => result.value)

					// Insert new devices
					for (const { device, properties } of devicesWithProperties) {
						const deviceData = buildDeviceData(device, properties, userId)
						// Check if device already exists
						const existingDevice = await tx.query.devices
							.where('dsn', device.dsn)
							.where('userId', userId)
							.one()
							.run()

						if (existingDevice?.id) {
							// Update existing device - history tracking happens in the update mutator
							const { id, ...dataWithoutId } = deviceData
							// Call the shared mutator to update the device
							await sharedMutators.devices.update(tx, {
								id: existingDevice.id,
								data: dataWithoutId,
							})

							// Track history for the update
							const currentDevice = await tx.query.devices
								.where('id', existingDevice.id)
								.one()
								.run()

							if (currentDevice) {
								// Check if we already have a snapshot for this minute. Local
								// validation commonly relies on one sample per worker cycle.
								const currentMinute = new Date()
								currentMinute.setSeconds(0, 0)
								const recentHistory = await tx.query.deviceHistory
									.where('deviceId', existingDevice.id)
									.orderBy('recordedAt', 'desc')
									.limit(120)
									.run()

								// Find if there's already a snapshot in the current minute.
								const currentMinuteSnapshot = recentHistory.find(
									(h) =>
										h.historyType === 'snapshot' &&
										h.recordedAt &&
										new Date(h.recordedAt).getTime() >= currentMinute.getTime(),
								)

								if (currentMinuteSnapshot) {
									// We have a snapshot, so create a patch from the old state to the new state.
									const patch = createJsonMergePatch(
										existingDevice as Record<string, unknown>,
										currentDevice as Record<string, unknown>,
									)

									// Only insert if there are actual changes
									if (Object.keys(patch).length > 0) {
										await tx.mutate.deviceHistory.insert(
											// id is DB-generated (identity); zero insert type wrongly requires it
											{
												deviceId: existingDevice.id,
												userId,
												historyType: 'patch',
												changes: patch,
												changedBy: userId,
											} as unknown as Parameters<
												typeof tx.mutate.deviceHistory.insert
											>[0],
										)
									}
								} else {
									// No recent snapshot, so create a new one with the current state.
									await tx.mutate.deviceHistory.insert(
										// id is DB-generated (identity); zero insert type wrongly requires it
										{
											deviceId: existingDevice.id,
											userId,
											historyType: 'snapshot',
											changes: currentDevice, // The snapshot is the full new state
											changedBy: userId,
										} as unknown as Parameters<
											typeof tx.mutate.deviceHistory.insert
										>[0],
									)
								}
							}
						} else {
							// Insert new device
							await tx.mutate.devices.insert(
								deviceData as Parameters<typeof tx.mutate.devices.insert>[0],
							)

							// For new devices, create an initial snapshot
							const newDevice = await tx.query.devices
								.where('dsn', device.dsn)
								.where('userId', userId)
								.one()
								.run()

							if (newDevice?.id) {
								await tx.mutate.deviceHistory.insert(
									// id is DB-generated (identity); zero insert type wrongly requires it
									{
										deviceId: newDevice.id,
										userId,
										historyType: 'snapshot',
										changes: deviceData,
										changedBy: userId,
									} as unknown as Parameters<
										typeof tx.mutate.deviceHistory.insert
									>[0],
								)
							}
						}
					}

					console.log(
						`[Server] Synced ${devicesWithProperties.length} real devices for user: ${userId}`,
					)
				} catch (error) {
					console.error('[Server] syncRealDevices error:', error)

					// Check if this is a permanent auth error
					const errorMessage =
						error instanceof Error ? error.message : String(error)
					const isPermanentAuthError =
						errorMessage.includes('OAuth token exchange failed') ||
						errorMessage.includes('Invalid credentials') ||
						errorMessage.includes('Authentication failed') ||
						errorMessage.includes('Refresh token expired') ||
						errorMessage.includes('Invalid refresh token')

					if (isPermanentAuthError) {
						log.info('permanent auth error detected, clearing tokens', {
							userId,
						})
						// Clear the tokens to stop future polling attempts
						await writeNinjaTokens(tx, userId, {
							aylaAccessToken: null,
							aylaRefreshToken: null,
							aylaExpiresAt: null,
							oauthAccessToken: null,
							oauthRefreshToken: null,
							oauthExpiresAt: null,
						})
					}

					// Re-throw the error so the client knows the sync failed
					throw error
				}
			},
			async update(
				tx: Transaction<Schema>,
				args: { id: string; data: Record<string, unknown> },
			) {
				// Get the current device state before update
				const currentDevice = await tx.query.devices
					.where('id', args.id)
					.one()
					.run()

				if (!currentDevice) {
					throw new Error('Device not found')
				}

				// Delegate to shared mutator for permission checks and update
				await sharedMutators.devices.update(tx, args)

				// Check if we already have a snapshot for this minute.
				const currentMinute = new Date()
				currentMinute.setSeconds(0, 0)
				const recentHistory = await tx.query.deviceHistory
					.where('deviceId', args.id)
					.orderBy('recordedAt', 'desc')
					.limit(120)
					.run()

				// Find if there's already a snapshot in the current minute.
				const currentMinuteSnapshot = recentHistory.find(
					(h) =>
						h.historyType === 'snapshot' &&
						h.recordedAt &&
						new Date(h.recordedAt).getTime() >= currentMinute.getTime(),
				)

				// Merge current state with updates to get the new state
				const newState = {
					...currentDevice,
					...args.data,
					updatedAt: Date.now(),
				}

				if (currentMinuteSnapshot) {
					// We already have a snapshot for this minute, create a patch.
					const patch = createJsonMergePatch(
						currentDevice as Record<string, unknown>,
						newState as Record<string, unknown>,
					)

					// Only insert if there are actual changes
					if (Object.keys(patch).length > 0) {
						await tx.mutate.deviceHistory.insert(
							// id is DB-generated (identity); zero insert type wrongly requires it
							{
								deviceId: args.id,
								userId: currentDevice.userId,
								historyType: 'patch',
								changes: patch,
								changedBy: authData.sub,
							} as unknown as Parameters<
								typeof tx.mutate.deviceHistory.insert
							>[0],
						)
					}
				} else {
					// First update of the minute, create a snapshot.
					await tx.mutate.deviceHistory.insert(
						// id is DB-generated (identity); zero insert type wrongly requires it
						{
							deviceId: args.id,
							userId: currentDevice.userId,
							historyType: 'snapshot',
							changes: newState,
							changedBy: authData.sub,
						} as unknown as Parameters<
							typeof tx.mutate.deviceHistory.insert
						>[0],
					)
				}

				console.log(
					`[Server] Device ${args.id} updated with minute snapshot/patch pattern`,
				)
			},
		},
	}
}
