import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { updatePowerAttributes } = vi.hoisted(() => ({
	updatePowerAttributes: vi.fn(async (_attrs: unknown) => true),
}))

vi.mock('./power-row', () => ({ updatePowerAttributes }))

import {
	powerGeneration,
	stampRealDeviceOnline,
	writeWorkerHeartbeat,
} from './worker'

beforeEach(() => {
	updatePowerAttributes.mockClear()
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

describe('stampRealDeviceOnline', () => {
	it('writes lastRealDeviceOnlineAt without a generation when unset', async () => {
		vi.stubEnv('POWER_GENERATION', '')
		await stampRealDeviceOnline()
		const attrs = updatePowerAttributes.mock.calls[0][0] as Record<
			string,
			{ S?: string; N?: string }
		>
		expect(Object.keys(attrs)).toEqual(['lastRealDeviceOnlineAt'])
		expect(attrs.lastRealDeviceOnlineAt.S).toMatch(/^\d{4}-\d{2}-\d{2}T/)
	})

	it('includes the generation when POWER_GENERATION is set', async () => {
		vi.stubEnv('POWER_GENERATION', '3')
		await stampRealDeviceOnline()
		const attrs = updatePowerAttributes.mock.calls[0][0] as Record<
			string,
			{ S?: string; N?: string }
		>
		expect(attrs.lastRealDeviceOnlineGeneration).toEqual({ N: '3' })
	})
})

describe('writeWorkerHeartbeat', () => {
	it('stamps workerHeartbeatAt with the generation when set', async () => {
		vi.stubEnv('POWER_GENERATION', '5')
		await writeWorkerHeartbeat()
		const attrs = updatePowerAttributes.mock.calls[0][0] as Record<
			string,
			{ S?: string; N?: string }
		>
		expect(attrs.workerHeartbeatAt.S).toMatch(/^\d{4}-\d{2}-\d{2}T/)
		expect(attrs.workerGeneration).toEqual({ N: '5' })
	})

	it('omits the generation when unset', async () => {
		vi.stubEnv('POWER_GENERATION', '')
		await writeWorkerHeartbeat()
		const attrs = updatePowerAttributes.mock.calls[0][0] as Record<
			string,
			unknown
		>
		expect(Object.keys(attrs)).toEqual(['workerHeartbeatAt'])
	})
})
