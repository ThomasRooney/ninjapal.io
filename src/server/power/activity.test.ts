import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { stampWebActivityRow } = vi.hoisted(() => ({
	stampWebActivityRow: vi.fn(
		async (_nowMs?: number) =>
			'applied' as 'applied' | 'condition-failed' | 'error',
	),
}))

vi.mock('./power-row', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./power-row')>()
	return { ...actual, stampWebActivityRow }
})

import {
	ACTIVITY_STAMP_INTERVAL_MS,
	__resetActivityThrottleForTests,
	stampWebActivity,
} from './activity'

beforeEach(() => {
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-08-06T12:00:00Z'))
	__resetActivityThrottleForTests()
	stampWebActivityRow.mockClear()
	stampWebActivityRow.mockResolvedValue('applied')
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllEnvs()
})

describe('stampWebActivity', () => {
	it('no-ops without POWER_TABLE', async () => {
		vi.stubEnv('POWER_TABLE', '')
		await stampWebActivity('user-1')
		expect(stampWebActivityRow).not.toHaveBeenCalled()
	})

	it('stamps with the current epoch-ms time when configured', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		await stampWebActivity('user-1')
		expect(stampWebActivityRow).toHaveBeenCalledTimes(1)
		expect(stampWebActivityRow).toHaveBeenCalledWith(
			Date.parse('2026-08-06T12:00:00Z'),
		)
	})

	it('saves DDB round-trips: one write per 5 minutes per process', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		await stampWebActivity('user-1')
		await stampWebActivity('user-2')
		expect(stampWebActivityRow).toHaveBeenCalledTimes(1)

		vi.advanceTimersByTime(ACTIVITY_STAMP_INTERVAL_MS + 1)
		await stampWebActivity('user-2')
		expect(stampWebActivityRow).toHaveBeenCalledTimes(2)
	})

	it('retries on the next call after a hard write error', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		stampWebActivityRow.mockResolvedValueOnce('error')
		await expect(stampWebActivity('user-1')).resolves.toBeUndefined()
		await stampWebActivity('user-1')
		expect(stampWebActivityRow).toHaveBeenCalledTimes(2)
	})

	it("keeps the window on 'condition-failed' (another process already stamped)", async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		stampWebActivityRow.mockResolvedValueOnce('condition-failed')
		await stampWebActivity('user-1')
		await stampWebActivity('user-1')
		expect(stampWebActivityRow).toHaveBeenCalledTimes(1)
	})
})
