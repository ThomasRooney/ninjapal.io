import {
	ConditionalCheckFailedException,
	DynamoDBClient,
} from '@aws-sdk/client-dynamodb'
import {
	DynamoDBDocumentClient,
	PutCommand,
	UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import {
	COMPONENTS,
	IDLE_AFTER_MS,
	MAINTENANCE_AFTER_MS,
	MAX_HOLD_MS,
	type PowerRow,
	type PowerState,
	STATES,
	TRANSITIONS,
	WEB_STAMP_THROTTLE_MS,
	allComponentsReady,
	claimTransition,
	forceSleep,
	heartbeat,
	holdWarm,
	isIdle,
	maintenanceDue,
	markComponentReady,
	markMaintenanceProbed,
	releaseHold,
	requestSleep,
	requestWake,
	seedRow,
	stampRealDeviceOnline,
	stampWebActivity,
	takeoverLease,
	transferLease,
	workerHeartbeat,
} from '../lambda/power/lib'

const TABLE = 'pitminder-power-test'
const NOW = 1_754_000_000_000

const ddbMock = mockClient(DynamoDBDocumentClient)
const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const conditionFailure = () =>
	new ConditionalCheckFailedException({
		message: 'The conditional request failed',
		$metadata: {},
	})

function makeRow(overrides: Partial<PowerRow> = {}): PowerRow {
	return {
		pk: 'POWER#prod',
		state: 'SLEEPING',
		desiredState: 'SLEEPING',
		version: 7,
		generation: 3,
		componentReady: {},
		stoppedAt: NOW - 60_000,
		updatedAt: NOW - 60_000,
		...overrides,
	}
}

beforeEach(() => {
	ddbMock.reset()
	ddbMock.on(UpdateCommand).resolves({})
	ddbMock.on(PutCommand).resolves({})
})

/**
 * The transition table SPEC, written out literally — the tests must not
 * derive expectations from the code under test.
 */
const SPEC: Record<PowerState, PowerState[]> = {
	SLEEPING: ['WAKING_DB', 'SLEEP_MAINTENANCE', 'ERROR'],
	// STOPPING_DB / DRAINING are "sleep cancels waking" (budget shutoff or
	// operator abort mid-wake) — the ungated emergency cleanup path.
	WAKING_DB: ['WAKING_SERVICES', 'STOPPING_DB', 'ERROR'],
	WAKING_SERVICES: ['AWAKE', 'DRAINING', 'ERROR'],
	AWAKE: ['DRAINING', 'ERROR'],
	DRAINING: ['STOPPING_DB', 'WAKING_SERVICES', 'ERROR'],
	STOPPING_DB: ['SLEEPING', 'ERROR'],
	SLEEP_MAINTENANCE: ['SLEEPING', 'WAKING_SERVICES', 'ERROR'],
	ERROR: ['SLEEPING', 'WAKING_DB'],
}

/** Transitions that begin a wake cycle and must bump the generation. */
const GENERATION_BUMPS = new Set([
	'SLEEPING->WAKING_DB',
	'ERROR->WAKING_DB',
	'DRAINING->WAKING_SERVICES',
	'SLEEP_MAINTENANCE->WAKING_SERVICES',
])

const TRANSITIONAL = new Set<PowerState>([
	'WAKING_DB',
	'WAKING_SERVICES',
	'DRAINING',
	'STOPPING_DB',
	'SLEEP_MAINTENANCE',
])

describe('transition table — exhaustive from x to matrix', () => {
	it('TRANSITIONS matches the written spec exactly', () => {
		expect(TRANSITIONS).toEqual(SPEC)
	})

	for (const from of STATES) {
		for (const to of STATES) {
			const allowed = SPEC[from].includes(to)
			it(`${from} -> ${to}: ${allowed ? 'allowed' : 'rejected locally'}`, async () => {
				const row = makeRow({ state: from })
				const res = await claimTransition(doc, TABLE, {
					row,
					to,
					owner: 'test-owner',
					now: NOW,
					errorMessage: 'test error',
				})
				const calls = ddbMock.commandCalls(UpdateCommand)
				if (!allowed) {
					expect(res).toEqual({
						applied: false,
						reason: 'illegal-transition',
					})
					// Rejected before any DynamoDB write.
					expect(calls).toHaveLength(0)
					return
				}
				expect(res.applied).toBe(true)
				expect(calls).toHaveLength(1)
				const input = calls[0].args[0].input
				// Every claim is fenced on state + version + lease.
				expect(input.ConditionExpression).toContain('#state = :from')
				expect(input.ConditionExpression).toContain('#version = :v')
				expect(input.ConditionExpression).toContain(
					'attribute_not_exists(#lease) OR #lease.expiresAt < :now OR #lease.#owner = :owner',
				)
				expect(input.ExpressionAttributeValues?.[':v']).toBe(row.version)
				expect(input.ExpressionAttributeValues?.[':from']).toBe(from)
				// Generation bumps exactly on wake-cycle starts.
				const bumps = GENERATION_BUMPS.has(`${from}->${to}`)
				expect(
					input.UpdateExpression?.includes('#generation = #generation + :one'),
				).toBe(bumps)
				// Transitional targets carry a lease and a fresh continuation
				// budget; terminal targets drop both.
				if (TRANSITIONAL.has(to)) {
					expect(input.UpdateExpression).toContain('#lease = :lease')
					expect(input.UpdateExpression).toContain('#attempts = :zero')
					expect(input.ExpressionAttributeValues?.[':lease']).toEqual({
						owner: 'test-owner',
						expiresAt: NOW + 2 * 60 * 1000,
					})
				} else {
					expect(input.UpdateExpression).toMatch(/REMOVE .*#lease/)
					expect(input.UpdateExpression).toMatch(/REMOVE .*#attempts/)
				}
				// Entering SLEEPING resets stoppedAt and clears the probe marker.
				if (to === 'SLEEPING') {
					expect(input.UpdateExpression).toContain('#stoppedAt = :now')
					expect(input.UpdateExpression).toMatch(/REMOVE .*#probed/)
				}
				if (to === 'ERROR') {
					expect(input.UpdateExpression).toContain('#lastError = :err')
					expect(input.ExpressionAttributeValues?.[':err']).toBe('test error')
				}
			})
		}
	}
})

describe('double-claim rejection', () => {
	it('the second claimant loses on the conditional write', async () => {
		ddbMock.on(UpdateCommand).resolvesOnce({}).rejectsOnce(conditionFailure())
		const row = makeRow({ state: 'SLEEPING', desiredState: 'AWAKE' })
		const first = await claimTransition(doc, TABLE, {
			row,
			to: 'WAKING_DB',
			owner: 'owner-a',
			now: NOW,
		})
		const second = await claimTransition(doc, TABLE, {
			row,
			to: 'WAKING_DB',
			owner: 'owner-b',
			now: NOW,
		})
		expect(first.applied).toBe(true)
		expect(second).toEqual({ applied: false, reason: 'conflict' })
	})

	it('a claim against an unexpired foreign lease is condition-rejected', async () => {
		ddbMock.on(UpdateCommand).rejects(conditionFailure())
		const row = makeRow({
			state: 'DRAINING',
			lease: { owner: 'other', expiresAt: NOW + 60_000 },
		})
		const res = await claimTransition(doc, TABLE, {
			row,
			to: 'STOPPING_DB',
			owner: 'me',
			now: NOW,
		})
		expect(res).toEqual({ applied: false, reason: 'conflict' })
	})
})

describe('heartbeat', () => {
	it('is fenced on owner AND generation', async () => {
		await heartbeat(doc, TABLE, { owner: 'me', generation: 4, now: NOW })
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.ConditionExpression).toContain('#lease.#owner = :owner')
		expect(input.ConditionExpression).toContain('#generation = :gen')
		expect(input.ExpressionAttributeValues?.[':gen']).toBe(4)
	})

	it('rejects a stale-generation heartbeat', async () => {
		ddbMock.on(UpdateCommand).rejects(conditionFailure())
		const res = await heartbeat(doc, TABLE, {
			owner: 'me',
			generation: 3, // superseded by a newer wake cycle
			now: NOW,
		})
		expect(res).toEqual({ applied: false, reason: 'stale' })
	})
})

describe('lease expiry takeover', () => {
	it('takeover is conditioned on the lease being expired or missing', async () => {
		const row = makeRow({
			state: 'WAKING_DB',
			lease: { owner: 'dead-invocation', expiresAt: NOW - 1 },
		})
		const res = await takeoverLease(doc, TABLE, row, 'me', NOW)
		expect(res.applied).toBe(true)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.ConditionExpression).toContain(
			'attribute_not_exists(#lease) OR #lease.expiresAt < :now',
		)
		expect(input.ConditionExpression).toContain('#state = :state')
		expect(input.ConditionExpression).toContain('#version = :v')
		expect(input.ExpressionAttributeValues?.[':lease']).toEqual({
			owner: 'me',
			expiresAt: NOW + 2 * 60 * 1000,
		})
	})

	it('an active lease defeats the takeover', async () => {
		ddbMock.on(UpdateCommand).rejects(conditionFailure())
		const row = makeRow({
			state: 'WAKING_DB',
			lease: { owner: 'alive', expiresAt: NOW + 60_000 },
		})
		const res = await takeoverLease(doc, TABLE, row, 'me', NOW)
		expect(res).toEqual({ applied: false, reason: 'conflict' })
	})
})

describe('wake cancels draining', () => {
	it('DRAINING -> WAKING_SERVICES is legal and starts a new generation', async () => {
		const row = makeRow({ state: 'DRAINING', desiredState: 'AWAKE' })
		const res = await claimTransition(doc, TABLE, {
			row,
			to: 'WAKING_SERVICES',
			owner: 'me',
			now: NOW,
		})
		expect(res.applied).toBe(true)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.UpdateExpression).toContain('#generation = #generation + :one')
	})

	it('DRAINING can never jump straight to AWAKE', async () => {
		const row = makeRow({ state: 'DRAINING', desiredState: 'AWAKE' })
		const res = await claimTransition(doc, TABLE, {
			row,
			to: 'AWAKE',
			owner: 'me',
			now: NOW,
		})
		expect(res).toEqual({ applied: false, reason: 'illegal-transition' })
	})

	it('requestWake bumps version so an in-flight drain claim loses its fence', async () => {
		await requestWake(doc, TABLE, NOW)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.UpdateExpression).toContain('#version = #version + :one')
		expect(input.ConditionExpression).toContain('#desired <> :awake')
	})
})

