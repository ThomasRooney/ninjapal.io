/**
 * PitMinder power-state library — the single source of truth for the
 * scale-to-zero state machine recorded in infra/aws/ARCHITECTURE.md.
 *
 * One DynamoDB row (`POWER#prod`) owns the whole stack's power state. EVERY
 * mutation here is a ConditionExpression write: single owner per transition,
 * optimistic version fencing on control fields, lease + generation fencing for
 * the long-running orchestrator work.
 *
 * Timestamps are epoch milliseconds.
 */
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb'
import {
	type DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	UpdateCommand,
} from '@aws-sdk/lib-dynamodb'

export const POWER_PK = 'POWER#prod'

/** Idle = no web activity AND no real-device-online signal for 8h. */
export const IDLE_AFTER_MS = 8 * 60 * 60 * 1000
/** Dashboard stamps lastWebAt at most once per 5 minutes. */
export const WEB_STAMP_THROTTLE_MS = 5 * 60 * 1000
/** Orchestrator lease; heartbeaten every poll tick while driving. */
export const DEFAULT_LEASE_MS = 2 * 60 * 1000
/**
 * RDS force-restarts stopped instances after 7 days. We pre-empt at
 * stoppedAt + 6d18h with a controlled start -> probe -> restop cycle.
 */
export const MAINTENANCE_AFTER_MS = (6 * 24 + 18) * 60 * 60 * 1000
/** An operator keep-warm hold can defer the idle rule by at most 24h. */
export const MAX_HOLD_MS = 24 * 60 * 60 * 1000
/** Continuations (takeover/handoff) allowed per transition before ERROR. */
export const MAX_TRANSITION_ATTEMPTS = 10

/** Components that must report ready at the current generation for AWAKE. */
export const COMPONENTS = ['zero-cache', 'sync-worker'] as const

export const STATES = [
	'SLEEPING',
	'WAKING_DB',
	'WAKING_SERVICES',
	'AWAKE',
	'DRAINING',
	'STOPPING_DB',
	'SLEEP_MAINTENANCE',
	'ERROR',
] as const
export type PowerState = (typeof STATES)[number]
export type DesiredState = 'AWAKE' | 'SLEEPING'

/**
 * The legal transition table. Anything not listed is rejected locally before
 * any DynamoDB call.
 *
 * - DRAINING -> WAKING_SERVICES is "wake cancels draining" (DB never stopped).
 * - SLEEP_MAINTENANCE -> WAKING_SERVICES is a real wake during the 7-day
 *   maintenance start; the restop is skipped.
 * - ERROR recovery is reconciler-gated (desired AWAKE -> WAKING_DB, desired
 *   SLEEPING -> SLEEPING, where drift repair then restops a running DB).
 */
export const TRANSITIONS: Record<PowerState, readonly PowerState[]> = {
	SLEEPING: ['WAKING_DB', 'SLEEP_MAINTENANCE', 'ERROR'],
	WAKING_DB: ['WAKING_SERVICES', 'ERROR'],
	WAKING_SERVICES: ['AWAKE', 'ERROR'],
	AWAKE: ['DRAINING', 'ERROR'],
	DRAINING: ['STOPPING_DB', 'WAKING_SERVICES', 'ERROR'],
	STOPPING_DB: ['SLEEPING', 'ERROR'],
	SLEEP_MAINTENANCE: ['SLEEPING', 'WAKING_SERVICES', 'ERROR'],
	ERROR: ['SLEEPING', 'WAKING_DB'],
}

/** States the orchestrator holds a lease in while driving them onward. */
export const TRANSITIONAL_STATES: readonly PowerState[] = [
	'WAKING_DB',
	'WAKING_SERVICES',
	'DRAINING',
	'STOPPING_DB',
	'SLEEP_MAINTENANCE',
]

export interface Lease {
	owner: string
	expiresAt: number
}

