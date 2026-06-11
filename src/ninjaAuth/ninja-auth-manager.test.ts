import { beforeEach, describe, expect, it } from 'vitest'
import { NinjaAuthManager } from './ninja-auth-manager.ts'
import type { Credentials } from './types.ts'

describe('NinjaAuthManager', () => {
	const testCredentials1: Credentials = {
		email: 'user1@example.com',
		password: 'password1',
	}

	const testCredentials2: Credentials = {
		email: 'user2@example.com',
		password: 'password2',
	}

	describe('create', () => {
		it('should create a new instance with valid credentials', () => {
			const manager = NinjaAuthManager.create(testCredentials1)
			expect(manager).toBeInstanceOf(NinjaAuthManager)
		})

		it('should throw error when credentials are missing', () => {
			expect(() => {
				// @ts-expect-error - testing invalid input
				NinjaAuthManager.create(null)
			}).toThrow('Credentials with email and password are required')

			expect(() => {
				// @ts-expect-error - testing invalid input
				NinjaAuthManager.create({})
			}).toThrow('Credentials with email and password are required')
		})

		it('should throw error when email is missing', () => {
			expect(() => {
				NinjaAuthManager.create({ email: '', password: 'password' })
			}).toThrow('Credentials with email and password are required')
		})

		it('should throw error when password is missing', () => {
			expect(() => {
				NinjaAuthManager.create({ email: 'test@example.com', password: '' })
			}).toThrow('Credentials with email and password are required')
		})

		it('should create separate instances for different credentials', () => {
			const manager1 = NinjaAuthManager.create(testCredentials1)
			const manager2 = NinjaAuthManager.create(testCredentials2)

			// They should be different instances
			expect(manager1).not.toBe(manager2)

			// Each should have its own state
			const state1 = manager1.getState()
			const state2 = manager2.getState()

			// States should be independent
			expect(state1).not.toBe(state2)
		})

		it('should create new instance each time (not singleton)', () => {
			const manager1 = NinjaAuthManager.create(testCredentials1)
			const manager2 = NinjaAuthManager.create(testCredentials1)

			// Even with same credentials, should be different instances
			expect(manager1).not.toBe(manager2)
		})

		it('should accept initial state', () => {
			const initialState = {
				identity: {
					cookies: [{ name: 'test', value: 'value', domain: '.example.com' }],
				},
			}

			const manager = NinjaAuthManager.create(testCredentials1, initialState)
			const state = manager.getState()

			expect(state.identity).toEqual(initialState.identity)
		})
	})

	describe('instance methods', () => {
		let manager: NinjaAuthManager

		beforeEach(() => {
			manager = NinjaAuthManager.create(testCredentials1)
		})

		it('should clear state', async () => {
			await manager.clearState()
			const state = manager.getState()
			expect(state).toEqual({})
		})

		it('should get metrics', () => {
			const metrics = manager.getMetrics()
			expect(metrics).toHaveProperty('successCount')
			expect(metrics).toHaveProperty('failureCount')
			expect(metrics).toHaveProperty('refreshCount')
			expect(metrics.successCount).toBe(0)
			expect(metrics.failureCount).toBe(0)
			expect(metrics.refreshCount).toBe(0)
		})
	})
})
