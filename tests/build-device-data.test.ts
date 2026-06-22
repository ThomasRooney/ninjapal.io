import { buildDeviceData } from '@/server/db/build-device-data'
import { describe, expect, it } from 'vitest'

function property(name: string, value: unknown) {
	return {
		property: {
			name,
			value,
			type: 'string',
			base_type: 'string',
			data_updated_at: '2026-06-21T06:56:12Z',
		},
	}
}

describe('buildDeviceData', () => {
	it('normalizes real grill-state temperatures to Celsius', () => {
		const data = buildDeviceData(
			{
				dsn: 'AC000W032754287',
				product_name: 'Young Smoky',
				model: 'AY008MVL1',
				connection_status: 'Online',
			},
			[
				property(
					'GET_GrillState',
					JSON.stringify({
						id: 71,
						state: 'cooking',
						mode: 'smoker',
						setpoint: 150,
						'seconds set': 28800,
						'seconds left': 26631,
						smoke: 1,
						error: 0,
						message: '',
						eventmask: '0x00',
						sim: 0,
						inputs: {
							temps: {
								grill: 257.9,
								air: 317.8,
								smoke: 280.4,
								probe0_a: 0,
								probe0_b: 0,
								probe1_a: 112,
								probe1_b: 112,
								main: 6542.4,
								ui: 6513.6,
							},
							io: { 'lid open': 0 },
						},
					}),
				),
				property(
					'GET_ProbeState',
					JSON.stringify({
						probes: [
							{
								name: 'probe0',
								'plugged in': 1,
								active: 0,
								temp: 44.4,
								progress: 100,
							},
							{
								name: 'probe1',
								'plugged in': 0,
								active: 0,
								temp: 0,
								progress: 100,
							},
						],
					}),
				),
				property('GET_Temp_Grill', null),
				property('GET_Temp_Air', null),
				property('GET_Probe1_Temp', null),
			],
			'6791c2c2-339d-4626-b7ee-fbba9eed0b3a',
		)

		expect(data.cook_mode).toBe('smoker')
		expect(data.cook_state).toBe('cooking')
		expect(data.cook_smoke_level).toBe(1)
		expect(data.error_code).toBe(0)
		expect(data.is_lid_open).toBe(false)

		expect(data.temp_grill).toBe(125.5)
		expect(data.temp_air).toBe(158.8)
		expect(data.temp_smoke).toBe(138)
		expect(data.probe1_temp_a).toBe(44.4)
		expect(data.probe2_temp_a).toBeNull()
		expect(data.is_probe1_installed).toBe(true)
		expect(data.is_probe2_installed).toBe(false)
		expect(data.temp_mainpcb).toBeNull()
		expect(data.temp_uipcb).toBeNull()

		const raw = JSON.parse(data.grill_state_raw as string)
		expect(raw.inputs.temps.grill).toBe(125.5)
		expect(raw.inputs.temps.air).toBe(158.8)
		expect(raw.inputs.temps.smoke).toBe(138)
		expect(raw.inputs.temps.probe1_a).toBe(44.4)
	})

	it('keeps simulated grill-state temperatures in Celsius', () => {
		const data = buildDeviceData(
			{ dsn: 'DEMO000000001', product_name: 'Demo Smoker' },
			[
				property(
					'GET_GrillState',
					JSON.stringify({
						id: 1,
						state: 'cooking',
						mode: 'smoker',
						setpoint: 107,
						sim: 1,
						inputs: {
							temps: { grill: 101.2, air: 99.1, smoke: 87.4 },
							io: { 'lid open': 0 },
						},
					}),
				),
			],
			'6791c2c2-339d-4626-b7ee-fbba9eed0b3a',
		)

		expect(data.temp_grill).toBe(101.2)
		expect(data.temp_air).toBe(99.1)
		expect(data.temp_smoke).toBe(87.4)
	})

	it('lets non-null standalone temperature properties override fallbacks', () => {
		const data = buildDeviceData(
			{ dsn: 'AC000W032754287', product_name: 'Young Smoky' },
			[
				property(
					'GET_GrillState',
					JSON.stringify({
						id: 71,
						state: 'cooking',
						mode: 'smoker',
						sim: 0,
						inputs: {
							temps: { grill: 257.9 },
							io: { 'lid open': 0 },
						},
					}),
				),
				property('GET_Temp_Grill', 130.2),
			],
			'6791c2c2-339d-4626-b7ee-fbba9eed0b3a',
		)

		expect(data.temp_grill).toBe(130.2)
	})
})
