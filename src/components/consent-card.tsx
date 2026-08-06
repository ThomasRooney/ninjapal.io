import { Button } from '@/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card.tsx'
import { useEffect, useState } from 'react'

/** Human descriptions for the scopes external MCP clients can request. */
const SCOPE_DESCRIPTIONS: Record<string, string> = {
	'pitminder:read':
		'Read your smoker telemetry, cook history, sessions, messages and photos',
	'pitminder:control':
		'Queue pit setpoint changes and respond to cook messages on your behalf (safety-enveloped)',
}

interface PublicClient {
	/** RFC 7591 field names, e.g. {"client_id":"…","client_name":"…"} */
	client_name?: string | null
	client_uri?: string | null
}

/**
 * OAuth consent card. The oauth-provider plugin redirects here with the
 * signed authorization query; approve/deny POSTs it back to
 * /api/auth/oauth2/consent which returns the redirect target.
 */
export function ConsentCard({
	clientId,
	scope,
	oauthQuery,
}: {
	clientId: string
	scope: string
	oauthQuery: string
}) {
	const [client, setClient] = useState<PublicClient | null>(null)
	const [phase, setPhase] = useState<
		'loading' | 'ready' | 'submitting' | 'error'
	>('loading')
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false
		;(async () => {
			try {
				const res = await fetch(
					`/api/auth/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`,
					{ credentials: 'include' },
				)
				if (!res.ok) {
					throw new Error(
						res.status === 401
							? 'You must be logged in to authorize an application.'
							: 'Could not load application details.',
					)
				}
				const data = (await res.json()) as PublicClient
				if (!cancelled) {
					setClient(data)
					setPhase('ready')
				}
			} catch (e) {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : 'Something went wrong.')
					setPhase('error')
				}
			}
		})()
		return () => {
			cancelled = true
		}
	}, [clientId])

	async function decide(accept: boolean) {
		setPhase('submitting')
		setError(null)
		try {
			const res = await fetch('/api/auth/oauth2/consent', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accept, oauth_query: oauthQuery }),
			})
			if (!res.ok) throw new Error('The authorization request has expired.')
			const data = (await res.json()) as { url?: string }
			if (!data.url) throw new Error('Malformed response from the server.')
			window.location.assign(data.url)
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Something went wrong.')
			setPhase('error')
		}
	}

	const scopes = scope.split(' ').filter(Boolean)
	const clientName = client?.client_name || clientId

	if (phase === 'loading') {
		return (
			<Card data-testid='consent-loading'>
				<CardHeader>
					<CardTitle className='text-2xl'>Authorize access</CardTitle>
					<CardDescription>Loading application details…</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-2xl'>Authorize access</CardTitle>
				<CardDescription>
					<span data-testid='consent-client-name' className='text-foreground'>
						{clientName}
					</span>{' '}
					wants to connect to your PitMinder account.
				</CardDescription>
			</CardHeader>
			<CardContent className='flex flex-col gap-6'>
				<ul className='flex flex-col gap-2' data-testid='consent-scopes'>
					{scopes.map((s) => (
						<li
							key={s}
							className='rounded border border-border bg-muted/40 px-3 py-2 text-sm'
						>
							<span className='font-mono text-xs text-muted-foreground'>
								{s}
							</span>
							<p className='text-foreground'>
								{SCOPE_DESCRIPTIONS[s] ?? 'Unknown permission'}
							</p>
						</li>
					))}
				</ul>
				{error && (
					<p className='text-sm text-destructive' data-testid='consent-error'>
						{error}
					</p>
				)}
				<div className='flex gap-3'>
					<Button
						className='flex-1 rounded'
						data-testid='consent-approve'
						disabled={phase === 'submitting'}
						onClick={() => decide(true)}
					>
						Approve
					</Button>
					<Button
						variant='outline'
						className='flex-1 rounded'
						data-testid='consent-deny'
						disabled={phase === 'submitting'}
						onClick={() => decide(false)}
					>
						Deny
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
