import {
	buildSetpointSeries,
	buildSteppedSetpointPath,
} from '@/components/temperature-graph'
import { describe, expect, it } from 'vitest'

describe('temperature graph setpoint history', () => {
	it('extracts only changed setpoints from reconstructed snapshots', () => {
		const series = buildSetpointSeries([
			{
				recordedAt: 1_000,
				state: { grill_state_raw: JSON.stringify({ setpoint: 107 }) },
			},
			{
				recordedAt: 2_000,
				state: { grill_state_raw: JSON.stringify({ setpoint: 107 }) },
			},
			{
				recordedAt: 3_000,
				state: { grill_state_raw: JSON.stringify({ setpoint: 121 }) },
			},
			{
				recordedAt: 4_000,
				state: { 'grill_state.setpoint': 95 },
			},
		])

		expect(series).toEqual([
			{ t: 1_000, value: 107 },
			{ t: 3_000, value: 121 },
			{ t: 4_000, value: 95 },
		])
	})

	it('draws a stepped line through each setpoint change time', () => {
		const path = buildSteppedSetpointPath(
			[
				{ t: 0, value: 100 },
				{ t: 10, value: 120 },
				{ t: 20, value: 90 },
			],
			30,
			(time) => time,
			(temp) => 200 - temp,
		)

		expect(path).toBe(
			'M 0.00 100.00 L 10.00 100.00 L 10.00 80.00 L 20.00 80.00 L 20.00 110.00 L 30.00 110.00',
		)
	})
})
