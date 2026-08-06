import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { stampWorkerCycle } = vi.hoisted(() => ({
	stampWorkerCycle: vi.fn(
		async (_args: unknown) => 'applied' as 'applied' | 'condition-failed',
	),
}))

vi.mock('./power-row', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./power-row')>()
	return { ...actual, stampWorkerCycle }
})

import {
	__resetWorkerPowerWarningsForTests,
	powerGeneration,
	stampWorkerCyclePower,
} from './worker'

beforeEach(() => {
	stampWorkerCycle.mockClear()
	stampWorkerCycle.mockResolvedValue('applied')
	__resetWorkerPowerWarningsForTests()
})

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('powerGeneration', () => {
	it('is null when unset or blank', () => {
		expect(powerGeneration({})).toBeNull()
		expect(powerGeneration({ POWER_GENERATION: ' ' })).toBeNull()
	})

	it('parses numeric generations', () => {
		expect(powerGeneration({ POWER_GENERATION: '7' })).toBe(7)
		expect(powerGeneration({ POWER_GENERATION: '0' })).toBe(0)
	})

	it('rejects non-numeric values', () => {
		expect(powerGeneration({ POWER_GENERATION: 'gen-7' })).toBeNull()
	})
})

describe('stampWorkerCyclePower', () => {
	it('no-ops when POWER_TABLE is unset', async () => {
		vi.stubEnv('POWER_TABLE', '')
		await expect(
			stampWorkerCyclePower({ realDeviceOnline: true }),
		).resolves.toBe(false)
		expect(stampWorkerCycle).not.toHaveBeenCalled()
	})

	it('skips ALL power writes (warn) when POWER_TABLE is set but POWER_GENERATION is missing', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '')
		await expect(
			stampWorkerCyclePower({ realDeviceOnline: true }),
		).resolves.toBe(false)
		expect(stampWorkerCycle).not.toHaveBeenCalled()
	})

	it('issues ONE generation-fenced update per cycle', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '3')
		await expect(
			stampWorkerCyclePower({ realDeviceOnline: true }),
		).resolves.toBe(true)
		expect(stampWorkerCycle).toHaveBeenCalledTimes(1)
		expect(stampWorkerCycle).toHaveBeenCalledWith({
			generation: 3,
			realDeviceOnline: true,
		})
	})

	it('passes realDeviceOnline=false through (heartbeat only)', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '5')
		await stampWorkerCyclePower({ realDeviceOnline: false })
		expect(stampWorkerCycle).toHaveBeenCalledWith({
			generation: 5,
			realDeviceOnline: false,
		})
	})

	it('reports false when the generation fence is lost', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '2')
		stampWorkerCycle.mockResolvedValueOnce('condition-failed')
		await expect(
			stampWorkerCyclePower({ realDeviceOnline: false }),
		).resolves.toBe(false)
	})
})
