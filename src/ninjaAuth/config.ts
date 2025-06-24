// Centralized configuration for the Ninja authentication system
// Supports environment variables and fallback defaults for development

export interface AuthConfig {
	oauth: {
		clientId: string
		redirectUri: string
		scope: string
		authBaseUrl: string
	}
	ayla: {
		baseUrl: string
		tokenSignInEndpoint: string
		appId: string
		appSecret: string
	}
	settings: {
		tokenExpiryBufferMs: number
		maxLoginRetries: number
		loginTimeoutMs: number
	}
}

// OAuth configuration based on HAR analysis
const OAUTH_CONFIG = {
	CLIENT_ID: '***REMOVED***',
	REDIRECT_URI:
		'com.sharkninja.ninja://logineu.sharkninja.com/android/com.sharkninja.ninja.connected.kitchen/callback',
	SCOPE:
		'openid profile email offline_access read:users read:current_user read:user_idp_tokens',
	AUTH_BASE_URL: 'https://logineu.sharkninja.com',
}

// Ayla Networks configuration for token_sign_in
const AYLA_CONFIG = {
	BASE_URL: 'https://user-field-eu.aylanetworks.com',
	TOKEN_SIGN_IN_ENDPOINT: '/api/v1/token_sign_in',
	APP_ID: 'android_ninjakitchen_prod-PQ-id',
	APP_SECRET: '***REMOVED***',
}

// Load configuration from environment variables with fallback defaults
function loadConfig(): AuthConfig {
	const config: AuthConfig = {
		oauth: {
			clientId: process.env.OAUTH_CLIENT_ID || OAUTH_CONFIG.CLIENT_ID,
			redirectUri: process.env.OAUTH_REDIRECT_URI || OAUTH_CONFIG.REDIRECT_URI,
			scope: process.env.OAUTH_SCOPE || OAUTH_CONFIG.SCOPE,
			authBaseUrl:
				process.env.OAUTH_AUTH_BASE_URL || OAUTH_CONFIG.AUTH_BASE_URL,
		},
		ayla: {
			baseUrl: process.env.AYLA_BASE_URL || AYLA_CONFIG.BASE_URL,
			tokenSignInEndpoint:
				process.env.AYLA_TOKEN_ENDPOINT || AYLA_CONFIG.TOKEN_SIGN_IN_ENDPOINT,
			appId: process.env.AYLA_APP_ID || AYLA_CONFIG.APP_ID,
			appSecret: process.env.AYLA_APP_SECRET || AYLA_CONFIG.APP_SECRET,
		},
		settings: {
			tokenExpiryBufferMs: Number.parseInt(
				process.env.TOKEN_EXPIRY_BUFFER_MS || '60000',
			), // 60 seconds
			maxLoginRetries: Number.parseInt(process.env.MAX_LOGIN_RETRIES || '3'),
			loginTimeoutMs: Number.parseInt(process.env.LOGIN_TIMEOUT_MS || '30000'), // 30 seconds
		},
	}

	// Validate required configuration
	validateConfig(config)

	return config
}

function validateConfig(config: AuthConfig): void {
	const requiredFields = [
		{ path: 'oauth.clientId', value: config.oauth.clientId },
		{ path: 'oauth.authBaseUrl', value: config.oauth.authBaseUrl },
		{ path: 'ayla.baseUrl', value: config.ayla.baseUrl },
		{ path: 'ayla.appId', value: config.ayla.appId },
		{ path: 'ayla.appSecret', value: config.ayla.appSecret },
	]

	const missingFields = requiredFields.filter(
		(field) => !field.value || field.value.trim() === '',
	)

	if (missingFields.length > 0) {
		const fieldNames = missingFields.map((field) => field.path).join(', ')
		throw new Error(
			`Missing required configuration fields: ${fieldNames}. Please check environment variables or defaults.`,
		)
	}

	// Validate URLs
	try {
		new URL(config.oauth.authBaseUrl)
		new URL(config.ayla.baseUrl)
	} catch (error) {
		throw new Error(
			`Invalid URL in configuration: ${error instanceof Error ? error.message : 'Unknown URL error'}`,
		)
	}
}

// Export the singleton config instance
export const config = loadConfig()

// Utility function to mask sensitive values for logging
export function getMaskedConfig(): Partial<AuthConfig> {
	return {
		oauth: config.oauth,
		ayla: {
			...config.ayla,
			appSecret: '***MASKED***',
		},
		settings: config.settings,
	}
}

// Utility function to log configuration (safely)
export function logConfig(): void {
	console.log(
		'Ninja Auth Configuration:',
		JSON.stringify(getMaskedConfig(), null, 2),
	)
}
