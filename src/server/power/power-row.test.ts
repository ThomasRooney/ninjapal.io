import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { send } = vi.hoisted(() => ({
	send: vi.fn(
		async (_command: unknown): Promise<{ Item?: Record<string, unknown> }> => ({
			Item: undefined,
		}),
	),
}))

vi.mock('@aws-sdk/client-dynamodb', () => ({
	DynamoDBClient: vi.fn(() => ({})),
}))

vi.mock('@aws-sdk/lib-dynamodb', () => {
	class FakeCommand {
		constructor(public input: Record<string, unknown>) {}
	}
	return {
		DynamoDBDocumentClient: { from: vi.fn(() => ({ send })) },
		GetCommand: class GetCommand extends FakeCommand {},
		UpdateCommand: class UpdateCommand extends FakeCommand {},
	}
})

import {
	WEB_STAMP_THROTTLE_MS,
	__resetPowerClientForTests,
	powerConfig,
	readPowerRow,
	requestWake,
	stampWebActivityRow,
	stampWorkerCycle,
} from './power-row'

function lastUpdateInput(): {
	UpdateExpression: string
	ConditionExpression: string
	ExpressionAttributeNames: Record<string, string>
	ExpressionAttributeValues: Record<string, unknown>
	Key: Record<string, unknown>
	TableName: string
} {
	const call = send.mock.calls.at(-1)?.[0] as {
		input: ReturnType<typeof lastUpdateInput>
	}
	return call.input
}

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-08-06T12:00:00Z'))
	__resetPowerClientForTests()
	send.mockClear()
	send.mockResolvedValue({ Item: undefined })
	vi.stubEnv('POWER_TABLE', 'pitminder-power')
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllEnvs()
})

const NOW = Date.parse('2026-08-06T12:00:00Z')

describe('powerConfig', () => {
	it('is null when POWER_TABLE is unset', () => {
		expect(powerConfig({})).toBeNull()
	})

	it('reads table, region and canonical row key', () => {
		expect(
			powerConfig({ POWER_TABLE: 'pitminder-power', AWS_REGION: 'eu-west-2' }),
		).toEqual({
			table: 'pitminder-power',
			region: 'eu-west-2',
			rowKey: 'POWER#prod',
		})
	})
})

describe('stampWebActivityRow', () => {
	it('writes epoch-NUMBER timestamps with the canonical throttle condition', async () => {
		await expect(stampWebActivityRow(NOW)).resolves.toBe('applied')
		const input = lastUpdateInput()
		expect(input.Key).toEqual({ pk: 'POWER#prod' })
		// Byte-identical to CONTRACT.md writer #1.
		expect(input.UpdateExpression).toBe('SET #web = :now, #updatedAt = :now')
		expect(input.ConditionExpression).toBe(
			'attribute_exists(#pk) AND (attribute_not_exists(#web) OR #web <= :cutoff)',
		)
		// Epoch numbers, never ISO strings — strings would corrupt the row.
		expect(input.ExpressionAttributeValues[':now']).toBe(NOW)
		expect(input.ExpressionAttributeValues[':cutoff']).toBe(
			NOW - WEB_STAMP_THROTTLE_MS,
		)
		for (const value of Object.values(input.ExpressionAttributeValues)) {
			expect(typeof value).toBe('number')
		}
	})

	it('reports condition-failed when the throttle window is open', async () => {
		const err = new Error('cond')
		err.name = 'ConditionalCheckFailedException'
		send.mockRejectedValueOnce(err)
		await expect(stampWebActivityRow(NOW)).resolves.toBe('condition-failed')
	})
})

