/**
 * Example service demonstrating how to use NinjaAuthManager in a production environment
 * This shows the pattern for using the auth manager in a backend service
 */

import { config } from './config.ts'
import { NinjaAuthManager } from './ninja-auth-manager.ts'

export class NinjaApiService {
	private authManager: NinjaAuthManager
	private isInitialized = false

	constructor() {
		// Initialize auth manager using singleton pattern
		this.authManager = NinjaAuthManager.getInstance()
	}

	/**
	 * Initialize the service and ensure we have valid authentication
	 * Call this before making any API requests
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return

		try {
			// Ensure we have a valid API token
			await this.authManager.getAPIToken()
			this.isInitialized = true

			console.log('[SERVICE] Ninja API service initialized successfully')

			// Log auth metrics for monitoring
			const metrics = this.authManager.getMetrics()
			console.log('[SERVICE] Auth metrics:', metrics)
		} catch (error) {
			console.error('[SERVICE] Failed to initialize Ninja API service:', error)
			throw new Error(
				`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			)
		}
	}

	/**
	 * Make an authenticated API request to the Ninja/Ayla API
	 * Handles token refresh automatically
	 */
	async makeAuthenticatedRequest(
		endpoint: string,
		options: RequestInit = {},
	): Promise<Response> {
		await this.initialize()

		try {
			// Get current API token (will refresh if needed)
			const apiToken = await this.authManager.getAPIToken()

			// Prepare request with authentication headers
			const requestOptions: RequestInit = {
				...options,
				headers: {
					Authorization: `Bearer ${apiToken}`,
					'Content-Type': 'application/json',
					Accept: 'application/json',
					...options.headers,
				},
			}

			// Make the API request
			const response = await fetch(endpoint, requestOptions)

			// Handle 401 responses by refreshing token and retrying once
			if (response.status === 401) {
				console.warn(
					'[SERVICE] Received 401, refreshing API token and retrying...',
				)

				try {
					const newApiToken = await this.authManager.forceRefreshAPIToken()

					// Retry request with new token
					const retryOptions: RequestInit = {
						...requestOptions,
						headers: {
							...requestOptions.headers,
							Authorization: `Bearer ${newApiToken}`,
						},
					}

					const retryResponse = await fetch(endpoint, retryOptions)

					if (retryResponse.status === 401) {
						throw new Error('Authentication failed even after token refresh')
					}

					return retryResponse
				} catch (refreshError) {
					console.error('[SERVICE] Token refresh failed:', refreshError)
					throw new Error(
						`Authentication refresh failed: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`,
					)
				}
			}

			return response
		} catch (error) {
			console.error('[SERVICE] API request failed:', error)
			throw error
		}
	}

	/**
	 * Example: Get list of devices
	 */
	async getDevices(): Promise<unknown[]> {
		const endpoint = `${config.ayla.baseUrl}/api/v1/devices`

		try {
			const response = await this.makeAuthenticatedRequest(endpoint)

			if (!response.ok) {
				throw new Error(
					`Failed to get devices: ${response.status} ${response.statusText}`,
				)
			}

			const data = await response.json()
			return data.devices || []
		} catch (error) {
			console.error('[SERVICE] Failed to get devices:', error)
			throw error
		}
	}

	/**
	 * Example: Send a command to a device
	 */
	async sendDeviceCommand(deviceId: number, command: unknown): Promise<void> {
		const endpoint = `${config.ayla.baseUrl}/api/v1/devices/${deviceId}/properties/SET_Cook_Command/datapoints`

		try {
			const response = await this.makeAuthenticatedRequest(endpoint, {
				method: 'POST',
				body: JSON.stringify({
					datapoint: {
						value: JSON.stringify(command),
					},
				}),
			})

			if (!response.ok) {
				throw new Error(
					`Failed to send device command: ${response.status} ${response.statusText}`,
				)
			}

			console.log('[SERVICE] Device command sent successfully')
		} catch (error) {
			console.error('[SERVICE] Failed to send device command:', error)
			throw error
		}
	}

	/**
	 * Get current authentication state for debugging
	 */
	getAuthState() {
		return this.authManager.getState()
	}

	/**
	 * Get authentication metrics for monitoring
	 */
	getAuthMetrics() {
		return this.authManager.getMetrics()
	}

	/**
	 * Clear authentication state (useful for testing or recovery)
	 */
	async clearAuthState(): Promise<void> {
		await this.authManager.clearState()
		this.isInitialized = false
	}

	/**
	 * Health check - verifies the service can authenticate
	 */
	async healthCheck(): Promise<{
		status: 'healthy' | 'unhealthy'
		details: unknown
	}> {
		try {
			await this.initialize()

			const metrics = this.getAuthMetrics()
			const state = this.getAuthState()

			return {
				status: 'healthy',
				details: {
					authenticated: !!state.aylaToken,
					tokenExpiry: state.aylaToken?.expiresAt,
					metrics,
				},
			}
		} catch (error) {
			return {
				status: 'unhealthy',
				details: {
					error: error instanceof Error ? error.message : 'Unknown error',
					metrics: this.getAuthMetrics(),
				},
			}
		}
	}
}

// Example usage:
/*
const service = new NinjaApiService();

// Initialize the service
await service.initialize();

// Get devices
const devices = await service.getDevices();
console.log('Devices:', devices);

// Send a command
await service.sendDeviceCommand(12345, {
  mode: 'grill',
  temp: 200,
  'seconds set': 900
});

// Check health
const health = await service.healthCheck();
console.log('Service health:', health);
*/
