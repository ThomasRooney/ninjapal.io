import * as crypto from 'node:crypto'
import { DatabaseService } from '../../../ninjapal.com/app.ninjapal.io/src/db'
import {
	type AuthState,
	type AuthStateStore,
	type AylaToken,
	IdentityArtifacts,
	type OAuthTokens,
} from './types.ts'

interface StoredAuthState {
	id: string
	userId: string
	state: AuthState
	createdAt: Date
	updatedAt: Date
	expiresAt: Date
}

export class DatabaseAuthStore implements AuthStateStore {
	private db: DatabaseService
	private encryptionKey: Buffer

	constructor(db: DatabaseService, encryptionKey: string) {
		this.db = db
		// Ensure encryption key is 32 bytes for AES-256
		this.encryptionKey = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32))
	}

	async save(userId: string, state: AuthState): Promise<void> {
		try {
			// Calculate expiration based on token expiry times
			const oauthExpiry = state.oauthTokens?.expiresAt || Date.now() + 3600000
			const aylaExpiry = state.aylaToken?.expiresAt || Date.now() + 3600000
			const expiresAt = new Date(Math.min(oauthExpiry, aylaExpiry))

			// Encrypt sensitive data
			const encryptedState = this.encryptAuthState(state)

			// Store in database
			await this.db.query(
				`
        INSERT INTO auth_states (id, user_id, state_data, expires_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          state_data = EXCLUDED.state_data,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `,
				[crypto.randomUUID(), userId, encryptedState, expiresAt],
			)

			// Also update credentials in the credentials table
			if (state.oauthTokens) {
				const oauthCreds = JSON.stringify({
					accessToken: state.oauthTokens.accessToken,
					refreshToken: state.oauthTokens.refreshToken || '',
					expiresAt: new Date(state.oauthTokens.expiresAt),
					idToken: state.oauthTokens.idToken,
					tokenType: state.oauthTokens.tokenType,
				})
				await this.db.credentials.store(oauthCreds, 'sharkninja_oauth', userId)
			}

			if (state.aylaToken) {
				const aylaCreds = JSON.stringify({
					accessToken: state.aylaToken.accessToken,
					refreshToken: state.aylaToken.refreshToken,
					expiresAt: new Date(state.aylaToken.expiresAt),
					role: state.aylaToken.role,
				})
				await this.db.credentials.store(aylaCreds, 'ayla', userId)
			}
		} catch (error) {
			console.error('[DatabaseAuthStore] Failed to save auth state:', error)
			throw new Error('Failed to save authentication state')
		}
	}

	async load(userId: string): Promise<AuthState | null> {
		try {
			// Load from auth_states table
			const result = await this.db.query(
				`
        SELECT state_data, expires_at
        FROM auth_states
        WHERE user_id = $1 AND expires_at > NOW()
      `,
				[userId],
			)

			if (result.rows.length === 0) {
				return null
			}

			const encryptedState = result.rows[0].state_data
			const authState = this.decryptAuthState(encryptedState)

			// Also load latest credentials as fallback
			const oauthCreds = await this.db.credentials.retrieve(
				'sharkninja_oauth',
				userId,
			)
			const aylaCreds = await this.db.credentials.retrieve('ayla', userId)

			// Merge with latest credentials if available
			if (oauthCreds?.credentials) {
				const parsedOAuth = JSON.parse(oauthCreds.credentials)
				if (new Date(parsedOAuth.expiresAt) > new Date()) {
					authState.oauthTokens = {
						accessToken: parsedOAuth.accessToken,
						refreshToken: parsedOAuth.refreshToken || '',
						idToken: parsedOAuth.idToken || '',
						tokenType: parsedOAuth.tokenType || 'Bearer',
						expiresIn: 3600,
						expiresAt: new Date(parsedOAuth.expiresAt).getTime(),
					}
				}
			}

			if (aylaCreds?.credentials) {
				const parsedAyla = JSON.parse(aylaCreds.credentials)
				if (new Date(parsedAyla.expiresAt) > new Date()) {
					authState.aylaToken = {
						accessToken: parsedAyla.accessToken,
						refreshToken: parsedAyla.refreshToken || '',
						expiresAt: new Date(parsedAyla.expiresAt).getTime(),
						role: parsedAyla.role || 'EndUser',
					}
				}
			}

			return authState
		} catch (error) {
			console.error('[DatabaseAuthStore] Failed to load auth state:', error)
			return null
		}
	}

	async delete(userId: string): Promise<void> {
		try {
			await this.db.query(
				`
        DELETE FROM auth_states WHERE user_id = $1
      `,
				[userId],
			)
		} catch (error) {
			console.error('[DatabaseAuthStore] Failed to delete auth state:', error)
			throw new Error('Failed to delete authentication state')
		}
	}

	async refresh(
		userId: string,
		newTokens: Partial<OAuthTokens & AylaToken>,
	): Promise<void> {
		try {
			const currentState = await this.load(userId)
			if (!currentState) {
				throw new Error('No auth state found to refresh')
			}

			// Update tokens
			if (newTokens.accessToken && currentState.oauthTokens) {
				currentState.oauthTokens = {
					...currentState.oauthTokens,
					...newTokens,
					expiresAt: newTokens.expiresAt || Date.now() + 3600000,
				}
			}

			if (newTokens.role && currentState.aylaToken) {
				currentState.aylaToken = {
					...currentState.aylaToken,
					accessToken:
						newTokens.accessToken || currentState.aylaToken.accessToken,
					refreshToken:
						newTokens.refreshToken || currentState.aylaToken.refreshToken,
					expiresAt: newTokens.expiresAt || Date.now() + 3600000,
				}
			}

			// Save updated state
			await this.save(userId, currentState)
		} catch (error) {
			console.error('[DatabaseAuthStore] Failed to refresh tokens:', error)
			throw new Error('Failed to refresh authentication tokens')
		}
	}

	async cleanup(): Promise<void> {
		try {
			// Delete expired auth states
			const result = await this.db.query(`
        DELETE FROM auth_states 
        WHERE expires_at < NOW()
        RETURNING user_id
      `)

			if (result.rows.length > 0) {
				console.log(
					`[DatabaseAuthStore] Cleaned up ${result.rows.length} expired auth states`,
				)
			}
		} catch (error) {
			console.error(
				'[DatabaseAuthStore] Failed to cleanup expired states:',
				error,
			)
		}
	}

	private encryptAuthState(state: AuthState): string {
		const stateJson = JSON.stringify(state)
		const iv = crypto.randomBytes(16)
		const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv)

		let encrypted = cipher.update(stateJson, 'utf8', 'base64')
		encrypted += cipher.final('base64')

		const authTag = cipher.getAuthTag()

		// Combine IV, auth tag, and encrypted data
		const combined = Buffer.concat([
			iv,
			authTag,
			Buffer.from(encrypted, 'base64'),
		])

		return combined.toString('base64')
	}

	private decryptAuthState(encryptedData: string): AuthState {
		const combined = Buffer.from(encryptedData, 'base64')

		// Extract components
		const iv = combined.slice(0, 16)
		const authTag = combined.slice(16, 32)
		const encrypted = combined.slice(32)

		const decipher = crypto.createDecipheriv(
			'aes-256-gcm',
			this.encryptionKey,
			iv,
		)
		decipher.setAuthTag(authTag)

		let decrypted = decipher.update(encrypted, undefined, 'utf8')
		decrypted += decipher.final('utf8')

		return JSON.parse(decrypted)
	}
}

interface DatabaseConfig {
	encryptionKey?: string
	[key: string]: unknown
}

// Factory function to create the store
export function createDatabaseAuthStore(
	dbConfig: DatabaseConfig,
): DatabaseAuthStore {
	const db = new DatabaseService(dbConfig)
	const encryptionKey = dbConfig.encryptionKey || process.env.ENCRYPTION_KEY

	if (!encryptionKey) {
		throw new Error('Encryption key is required for DatabaseAuthStore')
	}

	return new DatabaseAuthStore(db, encryptionKey)
}
