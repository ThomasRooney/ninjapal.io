/**
 * Virtual grill physics — the same model the autopilot simulator tests
 * against, packaged for the worker to step real (database-backed)
 * simulated devices. Pure: state in, state out.
 */

export interface SimState {
	cooking: boolean
	mode: string
	setpointC: number
	grillC: number
	probe1C: number | null
	probe2C: number | null
	/** °C the probes asymptote toward if left forever (meat physics cap) */
	probe1CapC: number
	probe2CapC: number
	startedAtMs: number
	lastStepMs: number
}

export function initialSimState(opts?: {
	setpointC?: number
	probe1StartC?: number
	withProbe2?: boolean
	nowMs?: number
}): SimState {
	const now = opts?.nowMs ?? Date.now()
	return {
		cooking: true,
		mode: 'smoker',
		setpointC: opts?.setpointC ?? 107,
		grillC: 18,
		probe1C: opts?.probe1StartC ?? 6,
		probe2C: opts?.withProbe2 ? 6 : null,
		probe1CapC: 99,
		probe2CapC: 99,
		startedAtMs: now,
		lastStepMs: now,
	}
}

function stepProbe(
	probeC: number,
	capC: number,
	grillC: number,
	dtMin: number,
): number {
	const heat = Math.max(0, grillC - probeC) / 100
	let ratePerMin = (heat * 6) / 5 // matches the CI simulator at 5-min steps
	// Evaporative stall band: meat sweats between 66–70°C unless the pit is hot
	if (probeC >= 66 && probeC < 70) {
		ratePerMin = (grillC > 108 ? 0.45 : 0.07) / 5
	}
	const next = probeC + ratePerMin * dtMin + (Math.random() - 0.5) * 0.1
	return Math.min(next, capC)
}

/** Advances the simulation by dtMs of wall-clock time. */
export function stepSim(state: SimState, nowMs: number): SimState {
	const dtMin = Math.max(0, Math.min(10, (nowMs - state.lastStepMs) / 60000))
	if (!state.cooking || dtMin === 0) {
		return { ...state, lastStepMs: nowMs }
	}

	// Grill: first-order lag toward setpoint (τ ≈ 3 min to ~63%)
	const alpha = 1 - Math.exp(-dtMin / 3)
	const grillC =
		state.grillC +
		(state.setpointC - state.grillC) * alpha +
		(Math.random() - 0.5) * 1.6

	return {
		...state,
		grillC: Math.round(grillC * 10) / 10,
		probe1C:
			state.probe1C != null
				? Math.round(
						stepProbe(state.probe1C, state.probe1CapC, grillC, dtMin) * 10,
					) / 10
				: null,
		probe2C:
			state.probe2C != null
				? Math.round(
						stepProbe(state.probe2C, state.probe2CapC, grillC, dtMin) * 10,
					) / 10
				: null,
		lastStepMs: nowMs,
	}
}

/** Synthesizes the deviceData record the normal sync pipeline expects. */
export function simDeviceData(
	state: SimState,
	dsn: string,
	productName: string | null,
): Record<string, unknown> {
	const preheating =
		state.cooking &&
		state.grillC < state.setpointC * 0.95 &&
		Date.now() - state.startedAtMs < 45 * 60 * 1000
	const cookState = state.cooking
		? preheating
			? 'preheating'
			: 'cooking'
		: 'idle'
	return {
		dsn,
		productName,
		connectionStatus: 'Online',
		cook_mode: state.mode,
		cook_state: cookState,
		cook_smoke_level: state.mode === 'smoker' ? 1 : 0,
		power_state: state.cooking ? 'on' : 'standby',
		gs_state: cookState,
		is_lid_open: false,
		is_probe1_installed: state.probe1C != null,
		is_probe2_installed: state.probe2C != null,
		temp_grill: state.grillC,
		temp_air:
			Math.round((state.grillC - 4 + (Math.random() - 0.5) * 2) * 10) / 10,
		temp_smoke:
			Math.round((state.grillC - 15 + (Math.random() - 0.5) * 4) * 10) / 10,
		probe1_temp_a: state.probe1C,
		probe1_temp_b:
			state.probe1C != null
				? Math.round((state.probe1C - 1.5) * 10) / 10
				: null,
		probe2_temp_a: state.probe2C,
		grill_state_raw: JSON.stringify({
			id: 1,
			state: cookState,
			mode: state.mode,
			setpoint: state.setpointC,
			'probes active': state.probe1C != null ? 1 : 0,
			smoke: state.mode === 'smoker' ? 1 : 0,
			error: 0,
			message: '',
			eventmask: '0',
			sim: 1,
			inputs: {
				temps: {
					grill: state.grillC,
					air: state.grillC - 4,
					smoke: state.grillC - 15,
					probe0_a: state.probe1C ?? 0,
					probe0_b: state.probe1C != null ? state.probe1C - 1.5 : 0,
					probe1_a: state.probe2C ?? 0,
					probe1_b: 0,
					main: 38,
					ui: 31,
					id: 1,
				},
				io: { 'lid open': 0, id: 1 },
				id: 1,
			},
		}),
		probe_state_raw: JSON.stringify({
			id: 1,
			probes: [
				{
					name: 'Probe 1',
					'plugged in': state.probe1C != null ? 1 : 0,
					active: state.probe1C != null ? 1 : 0,
					temp: state.probe1C ?? 0,
					progress: 0,
				},
				{
					name: 'Probe 2',
					'plugged in': state.probe2C != null ? 1 : 0,
					active: state.probe2C != null ? 1 : 0,
					temp: state.probe2C ?? 0,
					progress: 0,
				},
			],
		}),
	}
}
