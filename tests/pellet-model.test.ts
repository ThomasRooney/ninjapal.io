import { describe, expect, it } from 'vitest'
import type { TempPoint } from '../src/lib/pellet-model'
import {
	burnRateKgPerHour,
	burnedKg,
	hopperStatus,
} from '../src/lib/pellet-model'

const H = 3_600_000

/** Flat-temperature series: one point every 5 min for `hours`. */
function flatSeries(tempC: number, hours: number, startMs = 0): TempPoint[] {
	const pts: TempPoint[] = []
	for (let t = startMs; t <= startMs + hours * H; t += 5 * 60_000) {
		pts.push({ t, value: tempC })
	}
	return pts
}

describe('burnRateKgPerHour', () => {
	it('anchors at ~0.45 kg/h for a 107°C low-and-slow', () => {
		expect(burnRateKgPerHour(107)).toBeCloseTo(0.45, 2)
	})

	it('scales with pit temperature', () => {
		expect(burnRateKgPerHour(160)).toBeGreaterThan(burnRateKgPerHour(107))
		expect(burnRateKgPerHour(80)).toBeLessThan(burnRateKgPerHour(107))
	})

	it('drops to a smolder rate below 50°C', () => {
		expect(burnRateKgPerHour(20)).toBe(0.05)
	})
})

describe('burnedKg', () => {
	it('integrates a steady 107°C cook at the anchor rate', () => {
		expect(burnedKg(flatSeries(107, 4))).toBeCloseTo(0.45 * 4, 1)
	})

	it('respects the from/to window', () => {
		const series = flatSeries(107, 6)
		expect(burnedKg(series, 2 * H, 4 * H)).toBeCloseTo(0.45 * 2, 1)
	})

	it('does not extrapolate across gaps longer than an hour', () => {
		const series = [...flatSeries(107, 1), ...flatSeries(107, 1, 5 * H)]
		expect(burnedKg(series)).toBeCloseTo(0.45 * 2, 1)
	})

	it('handles unsorted input and empty series', () => {
		expect(burnedKg([])).toBe(0)
		const shuffled = flatSeries(107, 2).reverse()
		expect(burnedKg(shuffled)).toBeCloseTo(0.45 * 2, 1)
	})
})

describe('hopperStatus', () => {
	it('forecasts the empty time of a 4 kg hopper at 107°C (~9 h total)', () => {
		const now = 2 * H
		const status = hopperStatus({
			capacityKg: 4,
			loadedAtMs: 0,
			grillSeries: flatSeries(107, 2),
			nowMs: now,
		})
		expect(status.burnedKg).toBeCloseTo(0.9, 1)
		expect(status.remainingKg).toBeCloseTo(3.1, 1)
		expect(status.refillSoon).toBe(false)
		// 3.1 kg left at 0.45 kg/h ≈ 6.9 h from now
		const hoursLeft = ((status.emptyAtMs ?? 0) - now) / H
		expect(hoursLeft).toBeGreaterThan(6)
		expect(hoursLeft).toBeLessThan(8)
	})

	it('flags refillSoon when under ~45 min of pellets remain', () => {
		const now = 8.5 * H
		const status = hopperStatus({
			capacityKg: 4,
			loadedAtMs: 0,
			grillSeries: flatSeries(107, 8.5),
			nowMs: now,
		})
		expect(status.remainingKg).toBeLessThan(0.45 * 0.75 + 0.05)
		expect(status.refillSoon).toBe(true)
	})

	it('never reports negative remaining pellets', () => {
		const status = hopperStatus({
			capacityKg: 1,
			loadedAtMs: 0,
			grillSeries: flatSeries(140, 6),
			nowMs: 6 * H,
		})
		expect(status.remainingKg).toBe(0)
	})

	it('skips the empty forecast when the grill is idle/cold', () => {
		const status = hopperStatus({
			capacityKg: 4,
			loadedAtMs: 0,
			grillSeries: flatSeries(22, 2),
			nowMs: 2 * H,
		})
		expect(status.emptyAtMs).toBeNull()
		expect(status.refillSoon).toBe(false)
	})

	it('ignores burn from before the load time (refill resets the clock)', () => {
		const series = flatSeries(107, 6)
		const fresh = hopperStatus({
			capacityKg: 4,
			loadedAtMs: 5 * H, // refilled an hour ago
			grillSeries: series,
			nowMs: 6 * H,
		})
		expect(fresh.burnedKg).toBeCloseTo(0.45, 1)
		expect(fresh.remainingKg).toBeGreaterThan(3.4)
	})
})
