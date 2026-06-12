/**
 * Emits the marketing-hero cook as JSON: a 12h AI-managed brisket —
 * preheat → 107°C hold → stall → doneness at ~9.3h → automatic drop to
 * 65°C hold-warm until dinner. Points: [hours, grill, air, probe, setpoint].
 */
import { COOK_PROFILES, generateCookTelemetry } from './seed-demo'

const profile = {
	...COOK_PROFILES.brisket,
	durationHours: 9.3,
	climbRate: 0.035,
}
const cook = generateCookTelemetry(0, profile)

type Row = [number, number, number, number, number]
const rows: Row[] = cook.map((p) => [
	Math.round((p.t / 3_600_000) * 100) / 100,
	p.temp_grill,
	p.temp_air,
	p.probe1_temp_a,
	107,
])

// Hold-warm phase: AI drops the setpoint to 65°C; pit decays, probe rests
const HOLD_SET = 65
const last = rows[rows.length - 1]
let grill = last[1]
let air = last[2]
let probe = last[3]
const stepH = 5 / 60
for (let h = last[0] + stepH; h <= 12; h += stepH) {
	grill = HOLD_SET + (grill - HOLD_SET) * 0.82 + (Math.random() - 0.5) * 1.2
	air = grill - 3 + (Math.random() - 0.5) * 1.5
	probe = Math.max(88, probe - 0.12)
	rows.push([
		Math.round(h * 100) / 100,
		Math.round(grill * 10) / 10,
		Math.round(air * 10) / 10,
		Math.round(probe * 10) / 10,
		HOLD_SET,
	])
}

console.log(JSON.stringify(rows))