export interface PowerRow {
	pk: typeof POWER_PK
	state: PowerState
	desiredState: DesiredState
	/** Bumped by every control mutation; claims are fenced on it. */
	version: number
	/** Bumped when a wake cycle begins; component readiness is fenced on it. */
	generation: number
	lease?: Lease
	/** Authenticated web activity (dashboard/MCP), stamped at most 1/5min. */
	lastWebAt?: number
	/**
	 * Last time a NON-simulated device reported online. Excluding
	 * `is_simulated` devices is the WORKER's job — this library stores
	 * whatever timestamp the worker sends.
	 */
	lastRealDeviceOnlineAt?: number
	/** When the RDS instance last reached `stopped` under our control. */
	stoppedAt?: number
	/** Set after the maintenance SQL probe; > stoppedAt means restop pending. */
	maintenanceProbedAt?: number
	/** component name -> generation it reported ready at. */
	componentReady: Record<string, number>
	/**
	 * Continuations of the CURRENT transition (lease takeovers + reinvoke
	 * handoffs). Reset by every claim; the driver claims ERROR past
	 * MAX_TRANSITION_ATTEMPTS.
	 */
	attempts?: number
	/** Operator hold: the idle rule is deferred while this is in the future.
	 * Capped at now + MAX_HOLD_MS when written. Never affects requestWake. */
	keepWarmUntil?: number
	lastError?: string
	updatedAt: number
}

export type RejectReason =
	| 'illegal-transition'
	| 'conflict'
	| 'throttled'
	| 'missing'
	| 'stale'
	| 'already-desired'
	| 'exists'

export type MutationResult =
	| { applied: true; row?: PowerRow }
	| { applied: false; reason: RejectReason }

export function isTransitional(state: PowerState): boolean {
	return TRANSITIONAL_STATES.includes(state)
}

/** A new wake cycle starts: fresh generation, prior component readiness stale. */
export function bumpsGeneration(from: PowerState, to: PowerState): boolean {
	return (
		to === 'WAKING_DB' ||
		(from === 'DRAINING' && to === 'WAKING_SERVICES') ||
		(from === 'SLEEP_MAINTENANCE' && to === 'WAKING_SERVICES')
	)
}

export function leaseActive(row: PowerRow, now: number): boolean {
	return row.lease !== undefined && row.lease.expiresAt >= now
}

/**
 * Idle rule: BOTH signals older than 8h (a missing signal counts as idle).
 * An unexpired operator keep-warm hold defers idleness entirely.
 */
export function isIdle(row: PowerRow, now: number): boolean {
	if (row.keepWarmUntil !== undefined && row.keepWarmUntil > now) return false
	const web = row.lastWebAt ?? 0
	const device = row.lastRealDeviceOnlineAt ?? 0
	return now - web > IDLE_AFTER_MS && now - device > IDLE_AFTER_MS
}

/** 7-day window: due at stoppedAt + 6d18h, only meaningful while SLEEPING. */
export function maintenanceDue(row: PowerRow, now: number): boolean {
	if (row.state !== 'SLEEPING' || row.stoppedAt === undefined) return false
	return now >= row.stoppedAt + MAINTENANCE_AFTER_MS
}

export function allComponentsReady(
	row: PowerRow,
	components: readonly string[],
): boolean {
	return components.every((c) => row.componentReady?.[c] === row.generation)
}

function conditionFailed(error: unknown): boolean {
	return (
		error instanceof ConditionalCheckFailedException ||
		(error instanceof Error && error.name === 'ConditionalCheckFailedException')
	)
}

export async function getRow(
	ddb: DynamoDBDocumentClient,
	table: string,
): Promise<PowerRow | null> {
	const res = await ddb.send(
		new GetCommand({
			TableName: table,
			Key: { pk: POWER_PK },
			ConsistentRead: true,
		}),
	)
	return (res.Item as PowerRow | undefined) ?? null
}

/** Create the row if it does not exist. Defaults to SLEEPING/stopped-now. */
export async function seedRow(
	ddb: DynamoDBDocumentClient,
	table: string,
	now: number,
	overrides: Partial<Omit<PowerRow, 'pk'>> = {},
): Promise<MutationResult> {
	const item: PowerRow = {
		pk: POWER_PK,
		state: 'SLEEPING',
		desiredState: 'SLEEPING',
		version: 0,
		generation: 0,
		componentReady: {},
		stoppedAt: now,
		updatedAt: now,
		...overrides,
	}
	try {
		await ddb.send(
			new PutCommand({
				TableName: table,
				Item: item,
				ConditionExpression: 'attribute_not_exists(#pk)',
				ExpressionAttributeNames: { '#pk': 'pk' },
			}),
		)
		return { applied: true, row: item }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'exists' }
		throw error
	}
}