describe('idle rule (evaluated by the 30-minute cron)', () => {
	const awakeRow = (web: number | undefined, device: number | undefined) =>
		makeRow({
			state: 'AWAKE',
			desiredState: 'AWAKE',
			lastWebAt: web,
			lastRealDeviceOnlineAt: device,
		})

	it('idle only when BOTH signals are older than 8h', () => {
		const old = NOW - IDLE_AFTER_MS - 1
		const fresh = NOW - IDLE_AFTER_MS // exactly 8h is NOT yet idle
		expect(isIdle(awakeRow(old, old), NOW)).toBe(true)
		expect(isIdle(awakeRow(fresh, old), NOW)).toBe(false)
		expect(isIdle(awakeRow(old, fresh), NOW)).toBe(false)
		expect(isIdle(awakeRow(fresh, fresh), NOW)).toBe(false)
	})

	it('a signal that never fired counts as idle', () => {
		const old = NOW - IDLE_AFTER_MS - 1
		expect(isIdle(awakeRow(undefined, old), NOW)).toBe(true)
		expect(isIdle(awakeRow(old, undefined), NOW)).toBe(true)
		expect(isIdle(awakeRow(undefined, undefined), NOW)).toBe(true)
	})

	it('requestSleep pins state, desired, version and the exact timestamps read', async () => {
		const row = awakeRow(NOW - IDLE_AFTER_MS - 5, NOW - IDLE_AFTER_MS - 9)
		await requestSleep(doc, TABLE, row, NOW)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.ConditionExpression).toContain('#state = :awakeState')
		expect(input.ConditionExpression).toContain('#desired = :awake')
		expect(input.ConditionExpression).toContain('#version = :v')
		expect(input.ConditionExpression).toContain('#web = :seenWeb')
		expect(input.ConditionExpression).toContain('#device = :seenDevice')
		expect(input.ExpressionAttributeValues?.[':seenWeb']).toBe(row.lastWebAt)
		expect(input.ExpressionAttributeValues?.[':seenDevice']).toBe(
			row.lastRealDeviceOnlineAt,
		)
	})

	it('requestSleep pins missing timestamps as attribute_not_exists', async () => {
		const row = awakeRow(undefined, undefined)
		await requestSleep(doc, TABLE, row, NOW)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.ConditionExpression).toContain('attribute_not_exists(#web)')
		expect(input.ConditionExpression).toContain('attribute_not_exists(#device)')
	})

	it('a concurrent activity stamp defeats the sleep decision', async () => {
		ddbMock.on(UpdateCommand).rejects(conditionFailure())
		const row = awakeRow(NOW - IDLE_AFTER_MS - 5, NOW - IDLE_AFTER_MS - 9)
		const res = await requestSleep(doc, TABLE, row, NOW)
		expect(res).toEqual({ applied: false, reason: 'conflict' })
	})
})

