import { describe, expect, it, vi } from 'vitest'
import type { DirectorToolHandlers } from '../src/server/control/pit-director'
import {
	MAX_ITERATIONS,
	runDirectorLoop,
} from '../src/server/control/pit-director'

type FakeBlock =
	| { type: 'text'; text: string }
	| { type: 'tool_use'; id: string; name: string; input: unknown }

function fakeResponse(blocks: FakeBlock[], stopReason = 'end_turn') {
	return {
		content: blocks,
		stop_reason: blocks.some((b) => b.type === 'tool_use')
			? 'tool_use'
			: stopReason,
	}
}

/** Anthropic client stub: returns the scripted responses in order. */
function fakeClient(responses: ReturnType<typeof fakeResponse>[]) {
	let call = 0
	const create = vi.fn(async (_req: { messages: unknown[] }) => {
		const r = responses[Math.min(call, responses.length - 1)]
		call++
		return r
	})
	return { client: { messages: { create } } as never, create }
}

function stubHandlers(
	overrides: Partial<DirectorToolHandlers> = {},
): DirectorToolHandlers {
	return {
		get_telemetry: async () => ({ pitC: 107, probe1C: 67 }),
		get_cook_history: async () => [],
		list_past_sessions: async () => [],
		get_recent_messages: async () => [],
		get_pellet_status: async () => ({ remainingKg: 2 }),
		list_photos: async () => [],
		set_pit_temp: async () => ({ ok: true, applied: 110 }),
		send_message: async () => ({ ok: true }),
		...overrides,
	}
}

const use = (name: string, input: unknown = {}, id = `t_${name}`) =>
	({ type: 'tool_use', id, name, input }) as FakeBlock

describe('runDirectorLoop', () => {
	it('completes a no-action check-in in one round', async () => {
		const { client, create } = fakeClient([
			fakeResponse([{ type: 'text', text: 'All nominal, no action.' }]),
		])
		const result = await runDirectorLoop({
			client,
			model: 'fake',
			contextNote: 'Device: Demo Smoker',
			handlers: stubHandlers(),
		})
		expect(create).toHaveBeenCalledTimes(1)
		expect(result.summary).toBe('All nominal, no action.')
		expect(result.setpointChanges).toBe(0)
		expect(result.messagesSent).toBe(0)
	})

	it('dispatches tools and feeds results back', async () => {
		const telemetry = vi.fn(async () => ({ pitC: 107 }))
		const { client, create } = fakeClient([
			fakeResponse([use('get_telemetry'), use('get_recent_messages')]),
			fakeResponse([{ type: 'text', text: 'done' }]),
		])
		const result = await runDirectorLoop({
			client,
			model: 'fake',
			contextNote: '',
			handlers: stubHandlers({ get_telemetry: telemetry }),
		})
		expect(telemetry).toHaveBeenCalledTimes(1)
		expect(result.toolCalls).toEqual(['get_telemetry', 'get_recent_messages'])
		// Second API call carries the tool results back
		const secondCall = create.mock.calls[1]?.[0] as unknown as {
			messages: Array<{ role: string; content: unknown }>
		}
		expect(secondCall.messages).toHaveLength(3)
		expect(secondCall.messages[2].role).toBe('user')
		expect(JSON.stringify(secondCall.messages[2].content)).toContain('pitC')
	})

	it('enforces the per-run setpoint budget', async () => {
		const setPit = vi.fn(async () => ({ ok: true }))
		const { client } = fakeClient([
			fakeResponse([
				use('set_pit_temp', { setpointC: 110, reason: 'a' }, 't1'),
				use('set_pit_temp', { setpointC: 120, reason: 'b' }, 't2'),
			]),
			fakeResponse([{ type: 'text', text: 'done' }]),
		])
		const result = await runDirectorLoop({
			client,
			model: 'fake',
			contextNote: '',
			handlers: stubHandlers({ set_pit_temp: setPit }),
		})
		expect(setPit).toHaveBeenCalledTimes(1)
		expect(result.setpointChanges).toBe(1)
	})

	it('enforces the per-run message budget', async () => {
		const send = vi.fn(async () => ({ ok: true }))
		const { client } = fakeClient([
			fakeResponse([
				use('send_message', { title: 'a', body: 'a' }, 't1'),
				use('send_message', { title: 'b', body: 'b' }, 't2'),
				use('send_message', { title: 'c', body: 'c' }, 't3'),
			]),
			fakeResponse([{ type: 'text', text: 'done' }]),
		])
		const result = await runDirectorLoop({
			client,
			model: 'fake',
			contextNote: '',
			handlers: stubHandlers({ send_message: send }),
		})
		expect(send).toHaveBeenCalledTimes(2)
		expect(result.messagesSent).toBe(2)
	})

	it('returns handler errors to the model instead of crashing', async () => {
		const { client, create } = fakeClient([
			fakeResponse([use('get_pellet_status')]),
			fakeResponse([{ type: 'text', text: 'noted the failure' }]),
		])
		const result = await runDirectorLoop({
			client,
			model: 'fake',
			contextNote: '',
			handlers: stubHandlers({
				get_pellet_status: async () => {
					throw new Error('no hopper configured')
				},
			}),
		})
		expect(result.summary).toBe('noted the failure')
		const secondCall = create.mock.calls[1]?.[0] as unknown as {
			messages: Array<{ content: unknown }>
		}
		const results = secondCall.messages[2].content as Array<{
			is_error?: boolean
			content: string
		}>
		expect(results[0].is_error).toBe(true)
		expect(results[0].content).toContain('no hopper configured')
	})

	it('caps the loop at MAX_ITERATIONS even if the model keeps calling tools', async () => {
		const { client, create } = fakeClient([
			fakeResponse([use('get_telemetry')]), // returned forever
		])
		const result = await runDirectorLoop({
			client,
			model: 'fake',
			contextNote: '',
			handlers: stubHandlers(),
		})
		expect(create).toHaveBeenCalledTimes(MAX_ITERATIONS)
		expect(result.iterations).toBe(MAX_ITERATIONS)
	})

	it('rejects malformed set_pit_temp input without spending budget', async () => {
		const setPit = vi.fn(async () => ({ ok: true }))
		const { client } = fakeClient([
			fakeResponse([use('set_pit_temp', { reason: 'missing temp' })]),
			fakeResponse([{ type: 'text', text: 'done' }]),
		])
		const result = await runDirectorLoop({
			client,
			model: 'fake',
			contextNote: '',
			handlers: stubHandlers({ set_pit_temp: setPit }),
		})
		expect(setPit).not.toHaveBeenCalled()
		expect(result.setpointChanges).toBe(0)
	})
})
