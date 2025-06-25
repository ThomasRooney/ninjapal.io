import { promises as fs } from 'node:fs'
import { existsSync } from 'node:fs'
import { request } from '@playwright/test'
import { PlaywrightBrowserAutomator } from './browser-automator.ts'
import { config } from './config.ts'
import type {
	AuthEvent,
	AuthMetrics,
	Credentials,
	EnhancedAuthState,
	IAuthManager,
	IBrowserAutomator,
	IdentityArtifacts,
} from './types.ts'

const AUTH_STATE_FILE = 'auth-state.json'
const TOKEN_EXPIRY_BUFFER_MS = config.settings.tokenExpiryBufferMs

// Custom error for authentication failures
export class AuthError extends Error {
	constructor(
		message: string,
		public stage?: string,
	) {
		super(message)
		this.name = 'AuthError'
	}
}

// Cache entry with TTL
interface CacheEntry<T> {
	data: T
	timestamp: number
	expiresAt: number
}

export class NinjaAuthManager implements IAuthManager {
	private state: EnhancedAuthState = {}
	private stateLoaded = false
	private browserAutomator: IBrowserAutomator
	private credentials: Credentials

	// Enhanced caching with TTL
	private tokenCache = new Map<string, CacheEntry<unknown>>()
	private inFlightRequests = new Map<string, Promise<unknown>>()
	private readonly DEFAULT_CACHE_TTL = 3600 * 1000 // 1 hour

	private metrics: AuthMetrics = {
		successCount: 0,
		failureCount: 0,
		refreshCount: 0,
	}

	// Private constructor for controlled instantiation
	private constructor(
		browserAutomator?: IBrowserAutomator,
		credentials?: Credentials,
		initialState?: EnhancedAuthState,
	) {
		this.browserAutomator = browserAutomator || new PlaywrightBrowserAutomator()

		// Credentials must be provided
		if (!credentials) {
			throw new Error('AuthManager constructor was called without credentials.')
		}
		this.credentials = credentials

		if (initialState) {
			this.state = initialState
			this.stateLoaded = true
		}
	}

	/**
	 * Factory method to create a new NinjaAuthManager instance for a specific user.
	 * @param credentials The user's email and password (required).
	 * @param initialState Optional initial auth state to hydrate the instance.
	 * @returns A new instance of NinjaAuthManager.
	 */
	public static create(
		credentials: Credentials,
		initialState?: EnhancedAuthState,
	): NinjaAuthManager {
		// Validate credentials at the public API level
		if (!credentials || !credentials.email || !credentials.password) {
			throw new Error(
				'Credentials with email and password are required to create an AuthManager instance.',
			)
		}

		// Create a new instance with the provided credentials
		return new NinjaAuthManager(undefined, credentials, initialState)
	}

	/**
	 * Get browser-based authentication artifacts with caching and race condition handling
	 */
	async getIdentityAuth(): Promise<IdentityArtifacts> {
		const cacheKey = `identity_${this.credentials.email}`

		// Check cache first
		const cached = this.getCachedItem<IdentityArtifacts>(cacheKey)
		if (cached) {
			this.logEvent('auth_success', { stage: 'browser', source: 'cache' })
			return cached
		}

		// Check for in-flight request
		if (this.inFlightRequests.has(cacheKey)) {
			console.log(
				'[NinjaAuthManager] Attaching to in-flight browser auth request',
			)
			const request = this.inFlightRequests.get(cacheKey)
			if (!request) {
				throw new Error('In-flight request not found')
			}
			return request as Promise<IdentityArtifacts>
		}

		// Perform browser authentication with race condition protection
		const authPromise = this.performBrowserAuth()
			.then((identity) => {
				// Cache the result with 1 hour TTL
				this.setCachedItem(cacheKey, identity, this.DEFAULT_CACHE_TTL)
				this.inFlightRequests.delete(cacheKey)
				return identity
			})
			.catch((error) => {
				this.inFlightRequests.delete(cacheKey)
				throw error
			})

		this.inFlightRequests.set(cacheKey, authPromise)
		return authPromise
	}

