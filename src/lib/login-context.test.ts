import { describe, expect, it } from 'vitest'
import { loginContext } from './login-context'

describe('login continuation', () => {
	it('defaults to the app and ignores arbitrary redirect parameters', () => {
		expect(loginContext('?redirectTo=https://evil.example')).toEqual({
			redirectTo: undefined,
			errorCallbackURL: '/auth/login',
			googleError: null,
		})
	})

	it('keeps the signed authorization query and removes provider error fields', () => {
		const query = new URLSearchParams({
			client_id: 'mcp-client',
			scope: 'pitminder:read pitminder:control',
			sig: 'signed+/=',
			state: 'original-state',
		}).toString()
		expect(
			loginContext(`?${query}&error=access_denied&error_description=Cancel`),
		).toEqual({
			redirectTo: `/api/auth/oauth2/authorize?${query}`,
			errorCallbackURL: `/auth/login?${query}`,
			googleError: 'access_denied',
		})
	})
})
