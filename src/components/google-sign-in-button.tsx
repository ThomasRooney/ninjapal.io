import { Button } from '@/components/ui/button'
import { signInWithGoogle } from '@/lib/auth-client'
import { useId, useState } from 'react'

function errorMessage(code: string) {
	switch (code.toLowerCase()) {
		case 'access_denied':
			return 'Google sign-in was cancelled. Try again when you’re ready.'
		case 'account_not_linked':
			return 'Verify your existing account using an email login link, then try Google again.'
		case 'provider_not_found':
		case 'oauth_provider_not_found':
		case 'invalid_client':
			return 'Google sign-in isn’t available yet. Use your password or an email login link.'
		case 'state_mismatch':
		case 'state_not_found':
			return 'Your sign-in attempt expired. Please try Google again.'
		default:
			return 'Couldn’t sign in with Google. Try again or use an email login link.'
	}
}

export function GoogleSignInButton({
	redirectTo,
	errorCallbackURL,
	googleError,
}: {
	redirectTo?: string
	errorCallbackURL?: string
	googleError?: string | null
}) {
	const [pending, setPending] = useState(false)
	const [attemptError, setAttemptError] = useState<string | null | undefined>()
	const error = attemptError === undefined ? googleError : attemptError
	const errorId = useId()

	async function onClick() {
		setPending(true)
		setAttemptError(null)
		try {
			const { error } = await signInWithGoogle(redirectTo, errorCallbackURL)
			if (error) {
				setAttemptError(error.code ?? 'unknown')
				setPending(false)
			}
			// Keep the button disabled while the auth client navigates to Google.
		} catch {
			setAttemptError('network_error')
			setPending(false)
		}
	}

	return (
		<div className='flex flex-col gap-2'>
			<Button
				type='button'
				variant='outline'
				className='w-full rounded'
				data-testid='login-google'
				onClick={onClick}
				disabled={pending}
				aria-busy={pending}
				aria-describedby={error ? errorId : undefined}
			>
				{pending ? 'Connecting to Google…' : 'Continue with Google'}
			</Button>
			{error && (
				<p
					id={errorId}
					role='alert'
					data-testid='login-google-error'
					className='text-sm text-destructive'
				>
					{errorMessage(error)}
				</p>
			)}
		</div>
	)
}
