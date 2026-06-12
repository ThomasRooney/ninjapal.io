/** Emits downsampled brisket telemetry as JSON for the marketing hero. */
import { COOK_PROFILES, generateCookTelemetry } from './seed-demo'

const points = generateCookTelemetry(0, COOK_PROFILES.brisket)
const data = points.map((p) => [
	Math.round((p.t / 3_600_000) * 100) / 100, // hours
	p.temp_grill,
	p.temp_air,
	p.probe1_temp_a,
])
console.log(JSON.stringify(data))
