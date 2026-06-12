import { describe, expect, it } from 'vitest'
import {
	countLidOpens,
	detectStall,
	projectETA,
	stabilityScore,
	tempHistogram,
} from './cook-analysis'

const MIN = 60_000
const T0 = 1_700_000_000_000

function series(
	valueAt: (minutes: number) => number,
	durationMin: number,
	stepMin = 5,
) {
	const pts = []
	for (let m = 0; m <= durationMin; m += stepMin) {
		pts.push({ t: T0 + m * MIN, value: valueAt(m) })
	}
	return pts
}

describe('detectStall', () => {
	it('flags a sustained mid-cook plateau', () => {
		// Climb to 65°C over 2h, then dead flat for 90 min
		const pts = series((m) => (m <= 120 ? 5 + m * 0.5 : 65), 210)
		const result = detectStall(pts)
		expect(result.inStall).toBe(true)
		expect(result.currentStallMs).toBeGreaterThan(60 * MIN)
		expect(result.regions.length).toBeGreaterThan(0)
	})

	it('does not flag a steady climb', () => {
		const pts = series((m) => 5 + m * 0.4, 240) // 24°C/h throughout
		const result = detectStall(pts)
		expect(result.inStall).toBe(false)
		expect(result.regions).toHaveLength(0)
	})

	it('ignores flatness below the cooking threshold', () => {
		const pts = series(() => 20, 120) // ambient flatline
		expect(detectStall(pts).inStall).toBe(false)
	})

	it('handles empty/short series', () => {
		expect(detectStall([]).inStall).toBe(false)
		expect(detectStall([{ t: T0, value: 60 }]).regions).toHaveLength(0)
	})
})

describe('projectETA', () => {
	it('projects a linear climb to target', () => {
		// 10°C/h from 60°C; target 70 → ETA ≈ 1h after last point
		const pts = series((m) => 60 + (m / 60) * 10, 60)
		const { etaMs, ratePerHour, projection } = projectETA(pts, 80)
		expect(ratePerHour).toBeCloseTo(10, 0)
		expect(etaMs).not.toBeNull()
		const lastT = T0 + 60 * MIN
		expect((etaMs as number) - lastT).toBeCloseTo(60 * MIN, -4)
		expect(projection.length).toBeGreaterThan(0)
		expect(projection[projection.length - 1].value).toBeCloseTo(80, 1)
	})

	it('returns no ETA when flat', () => {
		const pts = series(() => 65, 90)
		expect(projectETA(pts, 95).etaMs).toBeNull()
	})

	it('returns now when already at target', () => {
		const pts = series((m) => 90 + m * 0.1, 60)
		const result = projectETA(pts, 95)
		expect(result.etaMs).toBe(T0 + 60 * MIN)
	})
})

describe('stabilityScore', () => {
	it('scores a rock-steady pit near 100', () => {
		const pts = series((m) => 107 + Math.sin(m) * 0.5, 240)
		expect(stabilityScore(pts, 107)).toBeGreaterThan(90)
	})

	it('scores a swingy pit low', () => {
		const pts = series((m) => 107 + (m % 2 === 0 ? 30 : -30), 240, 1)
		expect(stabilityScore(pts, 107)).toBeLessThan(20)
	})

	it('returns null without enough data', () => {
		expect(stabilityScore([], 107)).toBeNull()
	})
})

describe('tempHistogram', () => {
	it('bins values', () => {
		const pts = [102, 104, 107, 108, 113].map((v, i) => ({
			t: T0 + i * MIN,
			value: v,
		}))
		const bins = tempHistogram(pts, 5)
		expect(bins.map((b) => b.count)).toEqual([2, 2, 1])
		expect(bins[0].from).toBe(100)
	})

	it('handles empty input', () => {
		expect(tempHistogram([])).toEqual([])
	})
})

describe('countLidOpens', () => {
	it('counts rising edges only', () => {
		const pts = [false, true, true, false, true, false].map((open, i) => ({
			t: T0 + i * MIN,
			open,
		}))
		expect(countLidOpens(pts)).toBe(2)
	})
})
