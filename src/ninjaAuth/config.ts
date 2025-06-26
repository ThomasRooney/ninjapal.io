// Centralized configuration for the Ninja authentication system
// Implements secure separation between public and private configuration

// --- Public, Client-Safe Configuration ---
// These are exposed via Vite's `VITE_` prefix and are safe for the client.
export const OAUTH_CONFIG = {
	CLIENT_ID: import.meta.env.VITE_OAUTH_CLIENT_ID,
	REDIRECT_URI: import.meta.env.VITE_OAUTH_REDIRECT_URI,
	SCOPE: import.meta.env.VITE_OAUTH_SCOPE,
	AUTH_BASE_URL: import.meta.env.VITE_OAUTH_AUTH_BASE_URL,
}

export const AYLA_PUBLIC_CONFIG = {
	BASE_URL: import.meta.env.VITE_AYLA_BASE_URL,
	TOKEN_SIGN_IN_ENDPOINT: import.meta.env.VITE_AYLA_TOKEN_SIGN_IN_ENDPOINT,
	APP_ID: import.meta.env.VITE_AYLA_APP_ID,
}

// --- Private, Server-Only Configuration ---
// These are NOT prefixed and are only available on the server.
// On the client, `process.env.AYLA_APP_SECRET` will be undefined.
const AYLA_SERVER_CONFIG = {
	APP_SECRET: process.env.AYLA_APP_SECRET,
}

// --- Universal Startup Validation ---
// Check for missing public variables. This runs on both client and server.
for (const [key, value] of Object.entries({
	...OAUTH_CONFIG,
	...AYLA_PUBLIC_CONFIG,
})) {
	if (!value) {
		const message = `FATAL ERROR: Missing required public environment variable for ${key}. Check your .env file.`
		// On the server, we can exit. On the client, we throw to halt execution.
		if (import.meta.env.SSR) {
			console.error(message)
			process.exit(1)
		}
		throw new Error(message)
	}
}

// --- Server-Side Startup Validation ---
if (import.meta.env.SSR) {
	if (!AYLA_SERVER_CONFIG.APP_SECRET) {
		console.error(
			"FATAL ERROR: Missing required server environment variable 'AYLA_APP_SECRET'.",
		)
		process.exit(1)
	}
}

// --- Getter for Server Config ---
// A function to securely access server config. It will throw an error if
// ever called on the client, preventing accidental leaks.
export function getAylaServerConfig() {
	if (!import.meta.env.SSR) {
		throw new Error('getAylaServerConfig() can only be called on the server.')
	}
	// We can now safely assert the type, as it's validated above.
	return AYLA_SERVER_CONFIG as { APP_SECRET: string }
}

// --- Legacy Interface Support ---
// Maintain backward compatibility with existing code that expects the old interface
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
		appSecret?: string // Optional for client-side usage
	}
	settings: {
		tokenExpiryBufferMs: number
		maxLoginRetries: number
		loginTimeoutMs: number
	}
}

// Export a config object for backward compatibility
// Note: This will NOT include the app secret on the client side
export const config: AuthConfig = {
	oauth: {
		clientId: OAUTH_CONFIG.CLIENT_ID,
		redirectUri: OAUTH_CONFIG.REDIRECT_URI,
		scope: OAUTH_CONFIG.SCOPE,
		authBaseUrl: OAUTH_CONFIG.AUTH_BASE_URL,
	},
	ayla: {
		baseUrl: AYLA_PUBLIC_CONFIG.BASE_URL,
		tokenSignInEndpoint: AYLA_PUBLIC_CONFIG.TOKEN_SIGN_IN_ENDPOINT,
		appId: AYLA_PUBLIC_CONFIG.APP_ID,
		// appSecret is intentionally omitted from client-side config
	},
	settings: {
		tokenExpiryBufferMs: 60000, // 60 seconds
		maxLoginRetries: 3,
		loginTimeoutMs: 30000, // 30 seconds
	},
}

// Utility function to get full config including secrets (server-only)
export function getFullServerConfig(): AuthConfig & {
	ayla: { appSecret: string }
} {
	const serverConfig = getAylaServerConfig()
	return {
		...config,
		ayla: {
			...config.ayla,
			appSecret: serverConfig.APP_SECRET,
		},
	}
}

// Utility function to mask sensitive values for logging
export function getMaskedConfig(): Partial<AuthConfig> {
	const fullConfig = import.meta.env.SSR ? getFullServerConfig() : config
	return {
		oauth: fullConfig.oauth,
		ayla: {
			...fullConfig.ayla,
			appSecret: fullConfig.ayla.appSecret ? '***MASKED***' : undefined,
		},
		settings: fullConfig.settings,
	}
}

// Utility function to log configuration (safely)
export function logConfig(): void {
	console.log(
		'Ninja Auth Configuration:',
		JSON.stringify(getMaskedConfig(), null, 2),
	)
}
