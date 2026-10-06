import { describe, expect, it } from 'vitest'
import type { ReconstructedState } from './historyUtils'
import {
	TENDERIZATION_REFERENCE_C as REF,
	calculateTenderization,
	tenderizationRate,
	tenderizationSamples,
} from './tenderization'

const MIN = 60_000
const celsius = (f: number) => ((f - 32) * 5) / 9
const constant = (value: number, minutes = 60) =>
	Array.from({ length: minutes + 1 }, (_, i) => ({ t: i * MIN, value }))

describe('brisket thermal exposure', () => {
	it.each([
		[175, 60 / 1.8],
		[195, 60],
		[205, 60 * Math.sqrt(2.8)],
	])(
		'weights one hour at %s°F according to the published relative rate',
		(f, expected) => {
			const result = calculateTenderization(constant(celsius(f)), 0, 60 * MIN)
			expect(result.equivalentMinutes).toBeCloseTo(expected, 8)
			expect(result.observedMs).toBe(60 * MIN)
			expect(result.missingMs).toBe(0)
		},
	)

	it('is continuous at 195°F and does not claim a conversion percentage', () => {
		expect(tenderizationRate(REF)).toBe(1)
		expect(tenderizationRate(REF - 1e-8)).toBeCloseTo(1, 7)
		expect(tenderizationRate(REF + 1e-8)).toBeCloseTo(1, 7)
		expect(
			calculateTenderization(constant(100, 120), 0, 120 * MIN)
				.equivalentMinutes,
		).toBeGreaterThan(100)
	})

	it('matches independent numerical integration across both model boundaries', () => {
		const startC = 55
		const endC = 99
		const subdivisions = 100_000
		let expected = 0
		for (let i = 0; i < subdivisions; i++) {
			const temp = startC + (endC - startC) * ((i + 0.5) / subdivisions)
			const f = (temp * 9) / 5 + 32
			const rate = temp < 60 ? 0 : (f <= 195 ? 1.8 : 2.8) ** ((f - 195) / 20)
			expected += (rate * 5) / subdivisions
		}
		const result = calculateTenderization(
			[
				{ t: 0, value: startC },
				{ t: 5 * MIN, value: endC },
			],
			0,
			5 * MIN,
		)
		expect(result.equivalentMinutes).toBeCloseTo(expected, 4)
		expect(result.belowModelMs).toBeCloseTo((5 * MIN * 5) / 44, 5)
		expect(result.fastZoneMs).toBeCloseTo((5 * MIN * (99 - REF)) / 44, 5)
	})

	it('counts cooldown and is invariant to sampling frequency on linear ramps', () => {
		const coarse = [
			{ t: 0, value: 99 },
			{ t: 5 * MIN, value: 55 },
		]
		const fine = Array.from({ length: 301 }, (_, i) => ({
			t: i * 1000,
			value: 99 - (44 * i) / 300,
		}))
		const a = calculateTenderization(coarse, 0, 5 * MIN)
		const b = calculateTenderization(fine, 0, 5 * MIN)
		expect(a.equivalentMinutes).toBeGreaterThan(0)
		expect(a.equivalentMinutes).toBeCloseTo(b.equivalentMinutes, 8)
		expect(a.fastZoneMs).toBeCloseTo(b.fastZoneMs, 5)
	})

	it('clips bracketing intervals and never extrapolates the edges', () => {
		const result = calculateTenderization(constant(REF, 10), MIN / 2, 12 * MIN)
		expect(result.equivalentMinutes).toBeCloseTo(9.5)
		expect(result.missingMs).toBe(2 * MIN)
		const laterStart = calculateTenderization(constant(REF, 10), -MIN, 5 * MIN)
		expect(laterStart.equivalentMinutes).toBe(5)
		expect(laterStart.missingMs).toBe(MIN)
	})

	it('skips gaps over five minutes, invalid readings and disconnected intervals', () => {
		const points = [
			{ t: 0, value: REF },
			{ t: MIN, value: REF },
			{ t: 2 * MIN, value: null },
			{ t: 3 * MIN, value: REF },
			{ t: 4 * MIN, value: REF },
			{ t: 12 * MIN, value: REF },
			{ t: 13 * MIN, value: REF },
		]
		const result = calculateTenderization(points, 0, 13 * MIN)
		expect(result.equivalentMinutes).toBe(3)
		expect(result.missingMs).toBe(10 * MIN)
	})

	it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 101, null])(
		'rejects invalid temperature %s without bridging it',
		(value) => {
			const result = calculateTenderization(
				[
					{ t: 0, value: REF },
					{ t: MIN, value },
					{ t: 2 * MIN, value: REF },
				],
				0,
				2 * MIN,
			)
			expect(result.observedMs).toBe(0)
			expect(result.missingMs).toBe(2 * MIN)
		},
	)

	it('sorts without mutating inputs and invalidates conflicting duplicates', () => {
		const points = constant(REF, 3).reverse()
		const original = [...points]
		expect(calculateTenderization(points, 0, 3 * MIN).equivalentMinutes).toBe(3)
		expect(points).toEqual(original)
		expect(
			calculateTenderization([...points, { t: MIN, value: REF }], 0, 3 * MIN)
				.equivalentMinutes,
		).toBe(3)
		expect(
			calculateTenderization([...points, { t: MIN, value: 80 }], 0, 3 * MIN)
				.equivalentMinutes,
		).toBe(1)
	})

	it('reports unavailable data and stale rates separately from zero exposure', () => {
		expect(calculateTenderization([], 0, MIN)).toMatchObject({
			equivalentMinutes: 0,
			observedMs: 0,
			missingMs: MIN,
			currentRate: null,
		})
		expect(calculateTenderization(constant(20), 0, 60 * MIN)).toMatchObject({
			equivalentMinutes: 0,
			observedMs: 60 * MIN,
			belowModelMs: 60 * MIN,
			currentRate: 0,
		})
		expect(
			calculateTenderization(constant(REF, 10), 0, 16 * MIN).currentRate,
		).toBeNull()
		expect(
			calculateTenderization([{ t: 0, value: REF }], 0, MIN).observedMs,
		).toBe(0)
		expect(() => calculateTenderization([], 1, 0)).toThrow(RangeError)
		expect(() => calculateTenderization([], 0, Number.NaN)).toThrow(RangeError)
	})
})

describe('probe availability', () => {
	const snapshot = (state: Record<string, unknown>): ReconstructedState => ({
		id: 1,
		recordedAt: MIN,
		changedBy: null,
		historyType: 'snapshot',
		state,
	})
	it('accepts numeric history values and selects each probe independently', () => {
		const snapshots = [
			snapshot({
				probe1_temp_a: '90.5',
				probe2_temp_a: 80,
				connectionStatus: 'Online',
			}),
		]
		expect(tenderizationSamples(snapshots, 1)[0].value).toBe(90.5)
		expect(tenderizationSamples(snapshots, 2)[0].value).toBe(80)
	})
	it.each([
		{ is_probe1_installed: false },
		{ connectionStatus: 'Offline' },
		{ connectionStatus: 'unknown' },
		{ probe1_temp_a: '' },
		{ probe1_temp_a: null },
	])('preserves an unavailable reading: %s', (state) => {
		expect(
			tenderizationSamples([snapshot({ probe1_temp_a: 95, ...state })], 1),
		).toEqual([{ t: MIN, value: null }])
	})
})
