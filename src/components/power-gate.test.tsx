import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PowerGate, READY_POLL_INTERVAL_MS, WAKE_BUDGET_MS } from './power-gate'

// Raw createRoot+act instead of @testing-library/react: RTL 16.x binds its
// own React copy under vitest + react 19.2 (null dispatcher) — same
// workaround as consent-card.test.tsx.
function renderGate(
	watchOnline?: (cb: (online: boolean) => void) => () => void,
) {
	const container = document.createElement('div')
	document.body.appendChild(container)
	const root = createRoot(container)
	act(() => {
		root.render(
			createElement(
				PowerGate,
				{ watchOnline },
				createElement(
					'button',
					{ type: 'button', 'data-testid': 'app-input' },
					'do a thing',
				),
			),
		)
	})
	return {
		container,
		byTestId: (id: string) =>
			container.querySelector<HTMLElement>(`[data-testid="${id}"]`),
		unmount: () => {
			act(() => root.unmount())
			container.remove()
		},
	}
}

async function flush() {
	await act(async () => {
		await Promise.resolve()
		await Promise.resolve()
		await Promise.resolve()
	})
}

type ReadyAnswer = { status: number; body?: Record<string, unknown> }

let readyQueue: ReadyAnswer[]
let readyDefault: ReadyAnswer
let wakeCalls: number
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
	vi.useFakeTimers()
	readyQueue = []
	readyDefault = { status: 200, body: { ready: true } }
	wakeCalls = 0
	fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input)
		if (url.endsWith('/api/wake') || url === '/api/wake') {
			expect(init?.method).toBe('POST')
			wakeCalls++
			return Response.json({ ok: true, configured: true })
		}
		const answer = readyQueue.shift() ?? readyDefault
		return Response.json(answer.body ?? {}, { status: answer.status })
	})
	vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

describe('PowerGate', () => {
	it('stays open when /api/ready answers 200', async () => {
		const gate = renderGate()
		await flush()
		expect(gate.byTestId('power-gate-warming')).toBeNull()
		expect(gate.byTestId('power-gate-content')?.hasAttribute('inert')).toBe(
			false,
		)
		expect(wakeCalls).toBe(0)
		gate.unmount()
	})

	it('warms on a 202, gates inputs, wakes, then reopens on 200', async () => {
		readyQueue.push({
			status: 202,
			body: { ready: false, state: 'WAKING_DB', progress: null },
		})
		readyQueue.push({
			status: 202,
			body: { ready: false, state: 'WAKING_SERVICES', progress: null },
		})
		// afterwards the default 200 answers

		const gate = renderGate()
		await flush()

		// warming: overlay up, inputs inert, wake requested
		expect(gate.byTestId('power-gate-warming')).not.toBeNull()
		expect(gate.byTestId('power-gate-content')?.hasAttribute('inert')).toBe(
			true,
		)
		expect(wakeCalls).toBe(1)
		expect(gate.byTestId('power-gate-progress')?.textContent).toContain(
			'starting the database',
		)

		// first poll: still warming, progress advances
		await act(async () => {
			await vi.advanceTimersByTimeAsync(READY_POLL_INTERVAL_MS)
		})
		expect(gate.byTestId('power-gate-progress')?.textContent).toContain(
			'realtime sync',
		)
		expect(gate.byTestId('power-gate-warming')).not.toBeNull()

		// next poll gets the 200 → gate opens, inputs usable again
		await act(async () => {
			await vi.advanceTimersByTimeAsync(READY_POLL_INTERVAL_MS)
		})
		expect(gate.byTestId('power-gate-warming')).toBeNull()
		expect(gate.byTestId('power-gate-content')?.hasAttribute('inert')).toBe(
			false,
		)
		gate.unmount()
	})

	it('confirms a Zero offline signal against /api/ready before gating', async () => {
		let onlineCb: ((online: boolean) => void) | undefined
		const unsubscribe = vi.fn()
		const watchOnline = (cb: (online: boolean) => void) => {
			onlineCb = cb
			return unsubscribe
		}
		const gate = renderGate(watchOnline)
		await flush() // mount check: 200 → open
		expect(gate.byTestId('power-gate-warming')).toBeNull()

		readyQueue.push({ status: 202, body: { ready: false, state: 'SLEEPING' } })
		act(() => {
			onlineCb?.(false)
		})
		await act(async () => {
			await vi.advanceTimersByTimeAsync(3_100)
		})
		expect(gate.byTestId('power-gate-warming')).not.toBeNull()
		gate.unmount()
		expect(unsubscribe).toHaveBeenCalled()
	})

	it('fails after the wake budget and retries from the error state', async () => {
		readyDefault = { status: 202, body: { ready: false, state: 'WAKING_DB' } }
		const gate = renderGate()
		await flush()
		expect(gate.byTestId('power-gate-warming')).not.toBeNull()

		await act(async () => {
			await vi.advanceTimersByTimeAsync(
				WAKE_BUDGET_MS + READY_POLL_INTERVAL_MS * 2,
			)
		})
		expect(gate.byTestId('power-gate-error')).not.toBeNull()
		expect(gate.byTestId('power-gate-content')?.hasAttribute('inert')).toBe(
			true,
		)

		// Retry re-enters warming with a fresh budget and a fresh wake POST
		const wakesBefore = wakeCalls
		readyDefault = { status: 200, body: { ready: true } }
		act(() => {
			gate.byTestId('power-gate-retry')?.click()
		})
		await flush()
		expect(wakeCalls).toBe(wakesBefore + 1)
		await act(async () => {
			await vi.advanceTimersByTimeAsync(READY_POLL_INTERVAL_MS)
		})
		expect(gate.byTestId('power-gate-warming')).toBeNull()
		gate.unmount()
	})

	it('fails fast when the power row reports ERROR', async () => {
		readyQueue.push({ status: 202, body: { ready: false, state: 'WAKING_DB' } })
		readyDefault = { status: 503, body: { ready: false, state: 'ERROR' } }
		const gate = renderGate()
		await flush()
		await act(async () => {
			await vi.advanceTimersByTimeAsync(READY_POLL_INTERVAL_MS)
		})
		expect(gate.byTestId('power-gate-error')).not.toBeNull()
		gate.unmount()
	})
})
