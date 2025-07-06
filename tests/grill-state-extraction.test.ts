import { describe, it, expect, vi } from 'vitest'

describe('Grill State Extraction', () => {
	// Mock the Zero server mutator extraction logic
	const mockExtractGrillState = (grillStateRaw: string) => {
		const deviceData: any = {}
		
		try {
			const grillState = JSON.parse(grillStateRaw)
			
			// Flatten top-level grill state fields
			if (grillState.state !== undefined)
				deviceData.gs_state = grillState.state
			if (grillState.message !== undefined)
				deviceData.gs_message = grillState.message
			if (grillState.eventmask !== undefined)
				deviceData.gs_eventmask = grillState.eventmask
			if (grillState.sim !== undefined)
				deviceData.gs_sim = grillState.sim
			
			// Extract nested temperature data
			if (grillState.inputs?.temps) {
				const temps = grillState.inputs.temps
				
				if (temps.grill !== undefined)
					deviceData.temp_grill = temps.grill
				if (temps.air !== undefined)
					deviceData.temp_air = temps.air
				if (temps.smoke !== undefined)
					deviceData.temp_smoke = temps.smoke
				if (temps.probe0_a !== undefined)
					deviceData.probe1_temp_a = temps.probe0_a
				if (temps.probe0_b !== undefined)
					deviceData.probe1_temp_b = temps.probe0_b
				if (temps.probe1_a !== undefined)
					deviceData.probe2_temp_a = temps.probe1_a
				if (temps.probe1_b !== undefined)
					deviceData.probe2_temp_b = temps.probe1_b
				if (temps.main !== undefined)
					deviceData.temp_mainpcb = temps.main
				if (temps.ui !== undefined)
					deviceData.temp_uipcb = temps.ui
			}
			
			// Extract IO data
			if (grillState.inputs?.io) {
				const io = grillState.inputs.io
				if (io['lid open'] !== undefined) {
					deviceData.is_lid_open = io['lid open'] === 1
				}
			}
		} catch (error) {
			console.warn('Failed to parse grill_state:', error)
		}
		
		return deviceData
	}

	it('should extract top-level grill state fields', () => {
		const grillStateRaw = JSON.stringify({
			id: 363,
			state: "powered OFF",
			message: "Test message",
			eventmask: "0x00",
			sim: 0,
		})
		
		const result = mockExtractGrillState(grillStateRaw)
		
		expect(result.gs_state).toBe("powered OFF")
		expect(result.gs_message).toBe("Test message")
		expect(result.gs_eventmask).toBe("0x00")
		expect(result.gs_sim).toBe(0)
	})

	it('should extract all temperature fields including probes', () => {
		const grillStateRaw = JSON.stringify({
			id: 363,
			inputs: {
				temps: {
					grill: 79.8,
					air: 70.5,
					smoke: 227.4,
					probe0_a: 100.5,
					probe0_b: 101.2,
					probe1_a: 150.3,
					probe1_b: 151.7,
					main: 6542.4,
					ui: 6513.6,
					id: 363
				}
			}
		})
		
		const result = mockExtractGrillState(grillStateRaw)
		
		// Check basic temperatures
		expect(result.temp_grill).toBe(79.8)
		expect(result.temp_air).toBe(70.5)
		expect(result.temp_smoke).toBe(227.4)
		
		// Check probe temperatures with new naming
		expect(result.probe1_temp_a).toBe(100.5)
		expect(result.probe1_temp_b).toBe(101.2)
		expect(result.probe2_temp_a).toBe(150.3)
		expect(result.probe2_temp_b).toBe(151.7)
		
		// Check PCB temperatures
		expect(result.temp_mainpcb).toBe(6542.4)
		expect(result.temp_uipcb).toBe(6513.6)
	})

	it('should extract IO fields correctly', () => {
		const grillStateRaw = JSON.stringify({
			id: 363,
			inputs: {
				io: {
					"lid open": 1,
					id: 363
				}
			}
		})
		
		const result = mockExtractGrillState(grillStateRaw)
		
		expect(result.is_lid_open).toBe(true)
	})

	it('should handle missing nested fields gracefully', () => {
		const grillStateRaw = JSON.stringify({
			id: 363,
			state: "powered ON"
			// No inputs field
		})
		
		const result = mockExtractGrillState(grillStateRaw)
		
		expect(result.gs_state).toBe("powered ON")
		expect(result.temp_grill).toBeUndefined()
		expect(result.probe1_temp_a).toBeUndefined()
		expect(result.is_lid_open).toBeUndefined()
	})

	it('should handle partial temperature data', () => {
		const grillStateRaw = JSON.stringify({
			id: 363,
			inputs: {
				temps: {
					grill: 200.5,
					air: 180.3,
					// No probe data
					smoke: 350.7
				}
			}
		})
		
		const result = mockExtractGrillState(grillStateRaw)
		
		expect(result.temp_grill).toBe(200.5)
		expect(result.temp_air).toBe(180.3)
		expect(result.temp_smoke).toBe(350.7)
		expect(result.probe1_temp_a).toBeUndefined()
		expect(result.probe1_temp_b).toBeUndefined()
		expect(result.probe2_temp_a).toBeUndefined()
		expect(result.probe2_temp_b).toBeUndefined()
	})

	it('should handle invalid JSON gracefully', () => {
		const grillStateRaw = "not valid json"
		
		const result = mockExtractGrillState(grillStateRaw)
		
		expect(Object.keys(result).length).toBe(0)
	})

	it('should convert lid open value to boolean', () => {
		const testCases = [
			{ input: 0, expected: false },
			{ input: 1, expected: true },
		]
		
		testCases.forEach(({ input, expected }) => {
			const grillStateRaw = JSON.stringify({
				inputs: {
					io: {
						"lid open": input
					}
				}
			})
			
			const result = mockExtractGrillState(grillStateRaw)
			expect(result.is_lid_open).toBe(expected)
		})
	})
})