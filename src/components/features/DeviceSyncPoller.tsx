'use client'

import { Button } from '@/components/ui/button'
import { useZero } from '@/hooks/use-typed-zero'
import { useQuery as useZeroQuery } from '@rocicorp/zero/react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function DeviceSyncPoller() {
	const z = useZero()

	// 1. Subscribe to the connection status using Zero's useQuery
	const [connections] = useZeroQuery(z.query.ninjaConnections)

	// 2. Determine if polling should be active based on the live data.
	const hasActiveConnection = connections?.some((c) => !!c.aylaAccessToken)
	const isPollingEnabled = !!connections && hasActiveConnection

	// 3. Run the polling query, which is controlled by the `enabled` flag.
	const { isFetching, refetch } = useQuery({
		// This key is unique to the polling action.
		queryKey: ['devices', 'syncPoller'],
		// The "query" is actually our mutation. TanStack Query handles it.
		queryFn: async () => {
			try {
				return await z.mutate.devices.syncRealDevices().server
			} catch (error) {
				// Only show error toast for manual refetch, not automatic polling
				if (error instanceof Error) {
					console.error('Device sync failed:', error)
					// Don't show toasts for automatic polling errors to avoid spam
					// The error will be shown if user manually clicks sync
				}
				throw error
			}
		},

		// --- Critical Configuration ---
		enabled: isPollingEnabled,
		refetchInterval: 60 * 1000, // 1 minute
		refetchIntervalInBackground: false, // Don't poll when window is not focused

		// We only want the interval to trigger this.
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: true, // Run once immediately when enabled.

		// A background poll should not have aggressive retries.
		// The self-healing loop is the "retry" mechanism.
		retry: 1,

		// The data from this is a status, not critical state to display.
		// Matching staleTime to the interval is a good practice.
		staleTime: 60 * 1000,
	})

	// Always show the button
	return (
		<Button
			variant='ghost'
			size='icon'
			className='h-6 w-6'
			onClick={async () => {
				try {
					await refetch()
				} catch (error) {
					if (error instanceof Error) {
						if (error.message === 'No connection found for user') {
							toast.error(
								'Please set up your Ninja account credentials first',
								{
									action: {
										label: 'Set up now',
										onClick: () => {
											window.location.href = '/app/ninja-connection'
										},
									},
								},
							)
						} else if (error.message === 'Credentials not set') {
							toast.error('Please complete your Ninja account setup', {
								action: {
									label: 'Complete setup',
									onClick: () => {
										window.location.href = '/app/ninja-connection'
									},
								},
							})
						} else {
							toast.error(`Failed to sync devices: ${error.message}`)
						}
					}
				}
			}}
			disabled={!isPollingEnabled || isFetching}
			title={
				isFetching
					? 'Syncing devices...'
					: isPollingEnabled
						? 'Sync devices now'
						: 'No active connection'
			}
		>
			{isFetching ? (
				<Loader2 className='h-3.5 w-3.5 animate-spin' />
			) : (
				<RefreshCw className='h-3.5 w-3.5' />
			)}
		</Button>
	)
}
