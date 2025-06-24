import type { AuthData } from '@/server/db/zero-permissions.ts'
import type { Schema } from '@/server/db/zero-schema.gen'
import { faker } from '@faker-js/faker'
import type { CustomMutatorDefs, Transaction } from '@rocicorp/zero'

/**
 * Shared mutators containing core business logic and database operations
 * These are used by both client and server mutators
 */
export function createSharedMutators(authData: AuthData) {
	return {
		persons: {
			async insert(
				tx: Transaction<Schema>,
				args: { id: string; name: string },
			) {
				// e.g. permission check: only logged-in users can insert
				if (!authData.sub) throw new Error('Not authenticated')
				await tx.mutate.persons.insert(args)
			},
			async delete(tx: Transaction<Schema>, args: { id: string }) {
				if (!authData.sub) throw new Error('Not authenticated')
				await tx.mutate.persons.delete(args)
			},
			async deleteMany(tx: Transaction<Schema>, args: { ids: string[] }) {
				if (!authData.sub) throw new Error('Not authenticated')
				for (const id of args.ids) {
					await tx.mutate.persons.delete({ id })
				}
			},
		},
		users: {
			async create(
				tx: Transaction<Schema>,
				u: { id: string; email: string; name: string },
			) {
				if (!authData.sub) throw new Error('Not authenticated')

				// Check if user already exists
				if (await tx.query.users.where('id', u.id).one().run()) return
				await tx.mutate.users.insert(u)
			},
			async delete(tx: Transaction<Schema>, args: { id: string }) {
				if (!authData.sub) throw new Error('Not authenticated')

				// Ensure users can only delete their own account
				if (args.id !== authData.sub)
					throw new Error("Cannot delete another user's account")
				await tx.mutate.users.delete(args)
			},
			async upsert(
				tx: Transaction<Schema>,
				args: { id: string; email: string; name: string },
			) {
				if (!authData.sub) throw new Error('Not authenticated')
				await tx.mutate.users.upsert(args)
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

				await tx.mutate.ninjaConnections.upsert({
					...args,
					attempts: args.attempts ?? 0,
					updatedAt: Date.now(),
				})
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
				if (!authData.sub) throw new Error('Not authenticated')

				// Ensure users can only update their own tokens
				if (args.userId !== authData.sub)
					throw new Error("Cannot modify another user's tokens")

				const updates: Record<string, string | number | null> = {
					updatedAt: Date.now(),
				}

				// Only include defined values in the update
				if (args.oauthAccessToken !== undefined)
					updates.oauthAccessToken = args.oauthAccessToken
				if (args.oauthRefreshToken !== undefined)
					updates.oauthRefreshToken = args.oauthRefreshToken
				if (args.oauthExpiresAt !== undefined)
					updates.oauthExpiresAt = args.oauthExpiresAt
				if (args.aylaAccessToken !== undefined)
					updates.aylaAccessToken = args.aylaAccessToken
				if (args.aylaRefreshToken !== undefined)
					updates.aylaRefreshToken = args.aylaRefreshToken
				if (args.aylaExpiresAt !== undefined)
					updates.aylaExpiresAt = args.aylaExpiresAt

				await tx.mutate.ninjaConnections.update({
					userId: args.userId,
					...updates,
				})
			},
			async incrementAttempts(
				tx: Transaction<Schema>,
				args: { userId: string },
			) {
				if (!authData.sub) throw new Error('Not authenticated')

				// Ensure users can only increment their own attempts
				if (args.userId !== authData.sub)
					throw new Error("Cannot modify another user's attempts")

				const connection = await tx.query.ninjaConnections
					.where('userId', args.userId)
					.one()
					.run()

				if (!connection) throw new Error('Connection not found')

				await tx.mutate.ninjaConnections.update({
					userId: args.userId,
					attempts: (connection.attempts ?? 0) + 1,
					updatedAt: Date.now(),
				})
			},
			async validateAndRefreshCredentials(
				tx: Transaction<Schema>,
				args: { userId: string },
			) {
				if (!authData.sub) throw new Error('Not authenticated')

				// Ensure users can only test their own connection
				if (args.userId !== authData.sub)
					throw new Error("Cannot test another user's connection")

				// The actual testing logic is handled in the server mutator
				// This shared mutator just handles permission checks
			},
		},
		devices: {
			async refreshFakeData(tx: Transaction<Schema>) {
				if (!authData.sub) throw new Error('Not authenticated')

				// Delete existing devices for this user
				const existingDevices = await tx.query.devices
					.where('userId', authData.sub)
					.run()

				for (const device of existingDevices) {
					await tx.mutate.devices.delete({ id: device.id })
				}

				// Generate 3 fake devices
				for (let i = 0; i < 3; i++) {
					const deviceId = crypto.randomUUID()
					const randomNum = Math.floor(Math.random() * 1000)

					await tx.mutate.devices.insert({
						id: deviceId,
						userId: authData.sub,
						dsn: `FAKE-DSN-${randomNum}`,
						productName: faker.commerce.productName(),
						model: `Model-${faker.vehicle.model()}`,
						mac: faker.internet.mac(),
						lanIp: faker.internet.ipv4(),
						connectionStatus: Math.random() > 0.5 ? 'online' : 'offline',
						additionalDeviceProperties: {
							firmwareVersion: `v${faker.system.semver()}`,
							signalStrength: -Math.floor(Math.random() * 50 + 30),
							temperature: Math.floor(Math.random() * 20 + 20),
							humidity: Math.floor(Math.random() * 40 + 30),
							lastSeen: new Date().toISOString(),
							features: faker.helpers.arrayElements(
								['wifi', 'bluetooth', 'zigbee', 'zwave'],
								{ min: 1, max: 3 },
							),
						},
						createdAt: Date.now(),
						updatedAt: Date.now(),
					})
				}
			},
		},
	} as const satisfies CustomMutatorDefs<Schema>
}

export type SharedMutators = ReturnType<typeof createSharedMutators>