describe('7-day maintenance window math', () => {
	it('6d18h in milliseconds', () => {
		expect(MAINTENANCE_AFTER_MS).toBe(583_200_000)
	})

	it('due exactly at stoppedAt + 6d18h, not a millisecond sooner', () => {
		const stoppedAt = NOW - MAINTENANCE_AFTER_MS
		expect(
			maintenanceDue(
				makeRow({ state: 'SLEEPING', stoppedAt: stoppedAt + 1 }),
				NOW,
			),
		).toBe(false)
		expect(maintenanceDue(makeRow({ state: 'SLEEPING', stoppedAt }), NOW)).toBe(
			true,
		)
	})

	it('only meaningful while SLEEPING with a recorded stop', () => {
		const stoppedAt = NOW - MAINTENANCE_AFTER_MS - 1
		expect(maintenanceDue(makeRow({ state: 'AWAKE', stoppedAt }), NOW)).toBe(
			false,
		)
		expect(
			maintenanceDue(makeRow({ state: 'SLEEPING', stoppedAt: undefined }), NOW),
		).toBe(false)
	})

	it('markMaintenanceProbed is fenced on state, version and lease owner', async () => {
		const row = makeRow({
			state: 'SLEEP_MAINTENANCE',
			lease: { owner: 'me', expiresAt: NOW + 60_000 },
		})
		await markMaintenanceProbed(doc, TABLE, row, 'me', NOW)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.ConditionExpression).toContain('#state = :maintenance')
		expect(input.ConditionExpression).toContain('#lease.#owner = :owner')
		expect(input.ConditionExpression).toContain('#version = :v')
	})
})

