/**
 * DynamoDB power-state row plumbing (infra/aws/ARCHITECTURE.md).
 *
 * One versioned row per environment tracks the scale-to-zero lifecycle:
 * SLEEPING → WAKING_DB → WAKING_SERVICES → AWAKE → DRAINING → STOPPING_DB,
 * plus SLEEP_MAINTENANCE and ERROR. The orchestrator OWNS state transitions;
 * the app only reads the row and stamps activity/desire attributes.
 *
 * Contract (must match the CDK data stack):
 *  - table name: env POWER_TABLE (unset → every helper here no-ops)
 *  - region:     env POWER_TABLE_REGION, else AWS_REGION/AWS_DEFAULT_REGION
 *  - key:        single partition key attribute `pk`, value env POWER_ROW_KEY
 *                (default "POWER#prod")
 *  - timestamps: ISO-8601 strings (S); generation: number (N)
 *
 * Every writer here conditions on attribute_exists(pk): the orchestrator
 * creates the row, and a missing row means the environment is not managed —
 * stamping must not conjure a half-initialized row for it.
 */
import { createLogger } from '@/lib/log'
import type { AttributeValue, DynamoDB } from '@aws-sdk/client-dynamodb'

const log = createLogger('power-row')

export interface PowerConfig {
	table: string
	region: string | undefined
	rowKey: string
}

/** Reads the POWER_TABLE config from env; null when unconfigured. */
export function powerConfig(
	env: Record<string, string | undefined> = process.env,
): PowerConfig | null {
	const table = env.POWER_TABLE?.trim()
	if (!table) return null
	return {
		table,
		region:
			env.POWER_TABLE_REGION?.trim() ||
			env.AWS_REGION?.trim() ||
			env.AWS_DEFAULT_REGION?.trim() ||
			undefined,
		rowKey: env.POWER_ROW_KEY?.trim() || 'POWER#prod',
	}
}

let _client: DynamoDB | null = null
let _clientRegion: string | undefined

async function getClient(region: string | undefined): Promise<DynamoDB> {
	if (!_client || _clientRegion !== region) {
		const { DynamoDB } = await import('@aws-sdk/client-dynamodb')
		_client = new DynamoDB(region ? { region } : {})
		_clientRegion = region
	}
	return _client
}

/** Test hook: drop the cached client so mocks take effect per-test. */
export function __resetPowerClientForTests(): void {
	_client = null
	_clientRegion = undefined
}

/** The power row as loosely-typed attributes; null when absent/unconfigured. */
export interface PowerRow {
	state: string | null
	desiredState: string | null
	generation: number | null
	progress: string | null
	[key: string]: unknown
}

function attrToValue(attr: AttributeValue): unknown {
	if (attr.S !== undefined) return attr.S
	if (attr.N !== undefined) return Number(attr.N)
	if (attr.BOOL !== undefined) return attr.BOOL
	if (attr.NULL) return null
	return undefined
}

/**
 * Reads the power row. Returns null when unconfigured or the row is absent;
 * throws are swallowed into null + a warn (readers must fail open).
 */
export async function readPowerRow(): Promise<PowerRow | null> {
	const config = powerConfig()
	if (!config) return null
	try {
		const client = await getClient(config.region)
		const result = await client.getItem({
			TableName: config.table,
			Key: { pk: { S: config.rowKey } },
			ConsistentRead: true,
		})
		if (!result.Item) return null
		const row: Record<string, unknown> = {}
		for (const [key, attr] of Object.entries(result.Item)) {
			row[key] = attrToValue(attr)
		}
		return {
			state: typeof row.state === 'string' ? row.state : null,
			desiredState:
				typeof row.desiredState === 'string' ? row.desiredState : null,
			generation: typeof row.generation === 'number' ? row.generation : null,
			progress: typeof row.progress === 'string' ? row.progress : null,
			...row,
		}
	} catch (error) {
		log.warn('power row read failed', {
			error: error instanceof Error ? error.message : String(error),
		})
		return null
	}
}

/**
 * Records that an authenticated user wants the stack awake. The
 * orchestrator (DDB Streams-triggered) reacts to desiredState; this only
 * writes intent. A wake is also web activity, so lastWebAt rides along in
 * the same write. No-op false when unconfigured.
 */
export async function requestWake(requestedBy: string): Promise<boolean> {
	const now = new Date().toISOString()
	return updatePowerAttributes({
		desiredState: { S: 'AWAKE' },
		wakeRequestedAt: { S: now },
		wakeRequestedBy: { S: requestedBy },
		lastWebAt: { S: now },
	})
}

/**
 * SETs the given attributes on the power row, conditioned on the row
 * existing. Returns true on success, false when unconfigured, the row is
 * missing, or the write fails — never throws (stamps are best-effort).
 */
export async function updatePowerAttributes(
	attrs: Record<string, AttributeValue>,
): Promise<boolean> {
	const config = powerConfig()
	if (!config) {
		log.debug('POWER_TABLE unset — skipping power row update', {
			attrs: Object.keys(attrs),
		})
		return false
	}
	const names: Record<string, string> = {}
	const values: Record<string, AttributeValue> = {}
	const sets: string[] = []
	let i = 0
	for (const [key, value] of Object.entries(attrs)) {
		const nameRef = `#a${i}`
		const valueRef = `:v${i}`
		names[nameRef] = key
		values[valueRef] = value
		sets.push(`${nameRef} = ${valueRef}`)
		i++
	}
	try {
		const client = await getClient(config.region)
		await client.updateItem({
			TableName: config.table,
			Key: { pk: { S: config.rowKey } },
			UpdateExpression: `SET ${sets.join(', ')}`,
			ConditionExpression: 'attribute_exists(pk)',
			ExpressionAttributeNames: names,
			ExpressionAttributeValues: values,
		})
		return true
	} catch (error) {
		const name = error instanceof Error ? error.name : ''
		if (name === 'ConditionalCheckFailedException') {
			log.debug('power row absent — update skipped', {
				attrs: Object.keys(attrs),
			})
		} else {
			log.warn('power row update failed', {
				attrs: Object.keys(attrs),
				error: error instanceof Error ? error.message : String(error),
			})
		}
		return false
	}
}
