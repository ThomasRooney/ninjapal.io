/**
 * JWKS mirror for offline MCP bearer verification (infra/aws/ARCHITECTURE.md).
 *
 * better-auth's JWKS lives in Postgres, so a sleeping stack cannot verify
 * the bearer that is supposed to wake it. Whenever the JWKS is read
 * successfully while awake, the PUBLIC keys are mirrored into the DynamoDB
 * power row (`jwksJson` attribute); the MCP endpoint falls back to the
 * mirror when the database is unreachable.
 *
 * Bootstrap constraint (documented, accepted): until the first successful
 * awake-time mirror, offline bearer verification is impossible — the very
 * first MCP wake after cutover requires the stack to be awake once with
 * POWER_TABLE configured. The mirror carries only public keys.
 */
import { createLogger } from '@/lib/log'
import { mergePowerAttributes, readPowerRow } from './power-row'

const log = createLogger('power-jwks')

const MIRROR_INTERVAL_MS = 60 * 60_000
let lastMirrorMs = 0

/** Test hook: clear the per-process mirror throttle. */
export function __resetJwksMirrorForTests(): void {
	lastMirrorMs = 0
}

/**
 * Mirrors the (public) JWKS onto the power row. Throttled to one write per
 * hour per process; best-effort and never throws.
 */
export async function mirrorJwks(jwks: { keys: JsonWebKey[] }): Promise<void> {
	if (!Array.isArray(jwks?.keys) || jwks.keys.length === 0) return
	const now = Date.now()
	if (now - lastMirrorMs < MIRROR_INTERVAL_MS) return
	lastMirrorMs = now
	const result = await mergePowerAttributes({
		jwksJson: JSON.stringify({ keys: jwks.keys }),
		jwksMirroredAt: now,
	})
	if (result === 'applied') {
		log.debug('mirrored JWKS to power row', { keys: jwks.keys.length })
	} else if (result !== 'unconfigured') {
		// Retry on the next verification rather than sitting out the hour.
		lastMirrorMs = 0
	}
}

/** Reads the mirrored JWKS; null when unconfigured/absent/corrupt. */
export async function readMirroredJwks(): Promise<{
	keys: JsonWebKey[]
} | null> {
	const row = await readPowerRow()
	const raw = row?.jwksJson
	if (typeof raw !== 'string' || raw.length === 0) return null
	try {
		const parsed = JSON.parse(raw) as { keys?: unknown }
		if (!Array.isArray(parsed.keys) || parsed.keys.length === 0) return null
		return { keys: parsed.keys as JsonWebKey[] }
	} catch {
		log.warn('mirrored JWKS is corrupt — ignoring')
		return null
	}
}
