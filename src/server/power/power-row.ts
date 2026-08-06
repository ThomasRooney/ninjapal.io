/**
 * App-side client for the DynamoDB power-state row. The CANONICAL contract
 * is infra/aws/lambda/power/lib.ts on the foundation branch — this module
 * mirrors it and must never diverge:
 *
 *  - key: `pk` = "POWER#prod" (env POWER_ROW_KEY override for staging)
 *  - ALL timestamps are epoch-millisecond NUMBERS (never ISO strings —
 *    strings would corrupt the live row and break isIdle forever)
 *  - `version` fences control mutations; requestWake bumps it so an
 *    in-flight DRAINING claim fenced on the old version loses
 *  - `generation` fences per-wake-cycle component writes
 *  - activity stamps are data, not control: no version bump, throttled via
 *    the ConditionExpression itself
 *  - `keepWarmUntil` (epoch ms) is orchestrator-owned; app writers ignore
 *    it, /api/ready may surface it
 *
 * The app only reads the row and writes activity/desire/heartbeat
 * attributes; the orchestrator owns state transitions and row creation.
 * Every helper here is best-effort and never throws.
 */
import { createLogger } from '@/lib/log'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const log = createLogger('power-row')

/** Dashboard stamps lastWebAt at most once per 5 minutes (canonical). */
export const WEB_STAMP_THROTTLE_MS = 5 * 60_000

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

let _client: DynamoDBDocumentClient | null = null
let _clientRegion: string | undefined

async function getClient(
	region: string | undefined,
): Promise<DynamoDBDocumentClient> {
	if (!_client || _clientRegion !== region) {
		const [{ DynamoDBClient }, { DynamoDBDocumentClient }] = await Promise.all([
			import('@aws-sdk/client-dynamodb'),
			import('@aws-sdk/lib-dynamodb'),
		])
		_client = DynamoDBDocumentClient.from(
			new DynamoDBClient(region ? { region } : {}),
			{ marshallOptions: { removeUndefinedValues: true } },
		)
		_clientRegion = region
	}
	return _client
}

/** Test hook: drop the cached client so mocks take effect per-test. */
export function __resetPowerClientForTests(): void {
	_client = null
	_clientRegion = undefined
}

/** The power row (canonical fields loosely typed; extras pass through). */
export interface PowerRow {
	state: string | null
	desiredState: string | null
	version: number | null
	generation: number | null
	progress: string | null
	keepWarmUntil: number | null
	lastWebAt: number | null
	lastRealDeviceOnlineAt: number | null
	[key: string]: unknown
}