describe('activity stamps', () => {
	it('web stamps are throttled to one write per 5 minutes via the condition', async () => {
		await stampWebActivity(doc, TABLE, NOW)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.ConditionExpression).toContain(
			'attribute_not_exists(#web) OR #web <= :cutoff',
		)
		expect(input.ExpressionAttributeValues?.[':cutoff']).toBe(
			NOW - WEB_STAMP_THROTTLE_MS,
		)
		// Stamps are data, not control: they never bump the version.
		expect(input.UpdateExpression).not.toContain('#version')
	})

	it('a throttled web stamp reports throttled', async () => {
		ddbMock.on(UpdateCommand).rejects(conditionFailure())
		const res = await stampWebActivity(doc, TABLE, NOW)
		expect(res).toEqual({ applied: false, reason: 'throttled' })
	})

	it('device stamp stores the timestamp verbatim — sim exclusion is the worker responsibility', async () => {
		await stampRealDeviceOnline(doc, TABLE, NOW)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		// The library has no notion of devices, simulated or otherwise: it
		// writes exactly one timestamp field. The worker must only call this
		// for non-simulated devices.
		expect(input.UpdateExpression).toBe('SET #device = :now, #updatedAt = :now')
		expect(input.ConditionExpression).toContain(
			'attribute_not_exists(#device) OR #device < :now',
		)
	})
})

