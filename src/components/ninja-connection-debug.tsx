'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useQuery, useZero } from '@rocicorp/zero/react'
import { useRouterState } from '@tanstack/react-router'

export function NinjaConnectionDebug() {
	const z = useZero()
	const routerState = useRouterState()
	const user = routerState.matches[0]?.context?.user

	const userId = user?.id || ''

	// Query ninja connection data from Zero
	const connection = useQuery(z.query.ninjaConnections)
	if (!connection) {
		return (
			<Card>
				<CardHeader>
					<CardTitle data-testid='ninja-connection-debug--card-title'>
						Debug Information
					</CardTitle>
					<CardDescription>No connection data available</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	const formatDate = (date: Date | null | undefined) => {
		if (!date) return 'Not set'
		return new Date(date).toLocaleString()
	}

	const TokenDisplay = ({
		label,
		value,
	}: { label: string; value: string | null | undefined }) => (
		<div className='space-y-1'>
			<p className='text-sm font-medium'>{label}:</p>
			{value ? (
				<pre className='text-xs bg-muted p-2 rounded overflow-x-auto'>
					{value}
				</pre>
			) : (
				<p className='text-xs text-muted-foreground'>Not available</p>
			)}
		</div>
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle data-testid='ninja-connection-debug--card-title'>
					Debug Information
				</CardTitle>
				<CardDescription>
					Token data from Zero sync (for debugging purposes)
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='grid gap-4'>
					<TokenDisplay
						label='OAuth Access Token'
						value={connection.oauthAccessToken}
					/>
					<TokenDisplay
						label='OAuth Refresh Token'
						value={connection.oauthRefreshToken}
					/>
					<div className='space-y-1'>
						<p className='text-sm font-medium'>OAuth Expires At:</p>
						<p className='text-xs text-muted-foreground'>
							{formatDate(connection.oauthExpiresAt)}
						</p>
					</div>

					<div className='border-t pt-4' />

					<TokenDisplay
						label='Ayla Access Token'
						value={connection.aylaAccessToken}
					/>
					<TokenDisplay
						label='Ayla Refresh Token'
						value={connection.aylaRefreshToken}
					/>
					<div className='space-y-1'>
						<p className='text-sm font-medium'>Ayla Expires At:</p>
						<p className='text-xs text-muted-foreground'>
							{formatDate(connection.aylaExpiresAt)}
						</p>
					</div>

					<div className='border-t pt-4' />

					<div className='flex justify-between text-sm'>
						<span className='text-muted-foreground'>Attempts:</span>
						<span className='font-mono'>{connection.attempts}</span>
					</div>
					<div className='flex justify-between text-sm'>
						<span className='text-muted-foreground'>Last Updated:</span>
						<span className='font-mono text-xs'>
							{formatDate(connection.updatedAt)}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
