import {
	type AutopilotState,
	evaluateAutopilot,
} from '@/server/control/autopilot'
import { HOLD_WARM_C, validateIntent } from '@/server/control/safety'
import type { TempPoint } from '@/lib/cook-analysis'
import { describe, expect, it } from 'vitest'

/**
 * Closed-loop simulation: a virtual grill (first-order lag toward the
 * setpoint) and a virtual brisket (climb rate driven by pit temp, with a
 * collagen "stall" band) run against the real autopilot policy + safety
 * envelope — exactly the code the worker executes.
 */

const MIN = 60_000

interface SimResult {
	holdEngagedAtMin: number | null
	nudgeAtMin: number | null
	revertAtMin: number | null
	maxSetpoint: number
	minSetpointWhileCooking: number
	messages: string[]
	probeAtHold: number | null
}

function simulateCook(opts: {
	targetC: number
	stall: boolean
	durationMin: number
}): SimResult {
	let setpoint = 107
	let grill = 20
	let probe = 6
	const series: TempPoint[] = []
	let state: AutopilotState = {}
	const result: SimResult = {
		holdEngagedAtMin: null,
		nudgeAtMin: null,
		revertAtMin: null,
		maxSetpoint: setpoint,
		minSetpointWhileCooking: setpoint,
		messages: [],
		probeAtHold: null,
	}

	for (let min = 0; min <= opts.durationMin; min += 5) {
		const nowMs = min * MIN
		// Virtual grill: first-order lag toward setpoint
		grill += (setpoint - grill) * 0.35

		// Virtual brisket: climb driven by pit heat; stall band at 66-70°C
		const heat = Math.max(0, grill - probe) / 100
		let rate = heat * 6 // °C per 5min step at full differential
		if (opts.stall && probe >= 66 && probe < 70 && min < 420) {
			// Evaporative cooling: hotter pit shortens the stall
			rate = grill > 108 ? 0.45 : 0.07
		}
		probe = Math.min(probe + rate, opts.targetC + 1.5)
		series.push({ t: nowMs, value: probe })

		const evaluation = evaluateAutopilot({
			nowMs,
			cooking: true,
			mode: 'smoker',
			setpointC: setpoint,
			probes: [{ index: 1, tempC: probe, targetC: opts.targetC }],
			probe1Series: series.filter((p) => nowMs - p.t <= 4 * 60 * MIN),
			state,
		})
		state = evaluation.state
		result.messages.push(...evaluation.messages.map((m) => m.kind))

		for (const intent of evaluation.intents) {
			const verdict = validateIntent(intent, {
				mode: 'smoker',
				currentSetpointC: setpoint,
			})
			expect(verdict.ok).toBe(true)
			setpoint = verdict.setpointC

			if (intent.kind === 'hold_warm' && result.holdEngagedAtMin === null) {
				result.holdEngagedAtMin = min
				result.probeAtHold = probe
			}
			if (intent.kind === 'set_pit_temp') {
				if (intent.setpointC > 107 && result.nudgeAtMin === null)
					result.nudgeAtMin = min
				if (intent.setpointC <= 107 && result.nudgeAtMin !== null)
					result.revertAtMin = min
			}
		}
		result.maxSetpoint = Math.max(result.maxSetpoint, setpoint)
		if (result.holdEngagedAtMin === null) {
			result.minSetpointWhileCooking = Math.min(
				result.minSetpointWhileCooking,
				setpoint,
			)
		}
	}
	return result
}

describe('autopilot closed-loop simulation', () => {
	it('runs a stalling brisket: nudges through the stall, reverts, then holds warm', () => {
		const sim = simulateCook({ targetC: 96, stall: true, durationMin: 12 * 60 })

		// Nudged during the stall, then reverted once climbing
		expect(sim.nudgeAtMin).not.toBeNull()
		expect(sim.revertAtMin).not.toBeNull()
		expect(sim.revertAtMin as number).toBeGreaterThan(sim.nudgeAtMin as number)
		expect(sim.messages).toContain('ai_adjust')

		// Hold-warm engaged promptly once the target was reached
		expect(sim.holdEngagedAtMin).not.toBeNull()
		expect(sim.probeAtHold as number).toBeGreaterThanOrEqual(96)
		expect(sim.probeAtHold as number).toBeLessThan(98.5) // within ~one cycle
		expect(sim.messages).toContain('hold_warm')

		// Safety: setpoint stayed inside the smoker envelope at all times
		expect(sim.maxSetpoint).toBeLessThanOrEqual(160)
		expect(sim.minSetpointWhileCooking).toBeGreaterThanOrEqual(60)
		expect(sim.maxSetpoint).toBeLessThanOrEqual(107 + 3) // only the nudge
	})

	it('runs a clean cook: no nudge, hold-warm at target', () => {
		const sim = simulateCook({ targetC: 74, stall: false, durationMin: 6 * 60 })
		expect(sim.nudgeAtMin).toBeNull()
		expect(sim.holdEngagedAtMin).not.toBeNull()
		expect(sim.messages).toContain('hold_warm')
		expect(sim.messages).not.toContain('ai_adjust')
	})

	it('multi-probe: announces the early finisher, holds only when all are done', () => {
		let setpoint = 107
		let state: AutopilotState = {}
		const kinds: string[] = []
		let holdAt: number | null = null
		// probe1 finishes at t=0 sim; probe2 still climbing until min 60
		for (let min = 0; min <= 120; min += 5) {
			const probe2 = 80 + min * 0.3 // hits 96 at ~min 53
			const evaluation = evaluateAutopilot({
				nowMs: min * MIN,
				cooking: true,
				mode: 'smoker',
				setpointC: setpoint,
				probes: [
					{ index: 1, tempC: 96.4, targetC: 96 },
					{ index: 2, tempC: probe2, targetC: 96 },
				],
				probe1Series: [],
				state,
			})
			state = evaluation.state
			kinds.push(...evaluation.messages.map((m) => m.kind))
			for (const intent of evaluation.intents) {
				setpoint = validateIntent(intent, {
					mode: 'smoker',
					currentSetpointC: setpoint,
				}).setpointC
				if (intent.kind === 'hold_warm' && holdAt === null) holdAt = min
			}
		}
		// Early finisher announced exactly once; hold only after probe 2 lands
		expect(kinds.filter((k) => k === 'target_reached')).toHaveLength(1)
		expect(holdAt).not.toBeNull()
		expect(holdAt as number).toBeGreaterThanOrEqual(55)
		expect(setpoint).toBe(HOLD_WARM_C)
	})

	it('safety: rejects nonsense and clamps out-of-envelope intents', () => {
		expect(
			validateIntent(
				{ kind: 'set_pit_temp', setpointC: Number.NaN, reason: 'x' },
				{ mode: 'smoker', currentSetpointC: 107 },
			).ok,
		).toBe(false)
		// 500°C clamps to the smoker max, and is further rate-limited
		const verdict = validateIntent(
			{ kind: 'set_pit_temp', setpointC: 500, reason: 'x' },
			{ mode: 'smoker', currentSetpointC: 107 },
		)
		expect(verdict.setpointC).toBe(122) // 107 + max raise step 15
		expect(verdict.clamped).toBe(true)
		// Lowering is never rate-limited (hold-warm, safety drops)
		expect(
			validateIntent(
				{ kind: 'hold_warm', setpointC: 65, reason: 'x' },
				{ mode: 'smoker', currentSetpointC: 150 },
			).setpointC,
		).toBe(65)
	})
})