	/**
	 * Perform browser authentication
	 */
	private async performBrowserAuth(): Promise<IdentityArtifacts> {
		await this.ensureStateLoaded()

		// Note: We don't use cached identity artifacts here because authorization codes are single-use
		// Always perform fresh browser login when identity auth is needed

		// Perform fresh browser login
		this.logEvent('auth_started', { stage: 'browser' })

		try {
			const startTime = Date.now()
			const identity = await this.browserAutomator.performLogin(
				this.credentials,
			)

			// Store identity artifacts in state
			this.state.identity = {
				cookies: identity.cookies,
				authorizationCode: identity.authorizationCode,
				pkceVerifier: identity.pkceVerifier,
				state: identity.state,
			}

			// Update metadata
			this.updateMetadata('success', Date.now() - startTime)
			await this.saveState()

			this.logEvent('auth_success', { stage: 'browser' })
			return identity
		} catch (error) {
			this.updateMetadata('failure')
			this.logEvent('auth_failure', {
				stage: 'browser',
				error:
					error instanceof Error ? error.message : 'Unknown browser auth error',
			})
			throw new AuthError(
				`Browser authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'browser',
			)
		}
	}

	/**
	 * Get OAuth ID token with caching and automatic refresh
	 */
	async getIDToken(): Promise<string> {
		const cacheKey = `oauth_id_${this.credentials.email}`

		// Check cache first
		const cached = this.getCachedItem<string>(cacheKey)
		if (cached) {
			return cached
		}

		// Check if we have valid OAuth tokens in state
		if (
			this.state.oauthTokens &&
			!this.isTokenExpired(this.state.oauthTokens.expiresAt)
		) {
			const idToken = this.state.oauthTokens.idToken
			// Cache with remaining TTL
			const remainingTTL =
				this.state.oauthTokens.expiresAt - Date.now() - TOKEN_EXPIRY_BUFFER_MS
			if (remainingTTL > 0) {
				this.setCachedItem(cacheKey, idToken, remainingTTL)
			}
			return idToken
		}

		// Try to refresh OAuth token if we have a refresh token
		if (this.state.oauthTokens?.refreshToken) {
			try {
				this.logEvent('token_refresh', { stage: 'oauth' })
				await this.refreshOAuthTokens()
				const idToken = this.state.oauthTokens?.idToken
				// Cache with new TTL
				const ttl =
					this.state.oauthTokens?.expiresAt -
					Date.now() -
					TOKEN_EXPIRY_BUFFER_MS
				this.setCachedItem(cacheKey, idToken, ttl)
				return idToken
			} catch (error) {
				console.warn(
					'OAuth token refresh failed, proceeding with full re-auth:',
					error,
				)
				this.state.oauthTokens = undefined
			}
		}

		// Get fresh identity artifacts and exchange for OAuth tokens
		const identity = await this.getIdentityAuth()

		try {
			this.logEvent('auth_started', { stage: 'oauth' })
			const startTime = Date.now()

			const oauthTokens = await this.exchangeCodeForOAuthTokens(
				identity.authorizationCode,
				identity.pkceVerifier,
			)

			this.state.oauthTokens = oauthTokens

			// Clear the authorization code after successful exchange (single-use only)
			if (this.state.identity) {
				this.state.identity.authorizationCode = undefined
				this.state.identity.pkceVerifier = undefined
				this.state.identity.state = undefined
			}

			this.updateMetadata('success', Date.now() - startTime)
			await this.saveState()

			// Cache with TTL
			const ttl = oauthTokens.expiresAt - Date.now() - TOKEN_EXPIRY_BUFFER_MS
			this.setCachedItem(cacheKey, oauthTokens.idToken, ttl)

			this.logEvent('auth_success', { stage: 'oauth' })
			return oauthTokens.idToken
		} catch (error) {
			this.updateMetadata('failure')
			this.logEvent('auth_failure', {
				stage: 'oauth',
				error: error instanceof Error ? error.message : 'Unknown OAuth error',
			})
			throw new AuthError(
				`OAuth token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'oauth',
			)
		}
	}

	/**
	 * Get Ayla API token with caching and race condition handling
	 */
	async getAPIToken(): Promise<string> {
		const cacheKey = `ayla_api_${this.credentials.email}`

		// Check cache first
		const cached = this.getCachedItem<string>(cacheKey)
		if (cached) {
			console.log('[NinjaAuthManager] Returning cached Ayla API token')
			return cached
		}

		// Check for in-flight request
		if (this.inFlightRequests.has(cacheKey)) {
			console.log(
				'[NinjaAuthManager] Attaching to in-flight Ayla token request',
			)
			const request = this.inFlightRequests.get(cacheKey)
			if (!request) {
				throw new Error('In-flight request not found')
			}
			return request as Promise<string>
		}

		// Perform token acquisition with race condition protection
		const tokenPromise = this.acquireAylaToken()
			.then((token) => {
				// Cache with TTL from token expiry
				if (this.state.aylaToken) {
					const ttl =
						this.state.aylaToken.expiresAt - Date.now() - TOKEN_EXPIRY_BUFFER_MS
					if (ttl > 0) {
						this.setCachedItem(cacheKey, token, ttl)
					}
				}
				this.inFlightRequests.delete(cacheKey)
				return token
			})
			.catch((error) => {
				this.inFlightRequests.delete(cacheKey)
				throw error
			})

		this.inFlightRequests.set(cacheKey, tokenPromise)
		return tokenPromise
	}