function num(v: unknown): number | null {
	return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function str(v: unknown): string | null {
	return typeof v === 'string' ? v : null
}

/**
 * Reads the power row (ConsistentRead). Returns null when unconfigured or
 * the row is absent; failures are swallowed into null + a warn (readers
 * must fail open).
 */
export async function readPowerRow(): Promise<PowerRow | null> {
	const config = powerConfig()
	if (!config) return null
	try {
		const [client, { GetCommand }] = await Promise.all([
			getClient(config.region),
			import('@aws-sdk/lib-dynamodb'),
		])
		const result = await client.send(
			new GetCommand({
				TableName: config.table,
				Key: { pk: config.rowKey },
				ConsistentRead: true,
			}),
		)
		const item = result.Item
		if (!item) return null
		return {
			...item,
			state: str(item.state),
			desiredState: str(item.desiredState),
			version: num(item.version),
			generation: num(item.generation),
			progress: str(item.progress),
			keepWarmUntil: num(item.keepWarmUntil),
			lastWebAt: num(item.lastWebAt),
			lastRealDeviceOnlineAt: num(item.lastRealDeviceOnlineAt),
		}
	} catch (error) {
		log.warn('power row read failed', {
			error: error instanceof Error ? error.message : String(error),
		})
		return null
	}
}

export type PowerWriteResult =
	| 'applied'
	| 'condition-failed'
	| 'unconfigured'
	| 'error'

interface ConditionedUpdate {
	set: string[]
	condition: string
	names: Record<string, string>
	values: Record<string, unknown>
	label: string
}

async function conditionedUpdate(
	update: ConditionedUpdate,
): Promise<PowerWriteResult> {
	const config = powerConfig()
	if (!config) {
		log.debug(`POWER_TABLE unset — skipping ${update.label}`)
		return 'unconfigured'
	}
	try {
		const [client, { UpdateCommand }] = await Promise.all([
			getClient(config.region),
			import('@aws-sdk/lib-dynamodb'),
		])
		await client.send(
			new UpdateCommand({
				TableName: config.table,
				Key: { pk: config.rowKey },
				UpdateExpression: `SET ${update.set.join(', ')}`,
				ConditionExpression: update.condition,
				ExpressionAttributeNames: { '#pk': 'pk', ...update.names },
				ExpressionAttributeValues: update.values,
			}),
		)
		return 'applied'
	} catch (error) {
		const name = error instanceof Error ? error.name : ''
		if (name === 'ConditionalCheckFailedException') {
			log.debug(`${update.label}: condition not met`)
			return 'condition-failed'
		}
		log.warn(`${update.label} failed`, {
			error: error instanceof Error ? error.message : String(error),
		})
		return 'error'
	}
}

/**
 * Stamp authenticated web activity (canonical stampWebActivity): throttled
 * to one write per 5 minutes via the condition itself, so callers can
 * stamp blindly. Data, not control — no version bump.
 */
export async function stampWebActivityRow(
	nowMs: number = Date.now(),
): Promise<PowerWriteResult> {
	return conditionedUpdate({
		label: 'lastWebAt stamp',
		set: ['#web = :now', '#updatedAt = :now'],
		condition:
			'attribute_exists(#pk) AND (attribute_not_exists(#web) OR #web <= :cutoff)',
		names: { '#web': 'lastWebAt', '#updatedAt': 'updatedAt' },
		values: { ':now': nowMs, ':cutoff': nowMs - WEB_STAMP_THROTTLE_MS },
	})
}

/**
 * A wake request (CONTRACT.md writer #2): flips desiredState to AWAKE,
 * stamps web activity and bumps `version` — REQUIRED, it fences off an
 * in-flight DRAINING→STOPPING_DB claim so wake-cancels-draining works.
 * Condition failure = already desired awake → fall back to the activity
 * stamp (writer #1) per the contract, and report success. Returns false
 * only when unconfigured or on a hard error.
 */
export async function requestWake(requestedBy: string): Promise<boolean> {
	const result = await conditionedUpdate({
		label: 'wake request',
		set: [
			'#desired = :awake',
			'#web = :now',
			'#version = #version + :one',
			'#updatedAt = :now',
		],
		condition: 'attribute_exists(#pk) AND #desired <> :awake',
		names: {
			'#desired': 'desiredState',
			'#web': 'lastWebAt',
			'#version': 'version',
			'#updatedAt': 'updatedAt',
		},
		values: { ':awake': 'AWAKE', ':now': Date.now(), ':one': 1 },
	})
	if (result === 'applied') {
		log.info('wake requested', { requestedBy })
		return true
	}
	if (result === 'condition-failed') {
		// Already desired awake — contract: fall back to the activity stamp.
		await stampWebActivityRow()
		return true
	}
	return false
}

/** The component name this app's worker reports readiness under. */
export const WORKER_COMPONENT = 'sync-worker'

/**
 * The worker's per-cycle write (CONTRACT.md writer #3), as ONE
 * generation-fenced update: componentReady['sync-worker'] = generation
 * always; lastRealDeviceOnlineAt ONLY when a NON-simulated device reported
 * Online this cycle. A stale POWER_GENERATION (superseded task after a
 * wake) loses the condition, writes nothing, and should drain itself.
 */
export async function stampWorkerCycle(args: {
	generation: number
	realDeviceOnline: boolean
	nowMs?: number
}): Promise<PowerWriteResult> {
	const now = args.nowMs ?? Date.now()
	const set = ['#ready.#c = :gen', '#updatedAt = :now']
	const names: Record<string, string> = {
		'#ready': 'componentReady',
		'#c': WORKER_COMPONENT,
		'#updatedAt': 'updatedAt',
		'#generation': 'generation',
	}
	if (args.realDeviceOnline) {
		set.push('#device = :now')
		names['#device'] = 'lastRealDeviceOnlineAt'
	}
	return conditionedUpdate({
		label: 'worker cycle stamp',
		set,
		condition: 'attribute_exists(#pk) AND #generation = :gen',
		names,
		values: { ':now': now, ':gen': args.generation },
	})
}

/**
 * Generic attribute merge for app-owned extension attributes (JWKS
 * mirror). Conditioned only on the row existing — never used for control
 * or activity fields.
 */
export async function mergePowerAttributes(
	attrs: Record<string, unknown>,
): Promise<PowerWriteResult> {
	const set: string[] = ['#updatedAt = :updatedAt']
	const names: Record<string, string> = { '#updatedAt': 'updatedAt' }
	const values: Record<string, unknown> = { ':updatedAt': Date.now() }
	let i = 0
	for (const [key, value] of Object.entries(attrs)) {
		names[`#m${i}`] = key
		values[`:m${i}`] = value
		set.push(`#m${i} = :m${i}`)
		i++
	}
	return conditionedUpdate({
		label: `attribute merge (${Object.keys(attrs).join(', ')})`,
		set,
		condition: 'attribute_exists(#pk)',
		names,
		values,
	})
}
