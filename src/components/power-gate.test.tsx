import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	PowerGate,
	type PowerGateProps,
	READY_POLL_INTERVAL_MS,
	WAKE_BUDGET_MS,
} from './power-gate'

// Raw createRoot+act instead of @testing-library/react: RTL 16.x binds its
// own React copy under vitest + react 19.2 (null dispatcher) — same
// workaround as consent-card.test.tsx.
function renderGate(props: Omit<PowerGateProps, 'children'> = {}) {
	const container = document.createElement('div')
	document.body.appendChild(container)
	const root = createRoot(container)
	act(() => {
		root.render(
			createElement(
				PowerGate,
				props,
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
		await Promise.resolve()
	})
}

type ReadyAnswer = {
	status: number
	body?: Record<string, unknown>
	retryAfter?: string
}

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
		const headers: Record<string, string> = {}
		if (answer.retryAfter) headers['retry-after'] = answer.retryAfter
		else if (answer.status === 202) headers['retry-after'] = '2'
		return Response.json(answer.body ?? {}, { status: answer.status, headers })
	})
	vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

describe('PowerGate (provider mode)', () => {
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

	it('warms on a 202, gates inputs, wakes once, then reopens on 200', async () => {
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

		// warming: overlay up, inputs inert, exactly one wake POST, and the
		// sequential loop's first poll already consumed the second 202
		expect(gate.byTestId('power-gate-warming')).not.toBeNull()
		expect(gate.byTestId('power-gate-content')?.hasAttribute('inert')).toBe(
			true,
		)
		expect(wakeCalls).toBe(1)
		expect(gate.byTestId('power-gate-progress')?.textContent).toContain(
			'realtime sync',
		)

		// next poll (after the Retry-After delay) gets the 200 → gate opens
		await act(async () => {
			await vi.advanceTimersByTimeAsync(READY_POLL_INTERVAL_MS)
		})
		await flush()
		expect(gate.byTestId('power-gate-warming')).toBeNull()
		expect(gate.byTestId('power-gate-content')?.hasAttribute('inert')).toBe(
			false,
		)
		gate.unmount()
	})

	it('polls sequentially and honors Retry-After', async () => {
		readyQueue.push({ status: 202, body: { state: 'WAKING_DB' } }) // mount
		readyQueue.push({
			status: 202,
			body: { state: 'WAKING_DB' },
			retryAfter: '5',
		}) // loop #1 → next delay 5s
		const gate = renderGate()
		await flush()
		const pollsAfterWarming = fetchMock.mock.calls.length

		// 2s (the default) passes: Retry-After said 5 — no new request yet
		await act(async () => {
			await vi.advanceTimersByTimeAsync(READY_POLL_INTERVAL_MS + 500)
		})
		expect(fetchMock.mock.calls.length).toBe(pollsAfterWarming)

		// the remaining 2.5s → the next (200) poll fires and opens the gate
		await act(async () => {
			await vi.advanceTimersByTimeAsync(2_600)
		})
		await flush()
		expect(fetchMock.mock.calls.length).toBe(pollsAfterWarming + 1)
		expect(gate.byTestId('power-gate-warming')).toBeNull()
		gate.unmount()
	})

	it('POSTs /api/wake exactly once per warming episode', async () => {
		readyDefault = { status: 202, body: { ready: false, state: 'WAKING_DB' } }
		const gate = renderGate()
		await flush()
		await act(async () => {
			await vi.advanceTimersByTimeAsync(READY_POLL_INTERVAL_MS * 30)
		})
		expect(wakeCalls).toBe(1)
		gate.unmount()
	})

	it('shows the honest cold-wake copy while warming', async () => {
		readyQueue.push({ status: 202, body: { state: 'WAKING_DB' } })
		readyDefault = { status: 202, body: { state: 'WAKING_DB' } }
		const gate = renderGate()
		await flush()
		expect(gate.byTestId('power-gate-warming')?.textContent).toContain(
			'6–8 minutes',
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
		const gate = renderGate({ watchOnline })
		await flush() // mount check: 200 → open
		expect(gate.byTestId('power-gate-warming')).toBeNull()

		readyQueue.push({ status: 202, body: { ready: false, state: 'SLEEPING' } })
		readyDefault = { status: 202, body: { ready: false, state: 'SLEEPING' } }
		act(() => {
			onlineCb?.(false)
		})
		await act(async () => {
			await vi.advanceTimersByTimeAsync(3_100)
		})
		await flush()
		expect(gate.byTestId('power-gate-warming')).not.toBeNull()
		gate.unmount()
		expect(unsubscribe).toHaveBeenCalled()
	})

	it('fails after the 10-minute budget and retries from the error state', async () => {
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
		expect(gate.byTestId('power-gate-warming')).toBeNull()
		gate.unmount()
	})

	it('fails fast when the power row reports ERROR', async () => {
		readyQueue.push({ status: 202, body: { ready: false, state: 'WAKING_DB' } })
		readyDefault = { status: 503, body: { ready: false, state: 'ERROR' } }
		const gate = renderGate()
		await flush()
		expect(gate.byTestId('power-gate-error')).not.toBeNull()
		gate.unmount()
	})
})

describe('PowerGate (standalone root shell)', () => {
	it('starts warming immediately and calls onReady instead of un-gating', async () => {
		readyQueue.push({ status: 202, body: { state: 'WAKING_SERVICES' } })
		const onReady = vi.fn()
		const gate = renderGate({ standalone: true, onReady })
		await flush()

		// no mount /api/ready gate-check — it is already warming, wake sent
		expect(gate.byTestId('power-gate-warming')).not.toBeNull()
		expect(wakeCalls).toBe(1)
		expect(onReady).not.toHaveBeenCalled()

		await act(async () => {
			await vi.advanceTimersByTimeAsync(READY_POLL_INTERVAL_MS)
		})
		await flush()
		expect(onReady).toHaveBeenCalledTimes(1)
		// overlay stays up — onReady (full reload) owns the exit
		expect(gate.byTestId('power-gate-warming')).not.toBeNull()
		gate.unmount()
	})
})
