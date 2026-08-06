import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsentCard } from './consent-card'

// Raw createRoot+act instead of @testing-library/react: RTL 16.x binds its
// own React copy under vitest + react 19.2 (null dispatcher) — same
// workaround as useCountdown.test.ts.
function renderCard(props: {
	clientId: string
	scope: string
	oauthQuery: string
}) {
	const container = document.createElement('div')
	document.body.appendChild(container)
	const root = createRoot(container)
	act(() => {
		root.render(createElement(ConsentCard, props))
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
	// drain the fetch promise chain inside act so state updates commit
	await act(async () => {
		await Promise.resolve()
		await Promise.resolve()
		await Promise.resolve()
	})
}

const OAUTH_QUERY = 'client_id=abc&scope=pitminder%3Aread&sig=xyz'

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
	const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
		handler(String(input), init),
	)
	vi.stubGlobal('fetch', fn)
	return fn
}

describe('ConsentCard', () => {
	let cleanup: (() => void) | undefined

	beforeEach(() => {
		// jsdom does not implement navigation
		Object.defineProperty(window, 'location', {
			value: { ...window.location, assign: vi.fn() },
			writable: true,
		})
	})

	afterEach(() => {
		cleanup?.()
		cleanup = undefined
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	it('shows a loading state while the client is fetched', () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => new Promise(() => {})),
		)
		const r = renderCard({
			clientId: 'abc',
			scope: 'pitminder:read',
			oauthQuery: OAUTH_QUERY,
		})
		cleanup = r.unmount
		expect(r.byTestId('consent-loading')).not.toBeNull()
	})

	it('renders client name and scope descriptions', async () => {
		mockFetch((url) => {
			if (url.includes('/oauth2/public-client')) {
				return Response.json({ name: 'Claude Code' })
			}
			throw new Error(`unexpected fetch ${url}`)
		})
		const r = renderCard({
			clientId: 'abc',
			scope: 'pitminder:read pitminder:control',
			oauthQuery: OAUTH_QUERY,
		})
		cleanup = r.unmount
		await flush()
		expect(r.byTestId('consent-client-name')?.textContent).toBe('Claude Code')
		const scopes = r.byTestId('consent-scopes')?.textContent ?? ''
		expect(scopes).toContain('pitminder:read')
		expect(scopes).toContain('pitminder:control')
		expect(scopes).toContain('Read your smoker telemetry')
		expect(scopes).toContain('Queue pit setpoint changes')
	})

	it('shows an error state when the client lookup fails', async () => {
		mockFetch(() => new Response('Unauthorized', { status: 401 }))
		const r = renderCard({
			clientId: 'abc',
			scope: 'pitminder:read',
			oauthQuery: OAUTH_QUERY,
		})
		cleanup = r.unmount
		await flush()
		expect(r.byTestId('consent-error')?.textContent).toContain(
			'must be logged in',
		)
	})

	it('POSTs accept:true with the raw oauth query and follows the redirect', async () => {
		const calls: Array<{ url: string; body: unknown }> = []
		mockFetch((url, init) => {
			if (url.includes('/oauth2/public-client')) {
				return Response.json({ name: 'Claude Code' })
			}
			if (url.includes('/oauth2/consent')) {
				calls.push({ url, body: JSON.parse(String(init?.body)) })
				return Response.json({
					redirect: true,
					url: 'http://client.example/cb?code=1',
				})
			}
			throw new Error(`unexpected fetch ${url}`)
		})
		const r = renderCard({
			clientId: 'abc',
			scope: 'pitminder:read',
			oauthQuery: OAUTH_QUERY,
		})
		cleanup = r.unmount
		await flush()
		act(() => r.byTestId('consent-approve')?.click())
		await flush()
		expect(calls).toHaveLength(1)
		expect(calls[0]?.body).toEqual({ accept: true, oauth_query: OAUTH_QUERY })
		expect(window.location.assign).toHaveBeenCalledWith(
			'http://client.example/cb?code=1',
		)
	})

	it('POSTs accept:false on deny', async () => {
		const bodies: unknown[] = []
		mockFetch((url, init) => {
			if (url.includes('/oauth2/public-client')) {
				return Response.json({ name: 'X' })
			}
			bodies.push(JSON.parse(String(init?.body)))
			return Response.json({
				redirect: true,
				url: 'http://client.example/cb?error=access_denied',
			})
		})
		const r = renderCard({
			clientId: 'abc',
			scope: 'pitminder:read',
			oauthQuery: OAUTH_QUERY,
		})
		cleanup = r.unmount
		await flush()
		act(() => r.byTestId('consent-deny')?.click())
		await flush()
		expect(bodies).toHaveLength(1)
		expect(bodies[0]).toEqual({ accept: false, oauth_query: OAUTH_QUERY })
	})

	it('surfaces an error when the consent POST fails', async () => {
		mockFetch((url) => {
			if (url.includes('/oauth2/public-client')) {
				return Response.json({ name: 'X' })
			}
			return new Response('expired', { status: 400 })
		})
		const r = renderCard({
			clientId: 'abc',
			scope: 'pitminder:read',
			oauthQuery: OAUTH_QUERY,
		})
		cleanup = r.unmount
		await flush()
		act(() => r.byTestId('consent-approve')?.click())
		await flush()
		expect(r.byTestId('consent-error')?.textContent).toContain('expired')
		expect(window.location.assign).not.toHaveBeenCalled()
	})
})