/**
 * Stamp authenticated web activity. Throttled to one write per 5 minutes via
 * the condition itself, so callers can stamp blindly on every request.
 * Does NOT bump version — activity is data, not control.
 */
export async function stampWebActivity(
	ddb: DynamoDBDocumentClient,
	table: string,
	now: number,
): Promise<MutationResult> {
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression: 'SET #web = :now, #updatedAt = :now',
				ConditionExpression:
					'attribute_exists(#pk) AND (attribute_not_exists(#web) OR #web <= :cutoff)',
				ExpressionAttributeNames: {
					'#pk': 'pk',
					'#web': 'lastWebAt',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: {
					':now': now,
					':cutoff': now - WEB_STAMP_THROTTLE_MS,
				},
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'throttled' }
		throw error
	}
}

/**
 * Stamp the last-real-device-online signal. Sim-device exclusion is the
 * WORKER's responsibility — the worker must only call this for devices where
 * `is_simulated` is false. Monotonic: an older timestamp never overwrites a
 * newer one.
 */
export async function stampRealDeviceOnline(
	ddb: DynamoDBDocumentClient,
	table: string,
	now: number,
): Promise<MutationResult> {
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression: 'SET #device = :now, #updatedAt = :now',
				ConditionExpression:
					'attribute_exists(#pk) AND (attribute_not_exists(#device) OR #device < :now)',
				ExpressionAttributeNames: {
					'#pk': 'pk',
					'#device': 'lastRealDeviceOnlineAt',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: { ':now': now },
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'stale' }
		throw error
	}
}

/**
 * A wake request (authenticated dashboard hit or MCP bearer). Flips
 * desiredState to AWAKE and stamps web activity. Bumps version so an
 * in-flight DRAINING claim fenced on the old version loses and re-reads.
 */
export async function requestWake(
	ddb: DynamoDBDocumentClient,
	table: string,
	now: number,
): Promise<MutationResult> {
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression:
					'SET #desired = :awake, #web = :now, #version = #version + :one, #updatedAt = :now',
				ConditionExpression: 'attribute_exists(#pk) AND #desired <> :awake',
				ExpressionAttributeNames: {
					'#pk': 'pk',
					'#desired': 'desiredState',
					'#web': 'lastWebAt',
					'#version': 'version',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: {
					':awake': 'AWAKE',
					':now': now,
					':one': 1,
				},
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error))
			return { applied: false, reason: 'already-desired' }
		throw error
	}
}

/**
 * The 30-minute idle cron's decision. Pins the exact activity timestamps it
 * evaluated, so ANY concurrent stamp (which does not bump version) still
 * defeats the sleep decision.
 */
export async function requestSleep(
	ddb: DynamoDBDocumentClient,
	table: string,
	row: PowerRow,
	now: number,
): Promise<MutationResult> {
	const names: Record<string, string> = {
		'#state': 'state',
		'#desired': 'desiredState',
		'#version': 'version',
		'#updatedAt': 'updatedAt',
		'#web': 'lastWebAt',
		'#device': 'lastRealDeviceOnlineAt',
	}
	const values: Record<string, unknown> = {
		':awakeState': 'AWAKE',
		':awake': 'AWAKE',
		':sleeping': 'SLEEPING',
		':v': row.version,
		':now': now,
		':one': 1,
	}
	const webPin =
		row.lastWebAt === undefined
			? 'attribute_not_exists(#web)'
			: '#web = :seenWeb'
	if (row.lastWebAt !== undefined) values[':seenWeb'] = row.lastWebAt
	const devicePin =
		row.lastRealDeviceOnlineAt === undefined
			? 'attribute_not_exists(#device)'
			: '#device = :seenDevice'
	if (row.lastRealDeviceOnlineAt !== undefined)
		values[':seenDevice'] = row.lastRealDeviceOnlineAt
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression:
					'SET #desired = :sleeping, #version = #version + :one, #updatedAt = :now',
				ConditionExpression: `#state = :awakeState AND #desired = :awake AND #version = :v AND ${webPin} AND ${devicePin}`,
				ExpressionAttributeNames: names,
				ExpressionAttributeValues: values,
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'conflict' }
		throw error
	}
}

