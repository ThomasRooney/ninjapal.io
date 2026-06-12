/**
 * Phase-1 autopilot: deterministic policy that runs the pit. Pure function
 * of telemetry — the worker (and the simulator in tests) provides context,
 * receives intents + messages + next state. No I/O here.
 *
 * Rules:
 *  - HOLD-WARM: when every probe that has a doneness target reaches it,
 *    drop the pit to HOLD_WARM_C and announce it. If some are done but
 *    others still cook, message the user to pull the finished one.
 *  - STALL NUDGE: if the lead probe stalls ≥ NUDGE_AFTER_MS, raise the pit
 *    +NUDGE_DELTA_C; revert to the base setpoint once it climbs again.
 */
import { type TempPoint, detectStall } from '@/lib/cook-analysis'
import { type ControlIntent, HOLD_WARM_C } from './safety'

export interface ProbeStatus {
	index: 1 | 2
	tempC: number | null
	targetC: number | null
}

export interface AutopilotState {
	baseSetpointC?: number
	nudgedAtMs?: number
	holdEngagedAtMs?: number
	/** probe indexes already announced as done (pull message sent) */
	announcedDone?: number[]
}

export interface AutopilotContext {
	nowMs: number
	cooking: boolean
	mode: string | null
	setpointC: number | null
	probes: ProbeStatus[]
	/** Lead probe trailing series (~4h) for stall detection */
	probe1Series: TempPoint[]
	state: AutopilotState
}

export interface AutopilotMessage {
	kind: string
	title: string
	body: string
	requiresAck?: boolean
	actions?: Array<{ id: string; label: string }>
}

export interface AutopilotResult {
	intents: ControlIntent[]
	messages: AutopilotMessage[]
	state: AutopilotState
}

const NUDGE_AFTER_MS = 40 * 60 * 1000
const NUDGE_DELTA_C = 3
const NUDGE_REVERT_RATE_C_PER_15MIN = 1.5

function climbRatePer15Min(series: TempPoint[], nowMs: number): number | null {
	const window = series
		.filter((p) => nowMs - p.t <= 15 * 60 * 1000)
		.sort((a, b) => a.t - b.t)
	if (window.length < 2) return null
	const first = window[0]
	const last = window[window.length - 1]
	const dtMin = (last.t - first.t) / 60000
	if (dtMin < 5) return null
	return ((last.value - first.value) / dtMin) * 15
}

export function evaluateAutopilot(ctx: AutopilotContext): AutopilotResult {
	const intents: ControlIntent[] = []
	const messages: AutopilotMessage[] = []
	const state: AutopilotState = { ...ctx.state }

	if (!ctx.cooking || ctx.setpointC == null) {
		return { intents, messages, state }
	}

	// Already holding warm: nothing to manage.
	if (state.holdEngagedAtMs) {
		return { intents, messages, state }
	}

	const targeted = ctx.probes.filter(
		(p) => p.targetC != null && p.tempC != null,
	)
	const done = targeted.filter(
		(p) => (p.tempC as number) >= (p.targetC as number),
	)

	// --- HOLD-WARM ---
	if (targeted.length > 0 && done.length === targeted.length) {
		state.holdEngagedAtMs = ctx.nowMs
		state.nudgedAtMs = undefined
		intents.push({
			kind: 'hold_warm',
			setpointC: HOLD_WARM_C,
			reason: `all ${targeted.length} probe target(s) reached`,
		})
		const temps = done
			.map((p) => `probe ${p.index}: ${(p.tempC as number).toFixed(1)}°C`)
			.join(', ')
		messages.push({
			kind: 'hold_warm',
			title: `We lowered the pit to ${HOLD_WARM_C}°C. It's ready. 🎉`,
			body: `${temps} — every doneness target met. Pit drops from ${ctx.setpointC.toFixed(0)}°C to ${HOLD_WARM_C}°C; the meat holds juicy for hours. Come eat when you're ready.`,
			requiresAck: true,
			actions: [
				{ id: 'pulled', label: 'Pulled it — slicing 🍽️' },
				{ id: 'holding', label: 'Keep holding' },
			],
		})
		return { intents, messages, state }
	}

	// Partially done: announce pulls once per probe, keep the pit running.
	for (const p of done) {
		const announced = state.announcedDone ?? []
		if (!announced.includes(p.index)) {
			state.announcedDone = [...announced, p.index]
			messages.push({
				kind: 'target_reached',
				title: `Probe ${p.index} hit ${(p.tempC as number).toFixed(1)}°C — pull it 🍽️`,
				body: `Target ${(p.targetC as number).toFixed(0)}°C met, but the pit stays at ${ctx.setpointC.toFixed(0)}°C — ${targeted.length - done.length} other probe(s) still cooking.`,
				requiresAck: true,
				actions: [{ id: 'pulled', label: `Pulled probe ${p.index} ✅` }],
			})
		}
	}

	// --- STALL NUDGE ---
	const stall = detectStall(ctx.probe1Series)
	const rate = climbRatePer15Min(ctx.probe1Series, ctx.nowMs)

	if (state.nudgedAtMs) {
		// Revert when the stall has broken
		if (rate != null && rate >= NUDGE_REVERT_RATE_C_PER_15MIN) {
			const base = state.baseSetpointC ?? ctx.setpointC - NUDGE_DELTA_C
			state.nudgedAtMs = undefined
			state.baseSetpointC = undefined
			intents.push({
				kind: 'set_pit_temp',
				setpointC: base,
				reason: 'stall broken — reverting nudge',
			})
			messages.push({
				kind: 'ai_adjust',
				title: `AI reverted pit → ${base.toFixed(0)}°C — stall broken 💪`,
				body: `Probe 1 climbing ${rate.toFixed(1)}°C/15min. Back on the original plan.`,
			})
		}
	} else if (
		stall.inStall &&
		stall.currentStallMs >= NUDGE_AFTER_MS &&
		done.length === 0
	) {
		const nudged = ctx.setpointC + NUDGE_DELTA_C
		state.nudgedAtMs = ctx.nowMs
		state.baseSetpointC = ctx.setpointC
		intents.push({
			kind: 'set_pit_temp',
			setpointC: nudged,
			reason: `probe stalled ${Math.round(stall.currentStallMs / 60000)} min`,
		})
		messages.push({
			kind: 'ai_adjust',
			title: `AI nudged pit +${NUDGE_DELTA_C}°C → ${nudged.toFixed(0)}°C`,
			body: `Probe 1 stalled ${Math.round(stall.currentStallMs / 60000)} min. A slightly hotter pit shortens the stall without bark risk; reverting once climb rate ≥${NUDGE_REVERT_RATE_C_PER_15MIN}°C/15min.`,
		})
	}

	return { intents, messages, state }
}
