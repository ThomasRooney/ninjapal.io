import { ConsentCard } from '@/components/consent-card.tsx'
import NavMain from '@/components/nav-main.tsx'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/consent')({
	component: RouteComponent,
})

/**
 * OAuth consent page — the oauth-provider plugin redirects here with the
 * signed authorization query string. The raw query is read on the client and
 * passed through untouched (the server verifies its signature).
 */
function RouteComponent() {
	const [query, setQuery] = useState<URLSearchParams | null>(null)

	useEffect(() => {
		setQuery(new URLSearchParams(window.location.search))
	}, [])

	const clientId = query?.get('client_id')
	const scope = query?.get('scope') ?? ''

	return (
		<div className='flex flex-col flex-grow h-screen w-full items-center justify-center'>
			<NavMain location='auth' />
			<div className='w-full h-full flex flex-col items-center justify-center max-w-md px-4'>
				{query === null ? null : clientId ? (
					<ConsentCard
						clientId={clientId}
						scope={scope}
						oauthQuery={query.toString()}
					/>
				) : (
					<p
						className='text-sm text-muted-foreground'
						data-testid='consent-invalid'
					>
						Invalid authorization request — missing client_id.
					</p>
				)}
			</div>
		</div>
	)
}
