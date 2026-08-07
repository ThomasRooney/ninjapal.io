import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { stampWorkerCycle, readPowerRow } = vi.hoisted(() => ({
	stampWorkerCycle: vi.fn(
		async (_args: unknown) =>
			'applied' as 'applied' | 'condition-failed' | 'unconfigured' | 'error',
	),
	readPowerRow: vi.fn(
		async (): Promise<{ generation: number | null } | null> => ({
			generation: 3,
		}),
	),
}))

vi.mock('./power-row', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./power-row')>()
	return { ...actual, stampWorkerCycle, readPowerRow }
})

import {
	powerGeneration,
	proveWorkerGeneration,
	stampWorkerCyclePower,
} from './worker'

beforeEach(() => {
	stampWorkerCycle.mockClear()
	stampWorkerCycle.mockResolvedValue('applied')
	readPowerRow.mockClear()
	readPowerRow.mockResolvedValue({ generation: 3 })
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

describe('proveWorkerGeneration (pre-cycle, fail-closed)', () => {
	it('unconfigured without POWER_TABLE — fencing not in play', async () => {
		vi.stubEnv('POWER_TABLE', '')
		await expect(proveWorkerGeneration()).resolves.toBe('unconfigured')
		expect(readPowerRow).not.toHaveBeenCalled()
	})

	it('ok when the row generation matches ours', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '3')
		await expect(proveWorkerGeneration()).resolves.toBe('ok')
	})

	it('stale when a newer wake superseded us — caller must drain and exit', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '2')
		readPowerRow.mockResolvedValueOnce({ generation: 3 })
		await expect(proveWorkerGeneration()).resolves.toBe('stale')
	})

	it('stale when POWER_TABLE is set but no generation exists (unprovable)', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '')
		await expect(proveWorkerGeneration()).resolves.toBe('stale')
		expect(readPowerRow).not.toHaveBeenCalled()
	})

	it('unavailable on a transient row-read failure — skip the cycle, never fake ok', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '3')
		readPowerRow.mockResolvedValueOnce(null)
		await expect(proveWorkerGeneration()).resolves.toBe('unavailable')
		readPowerRow.mockResolvedValueOnce({ generation: null })
		await expect(proveWorkerGeneration()).resolves.toBe('unavailable')
	})
})

describe('stampWorkerCyclePower', () => {
	it('skipped when POWER_TABLE is unset', async () => {
		vi.stubEnv('POWER_TABLE', '')
		await expect(
			stampWorkerCyclePower({ realDeviceOnline: true }),
		).resolves.toBe('skipped')
		expect(stampWorkerCycle).not.toHaveBeenCalled()
	})

	it('skipped (loud) when POWER_TABLE is set but POWER_GENERATION is missing', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '')
		await expect(
			stampWorkerCyclePower({ realDeviceOnline: true }),
		).resolves.toBe('skipped')
		expect(stampWorkerCycle).not.toHaveBeenCalled()
	})

	it('issues ONE generation-fenced update per cycle', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '3')
		await expect(
			stampWorkerCyclePower({ realDeviceOnline: true }),
		).resolves.toBe('applied')
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

	it('fence-lost when the generation fence is lost — caller must drain and exit', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '2')
		stampWorkerCycle.mockResolvedValueOnce('condition-failed')
		await expect(
			stampWorkerCyclePower({ realDeviceOnline: false }),
		).resolves.toBe('fence-lost')
	})

	it('error on a transient write failure — retried next cycle', async () => {
		vi.stubEnv('POWER_TABLE', 'pitminder-power')
		vi.stubEnv('POWER_GENERATION', '2')
		stampWorkerCycle.mockResolvedValueOnce('error')
		await expect(
			stampWorkerCyclePower({ realDeviceOnline: false }),
		).resolves.toBe('error')
	})
})