describe('component readiness', () => {
	it('marking ready is fenced on the generation', async () => {
		await markComponentReady(doc, TABLE, {
			component: 'zero-cache',
			generation: 5,
			now: NOW,
		})
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.ConditionExpression).toContain('#generation = :gen')
		expect(input.ExpressionAttributeNames?.['#c']).toBe('zero-cache')
	})

	it('a report for a superseded generation is rejected as stale', async () => {
		ddbMock.on(UpdateCommand).rejects(conditionFailure())
		const res = await markComponentReady(doc, TABLE, {
			component: 'sync-worker',
			generation: 4,
			now: NOW,
		})
		expect(res).toEqual({ applied: false, reason: 'stale' })
	})

	it('allComponentsReady demands every component at the CURRENT generation', () => {
		const row = makeRow({
			generation: 3,
			componentReady: { 'zero-cache': 3, 'sync-worker': 2 },
		})
		expect(allComponentsReady(row, COMPONENTS)).toBe(false)
		row.componentReady['sync-worker'] = 3
		expect(allComponentsReady(row, COMPONENTS)).toBe(true)
	})
})

describe('seeding', () => {
	it('creates the row only if absent', async () => {
		const res = await seedRow(doc, TABLE, NOW)
		expect(res.applied).toBe(true)
		const input = ddbMock.commandCalls(PutCommand)[0].args[0].input
		expect(input.ConditionExpression).toBe('attribute_not_exists(#pk)')
	})

	it('reports exists when the row is already there', async () => {
		ddbMock.on(PutCommand).rejects(conditionFailure())
		const res = await seedRow(doc, TABLE, NOW)
		expect(res).toEqual({ applied: false, reason: 'exists' })
	})
})

describe('lease transfer (reinvoke handoff)', () => {
	it('is fenced on the CURRENT owner and counts as a continuation', async () => {
		await transferLease(doc, TABLE, {
			fromOwner: 'wake:first',
			toOwner: 'wake:successor',
			now: NOW,
		})
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.ConditionExpression).toBe(
			'attribute_exists(#lease) AND #lease.#owner = :from',
		)
		expect(input.ExpressionAttributeValues?.[':from']).toBe('wake:first')
		expect(input.ExpressionAttributeValues?.[':lease']).toEqual({
			owner: 'wake:successor',
			expiresAt: NOW + 2 * 60 * 1000,
		})
		expect(input.UpdateExpression).toContain(
			'#attempts = if_not_exists(#attempts, :zero) + :one',
		)
	})

	it('rejects when the lease moved on', async () => {
		ddbMock.on(UpdateCommand).rejects(conditionFailure())
		const res = await transferLease(doc, TABLE, {
			fromOwner: 'wake:stale',
			toOwner: 'wake:successor',
			now: NOW,
		})
		expect(res).toEqual({ applied: false, reason: 'conflict' })
	})

	it('takeover also counts as a continuation', async () => {
		const row = makeRow({
			state: 'WAKING_DB',
			lease: { owner: 'dead', expiresAt: NOW - 1 },
		})
		await takeoverLease(doc, TABLE, row, 'me', NOW)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.UpdateExpression).toContain(
			'#attempts = if_not_exists(#attempts, :zero) + :one',
		)
	})
})

