import { afterEach, describe, expect, it, vi } from 'vitest'
import { waitUntil } from './lambda-wait-until'

afterEach(() => {
	globalThis.__pitminderWaitUntil = undefined
})

describe('waitUntil (Lambda background-work registration)', () => {
	it('registers the promise with the invocation registry when present', () => {
		const register = vi.fn()
		globalThis.__pitminderWaitUntil = register
		const work = Promise.resolve('done')
		waitUntil(work)
		expect(register).toHaveBeenCalledTimes(1)
		expect(register.mock.calls[0]?.[0]).toBeInstanceOf(Promise)
	})

	it('falls back to detached behavior (no throw) when the registry is absent', () => {
		expect(globalThis.__pitminderWaitUntil).toBeUndefined()
		expect(() => waitUntil(Promise.resolve())).not.toThrow()
	})

	it('a rejecting promise never surfaces an unhandled rejection', async () => {
		const unhandled = vi.fn()
		process.on('unhandledRejection', unhandled)
		try {
			waitUntil(Promise.reject(new Error('boom')))
			await new Promise((r) => setTimeout(r, 20))
			expect(unhandled).not.toHaveBeenCalled()
		} finally {
			process.off('unhandledRejection', unhandled)
		}
	})

	it('the registered (guarded) promise still settles after the source rejects', async () => {
		let registered: Promise<unknown> | undefined
		globalThis.__pitminderWaitUntil = (p) => {
			registered = p
		}
		waitUntil(Promise.reject(new Error('boom')))
		await expect(registered).resolves.toBeUndefined()
	})
})
