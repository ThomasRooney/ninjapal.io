/// <reference types="vite/client" />

interface ImportMetaEnv {
	// Zero Sync Configuration
	readonly VITE_PUBLIC_SERVER: string

	// OAuth Configuration (Public)
	readonly VITE_OAUTH_CLIENT_ID: string
	readonly VITE_OAUTH_REDIRECT_URI: string
	readonly VITE_OAUTH_SCOPE: string
	readonly VITE_OAUTH_AUTH_BASE_URL: string

	// Ayla Configuration (Public)
	readonly VITE_AYLA_BASE_URL: string
	readonly VITE_AYLA_APP_ID: string
	readonly VITE_AYLA_TOKEN_SIGN_IN_ENDPOINT: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
