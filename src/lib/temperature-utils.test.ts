import { describe, expect, it } from 'vitest'
import { fahrenheitToCelsius, formatTemperature } from './temperature-utils'

describe('temperature-utils', () => {
	describe('fahrenheitToCelsius', () => {
		it('should convert 32°F to 0°C', () => {
			expect(fahrenheitToCelsius(32)).toBe(0)
		})

		it('should convert 212°F to 100°C', () => {
			expect(fahrenheitToCelsius(212)).toBe(100)
		})

		it('should convert 98.6°F to 37°C', () => {
			expect(fahrenheitToCelsius(98.6)).toBe(37)
		})

		it('should convert 0°F to -17.8°C', () => {
			expect(fahrenheitToCelsius(0)).toBe(-17.8)
		})

		it('should convert -40°F to -40°C', () => {
			expect(fahrenheitToCelsius(-40)).toBe(-40)
		})

		it('should handle null input', () => {
			expect(fahrenheitToCelsius(null)).toBe(null)
		})

		it('should handle undefined input', () => {
			expect(fahrenheitToCelsius(undefined)).toBe(undefined)
		})

		it('should round to one decimal place', () => {
			expect(fahrenheitToCelsius(100)).toBe(37.8)
			expect(fahrenheitToCelsius(75)).toBe(23.9)
		})
	})

	describe('formatTemperature', () => {
		it('should format temperature in Fahrenheit when prefersCelsius is false', () => {
			expect(formatTemperature(100, false)).toBe('100°F')
			expect(formatTemperature(32, false)).toBe('32°F')
			expect(formatTemperature(0, false)).toBe('0°F')
		})

		it('should format temperature in Celsius when prefersCelsius is true', () => {
			expect(formatTemperature(100, true)).toBe('37.8°C')
			expect(formatTemperature(32, true)).toBe('0°C')
			expect(formatTemperature(212, true)).toBe('100°C')
		})

		it('should handle null temperature', () => {
			expect(formatTemperature(null, false)).toBe('--')
			expect(formatTemperature(null, true)).toBe('--')
		})

		it('should handle undefined temperature', () => {
			expect(formatTemperature(undefined, false)).toBe('--')
			expect(formatTemperature(undefined, true)).toBe('--')
		})

		it('should handle negative temperatures', () => {
			expect(formatTemperature(-10, false)).toBe('-10°F')
			expect(formatTemperature(-10, true)).toBe('-23.3°C')
		})

		it('should handle decimal temperatures', () => {
			expect(formatTemperature(98.6, false)).toBe('98.6°F')
			expect(formatTemperature(98.6, true)).toBe('37°C')
		})
	})
})
