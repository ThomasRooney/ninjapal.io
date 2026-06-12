/**
 * Safety envelope for device control. EVERY intent — user, policy, or
 * (later) LLM — passes through here before touching the grill. The LLM
 * proposes; this disposes.
 */

export interface ControlIntent {
	kind: 'set_pit_temp' | 'hold_warm'
	setpointC: number
	reason: string
}

export interface SafetyContext {
	mode: string | null // smoker | grill | roast | ...
	currentSetpointC: number | null
}

export interface SafetyVerdict {
	ok: boolean
	/** The setpoint after clamping (valid only when ok) */
	setpointC: number
	rejectReason?: string
	clamped: boolean
}

/** Per-mode pit temperature bounds (°C). */
const MODE_BOUNDS: Record<string, { min: number; max: number }> = {
	smoker: { min: 60, max: 160 },
	grill: { min: 60, max: 260 },
	roast: { min: 60, max: 230 },
	bake: { min: 60, max: 230 },
}
const DEFAULT_BOUNDS = { min: 60, max: 230 }

/** Largest single upward step (°C) any one intent may apply. */
const MAX_RAISE_STEP_C = 15

export const HOLD_WARM_C = 65

export function validateIntent(
	intent: ControlIntent,
	ctx: SafetyContext,
): SafetyVerdict {
	const bounds = MODE_BOUNDS[ctx.mode?.toLowerCase() ?? ''] ?? DEFAULT_BOUNDS

	if (!Number.isFinite(intent.setpointC)) {
		return {
			ok: false,
			setpointC: 0,
			clamped: false,
			rejectReason: 'setpoint is not a number',
		}
	}

	let target = intent.setpointC
	let clamped = false

	if (target < bounds.min) {
		target = bounds.min
		clamped = true
	}
	if (target > bounds.max) {
		target = bounds.max
		clamped = true
	}

	// Raising the pit is rate-limited; lowering (hold-warm, safety) never is.
	if (
		ctx.currentSetpointC != null &&
		target > ctx.currentSetpointC + MAX_RAISE_STEP_C
	) {
		target = ctx.currentSetpointC + MAX_RAISE_STEP_C
		clamped = true
	}

	return { ok: true, setpointC: Math.round(target * 10) / 10, clamped }
}
