import type { ReconstructedState } from './historyUtils'

/**
 * Experimental brisket thermal exposure, NOT percent collagen converted.
 * Chris Young, https://www.youtube.com/watch?v=7fW16i40ZDQ&t=305s:
 * approximately 1.8x per 20°F below 195°F, 2.8x above it.
 * This continuous piecewise exponential is our interpretation of that rule,
 * not a fitted Arrhenius law. No absolute reaction rate was supplied.
 * Scope deliberately limited to 60–100°C; colder time contributes zero.
 */
export const TENDERIZATION_REFERENCE_C = ((195 - 32) * 5) / 9
export const TENDERIZATION_MIN_C = 60
export const TENDERIZATION_MAX_C = 100
export const TENDERIZATION_MAX_GAP_MS = 5 * 60_000
export const TENDERIZATION_MODEL = 'young-relative-v1'

export interface TenderizationSample {
	t: number
	/** Null explicitly breaks integration (offline, missing or removed probe). */
	value: number | null
}

export interface TenderizationResult {
	equivalentMinutes: number
	observedMs: number
	missingMs: number
	belowModelMs: number
	fastZoneMs: number
	/** Only present when the last usable reading is recent and in the window. */
	currentRate: number | null
}

function validTemperature(value: number | null): value is number {
	return value !== null && Number.isFinite(value) && value >= 0 && value <= 100
}

/** Rate relative to 195°F / 90.6°C; null means outside the supported range. */
export function tenderizationRate(tempC: number): number | null {
	if (!validTemperature(tempC)) return null
	if (tempC < TENDERIZATION_MIN_C) return 0
	const multiplier = tempC <= TENDERIZATION_REFERENCE_C ? 1.8 : 2.8
	return multiplier ** ((tempC - TENDERIZATION_REFERENCE_C) / (100 / 9))
}

/** Preserve invalid readings as breaks; never drop them and bridge the hole. */
export function tenderizationSamples(
	snapshots: readonly ReconstructedState[],
	probe: 1 | 2,
): TenderizationSample[] {
	return snapshots.flatMap(({ recordedAt, state }) => {
		if (recordedAt === null || !Number.isFinite(recordedAt)) return []
		const raw = state[`probe${probe}_temp_a`]
		const value =
			typeof raw === 'number'
				? raw
				: typeof raw === 'string' && raw.trim() !== ''
					? Number(raw)
					: null
		const unavailable =
			state[`is_probe${probe}_installed`] === false ||
			(typeof state.connectionStatus === 'string' &&
				state.connectionStatus.toLowerCase() !== 'online')
		return [{ t: recordedAt, value: unavailable ? null : value }]
	})
}

/**
 * Integrate only adjacent valid observations, linearly interpolating the
 * temperature between them. Integrate the exponential exactly, splitting at
 * 60°C and 195°F. Never extrapolate missing edges or gaps over five minutes.
 * Times are epoch milliseconds; inputs may include observations bracketing
 * the requested window. Conflicting duplicate timestamps break integration.
 */
export function calculateTenderization(
	points: readonly TenderizationSample[],
	start: number,
	end: number,
): TenderizationResult {
	if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
		throw new RangeError('Tenderization requires a finite, ordered time window')
	}
	const result: TenderizationResult = {
		equivalentMinutes: 0,
		observedMs: 0,
		missingMs: end - start,
		belowModelMs: 0,
		fastZoneMs: 0,
		currentRate: null,
	}
	const byTime = new Map<number, number | null>()
	for (const p of points) {
		if (!Number.isFinite(p.t)) continue
		const value = validTemperature(p.value) ? p.value : null
		byTime.set(p.t, byTime.has(p.t) && byTime.get(p.t) !== value ? null : value)
	}
	const sorted = [...byTime].sort(([a], [b]) => a - b)
	for (let i = 1; i < sorted.length; i++) {
		const [t0, v0] = sorted[i - 1]
		const [t1, v1] = sorted[i]
		const from = Math.max(start, t0)
		const to = Math.min(end, t1)
		if (
			to <= from ||
			t1 - t0 > TENDERIZATION_MAX_GAP_MS ||
			v0 === null ||
			v1 === null
		)
			continue
		result.observedMs += to - from
		const at = (t: number) => v0 + ((v1 - v0) * (t - t0)) / (t1 - t0)
		const boundaries = [from, to]
		if (v1 !== v0) {
			for (const temp of [TENDERIZATION_MIN_C, TENDERIZATION_REFERENCE_C]) {
				const crossing = t0 + ((temp - v0) / (v1 - v0)) * (t1 - t0)
				if (crossing > from && crossing < to) boundaries.push(crossing)
			}
		}
		boundaries.sort((a, b) => a - b)
		for (let j = 1; j < boundaries.length; j++) {
			const a = boundaries[j - 1]
			const b = boundaries[j]
			const duration = b - a
			const middleTemp = at((a + b) / 2)
			if (middleTemp < TENDERIZATION_MIN_C) {
				result.belowModelMs += duration
				continue
			}
			if (middleTemp >= TENDERIZATION_REFERENCE_C) result.fastZoneMs += duration
			const slope =
				Math.log(middleTemp <= TENDERIZATION_REFERENCE_C ? 1.8 : 2.8) /
				(100 / 9)
			const rateA = Math.exp(slope * (at(a) - TENDERIZATION_REFERENCE_C))
			const exponentChange = slope * (at(b) - at(a))
			const meanRate =
				Math.abs(exponentChange) < 1e-10
					? rateA
					: (rateA * Math.expm1(exponentChange)) / exponentChange
			result.equivalentMinutes += (duration / 60_000) * meanRate
		}
	}
	result.missingMs = Math.max(0, end - start - result.observedMs)
	const last = sorted.filter(([t]) => t >= start && t <= end).at(-1)
	if (last && last[1] !== null && end - last[0] <= TENDERIZATION_MAX_GAP_MS) {
		result.currentRate = tenderizationRate(last[1])
	}
	return result
}
