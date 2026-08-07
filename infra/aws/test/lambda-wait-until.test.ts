import { describe, expect, it } from 'vitest'
import { createWaitUntilRegistry } from '../spike/lambda-wait-until.mjs'

/** A promise with its resolver exposed. */
function deferred<T = void>() {
	let resolve!: (value: T) => void
	let reject!: (reason?: unknown) => void
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}

describe('waitUntil registry (P0: detached work must not outlive the invocation)', () => {
	it('flush resolves immediately with nothing registered', async () => {
		const registry = createWaitUntilRegistry()
		await expect(registry.flush()).resolves.toBeUndefined()
	})

	it('the handler (flush) must NOT resolve before a registered promise settles', async () => {
		const registry = createWaitUntilRegistry()
		const work = deferred()
		let workDone = false
		registry.register(
			work.promise.then(() => {
				workDone = true
			}),
		)

		let flushed = false
		const flushing = registry.flush().then(() => {
			flushed = true
		})
		// Give the flush every chance to (incorrectly) resolve early.
		await new Promise((r) => setTimeout(r, 20))
		expect(flushed).toBe(false)

		work.resolve()
		await flushing
		expect(flushed).toBe(true)
		expect(workDone).toBe(true)
	})

	it('a rejected background promise settles the flush without throwing', async () => {
		const registry = createWaitUntilRegistry()
		registry.register(Promise.reject(new Error('tee failed')))
		await expect(registry.flush()).resolves.toBeUndefined()
	})

	it('work registered DURING a flush pass is awaited too', async () => {
		const registry = createWaitUntilRegistry()
		const second = deferred()
		let secondDone = false
		registry.register(
			Promise.resolve().then(() => {
				registry.register(
					second.promise.then(() => {
						secondDone = true
					}),
				)
			}),
		)
		let flushed = false
		const flushing = registry.flush().then(() => {
			flushed = true
		})
		await new Promise((r) => setTimeout(r, 20))
		expect(flushed).toBe(false)
		second.resolve()
		await flushing
		expect(secondDone).toBe(true)
	})

	it('registrations are per-registry (per-invocation isolation)', async () => {
		const a = createWaitUntilRegistry()
		const b = createWaitUntilRegistry()
		a.register(new Promise(() => {})) // never settles
		expect(a.size()).toBe(1)
		expect(b.size()).toBe(0)
		await expect(b.flush()).resolves.toBeUndefined()
	})
})
