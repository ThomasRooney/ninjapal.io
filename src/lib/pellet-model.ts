/**
 * Pellet hopper model: burn-rate inference from the setpoint/temperature
 * history, remaining-pellet estimate, and an empty-hopper forecast. Pure.
 *
 * Burn rate scales with pit temperature — a Ninja Woodfire burns roughly
 * 0.45 kg/h holding 107°C (smoker low-and-slow) and close to linearly more
 * as the pit runs hotter.
 */
import type { TempPoint } from './cook-analysis'

export type { TempPoint }

/** kg/h at a given pit temperature (°C). */
export function burnRateKgPerHour(pitC: number): number {
	if (pitC < 50) return 0.05 // smolder / idle
	return 0.45 * (pitC / 107)
}

/**
 * Integrates pellet burn (kg) over a grill-temperature series between
 * fromMs and toMs (defaults: whole series).
 */
export function burnedKg(
	grillSeries: TempPoint[],
	fromMs?: number,
	toMs?: number,
): number {
	const pts = [...grillSeries]
		.sort((a, b) => a.t - b.t)
		.filter(
			(p) => (fromMs == null || p.t >= fromMs) && (toMs == null || p.t <= toMs),
		)
	let kg = 0
	for (let i = 1; i < pts.length; i++) {
		const dtH = (pts[i].t - pts[i - 1].t) / 3_600_000
		if (dtH <= 0 || dtH > 1) continue // gaps: don't extrapolate across them
		const avgC = (pts[i].value + pts[i - 1].value) / 2
		kg += burnRateKgPerHour(avgC) * dtH
	}
	return kg
}

export interface HopperStatus {
	burnedKg: number
	remainingKg: number
	/** Predicted epoch ms when the hopper runs dry at the current burn rate */
	emptyAtMs: number | null
	currentRateKgPerHour: number
	/** True when a refill warning is warranted (≲45 min of pellets left) */
	refillSoon: boolean
}

export function hopperStatus(opts: {
	capacityKg: number
	loadedAtMs: number
	grillSeries: TempPoint[]
	nowMs: number
}): HopperStatus {
	const burned = burnedKg(opts.grillSeries, opts.loadedAtMs, opts.nowMs)
	const remaining = Math.max(0, opts.capacityKg - burned)

	const recent = opts.grillSeries.filter(
		(p) => opts.nowMs - p.t <= 30 * 60 * 1000,
	)
	const currentC = recent.length
		? recent[recent.length - 1].value
		: (opts.grillSeries[opts.grillSeries.length - 1]?.value ?? 0)
	const rate = burnRateKgPerHour(currentC)

	const hoursLeft = rate > 0.06 ? remaining / rate : null
	const emptyAtMs =
		hoursLeft != null ? opts.nowMs + hoursLeft * 3_600_000 : null

	return {
		burnedKg: Math.round(burned * 100) / 100,
		remainingKg: Math.round(remaining * 100) / 100,
		emptyAtMs,
		currentRateKgPerHour: Math.round(rate * 100) / 100,
		refillSoon: hoursLeft != null && hoursLeft <= 0.75,
	}
}
