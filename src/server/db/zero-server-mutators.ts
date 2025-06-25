import type { EnhancedAuthState } from '@/ninjaAuth/types.ts'
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
					await tx.query.ninjaConnections.one()

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

				// Get the connection from the database
				const connection = await tx.query.ninjaConnections
					.where('userId', authData.sub)
					.one()
					.run()

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
				const { DEVICE_PROPERTY_MAPPINGS } = await import(
					'@/server/db/device-property-mappings.ts'
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
					await sharedMutators.ninjaConnections.updateTokens(tx, {
						userId: authData.sub,
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

				// Delete existing devices for this user
				const existingDevices = await tx.query.devices
					.where('userId', authData.sub)
					.run()

				for (const device of existingDevices) {
					await tx.mutate.devices.delete({ id: device.id })
				}

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
					// Transform properties array into a more useful object format
					const propertiesMap: Record<string, unknown> = {}
					if (properties && Array.isArray(properties)) {
						for (const propWrapper of properties) {
							const prop = propWrapper.property
							if (prop?.name) {
								propertiesMap[prop.name] = {
									value: prop.value,
									type: prop.type,
									base_type: prop.base_type,
									updated_at: prop.data_updated_at,
								}
							}
						}
					}

					// Create filtered properties map that excludes mapped properties
					const filteredPropertiesMap = Object.fromEntries(
						Object.entries(propertiesMap).filter(
							([propName]) => !DEVICE_PROPERTY_MAPPINGS[propName],
						),
					)

					// Define keys that are already handled as dedicated columns
					const handledTopLevelKeys = new Set([
						'dsn',
						'product_name',
						'model',
						'mac',
						'lan_ip',
						'connection_status',
						'properties', // Original properties array from API
					])

					// Extract only unmapped device fields
					const unmappedApiFields = Object.fromEntries(
						Object.entries(device).filter(
							([key]) => !handledTopLevelKeys.has(key),
						),
					)

					// Build clean additionalDeviceProperties without duplication
					const additionalDeviceProperties = {
						...unmappedApiFields,
						properties: filteredPropertiesMap,
						lastSyncedAt: new Date().toISOString(),
					}

					// Build device data with mapped properties
					const deviceData: Record<string, unknown> = {
						id: crypto.randomUUID(),
						userId: authData.sub,
						dsn: device.dsn,
						productName: device.product_name || null,
						model: device.model || null,
						mac: device.mac || null,
						lanIp: device.lan_ip || null,
						connectionStatus: device.connection_status || 'unknown',
						additionalDeviceProperties,
						createdAt: Date.now(),
						updatedAt: Date.now(),
					}

					// Map each property to its corresponding column
					for (const [propName, propData] of Object.entries(propertiesMap)) {
						const mapping = DEVICE_PROPERTY_MAPPINGS[propName]
						if (mapping) {
							const { columnName, dataType } = mapping
							const propValue = (propData as Record<string, unknown>).value

							// Convert value based on data type
							let convertedValue = null
							if (propValue !== null && propValue !== undefined) {
								switch (dataType) {
									case 'integer':
										convertedValue =
											typeof propValue === 'number'
												? propValue
												: Number.parseInt(propValue as string)
										break
									case 'numeric':
										convertedValue =
											typeof propValue === 'number'
												? propValue
												: Number.parseFloat(propValue as string)
										break
									case 'boolean':
										convertedValue =
											typeof propValue === 'boolean'
												? propValue
												: propValue === 1 ||
													propValue === '1' ||
													propValue === 'true'
										break
									case 'timestamptz':
										// Handle timestamp conversion - expected format may vary
										if (propName === 'GET_Estimated_End_Time' && propValue) {
											// Try to parse as Unix timestamp or ISO string
											const parsed =
												typeof propValue === 'number'
													? new Date(propValue * 1000) // Unix timestamp
													: new Date(propValue as string | number)
											convertedValue = Number.isNaN(parsed.getTime())
												? null
												: parsed
										}
										break
									default:
										convertedValue = String(propValue)
										break
								}
							}

							// Set the value in deviceData only if column is enabled
							deviceData[columnName] = convertedValue
						}
					}

					await tx.mutate.devices.insert(
						deviceData as Parameters<typeof tx.mutate.devices.insert>[0],
					)
				}

				console.log(
					`[Server] Synced ${devicesWithProperties.length} real devices for user: ${authData.sub}`,
				)
			},
		},
	}
}
