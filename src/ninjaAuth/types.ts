// OAuth and Authentication Types

export interface TokenInfo {
	/** JWT access token for API calls */
	access_token: string

	/** JWT ID token containing user profile information */
	id_token?: string

	/** Refresh token for obtaining new access tokens */
	refresh_token: string

	/** Token expiration time as Unix timestamp in milliseconds */
	expires_at: number
}

// Cookie type definition
export interface Cookie {
	name: string
	value: string
	domain?: string
	path?: string
	expires?: number
	httpOnly?: boolean
	secure?: boolean
	sameSite?: 'Strict' | 'Lax' | 'None'
}

// Identity artifacts from browser authentication
export interface IdentityArtifacts {
	cookies: Cookie[]
	authorizationCode: string
	pkceVerifier: string
	state: string
}

// OAuth tokens structure
export interface OAuthTokens {
	accessToken: string
	idToken: string
	refreshToken: string
	tokenType: string
	expiresIn: number
	expiresAt: number
}

// Ayla API tokens
export interface AylaToken {
	accessToken: string
	refreshToken: string
	expiresAt: number
	role: string
}

// Auth state interface
export interface AuthState {
	/** Browser session artifacts from authentication */
	identityArtifacts: IdentityArtifacts | null

	/** OAuth tokens from logineu.sharkninja.com */
	oauthTokens: OAuthTokens | null

	/** Ayla API tokens from user-field-eu.aylanetworks.com */
	aylaToken: AylaToken | null
}

// Enhanced auth state interface for the new architecture
export interface EnhancedAuthState {
	/** Browser session artifacts from authentication */
	identity?: {
		cookies: Cookie[]
		authorizationCode?: string
		pkceVerifier?: string
		state?: string
	}

	/** OAuth tokens from logineu.sharkninja.com */
	oauthTokens?: {
		accessToken: string
		idToken: string
		refreshToken: string
		expiresAt: number
	}

	/** Ayla API tokens from user-field-eu.aylanetworks.com */
	aylaToken?: {
		accessToken: string
		refreshToken?: string
		expiresAt: number
	}

	/** User information from OAuth userinfo endpoint */
	userInfo?: UserInfoResponse

	/** Metadata about the auth state */
	metadata?: {
		lastAuthenticatedAt: number
		authFailureCount: number
		lastRefreshAt?: number
	}
}

// Legacy interface for backward compatibility
export interface NinjaAuthState {
	/** Authentication tokens by service */
	tokens: {
		/** OAuth tokens from logineu.sharkninja.com */
		oauth?: TokenInfo

		/** Ayla tokens from user-field-eu.aylanetworks.com */
		ayla?: TokenInfo
	}

	/** Browser cookies for fallback authentication */
	cookies?: Cookie[]
}

// Interface for dependency injection of browser automation
export interface IBrowserAutomator {
	performLogin(credentials: Credentials): Promise<IdentityArtifacts>
}

export interface Credentials {
	email: string
	password: string
}

export interface IdentityArtifacts {
	cookies: Cookie[]
	authorizationCode: string
	pkceVerifier: string
	state: string
}

// Auth manager interface for testing
export interface IAuthManager {
	getIdentityAuth(): Promise<IdentityArtifacts>
	getIDToken(): Promise<string>
	getAPIToken(): Promise<string>
	forceRefreshAPIToken(): Promise<string>
	getState(): EnhancedAuthState
	clearState(): Promise<void>
}

// Auth state store interface for persistence
export interface AuthStateStore {
	save(userId: string, state: AuthState): Promise<void>
	load(userId: string): Promise<AuthState | null>
	delete(userId: string): Promise<void>
	refresh(
		userId: string,
		newTokens: Partial<OAuthTokens & AylaToken>,
	): Promise<void>
	cleanup(): Promise<void>
}

// Auth event types for monitoring
export interface AuthEvent {
	type:
		| 'auth_started'
		| 'auth_success'
		| 'auth_failure'
		| 'token_refresh'
		| 'token_expired'
	timestamp: number
	details?: {
		stage?: 'browser' | 'oauth' | 'ayla'
		error?: string
		retryCount?: number
	}
}

// Auth metrics for monitoring
export interface AuthMetrics {
	successCount: number
	failureCount: number
	lastSuccessAt?: number
	lastFailureAt?: number
	averageLatencyMs?: number
	refreshCount: number
}

export interface UserInfoResponse {
	/** User's email address - e.g. "thomas.c.rooney@gmail.com" */
	email: string

	/** Whether the email has been verified - typically true */
	email_verified: boolean

	/** User's display name - e.g. "Thomas Rooney" */
	name: string

	/** URL to user's profile picture */
	picture: string

	/** User's subject identifier from Auth0 - e.g. "auth0|e0525130-2b64-11ec-8a65-0a580ae94415" */
	sub: string

	/** When the user info was last updated - ISO 8601 timestamp */
	updated_at: string
}

export interface TokenResponse {
	/** JWT access token for API calls */
	access_token: string

	/** JWT ID token containing user profile information */
	id_token?: string

	/** Token type - always "Bearer" */
	token_type: string

	/** Access token lifetime in seconds - typically 86400 (24 hours) */
	expires_in: number

	/** Refresh token for obtaining new access tokens */
	refresh_token?: string

	/** Space-delimited list of scopes granted */
	scope: string
}

// Device API Types

export interface Device {
	/** Human-readable device name - e.g. "Young Smoky" */
	product_name: string