export interface ClaimInput {
	row: PowerRow
	to: PowerState
	owner: string
	now: number
	leaseMs?: number
	/** Required context when claiming into ERROR. */
	errorMessage?: string
}

/**
 * Claim a transition. This is THE write that moves the machine. Fenced on:
 * - the exact state the caller read (single owner per transition),
 * - the version it read (no torn read-modify-write),
 * - the lease: an unexpired lease held by another owner rejects the claim
 *   (double-claim rejection); an expired lease may be taken over.
 */
export async function claimTransition(
	ddb: DynamoDBDocumentClient,
	table: string,
	input: ClaimInput,
): Promise<MutationResult> {
	const { row, to, owner, now } = input
	const from = row.state
	if (!TRANSITIONS[from].includes(to)) {
		return { applied: false, reason: 'illegal-transition' }
	}
	const leaseMs = input.leaseMs ?? DEFAULT_LEASE_MS
	const names: Record<string, string> = {
		'#state': 'state',
		'#version': 'version',
		'#lease': 'lease',
		'#owner': 'owner',
		'#updatedAt': 'updatedAt',
	}
	const values: Record<string, unknown> = {
		':from': from,
		':to': to,
		':v': row.version,
		':now': now,
		':one': 1,
		':owner': owner,
	}
	const sets = [
		'#state = :to',
		'#version = #version + :one',
		'#updatedAt = :now',
	]
	const removes: string[] = []
	names['#attempts'] = 'attempts'

	if (isTransitional(to)) {
		sets.push('#lease = :lease')
		values[':lease'] = { owner, expiresAt: now + leaseMs } satisfies Lease
		// A claim starts a fresh transition: its continuation budget resets.
		sets.push('#attempts = :zero')
		values[':zero'] = 0
	} else {
		removes.push('#lease')
		removes.push('#attempts')
	}
	if (bumpsGeneration(from, to)) {
		names['#generation'] = 'generation'
		sets.push('#generation = #generation + :one')
	}
	if (to === 'SLEEPING') {
		names['#stoppedAt'] = 'stoppedAt'
		names['#probed'] = 'maintenanceProbedAt'
		sets.push('#stoppedAt = :now')
		removes.push('#probed')
	}
	if (to === 'AWAKE') {
		names['#lastError'] = 'lastError'
		removes.push('#lastError')
	}
	if (to === 'ERROR') {
		names['#lastError'] = 'lastError'
		sets.push('#lastError = :err')
		values[':err'] = input.errorMessage ?? 'unknown error'
	}

	const update = `SET ${sets.join(', ')}${removes.length > 0 ? ` REMOVE ${removes.join(', ')}` : ''}`
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression: update,
				ConditionExpression:
					'#state = :from AND #version = :v AND ' +
					'(attribute_not_exists(#lease) OR #lease.expiresAt < :now OR #lease.#owner = :owner)',
				ExpressionAttributeNames: names,
				ExpressionAttributeValues: values,
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'conflict' }
		throw error
	}
}

/**
 * Take over an expired (or missing) lease on the current state without moving
 * it — how a new orchestrator invocation resumes an abandoned transition.
 */
export async function takeoverLease(
	ddb: DynamoDBDocumentClient,
	table: string,
	row: PowerRow,
	owner: string,
	now: number,
	leaseMs: number = DEFAULT_LEASE_MS,
): Promise<MutationResult> {
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression:
					'SET #lease = :lease, #version = #version + :one, ' +
					'#attempts = if_not_exists(#attempts, :zero) + :one, #updatedAt = :now',
				ConditionExpression:
					'#state = :state AND #version = :v AND ' +
					'(attribute_not_exists(#lease) OR #lease.expiresAt < :now)',
				ExpressionAttributeNames: {
					'#state': 'state',
					'#version': 'version',
					'#lease': 'lease',
					'#attempts': 'attempts',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: {
					':state': row.state,
					':v': row.version,
					':now': now,
					':one': 1,
					':zero': 0,
					':lease': { owner, expiresAt: now + leaseMs } satisfies Lease,
				},
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'conflict' }
		throw error
	}
}

