import type {
	GrillState,
	GrillTemperatures,
	Probe,
	ProbeState,
} from '@/types/grill'
import { useMemo } from 'react'

// Define which temp keys are safe for display from grillState
const DISPLAYABLE_GRILL_TEMPS: (keyof GrillTemperatures)[] = [
	'grill',
	'air',
	'smoke',
]

// User-friendly temperature display names
const TEMP_DISPLAY_NAMES: Record<string, string> = {
	grill: 'Grill',
	air: 'Chamber',
	smoke: 'Exhaust',
}

export interface GrillViewModel {
	displayTemperatures: Array<{ name: string; temp: number }>
	lidIsOpen: boolean
	smokeIsOn: boolean
	deviceStatus: 'Online' | 'Offline' | 'Unknown'
	errorStatus: {
		hasError: boolean
		message: string
	}
	connectedProbes: Probe[]
	activeProbeCount: number
}

export function useGrillViewModel(
	grillState: GrillState | null,
	probeState: ProbeState | null,
	connectionStatus: string | null | undefined,
): GrillViewModel | null {
	return useMemo(() => {
		if (!grillState || !probeState) {
			return null
		}

		// 1. Process Grill Temperatures
		const displayTemperatures = Object.entries(grillState.inputs.temps)
			.filter(([key]) =>
				DISPLAYABLE_GRILL_TEMPS.includes(key as keyof GrillTemperatures),
			)
			.map(([key, value]) => ({
				name: TEMP_DISPLAY_NAMES[key] || key,
				temp: Math.round(value as number),
			}))

		// 2. Process Grill Status
		const lidIsOpen = grillState.inputs.io['lid open'] === 1
		const smokeIsOn = grillState.smoke === 1

		const isOffline =
			connectionStatus === 'Offline' || grillState.state?.state === 'zc loss'
		const hasDeviceError = grillState.error != null && grillState.error !== 0

		const errorStatus = {
			hasError: !isOffline && hasDeviceError,
			message: hasDeviceError ? grillState.message || 'Unknown error' : '',
		}

		const deviceStatus =
			connectionStatus === 'Online'
				? 'Online'
				: connectionStatus === 'Offline'
					? 'Offline'
					: 'Unknown'

		// 3. Process Probe Data
		// We only care about probes that are physically plugged in
		const connectedProbes = probeState.probes.filter(
			(p) => p['plugged in'] === 1,
		)

		return {
			displayTemperatures,
			lidIsOpen,
			smokeIsOn,
			deviceStatus,
			errorStatus,
			connectedProbes,
			activeProbeCount: connectedProbes.filter((p) => p.active === 1).length,
		}
	}, [grillState, probeState, connectionStatus])
}
