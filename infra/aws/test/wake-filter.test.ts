import { describe, expect, it } from 'vitest'
import { shouldDrive } from '../lambda/power/wake'

const modify = (oldDesired: string, newDesired: string) => ({
	eventName: 'MODIFY',
	dynamodb: {
		OldImage: { desiredState: { S: oldDesired }, state: { S: 'AWAKE' } },
		NewImage: { desiredState: { S: newDesired }, state: { S: 'AWAKE' } },
	},
})

describe('wake stream no-op filter (shouldDrive)', () => {
	it('always drives on direct invokes (no Records)', () => {
		expect(shouldDrive({})).toBe(true)
		expect(shouldDrive(null)).toBe(true)
		expect(shouldDrive({ reason: 'reconcile', depth: 0 })).toBe(true)
	})

	it('drives on INSERT (row seeded)', () => {
		expect(shouldDrive({ Records: [{ eventName: 'INSERT' }] })).toBe(true)
	})

	it('drives when desiredState changes', () => {
		expect(shouldDrive({ Records: [modify('SLEEPING', 'AWAKE')] })).toBe(true)
		expect(shouldDrive({ Records: [modify('AWAKE', 'SLEEPING')] })).toBe(true)
	})

	it('skips activity stamps, heartbeats and the driver own state claims', () => {
		// Same desiredState on both images — a stamp, a lease heartbeat, or a
		// state claim by the in-process driver. None need a fresh invocation.
		expect(shouldDrive({ Records: [modify('AWAKE', 'AWAKE')] })).toBe(false)
		expect(
			shouldDrive({
				Records: [
					{
						eventName: 'MODIFY',
						dynamodb: {
							OldImage: {
								desiredState: { S: 'SLEEPING' },
								state: { S: 'STOPPING_DB' },
							},
							NewImage: {
								desiredState: { S: 'SLEEPING' },
								state: { S: 'SLEEPING' },
							},
						},
					},
				],
			}),
		).toBe(false)
	})

	it('skips REMOVE, drives when any record in a batch qualifies', () => {
		expect(shouldDrive({ Records: [{ eventName: 'REMOVE' }] })).toBe(false)
		expect(
			shouldDrive({
				Records: [modify('AWAKE', 'AWAKE'), modify('AWAKE', 'SLEEPING')],
			}),
		).toBe(true)
	})
})
