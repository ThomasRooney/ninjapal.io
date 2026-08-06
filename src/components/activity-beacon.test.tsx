import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACTIVITY_BEACON_INTERVAL_MS, ActivityBeacon } from './activity-beacon'

// Raw createRoot+act instead of @testing-library/react: RTL 16.x binds its
// own React copy under vitest + react 19.2 (null dispatcher) — same
// workaround as consent-card.test.tsx.
function renderBeacon() {
	const container = document.createElement('div')
	document.body.appendChild(container)
	const root = createRoot(container)
	act(() => {
		root.render(createElement(ActivityBeacon))
	})
	return {
		unmount: () => {
			act(() => root.unmount())
			container.remove()
		},
	}
}

function setVisibility(state: 'visible' | 'hidden') {
	Object.defineProperty(document, 'visibilityState', {
		configurable: true,
		get: () => state,
	})
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
	vi.useFakeTimers()
	fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
	vi.stubGlobal('fetch', fetchMock)
	setVisibility('visible')
})

afterEach(() => {
	vi.useRealTimers()
	vi.unstubAllGlobals()
	setVisibility('visible')
})

describe('ActivityBeacon', () => {
	it('pings /api/activity on mount while visible', () => {
		const { unmount } = renderBeacon()
		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(fetchMock).toHaveBeenCalledWith('/api/activity', {
			method: 'POST',
			credentials: 'same-origin',
		})
		unmount()
	})

	it('does not ping while the tab is hidden', () => {
		setVisibility('hidden')
		const { unmount } = renderBeacon()
		expect(fetchMock).not.toHaveBeenCalled()
		act(() => {
			vi.advanceTimersByTime(ACTIVITY_BEACON_INTERVAL_MS * 2 + 1_000)
		})
		expect(fetchMock).not.toHaveBeenCalled()
		unmount()
	})

	it('pings every interval while visible', () => {
		const { unmount } = renderBeacon()
		expect(fetchMock).toHaveBeenCalledTimes(1)
		act(() => {
			vi.advanceTimersByTime(ACTIVITY_BEACON_INTERVAL_MS + 10)
		})
		expect(fetchMock).toHaveBeenCalledTimes(2)
		act(() => {
			vi.advanceTimersByTime(ACTIVITY_BEACON_INTERVAL_MS)
		})
		expect(fetchMock).toHaveBeenCalledTimes(3)
		unmount()
	})

	it('pings when the tab becomes visible again after the window elapses', () => {
		setVisibility('hidden')
		const { unmount } = renderBeacon()
		expect(fetchMock).not.toHaveBeenCalled()
		act(() => {
			vi.advanceTimersByTime(ACTIVITY_BEACON_INTERVAL_MS + 1_000)
		})
		setVisibility('visible')
		act(() => {
			document.dispatchEvent(new Event('visibilitychange'))
		})
		expect(fetchMock).toHaveBeenCalledTimes(1)
		unmount()
	})

	it('stops pinging after unmount', () => {
		const { unmount } = renderBeacon()
		unmount()
		fetchMock.mockClear()
		act(() => {
			vi.advanceTimersByTime(ACTIVITY_BEACON_INTERVAL_MS * 3)
		})
		expect(fetchMock).not.toHaveBeenCalled()
	})
})