/**
 * CAS-transfer a LIVE lease to a named successor — how an orchestrator
 * invocation running out of time hands the in-flight transition to its
 * self-reinvoked successor without waiting out the lease. Fenced on the
 * current owner; counts as a continuation (attempts + 1).
 */
export async function transferLease(
	ddb: DynamoDBDocumentClient,
	table: string,
	input: { fromOwner: string; toOwner: string; now: number; leaseMs?: number },
): Promise<MutationResult> {
	const leaseMs = input.leaseMs ?? DEFAULT_LEASE_MS
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression:
					'SET #lease = :lease, ' +
					'#attempts = if_not_exists(#attempts, :zero) + :one, #updatedAt = :now',
				ConditionExpression:
					'attribute_exists(#lease) AND #lease.#owner = :from',
				ExpressionAttributeNames: {
					'#lease': 'lease',
					'#owner': 'owner',
					'#attempts': 'attempts',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: {
					':from': input.fromOwner,
					':now': input.now,
					':one': 1,
					':zero': 0,
					':lease': {
						owner: input.toOwner,
						expiresAt: input.now + leaseMs,
					} satisfies Lease,
				},
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'conflict' }
		throw error
	}
}

/**
 * Extend the lease while driving. Fenced on BOTH the owner and the generation
 * the driver believes it is working for — a heartbeat from a superseded wake
 * cycle (stale generation) is rejected and the driver must stand down.
 */
export async function heartbeat(
	ddb: DynamoDBDocumentClient,
	table: string,
	input: { owner: string; generation: number; now: number; leaseMs?: number },
): Promise<MutationResult> {
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression: 'SET #lease.expiresAt = :exp, #updatedAt = :now',
				ConditionExpression:
					'attribute_exists(#lease) AND #lease.#owner = :owner AND #generation = :gen',
				ExpressionAttributeNames: {
					'#lease': 'lease',
					'#owner': 'owner',
					'#generation': 'generation',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: {
					':owner': input.owner,
					':gen': input.generation,
					':now': input.now,
					':exp': input.now + (input.leaseMs ?? DEFAULT_LEASE_MS),
				},
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'stale' }
		throw error
	}
}

/**
 * A component reports ready. Fenced on the generation it was started for —
 * a report from a previous wake cycle can never satisfy the current one.
 */
export async function markComponentReady(
	ddb: DynamoDBDocumentClient,
	table: string,
	input: { component: string; generation: number; now: number },
): Promise<MutationResult> {
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression: 'SET #ready.#c = :gen, #updatedAt = :now',
				ConditionExpression: 'attribute_exists(#pk) AND #generation = :gen',
				ExpressionAttributeNames: {
					'#pk': 'pk',
					'#ready': 'componentReady',
					'#c': input.component,
					'#generation': 'generation',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: {
					':gen': input.generation,
					':now': input.now,
				},
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'stale' }
		throw error
	}
}

/** Record the maintenance SQL probe; disambiguates start-phase from restop. */
export async function markMaintenanceProbed(
	ddb: DynamoDBDocumentClient,
	table: string,
	row: PowerRow,
	owner: string,
	now: number,
): Promise<MutationResult> {
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression:
					'SET #probed = :now, #version = #version + :one, #updatedAt = :now',
				ConditionExpression:
					'#state = :maintenance AND #version = :v AND #lease.#owner = :owner',
				ExpressionAttributeNames: {
					'#probed': 'maintenanceProbedAt',
					'#state': 'state',
					'#version': 'version',
					'#lease': 'lease',
					'#owner': 'owner',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: {
					':maintenance': 'SLEEP_MAINTENANCE',
					':v': row.version,
					':owner': owner,
					':now': now,
					':one': 1,
				},
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'conflict' }
		throw error
	}
}

/**
 * Force desiredState=SLEEPING regardless of activity — the budget shutoff's
 * wind-down. The stream + a direct invoke then drive the drain. Bumps version
 * like every desired-state change.
 */
