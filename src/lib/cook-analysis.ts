/**
 * Pure cook-telemetry analysis over time-series points reconstructed from
 * device_history. All temperatures °C, all times epoch ms.
 */

export interface TempPoint {
	t: number
	value: number
}

export interface StallResult {
	inStall: boolean
	/** Stall regions detected across the series */
	regions: Array<{ start: number; end: number }>
	/** Duration of the currently-active stall (ms), 0 if not stalling */
	currentStallMs: number
}

/** Probe climbing slower than this (°C per 15 min) mid-cook counts as stalled. */
const STALL_RATE_C_PER_15MIN = 1.0
/** Only consider the stall once the meat is genuinely cooking. */
const STALL_MIN_TEMP_C = 50
/** Require this much sustained flatness before calling it a stall. */
const STALL_MIN_DURATION_MS = 20 * 60 * 1000

/**
 * Detects stall regions: sustained periods where probe temp rises slower
 * than STALL_RATE_C_PER_15MIN while above STALL_MIN_TEMP_C.
 */
export function detectStall(points: TempPoint[]): StallResult {
	const regions: Array<{ start: number; end: number }> = []
	if (points.length < 3) return { inStall: false, regions, currentStallMs: 0 }

	const sorted = [...points].sort((a, b) => a.t - b.t)
	const windowMs = 15 * 60 * 1000

	let regionStart: number | null = null
	for (let i = 0; i < sorted.length; i++) {
		const p = sorted[i]
		// Rate over the trailing 15-minute window
		let j = i
		while (j > 0 && p.t - sorted[j - 1].t < windowMs) j--
		const past = sorted[j]
		const dtMin = (p.t - past.t) / 60000
		const rate = dtMin >= 5 ? ((p.value - past.value) / dtMin) * 15 : null

		const stalled =
			rate !== null &&
			p.value >= STALL_MIN_TEMP_C &&
			rate < STALL_RATE_C_PER_15MIN
		if (stalled && regionStart === null) {
			regionStart = past.t
		} else if (!stalled && regionStart !== null) {
			if (p.t - regionStart >= STALL_MIN_DURATION_MS) {
				regions.push({ start: regionStart, end: p.t })
			}
			regionStart = null
		}
	}

	const last = sorted[sorted.length - 1]
	let currentStallMs = 0
	let inStall = false
	if (regionStart !== null && last.t - regionStart >= STALL_MIN_DURATION_MS) {
		inStall = true
		currentStallMs = last.t - regionStart
		regions.push({ start: regionStart, end: last.t })
	}

	return { inStall, regions, currentStallMs }
}

export interface EtaResult {
	/** Predicted epoch ms when target is reached, null if not predictable */
	etaMs: number | null
	/** °C per hour over the fitting window */
	ratePerHour: number
	/** Projected points from "now" to the ETA for drawing a dotted line */
	projection: TempPoint[]
}

/**
 * Projects when the probe will hit `targetC` using a least-squares linear
 * fit over the trailing `fitWindowMs` (default 45 min) of readings.
 */
export function projectETA(
	points: TempPoint[],
	targetC: number,
	fitWindowMs = 45 * 60 * 1000,
): EtaResult {
	const none: EtaResult = { etaMs: null, ratePerHour: 0, projection: [] }
	if (points.length < 3) return none

	const sorted = [...points].sort((a, b) => a.t - b.t)
	const last = sorted[sorted.length - 1]
	if (last.value >= targetC) return { ...none, etaMs: last.t }

	const window = sorted.filter((p) => last.t - p.t <= fitWindowMs)
	if (window.length < 3) return none

	// Least squares: value = a + b * t  (t in hours relative to window start)
	const t0 = window[0].t
	const xs = window.map((p) => (p.t - t0) / 3_600_000)
	const ys = window.map((p) => p.value)
	const n = xs.length
	const sumX = xs.reduce((a, b) => a + b, 0)
	const sumY = ys.reduce((a, b) => a + b, 0)
	const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0)
	const sumXX = xs.reduce((acc, x) => acc + x * x, 0)
	const denom = n * sumXX - sumX * sumX
	if (denom === 0) return none
	const b = (n * sumXY - sumX * sumY) / denom // °C per hour
	const a = (sumY - b * sumX) / n

	if (b <= 0.5) return { ...none, ratePerHour: b } // flat/falling: no honest ETA

	const hoursToTarget = (targetC - (a + b * ((last.t - t0) / 3_600_000))) / b
	const etaMs = last.t + hoursToTarget * 3_600_000

	// Cap absurd projections at 24h out
	if (hoursToTarget < 0 || hoursToTarget > 24)
		return { ...none, ratePerHour: b }

	const projection: TempPoint[] = []
	const steps = 12
	for (let i = 0; i <= steps; i++) {
		const t = last.t + ((etaMs - last.t) * i) / steps
		projection.push({
			t,
			value: Math.min(
				targetC,
				last.value + ((targetC - last.value) * i) / steps,
			),
		})
	}

	return { etaMs, ratePerHour: b, projection }
}

/**
 * Pit stability: 100 when grill temp never deviates from setpoint, dropping
 * with RMS deviation. 10°C RMS ≈ 50; 20°C+ RMS → 0.
 */
export function stabilityScore(
	points: TempPoint[],
	setpointC: number,
): number | null {
	if (points.length < 3 || !Number.isFinite(setpointC)) return null
	// Score the hold, not the climb: start from the first time the pit
	// reaches ~97% of setpoint (preheat ramps would swamp the RMS).
	const sorted = [...points].sort((a, b) => a.t - b.t)
	const firstAt = sorted.findIndex((p) => p.value >= setpointC * 0.97)
	const hold = firstAt === -1 ? sorted : sorted.slice(firstAt)
	if (hold.length < 3) return null
	const devs = hold.map((p) => p.value - setpointC)
	const rms = Math.sqrt(devs.reduce((acc, d) => acc + d * d, 0) / devs.length)
	const score = Math.round(100 * Math.exp(-rms / 14.4)) // e-folding ≈ 14.4°C
	return Math.max(0, Math.min(100, score))
}

export interface HistogramBin {
	from: number
	to: number
	count: number
}

/** Temperature distribution histogram with °C-aligned bins. */
export function tempHistogram(
	points: TempPoint[],
	binSizeC = 5,
): HistogramBin[] {
	if (points.length === 0) return []
	const values = points.map((p) => p.value)
	const min = Math.floor(Math.min(...values) / binSizeC) * binSizeC
	const max = Math.ceil(Math.max(...values) / binSizeC) * binSizeC
	const bins: HistogramBin[] = []
	for (let from = min; from < max || bins.length === 0; from += binSizeC) {
		bins.push({ from, to: from + binSizeC, count: 0 })
	}
	for (const v of values) {
		const idx = Math.min(bins.length - 1, Math.floor((v - min) / binSizeC))
		bins[idx].count++
	}
	return bins
}

/** Counts lid-open transitions (false→true) across a boolean series. */
export function countLidOpens(
	points: Array<{ t: number; open: boolean }>,
): number {
	const sorted = [...points].sort((a, b) => a.t - b.t)
	let count = 0
	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i].open && !sorted[i - 1].open) count++
	}
	return count
}
