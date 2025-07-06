import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from './useCountdown'

describe('useCountdown', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should return zeros for null/undefined target date', () => {
		const { result } = renderHook(() => useCountdown(null))
		expect(result.current).toEqual({
			hours: '00',
			minutes: '00',
			seconds: '00',
			formatted: '00:00:00',
		})
	})

	it('should calculate countdown correctly', () => {
		const targetDate = new Date()
		targetDate.setHours(targetDate.getHours() + 1)
		targetDate.setMinutes(targetDate.getMinutes() + 30)
		targetDate.setSeconds(targetDate.getSeconds() + 45)

		const { result } = renderHook(() => useCountdown(targetDate.toISOString()))

		// Should show approximately 1:30:45
		expect(result.current.hours).toBe('01')
		expect(result.current.minutes).toBe('30')
		expect(result.current.seconds).toBe('45')
		expect(result.current.formatted).toBe('01:30:45')
	})

	it('should return zeros for past dates', () => {
		const pastDate = new Date()
		pastDate.setDate(pastDate.getDate() - 1)

		const { result } = renderHook(() => useCountdown(pastDate.toISOString()))

		expect(result.current).toEqual({
			hours: '00',
			minutes: '00',
			seconds: '00',
			formatted: '00:00:00',
		})
	})
})