export async function forceSleep(
	ddb: DynamoDBDocumentClient,
	table: string,
	now: number,
): Promise<MutationResult> {
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression:
					'SET #desired = :sleeping, #version = #version + :one, #updatedAt = :now',
				ConditionExpression: 'attribute_exists(#pk) AND #desired <> :sleeping',
				ExpressionAttributeNames: {
					'#pk': 'pk',
					'#desired': 'desiredState',
					'#version': 'version',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: {
					':sleeping': 'SLEEPING',
					':now': now,
					':one': 1,
				},
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error))
			return { applied: false, reason: 'already-desired' }
		throw error
	}
}

/**
 * Operator keep-warm hold: defer the idle rule until `now + hours` (capped at
 * MAX_HOLD_MS). Never shortens an existing longer hold — the condition
 * rejects instead. Does not wake anything by itself.
 */
export async function holdWarm(
	ddb: DynamoDBDocumentClient,
	table: string,
	now: number,
	hours: number,
): Promise<MutationResult & { until?: number }> {
	const until = now + Math.min(Math.max(hours, 0) * 60 * 60 * 1000, MAX_HOLD_MS)
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression: 'SET #hold = :until, #updatedAt = :now',
				ConditionExpression:
					'attribute_exists(#pk) AND (attribute_not_exists(#hold) OR #hold < :until)',
				ExpressionAttributeNames: {
					'#pk': 'pk',
					'#hold': 'keepWarmUntil',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: { ':until': until, ':now': now },
			}),
		)
		return { applied: true, until }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'stale' }
		throw error
	}
}

/** Release the keep-warm hold; the idle rule applies again immediately. */
export async function releaseHold(
	ddb: DynamoDBDocumentClient,
	table: string,
	now: number,
): Promise<MutationResult> {
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression: 'REMOVE #hold SET #updatedAt = :now',
				ConditionExpression:
					'attribute_exists(#pk) AND attribute_exists(#hold)',
				ExpressionAttributeNames: {
					'#pk': 'pk',
					'#hold': 'keepWarmUntil',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: { ':now': now },
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'missing' }
		throw error
	}
}

/**
 * The sync-worker's combined heartbeat: ONE generation-fenced write that
 * marks the worker component ready and (when a NON-simulated device is
 * online — the worker's check, not this library's) stamps
 * lastRealDeviceOnlineAt. A write for a superseded generation is rejected
 * whole, so a draining worker can never resurrect activity.
 */
export async function workerHeartbeat(
	ddb: DynamoDBDocumentClient,
	table: string,
	input: {
		generation: number
		now: number
		realDeviceOnline: boolean
		component?: string
	},
): Promise<MutationResult> {
	const sets = ['#ready.#c = :gen', '#updatedAt = :now']
	const names: Record<string, string> = {
		'#pk': 'pk',
		'#ready': 'componentReady',
		'#c': input.component ?? 'sync-worker',
		'#generation': 'generation',
		'#updatedAt': 'updatedAt',
	}
	if (input.realDeviceOnline) {
		sets.push('#device = :now')
		names['#device'] = 'lastRealDeviceOnlineAt'
	}
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression: `SET ${sets.join(', ')}`,
				ConditionExpression: 'attribute_exists(#pk) AND #generation = :gen',
				ExpressionAttributeNames: names,
				ExpressionAttributeValues: {
					':gen': input.generation,
					':now': input.now,
				},
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'stale' }
		throw error
	}
}

/** Note an operational error without moving the state machine. */
export async function recordSoftError(
	ddb: DynamoDBDocumentClient,
	table: string,
	message: string,
	now: number,
): Promise<MutationResult> {
	try {
		await ddb.send(
			new UpdateCommand({
				TableName: table,
				Key: { pk: POWER_PK },
				UpdateExpression: 'SET #lastError = :err, #updatedAt = :now',
				ConditionExpression: 'attribute_exists(#pk)',
				ExpressionAttributeNames: {
					'#pk': 'pk',
					'#lastError': 'lastError',
					'#updatedAt': 'updatedAt',
				},
				ExpressionAttributeValues: { ':err': message, ':now': now },
			}),
		)
		return { applied: true }
	} catch (error) {
		if (conditionFailed(error)) return { applied: false, reason: 'missing' }
		throw error
	}
}
