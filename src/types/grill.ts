// Grill state type definitions

export interface GrillTemperatures {
	grill: number
	air: number
	smoke: number
	probe0_a: number
	probe0_b: number
	probe1_a: number
	probe1_b: number
	main: number // Raw sensor value, not for display
	ui: number // Raw sensor value, not for display
	id: number
}

export interface GrillIo {
	'lid open': 0 | 1
	id: number
}

export interface GrillState {
	id: number
	state: 'cooking' | 'idle' | 'error' | string // Allow other states
	mode: 'smoker' | 'grill' | string // Allow other modes
	setpoint: number
	'seconds set': number
	endtimeutc: number
	'seconds left': number
	'probes active': number
	smoke: 0 | 1 // Treating as boolean for now
	error: number
	message: string
	eventmask: string
	sim: number
	inputs: {
		temps: GrillTemperatures
		io: GrillIo
		id: number
	}
}

export interface Probe {
	name: string
	'plugged in': 0 | 1
	active: 0 | 1
	temp: number
	progress: number
}

export interface ProbeState {
	probes: Probe[]
	id: number
}
