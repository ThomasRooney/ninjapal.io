/**
 * In-VPC database probe (pitminder-compute). The wake orchestrator lives
 * OUTSIDE the VPC (waking must not depend on anything inside it), so it
 * invokes this function for the maintenance SQL probe: TLS connect +
 * SELECT 1, reporting logical slots/publications as evidence.
 *
 * DB_URL arrives via a CloudFormation dynamic reference resolved at deploy
 * time — this function performs NO AWS API calls at runtime, because during
 * SLEEP_MAINTENANCE the NAT instance is stopped and the private subnets
 * have no path to regional endpoints (S3/DynamoDB gateways aside).
 *
 * A reachable database with zero slots is still ok:true — the probe runs
 * before the first zero-cache start ever creates a slot.
 */
import postgres from 'postgres'

export interface DbProbeResult {
	ok: boolean
	error?: string
	/** wal_level === 'logical' — Zero cannot replicate without it. */
	logicalReplication?: boolean
	slots?: string[]
	publications?: string[]
	latencyMs?: number
}

export async function handler(): Promise<DbProbeResult> {
	const url = process.env.DB_URL
	if (!url) return { ok: false, error: 'DB_URL is not configured' }
	const sql = postgres(url, {
		max: 1,
		ssl: 'require',
		connect_timeout: 10,
	})
	const startedAt = Date.now()
	try {
		await sql`SELECT 1`
		const [wal] = await sql`SHOW wal_level`
		const slots = await sql`SELECT slot_name FROM pg_replication_slots`
		const publications = await sql`SELECT pubname FROM pg_publication`
		return {
			ok: true,
			latencyMs: Date.now() - startedAt,
			// rds.logical_replication=1 surfaces as wal_level=logical; SHOW
			// works on any Postgres, unlike the RDS-specific GUC.
			logicalReplication: wal?.wal_level === 'logical',
			slots: slots.map((row) => String(row.slot_name)),
			publications: publications.map((row) => String(row.pubname)),
		}
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		}
	} finally {
		await sql.end({ timeout: 5 }).catch(() => {})
	}
}
