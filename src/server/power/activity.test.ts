import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const updateItem = vi.fn(async (_input: unknown) => ({}))
const getItem = vi.fn(async (_input: unknown) => ({ Item: undefined }))

vi.mock('@aws-sdk/client-dynamodb', () => ({
	DynamoDB: vi.fn(() => ({ updateItem, getItem })),
}))

import {
	ACTIVITY_STAMP_INTERVAL_MS,
	__resetActivityThrottleForTests,
	stampWebActivity,
} from './activity'
import { __resetPowerClientForTests, powerConfig } from './power-row'

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-08-06T12:00:00Z'))
	__resetActivityThrottleForTests()
	__resetPowerClientForTests()
	updateItem.mockClear()
	updateItem.mockResolvedValue({})
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllEnvs()
})

describe('powerConfig', () => {
	it('is null when POWER_TABLE is unset', () => {
		expect(powerConfig({})).toBeNull()
	})

	it('reads table, region and row key with defaults', () => {
		expect(
			powerConfig({ POWER_TABLE: 'pitminder-power', AWS_REGION: 'eu-west-2' }),
		).toEqual({
			table: 'pitminder-power',
			region: 'eu-west-2',
			rowKey: 'POWER#prod',
		})
	})

	it('prefers POWER_TABLE_REGION and POWER_ROW_KEY overrides', () => {
		expect(
			powerConfig({
				POWER_TABLE: 't',
				POWER_TABLE_REGION: 'eu-west-1',
				AWS_REGION: 'us-east-1',
				POWER_ROW_KEY: 'POWER#staging',
			}),
		).toEqual({ table: 't', region: 'eu-west-1', rowKey: 'POWER#staging' })
	})
})

describe('stampWebActivity', () => {
	it('no-ops without POWER_TABLE', async () => {
		vi.stubEnv('POWER_TABLE', '')
		await stampWebActivity('user-1')
		expect(updateItem).not.toHaveBeenCalled()
	})

	it('writes lastWebAt to the power row when configured', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		await stampWebActivity('user-1')
		expect(updateItem).toHaveBeenCalledTimes(1)
		const input = updateItem.mock.calls[0][0] as unknown as {
			TableName: string
			Key: { pk: { S: string } }
			ConditionExpression: string
			ExpressionAttributeValues: Record<string, { S: string }>
		}
		expect(input.TableName).toBe('pitminder-power')
		expect(input.Key.pk.S).toBe('POWER#prod')
		expect(input.ConditionExpression).toBe('attribute_exists(pk)')
		const values = Object.values(input.ExpressionAttributeValues).map(
			(v) => v.S,
		)
		expect(values).toContain('2026-08-06T12:00:00.000Z')
		expect(values).toContain('user-1')
	})

	it('throttles to one write per 5 minutes per process', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		await stampWebActivity('user-1')
		await stampWebActivity('user-2')
		expect(updateItem).toHaveBeenCalledTimes(1)

		vi.advanceTimersByTime(ACTIVITY_STAMP_INTERVAL_MS + 1)
		await stampWebActivity('user-2')
		expect(updateItem).toHaveBeenCalledTimes(2)
	})

	it('retries on the next call after a failed write', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		updateItem.mockRejectedValueOnce(new Error('dynamo down'))
		await expect(stampWebActivity('user-1')).resolves.toBeUndefined()
		await stampWebActivity('user-1')
		expect(updateItem).toHaveBeenCalledTimes(2)
	})

	it('skips (condition failed) when the orchestrator has not created the row', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		const conditionError = new Error('no row')
		conditionError.name = 'ConditionalCheckFailedException'
		updateItem.mockRejectedValueOnce(conditionError)
		await expect(stampWebActivity('user-1')).resolves.toBeUndefined()
	})
})