describe('budget wind-down (forceSleep)', () => {
	it('forces desiredState=SLEEPING regardless of activity, version-bumped', async () => {
		await forceSleep(doc, TABLE, NOW)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.ConditionExpression).toBe(
			'attribute_exists(#pk) AND #desired <> :sleeping',
		)
		expect(input.UpdateExpression).toContain('#desired = :sleeping')
		expect(input.UpdateExpression).toContain('#version = #version + :one')
	})

	it('no-ops when already desired sleeping', async () => {
		ddbMock.on(UpdateCommand).rejects(conditionFailure())
		const res = await forceSleep(doc, TABLE, NOW)
		expect(res).toEqual({ applied: false, reason: 'already-desired' })
	})
})

describe('keep-warm hold', () => {
	it('defers the idle rule while unexpired, and only then', () => {
		const old = NOW - IDLE_AFTER_MS - 1
		const idleRow = makeRow({
			state: 'AWAKE',
			lastWebAt: old,
			lastRealDeviceOnlineAt: old,
		})
		expect(isIdle(idleRow, NOW)).toBe(true)
		idleRow.keepWarmUntil = NOW + 1
		expect(isIdle(idleRow, NOW)).toBe(false)
		idleRow.keepWarmUntil = NOW // expired exactly now
		expect(isIdle(idleRow, NOW)).toBe(true)
	})

	it('caps the hold at 24h', async () => {
		const res = await holdWarm(doc, TABLE, NOW, 72)
		expect(res.applied).toBe(true)
		expect(res.until).toBe(NOW + MAX_HOLD_MS)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.ExpressionAttributeValues?.[':until']).toBe(NOW + MAX_HOLD_MS)
	})

	it('never shortens an existing longer hold (condition rejects)', async () => {
		const first = await holdWarm(doc, TABLE, NOW, 2)
		expect(first.applied).toBe(true)
		expect(first.applied && first.until).toBe(NOW + 2 * 60 * 60 * 1000)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.ConditionExpression).toBe(
			'attribute_exists(#pk) AND (attribute_not_exists(#hold) OR #hold < :until)',
		)
		ddbMock.on(UpdateCommand).rejects(conditionFailure())
		const shorter = await holdWarm(doc, TABLE, NOW, 1)
		expect(shorter).toEqual({ applied: false, reason: 'stale' })
	})

	it('release removes the hold conditionally', async () => {
		await releaseHold(doc, TABLE, NOW)
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.UpdateExpression).toBe('REMOVE #hold SET #updatedAt = :now')
		expect(input.ConditionExpression).toBe(
			'attribute_exists(#pk) AND attribute_exists(#hold)',
		)
	})
})

describe('worker heartbeat (single generation-fenced write)', () => {
	it('marks the worker ready and stamps device activity in ONE write', async () => {
		await workerHeartbeat(doc, TABLE, {
			generation: 4,
			now: NOW,
			realDeviceOnline: true,
		})
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.UpdateExpression).toBe(
			'SET #ready.#c = :gen, #updatedAt = :now, #device = :now',
		)
		expect(input.ConditionExpression).toBe(
			'attribute_exists(#pk) AND #generation = :gen',
		)
		expect(input.ExpressionAttributeNames?.['#c']).toBe('sync-worker')
	})

	it('omits the device stamp when no real device is online (sim exclusion is the caller check)', async () => {
		await workerHeartbeat(doc, TABLE, {
			generation: 4,
			now: NOW,
			realDeviceOnline: false,
		})
		const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
		expect(input.UpdateExpression).toBe(
			'SET #ready.#c = :gen, #updatedAt = :now',
		)
		expect(input.ExpressionAttributeNames?.['#device']).toBeUndefined()
	})

	it('a superseded-generation worker can neither mark ready nor resurrect activity', async () => {
		ddbMock.on(UpdateCommand).rejects(conditionFailure())
		const res = await workerHeartbeat(doc, TABLE, {
			generation: 3,
			now: NOW,
			realDeviceOnline: true,
		})
		expect(res).toEqual({ applied: false, reason: 'stale' })
	})
})
