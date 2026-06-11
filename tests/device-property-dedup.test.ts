import {
	DEVICE_PROPERTY_MAPPINGS,
	getColumnNameForProperty,
	isPropertyMapped,
} from '@/server/db/device-property-mappings'
import { describe, expect, it } from 'vitest'

/**
 * Mapped Ayla properties must flatten to dedicated columns and be excluded
 * from additionalDeviceProperties (sync filters on isPropertyMapped), while
 * unmapped properties pass through untouched.
 */
describe('Device property mapping dedup', () => {
	it('maps known properties to dedicated columns', () => {
		expect(isPropertyMapped('GET_RSSI')).toBe(true)
		expect(getColumnNameForProperty('GET_RSSI')).toBe('rssi')

		expect(isPropertyMapped('GET_Temp_Air')).toBe(true)
		expect(getColumnNameForProperty('GET_Temp_Air')).toBe('temp_air')
	})

	it('leaves unknown properties unmapped (kept in additionalDeviceProperties)', () => {
		expect(isPropertyMapped('unmapped_property')).toBe(false)
		expect(getColumnNameForProperty('unmapped_property')).toBeUndefined()
	})

	it('has a column for every mapping entry', () => {
		for (const [property, mapping] of Object.entries(
			DEVICE_PROPERTY_MAPPINGS,
		)) {
			expect(mapping.columnName, `mapping for ${property}`).toBeTruthy()
		}
	})
})