	/** Device model identifier - e.g. "AY008MVL1" */
	model: string

	/** Device Serial Number - unique identifier - e.g. "AC000W032754287" */
	dsn: string

	/** OEM model number - e.g. "OG900-EU" */
	oem_model: string

	/** Software/firmware version - e.g. "ADA 1.5-beta ameba 2019-08-07 18:17:00 7a221c647" */
	sw_version: string

	/** Template ID for device configuration - e.g. 59051 */
	template_id: number

	/** Device MAC address - e.g. "0ce5a311bba7" */
	mac: string

	/** Unique hardware identifier - may be null */
	unique_hardware_id: string | null

	/** Local IP address on LAN - e.g. "192.168.50.122" */
	lan_ip: string

	/** When device last connected - ISO 8601 timestamp - e.g. "2025-06-14T14:05:10Z" */
	connected_at: string

	/** Internal device key/ID - e.g. 3271081 */
	key: number

	/** Whether LAN connectivity is enabled */
	lan_enabled: boolean

	/** Connection priority order - e.g. ["LAN"] */
	connection_priority: string[]

	/** Whether device has configurable properties */
	has_properties: boolean

	/** Product classification - e.g. "demo" */
	product_class: string

	/** Current connection status - "Online" | "Offline" */
	connection_status: 'Online' | 'Offline'

	/** Device latitude coordinate - e.g. "51.2967" */
	lat: string

	/** Device longitude coordinate - e.g. "0.4032" */
	lng: string

	/** Location/postal code - e.g. "ME19" */
	locality: string

	/** Device connectivity type - e.g. "Wifi" */
	device_type: string

	/** Dealer information - may be null */
	dealer: string | null

	/** Facility UUID - may be null */
	facility_uuid: string | null
}

export interface DeviceResponse {
	device: Device
}

export interface CookCommand {
	/** Device ID - e.g. 3271081 */
	id: number

	/** Cooking mode - "grill" | "smoker" */
	mode: 'grill' | 'smoker'

	/** Cook time in seconds - e.g. 900 (15 min) for grill, 14400 (4 hours) for smoker */
	'seconds set': number

	/** Temperature setting - e.g. 1 for grill, 120 for smoker */
	temp: number

	/** Smoke setting - 0 for grill, 1 for smoker */
	smoke: 0 | 1

	/** Whether to skip preheat - typically 0 */
	'skip preheat': 0 | 1
}

export interface StopCookCommand {
	/** Cooking mode to stop */
	mode: 'grill' | 'smoker'

	/** Temperature 0 to stop */
	temp: 0
}

export interface CookCommandDatapoint {
	datapoint: {
		/** User metadata */
		metadata: {
			/** User UUID from Auth0 - e.g. "e0525130-2b64-11ec-8a65-0a580ae94415" */
			userUUID: string
		}

		/** JSON string of cook command */
		value: string
	}
}

export interface DeviceProperty {
	/** Property name - e.g. "GET_CookState", "SET_Cook_Command" */
	name: string

	/** Property value */
	value: unknown

	/** When property was last updated */
	updated_at: string
}

// Common API Response Types

export interface ApiError {
	/** Error message */
	message: string

	/** Error code */
	code?: string

	/** HTTP status code */
	status: number
}

// Constants from HAR analysis

export const API_ENDPOINTS = {
	/** Ayla Networks EU API base URL */
	AYLA_EU: 'https://ads-eu.aylanetworks.com',

	/** Auth0 EU base URL */
	AUTH0_EU: 'https://logineu.sharkninja.com',
} as const

export const DEVICE_PROPERTIES = {
	/** Get current cooking state */
	GET_CookState: 'GET_CookState',

	/** Get cooking notifications */
	GET_Cook_Notifications: 'GET_Cook_Notifications',

	/** Get device model number */
	GET_Device_Model_Number: 'GET_Device_Model_Number',

	/** Get device serial number */
	GET_Device_Serial_Num: 'GET_Device_Serial_Num',

	/** Get grill state */
	GET_GrillState: 'GET_GrillState',

	/** Get probe state */
	GET_ProbeState: 'GET_ProbeState',

	/** Get WiFi signal strength */
	GET_RSSI: 'GET_RSSI',

	/** Get firmware version */
	OTA_FW_VERSION: 'OTA_FW_VERSION',

	/** Send cook command */
	SET_Cook_Command: 'SET_Cook_Command',

	/** Set grill power */
	SET_GrillPower: 'SET_GrillPower',

	/** Set RSSI reporting period */
	SET_ReportRSSIPeriod: 'SET_ReportRSSIPeriod',

	/** Factory reset */
	SET_Reset_Factory: 'SET_Reset_Factory',

	/** WiFi reset */
	SET_Reset_WiFi: 'SET_Reset_WiFi',
} as const

// Example values from actual API responses
export const EXAMPLE_VALUES = {
	/** Example device DSN */
	DEVICE_DSN: 'AC000W032754287',

	/** Example device ID */
	DEVICE_ID: 3271081,

	/** Example user UUID */
	USER_UUID: 'e0525130-2b64-11ec-8a65-0a580ae94415',

	/** Example grill cook time (15 minutes) */
	GRILL_COOK_TIME: 900,

	/** Example smoker cook time (4 hours) */
	SMOKER_COOK_TIME: 14400,

	/** Example smoker temperature */
	SMOKER_TEMP: 120,
} as const