	/**
	 * Acquire Ayla API token
	 */
	private async acquireAylaToken(): Promise<string> {
		await this.ensureStateLoaded()

		// Check if we have a valid Ayla token in state
		if (
			this.state.aylaToken &&
			!this.isTokenExpired(this.state.aylaToken.expiresAt)
		) {
			return this.state.aylaToken.accessToken
		}

		// Get OAuth ID token (this handles OAuth refresh if needed)
		const idToken = await this.getIDToken()

		// Exchange ID token for Ayla API token
		this.logEvent('auth_started', { stage: 'ayla' })
		const startTime = Date.now()

		try {
			const aylaToken = await this.exchangeIdTokenForAylaToken(idToken)

			this.state.aylaToken = aylaToken
			this.updateMetadata('success', Date.now() - startTime)
			await this.saveState()

			this.logEvent('auth_success', { stage: 'ayla' })
			return aylaToken.accessToken
		} catch (error) {
			this.updateMetadata('failure')
			this.logEvent('auth_failure', {
				stage: 'ayla',
				error:
					error instanceof Error ? error.message : 'Unknown Ayla token error',
			})
			throw new AuthError(
				`Ayla token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'ayla',
			)
		}
	}

	/**
	 * Force refresh of the Ayla API token
	 */
	async forceRefreshAPIToken(): Promise<string> {
		// Clear cached tokens
		const cacheKey = `ayla_api_${this.credentials.email}`
		this.tokenCache.delete(cacheKey)
		this.state.aylaToken = undefined
		this.metrics.refreshCount++

		return this.getAPIToken()
	}

	/**
	 * Get current authentication state
	 */
	getState(): EnhancedAuthState {
		return { ...this.state }
	}

	/**
	 * Clear all authentication state
	 */
	async clearState(): Promise<void> {
		this.state = {}
		this.stateLoaded = false
		this.tokenCache.clear()
		this.inFlightRequests.clear()
		this.metrics = { successCount: 0, failureCount: 0, refreshCount: 0 }

		if (existsSync(AUTH_STATE_FILE)) {
			try {
				await fs.unlink(AUTH_STATE_FILE)
			} catch (error) {
				console.warn('Failed to delete auth state file:', error)
			}
		}
	}

	/**
	 * Get authentication metrics
	 */
	getMetrics(): AuthMetrics {
		return { ...this.metrics }
	}

	// Private helper methods

	/**
	 * Get cached item if valid
	 */
	private getCachedItem<T>(key: string): T | null {
		const entry = this.tokenCache.get(key)
		if (!entry) return null

		const now = Date.now()
		if (now >= entry.expiresAt) {
			this.tokenCache.delete(key)
			return null
		}

		console.log(
			`[NinjaAuthManager] Cache hit for ${key}, expires in ${Math.round((entry.expiresAt - now) / 1000)}s`,
		)
		return entry.data as T
	}

	/**
	 * Set cached item with TTL
	 */
	private setCachedItem<T>(key: string, data: T, ttlMs: number): void {
		const now = Date.now()
		this.tokenCache.set(key, {
			data,
			timestamp: now,
			expiresAt: now + ttlMs,
		})
		console.log(
			`[NinjaAuthManager] Cached ${key} with TTL ${Math.round(ttlMs / 1000)}s`,
		)
	}

	private async exchangeCodeForOAuthTokens(
		authCode: string,
		pkceVerifier: string,
	) {
		const requestContext = await request.newContext()

		try {
			const response = await requestContext.post(
				`${config.oauth.authBaseUrl}/oauth/token`,
				{
					headers: {
						'Content-Type': 'application/json',
					},
					data: {
						client_id: config.oauth.clientId,
						grant_type: 'authorization_code',
						code: authCode,
						redirect_uri: config.oauth.redirectUri,
						code_verifier: pkceVerifier,
						scope: config.oauth.scope,
					},
				},
			)

			if (response.status() !== 200) {
				const errorText = await response.text()
				throw new Error(
					`Token exchange failed with status ${response.status()}: ${errorText}`,
				)
			}

			const tokenData = await response.json()

			// Fetch user info
			const userInfoResponse = await requestContext.get(
				`${config.oauth.authBaseUrl}/userinfo`,
				{
					headers: {
						Authorization: `Bearer ${tokenData.access_token}`,
					},
				},
			)

			if (userInfoResponse.status() !== 200) {
				throw new Error(
					`Failed to fetch user info: ${userInfoResponse.status()}`,
				)
			}

			const userInfo = await userInfoResponse.json()
			this.state.userInfo = userInfo

			return {
				accessToken: tokenData.access_token,
				idToken: tokenData.id_token,
				refreshToken: tokenData.refresh_token,
				expiresAt: Date.now() + tokenData.expires_in * 1000,
			}
		} finally {
			await requestContext.dispose()
		}
	}

	private async refreshOAuthTokens(): Promise<void> {
		if (!this.state.oauthTokens?.refreshToken) {
			throw new Error('No refresh token available')
		}

		const requestContext = await request.newContext()

		try {
			const response = await requestContext.post(
				`${config.oauth.authBaseUrl}/oauth/token`,
				{
					headers: {
						'Content-Type': 'application/json',
					},
					data: {
						client_id: config.oauth.clientId,
						grant_type: 'refresh_token',
						refresh_token: this.state.oauthTokens.refreshToken,
						scope: config.oauth.scope,
					},
				},
			)

			if (response.status() !== 200) {
				const errorText = await response.text()
				throw new Error(
					`Token refresh failed with status ${response.status()}: ${errorText}`,
				)
			}

			const tokenData = await response.json()

			this.state.oauthTokens = {
				accessToken: tokenData.access_token,
				idToken: tokenData.id_token,
				refreshToken:
					tokenData.refresh_token || this.state.oauthTokens.refreshToken,
				expiresAt: Date.now() + tokenData.expires_in * 1000,
			}

			this.metrics.refreshCount++
			await this.saveState()
		} finally {
			await requestContext.dispose()
		}
	}

	private async exchangeIdTokenForAylaToken(idToken: string) {
		const requestContext = await request.newContext()

		try {
			const response = await requestContext.post(
				`${config.ayla.baseUrl}${config.ayla.tokenSignInEndpoint}`,
				{
					headers: {
						'Content-Type': 'application/json',
						Accept: '*/*',
						'User-Agent':
							'Dalvik/2.1.0 (Linux; U; Android 16; sdk_gphone64_arm64 Build/BP22.250325.006)',
					},
					data: {
						token: idToken,
						app_id: config.ayla.appId,
						app_secret: config.ayla.appSecret,
					},
				},
			)

			if (response.status() !== 200) {
				const errorText = await response.text()
				throw new Error(
					`Ayla token_sign_in failed with status ${response.status()}: ${errorText}`,
				)
			}

			const tokenData = await response.json()

			return {
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token,
				expiresAt: Date.now() + tokenData.expires_in * 1000,
			}
		} finally {
			await requestContext.dispose()
		}
	}

	private isTokenExpired(expiresAt: number): boolean {
		return Date.now() + TOKEN_EXPIRY_BUFFER_MS >= expiresAt
	}

	private async ensureStateLoaded(): Promise<void> {
		if (this.stateLoaded) return

		try {
			if (existsSync(AUTH_STATE_FILE)) {
				const data = await fs.readFile(AUTH_STATE_FILE, 'utf-8')
				this.state = JSON.parse(data)
				console.log('[NinjaAuthManager] Loaded auth state from file')
			}
		} catch (error) {
			console.warn('[NinjaAuthManager] Failed to load auth state:', error)
			this.state = {}
		}

		this.stateLoaded = true
	}

	private async saveState(): Promise<void> {
		try {
			await fs.writeFile(AUTH_STATE_FILE, JSON.stringify(this.state, null, 2))
			console.log('[NinjaAuthManager] Saved auth state to file')
		} catch (error) {
			console.error('[NinjaAuthManager] Failed to save auth state:', error)
		}
	}

	private updateMetadata(
		result: 'success' | 'failure',
		latencyMs?: number,
	): void {
		if (result === 'success') {
			this.metrics.successCount++
			if (latencyMs) {
				const current = this.metrics.averageLatencyMs || 0
				const count = this.metrics.successCount
				this.metrics.averageLatencyMs =
					(current * (count - 1) + latencyMs) / count
			}
		} else {
			this.metrics.failureCount++
		}
	}

	private logEvent(type: AuthEvent['type'], data?: unknown): void {
		// Log events to console for now
		console.log(`[NinjaAuthManager] Event: ${type}`, data || '')
	}
}
