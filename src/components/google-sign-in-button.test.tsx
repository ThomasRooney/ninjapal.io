import { fireEvent, within } from '@testing-library/dom'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GoogleSignInButton } from './google-sign-in-button'

const { signInWithGoogle } = vi.hoisted(() => ({ signInWithGoogle: vi.fn() }))
vi.mock('@/lib/auth-client', () => ({ signInWithGoogle }))

let cleanup: (() => void) | undefined
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true))
afterEach(() => {
	cleanup?.()
	vi.resetAllMocks()
	vi.unstubAllGlobals()
})

function render(props: Parameters<typeof GoogleSignInButton>[0] = {}) {
	const container = document.createElement('div')
	document.body.appendChild(container)
	const root = createRoot(container)
	act(() => root.render(createElement(GoogleSignInButton, props)))
	cleanup = () => {
		act(() => root.unmount())
		container.remove()
	}
	return within(container)
}

describe('Google sign-in', () => {
	it('shows pending state and prevents duplicate requests during navigation', async () => {
		let complete!: (result: { error: null }) => void
		signInWithGoogle.mockReturnValue(
			new Promise((resolve) => {
				complete = resolve
			}),
		)
		const view = render()
		const button = view.getByRole('button') as HTMLButtonElement
		act(() => fireEvent.click(button))
		expect(button.disabled).toBe(true)
		expect(button.textContent).toContain('Connecting to Google')
		act(() => fireEvent.click(button))
		expect(signInWithGoogle).toHaveBeenCalledTimes(1)
		await act(async () => complete({ error: null }))
		expect(button.disabled).toBe(true)
	})

	it('recovers from API errors and passes the MCP return paths on retry', async () => {
		signInWithGoogle.mockResolvedValueOnce({
			error: { code: 'PROVIDER_NOT_FOUND' },
		})
		const redirectTo = '/api/auth/oauth2/authorize?client_id=test&sig=signed'
		const errorCallbackURL = '/auth/login?client_id=test&sig=signed'
		const view = render({ redirectTo, errorCallbackURL })
		const button = view.getByRole('button') as HTMLButtonElement
		await act(async () => fireEvent.click(button))
		expect(view.getByRole('alert').textContent).toContain('isn’t available yet')
		expect(button.disabled).toBe(false)
		signInWithGoogle.mockResolvedValueOnce({ error: null })
		await act(async () => fireEvent.click(button))
		expect(signInWithGoogle).toHaveBeenLastCalledWith(
			redirectTo,
			errorCallbackURL,
		)
		expect(view.queryByRole('alert')).toBeNull()
	})

	it('recovers from a network rejection', async () => {
		signInWithGoogle.mockRejectedValue(new Error('offline'))
		const view = render()
		await act(async () => fireEvent.click(view.getByRole('button')))
		expect(view.getByRole('alert').textContent).toContain('Try again')
		expect((view.getByRole('button') as HTMLButtonElement).disabled).toBe(false)
	})

	it.each([
		['access_denied', 'cancelled'],
		['account_not_linked', 'Verify your existing account'],
		['state_mismatch', 'expired'],
		['<script>untrusted provider description</script>', 'Couldn’t sign in'],
	])(
		'explains callback error %s without displaying untrusted descriptions',
		(code, message) => {
			const view = render({ googleError: code })
			expect(view.getByRole('alert').textContent).toContain(message)
			expect(view.getByRole('alert').textContent).not.toContain('<script>')
		},
	)
})
