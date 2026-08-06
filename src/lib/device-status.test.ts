import { describe, expect, it } from 'vitest'
import { isDeviceOnline } from './device-status'

describe('isDeviceOnline', () => {
	it('matches any casing of online', () => {
		expect(isDeviceOnline('Online')).toBe(true)
		expect(isDeviceOnline('online')).toBe(true)
		expect(isDeviceOnline('ONLINE')).toBe(true)
	})

	it('rejects offline and unknown statuses', () => {
		expect(isDeviceOnline('Offline')).toBe(false)
		expect(isDeviceOnline('offline')).toBe(false)
		expect(isDeviceOnline('')).toBe(false)
		expect(isDeviceOnline('onlineish')).toBe(false)
	})

	it('rejects null and undefined', () => {
		expect(isDeviceOnline(null)).toBe(false)
		expect(isDeviceOnline(undefined)).toBe(false)
	})
})
