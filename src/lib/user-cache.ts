/**
 * Client-side cache of the root-route user. The root beforeLoad runs on
 * EVERY navigation; without this, each sidebar click paid a server-fn
 * round-trip (session fetch + provision upsert on Neon) — a flat ~800 ms
 * per nav in prod. Auth state only changes at login/signup/logout (all
 * SPA transitions), so those call clearUserCache(); full-page loads
 * (magic link, impersonation) reset module state for free.
 */

export interface RootUser {
	id: string
	email: string
	name: string
	whitelisted: boolean
	isAdmin: boolean
	impersonatedBy: string | null
	accessToken: string
}

let cached: { user: RootUser | null } | null = null

export function getCachedUser(): { user: RootUser | null } | null {
	return cached
}

export function setCachedUser(user: RootUser | null): void {
	cached = { user }
}

export function clearUserCache(): void {
	cached = null
}
