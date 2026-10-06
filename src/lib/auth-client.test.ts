import { describe, expect, it, vi } from 'vitest'
import { signInWithGoogle } from './auth-client'

const { social } = vi.hoisted(() => ({ social: vi.fn() }))
vi.mock('better-auth/react', () => ({
	createAuthClient: () => ({ signIn: { social } }),
}))

describe('Google auth client', () => {
	it('sets an app destination and recoverable error page', async () => {
		await signInWithGoogle()
		expect(social).toHaveBeenLastCalledWith({
			provider: 'google',
			callbackURL: '/app',
			errorCallbackURL: '/auth/login',
		})
	})
	it('preserves the MCP continuation after success or cancellation', async () => {
		await signInWithGoogle(
			'/api/auth/oauth2/authorize?sig=x',
			'/auth/login?sig=x',
		)
		expect(social).toHaveBeenLastCalledWith({
			provider: 'google',
			callbackURL: '/api/auth/oauth2/authorize?sig=x',
			errorCallbackURL: '/auth/login?sig=x',
		})
	})
})
