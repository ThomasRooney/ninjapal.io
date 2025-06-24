import { DatabaseService } from '../../../ninjapal.com/app.ninjapal.io/src/db'
import { DatabaseAuthStore } from './db-auth-store.ts'
import { NinjaAuthManager } from './ninja-auth-manager.ts'
import type { AuthState, Credentials } from './types.ts'

export interface EnhancedAuthManagerConfig {
	credentials: Credentials // Now required
	userId?: string
	dbConfig?: Parameters<(typeof DatabaseService)['prototype']['constructor']>[0]
	autoSave?: boolean
	autoRestore?: boolean
}

export class EnhancedAuthManager {
	private authManager: NinjaAuthManager
	private authStore?: DatabaseAuthStore
	private userId?: string
	private autoSave: boolean
	private autoRestore: boolean

	constructor(config: EnhancedAuthManagerConfig) {
		// Credentials are required for creating auth manager
		if (!config.credentials) {
			throw new Error('Credentials are required for EnhancedAuthManager')
		}
		this.authManager = NinjaAuthManager.create(config.credentials)
		this.userId = config.userId
		this.autoSave = config.autoSave ?? true
		this.autoRestore = config.autoRestore ?? true

		if (config.dbConfig) {
			const db = new DatabaseService(config.dbConfig)
			this.authStore = new DatabaseAuthStore(db, config.dbConfig.encryptionKey)
		}
	}

	async initialize(): Promise<void> {
		// Try to restore from database if enabled
		if (this.autoRestore && this.authStore && this.userId) {
			const savedState = await this.authStore.load(this.userId)
			if (savedState) {
				console.log('[EnhancedAuthManager] Restored auth state from database')
				this.authManager.setAuthState(savedState)

				// Check if tokens need refresh
				if (this.shouldRefreshTokens(savedState)) {
					await this.refreshTokens()
				}
			}
		}
	}

	async login(): Promise<AuthState> {
		// Perform login
		const authState = await this.authManager.getFullAuthState()

		// Save to database if enabled
		if (this.autoSave && this.authStore && this.userId) {
			await this.authStore.save(this.userId, authState)
			console.log('[EnhancedAuthManager] Saved auth state to database')
		}

		return authState
	}

	async refreshTokens(): Promise<AuthState | null> {
		try {
			// Refresh OAuth tokens
			const refreshedOAuth = await this.authManager.refreshOAuthToken()
			if (!refreshedOAuth) {
				return null
			}

			// Get current state and update it
			const currentState = this.authManager.getAuthState()
			if (!currentState) {
				return null
			}

			currentState.oauthTokens = refreshedOAuth

			// Save to database if enabled
			if (this.autoSave && this.authStore && this.userId) {
				await this.authStore.save(this.userId, currentState)
				console.log('[EnhancedAuthManager] Saved refreshed tokens to database')
			}

			return currentState
		} catch (error) {
			console.error('[EnhancedAuthManager] Failed to refresh tokens:', error)
			return null
		}
	}

	async logout(): Promise<void> {
		// Clear from database if enabled
		if (this.authStore && this.userId) {
			await this.authStore.delete(this.userId)
			console.log('[EnhancedAuthManager] Cleared auth state from database')
		}

		// Clear in-memory state
		this.authManager.clearAuthState()
	}

	getAuthState(): AuthState | null {
		return this.authManager.getAuthState()
	}

	setUserId(userId: string): void {
		this.userId = userId
	}

	private shouldRefreshTokens(state: AuthState): boolean {
		const now = Date.now()
		const bufferTime = 5 * 60 * 1000 // 5 minutes buffer

		// Check OAuth tokens
		if (state.oauthTokens?.expiresAt) {
			if (state.oauthTokens.expiresAt - now < bufferTime) {
				return true
			}
		}

		// Check Ayla tokens
		if (state.aylaToken?.expiresAt) {
			if (state.aylaToken.expiresAt - now < bufferTime) {
				return true
			}
		}

		return false
	}
}

// Helper function to create an enhanced auth manager
export async function createEnhancedAuthManager(
	config: EnhancedAuthManagerConfig,
): Promise<EnhancedAuthManager> {
	const manager = new EnhancedAuthManager(config)
	await manager.initialize()
	return manager
}
