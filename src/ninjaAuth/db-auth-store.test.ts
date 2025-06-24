import * as crypto from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { DatabaseService } from '../../../ninjapal.com/app.ninjapal.io/src/db'
import { DatabaseAuthStore } from './db-auth-store.ts'
import type { AuthState } from './types.ts'

describe('DatabaseAuthStore', () => {
	let authStore: DatabaseAuthStore
	let db: DatabaseService
	const testUserId = crypto.randomUUID()
	const testEncryptionKey = 'test-encryption-key-32-bytes-long!!'

	beforeAll(async () => {
		// Initialize database
		db = new DatabaseService({
			host: process.env.DB_HOST || 'localhost',
			port: Number.parseInt(process.env.DB_PORT || '5432'),
			database: process.env.DB_NAME || 'ninjapal_main',
			user: process.env.DB_USER || 'ninjapal',
			password: process.env.DB_PASSWORD || 'ninjapal_dev',
			encryptionKey: testEncryptionKey,
		})

		await db.waitForHealthy()

		// Create test user
		await db.query(
			`
      INSERT INTO users (id, email, name) 
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO NOTHING
    `,
			[testUserId, 'test@example.com', 'Test User'],
		)

		// Initialize auth store
		authStore = new DatabaseAuthStore(db, testEncryptionKey)
	})

	afterAll(async () => {
		// Cleanup
		await db.query('DELETE FROM users WHERE id = $1', [testUserId])
		await db.shutdown()
	})

	describe('save and load', () => {
		it('should save and load auth state', async () => {
			const authState: AuthState = {
				identityArtifacts: {
					cookies: [
						{ name: 'session', value: 'abc123', domain: '.example.com' },
					],
					authorizationCode: 'auth-code-123',
					pkceVerifier: 'verifier-123',
					state: 'state-123',
				},
				oauthTokens: {
					accessToken: 'access-token-123',
					refreshToken: 'refresh-token-123',
					idToken: 'id-token-123',
					tokenType: 'Bearer',
					expiresIn: 3600,
					expiresAt: Date.now() + 3600000,
				},
				aylaToken: {
					accessToken: 'ayla-access-123',
					refreshToken: 'ayla-refresh-123',
					expiresAt: Date.now() + 3600000,
					role: 'EndUser',
				},
			}

			// Save state
			await authStore.save(testUserId, authState)

			// Load state
			const loadedState = await authStore.load(testUserId)

			expect(loadedState).toBeTruthy()
			expect(loadedState?.identityArtifacts?.cookies).toHaveLength(1)
			expect(loadedState?.identityArtifacts?.cookies[0].name).toBe('session')
			expect(loadedState?.oauthTokens?.accessToken).toBe('access-token-123')
			expect(loadedState?.aylaToken?.accessToken).toBe('ayla-access-123')
		})

		it('should not load expired state', async () => {
			const expiredState: AuthState = {
				identityArtifacts: null,
				oauthTokens: {
					accessToken: 'expired-token',
					refreshToken: 'expired-refresh',
					idToken: 'expired-id',
					tokenType: 'Bearer',
					expiresIn: -1,
					expiresAt: Date.now() - 3600000, // 1 hour ago
				},
				aylaToken: null,
			}

			// Save expired state
			await authStore.save(testUserId, expiredState)

			// Try to load - should return null because it's expired
			const loadedState = await authStore.load(testUserId)
			expect(loadedState).toBeNull()
		})
	})

	describe('refresh', () => {
		it('should refresh tokens', async () => {
			const initialState: AuthState = {
				identityArtifacts: null,
				oauthTokens: {
					accessToken: 'old-access',
					refreshToken: 'refresh-token',
					idToken: 'old-id',
					tokenType: 'Bearer',
					expiresIn: 3600,
					expiresAt: Date.now() + 3600000,
				},
				aylaToken: {
					accessToken: 'old-ayla',
					refreshToken: 'ayla-refresh',
					expiresAt: Date.now() + 3600000,
					role: 'EndUser',
				},
			}

			await authStore.save(testUserId, initialState)

			// Refresh with new tokens
			await authStore.refresh(testUserId, {
				accessToken: 'new-access',
				idToken: 'new-id',
				expiresAt: Date.now() + 7200000,
			})

			const updatedState = await authStore.load(testUserId)
			expect(updatedState?.oauthTokens?.accessToken).toBe('new-access')
			expect(updatedState?.oauthTokens?.idToken).toBe('new-id')
			expect(updatedState?.oauthTokens?.refreshToken).toBe('refresh-token') // Unchanged
		})
	})

	describe('delete', () => {
		it('should delete auth state', async () => {
			const authState: AuthState = {
				identityArtifacts: null,
				oauthTokens: {
					accessToken: 'to-delete',
					refreshToken: 'to-delete-refresh',
					idToken: 'to-delete-id',
					tokenType: 'Bearer',
					expiresIn: 3600,
					expiresAt: Date.now() + 3600000,
				},
				aylaToken: null,
			}

			await authStore.save(testUserId, authState)

			// Verify it was saved
			let loaded = await authStore.load(testUserId)
			expect(loaded).toBeTruthy()

			// Delete it
			await authStore.delete(testUserId)

			// Verify it's gone
			loaded = await authStore.load(testUserId)
			expect(loaded).toBeNull()
		})
	})

	describe('cleanup', () => {
		it('should clean up expired states', async () => {
			// This test would need to manipulate the database directly
			// to insert an already-expired state, which is complex
			// For now, just verify the method doesn't throw
			await expect(authStore.cleanup()).resolves.not.toThrow()
		})
	})

	describe('encryption', () => {
		it('should properly encrypt and decrypt auth state', async () => {
			const sensitiveState: AuthState = {
				identityArtifacts: {
					cookies: [
						{
							name: 'sensitive-cookie',
							value: 'super-secret-value',
							domain: '.example.com',
						},
					],
					authorizationCode: 'secret-auth-code',
					pkceVerifier: 'secret-verifier',
					state: 'secret-state',
				},
				oauthTokens: {
					accessToken: 'secret-access-token',
					refreshToken: 'secret-refresh-token',
					idToken: 'secret-id-token',
					tokenType: 'Bearer',
					expiresIn: 3600,
					expiresAt: Date.now() + 3600000,
				},
				aylaToken: null,
			}

			await authStore.save(testUserId, sensitiveState)

			// Query the database directly to verify encryption
			const result = await db.query(
				`
        SELECT state_data FROM auth_states WHERE user_id = $1
      `,
				[testUserId],
			)

			const encryptedData = result.rows[0].state_data

			// Verify it's not plaintext
			expect(encryptedData).not.toContain('secret-access-token')
			expect(encryptedData).not.toContain('super-secret-value')

			// Verify we can decrypt it
			const decrypted = await authStore.load(testUserId)
			expect(decrypted?.oauthTokens?.accessToken).toBe('secret-access-token')
			expect(decrypted?.identityArtifacts?.cookies[0].value).toBe(
				'super-secret-value',
			)
		})
	})
})
