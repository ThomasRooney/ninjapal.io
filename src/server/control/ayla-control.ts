/**
 * Ayla write path — the only code that changes the grill. DRY_RUN is the
 * default everywhere until the command shape is verified against real
 * hardware (AUTOPILOT_DRY_RUN=false to arm).
 */

export interface AylaWriteResult {
	status: 'sent' | 'dry_run' | 'failed'
	error?: string
}

export function isDryRun(): boolean {
	return process.env.AUTOPILOT_DRY_RUN !== 'false'
}

/**
 * Best-guess SET_Cook_Command payload for a pit setpoint change.
 *
 * ⚠️ NEEDS HARDWARE VERIFICATION: the exact JSON contract has to be
 * confirmed by diffing GET_Cook_Command from a real device after using the
 * official app. Until then this never leaves DRY_RUN.
 */
export function buildSetpointCommand(setpointC: number): string {
	return JSON.stringify({ command: 'set', setpoint: setpointC })
}

export async function sendDatapoint(
	dsn: string,
	property: string,
	value: string | number,
	headers: Record<string, string>,
): Promise<AylaWriteResult> {
	if (isDryRun()) {
		console.log(
			`[DRY_RUN] would POST datapoint ${property}=${String(value).slice(0, 80)} to ${dsn}`,
		)
		return { status: 'dry_run' }
	}
	try {
		const res = await fetch(
			`https://ads-eu.aylanetworks.com/apiv1/dsns/${dsn}/properties/${property}/datapoints.json`,
			{
				method: 'POST',
				headers: { ...headers, 'content-type': 'application/json' },
				body: JSON.stringify({ datapoint: { value } }),
			},
		)
		if (!res.ok) {
			return {
				status: 'failed',
				error: `datapoint POST ${res.status} ${res.statusText}`,
			}
		}
		return { status: 'sent' }
	} catch (error) {
		return {
			status: 'failed',
			error: error instanceof Error ? error.message : String(error),
		}
	}
}