describe('requestWake', () => {
	it('flips desiredState, stamps lastWebAt and bumps version', async () => {
		await expect(requestWake('user-1')).resolves.toBe(true)
		const input = lastUpdateInput()
		// Byte-identical to CONTRACT.md writer #2 (version bump REQUIRED).
		expect(input.UpdateExpression).toBe(
			'SET #desired = :awake, #web = :now, #version = #version + :one, #updatedAt = :now',
		)
		expect(input.ConditionExpression).toBe(
			'attribute_exists(#pk) AND #desired <> :awake',
		)
		expect(input.ExpressionAttributeValues[':now']).toBe(NOW)
		expect(input.ExpressionAttributeValues[':awake']).toBe('AWAKE')
	})

	it('already-desired (condition failure) falls back to the activity stamp — contract writer #1', async () => {
		const err = new Error('cond')
		err.name = 'ConditionalCheckFailedException'
		send.mockRejectedValueOnce(err)
		await expect(requestWake('user-1')).resolves.toBe(true)
		// Second write is the web-activity stamp fallback.
		expect(send).toHaveBeenCalledTimes(2)
		const fallback = lastUpdateInput()
		expect(fallback.UpdateExpression).toBe('SET #web = :now, #updatedAt = :now')
	})

	it('is false when unconfigured or on a hard error', async () => {
		vi.stubEnv('POWER_TABLE', '')
		await expect(requestWake('user-1')).resolves.toBe(false)
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		send.mockRejectedValueOnce(new Error('dynamo down'))
		await expect(requestWake('user-1')).resolves.toBe(false)
	})
})

describe('stampWorkerCycle', () => {
	it('reports componentReady[sync-worker] in ONE generation-fenced update (contract writer #3)', async () => {
		await expect(
			stampWorkerCycle({ generation: 4, realDeviceOnline: false }),
		).resolves.toBe('applied')
		expect(send).toHaveBeenCalledTimes(1)
		const input = lastUpdateInput()
		// Byte-identical to CONTRACT.md writer #3.
		expect(input.UpdateExpression).toBe(
			'SET #ready.#c = :gen, #updatedAt = :now',
		)
		expect(input.ConditionExpression).toBe(
			'attribute_exists(#pk) AND #generation = :gen',
		)
		expect(input.ExpressionAttributeNames['#ready']).toBe('componentReady')
		expect(input.ExpressionAttributeNames['#c']).toBe('sync-worker')
		expect(input.ExpressionAttributeValues[':gen']).toBe(4)
		expect(input.ExpressionAttributeValues[':now']).toBe(NOW)
	})

	it('folds lastRealDeviceOnlineAt into the same fenced update when a real device is online', async () => {
		await stampWorkerCycle({ generation: 4, realDeviceOnline: true })
		expect(send).toHaveBeenCalledTimes(1)
		const input = lastUpdateInput()
		expect(input.UpdateExpression).toBe(
			'SET #ready.#c = :gen, #updatedAt = :now, #device = :now',
		)
		expect(input.ConditionExpression).toBe(
			'attribute_exists(#pk) AND #generation = :gen',
		)
		expect(input.ExpressionAttributeNames['#device']).toBe(
			'lastRealDeviceOnlineAt',
		)
	})

	it('reports condition-failed on a stale generation', async () => {
		const err = new Error('cond')
		err.name = 'ConditionalCheckFailedException'
		send.mockRejectedValueOnce(err)
		await expect(
			stampWorkerCycle({ generation: 1, realDeviceOnline: false }),
		).resolves.toBe('condition-failed')
	})
})

describe('readPowerRow', () => {
	it('returns null when the row is absent', async () => {
		await expect(readPowerRow()).resolves.toBeNull()
	})

	it('passes canonical numeric fields through (incl. keepWarmUntil)', async () => {
		send.mockResolvedValueOnce({
			Item: {
				pk: 'POWER#prod',
				state: 'WAKING_DB',
				desiredState: 'AWAKE',
				version: 12,
				generation: 3,
				lastWebAt: NOW - 1000,
				keepWarmUntil: NOW + 60_000,
			},
		})
		const row = await readPowerRow()
		expect(row).toMatchObject({
			state: 'WAKING_DB',
			desiredState: 'AWAKE',
			version: 12,
			generation: 3,
			lastWebAt: NOW - 1000,
			keepWarmUntil: NOW + 60_000,
		})
	})
})
