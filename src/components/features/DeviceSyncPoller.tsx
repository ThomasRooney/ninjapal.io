'use client'

import { useZero } from '@/hooks/use-typed-zero'
import { useQuery as useZeroQuery } from '@rocicorp/zero/react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

export function DeviceSyncPoller() {
	const z = useZero()

	// 1. Subscribe to the connection status using Zero's useQuery
	const [connections] = useZeroQuery(z.query.ninjaConnections)

	// 2. Determine if polling should be active based on the live data.
	const hasActiveConnection = connections?.some((c) => !!c.aylaAccessToken)
	const isPollingEnabled = !!connections && hasActiveConnection

	// 3. Run the polling query, which is controlled by the `enabled` flag.
	const { isRefetching } = useQuery({
		// This key is unique to the polling action.
		queryKey: ['devices', 'syncPoller'],
		// The "query" is actually our mutation. TanStack Query handles it.
		queryFn: async () => {
			await z.mutate.devices.syncRealDevices()
			return null
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

	// Show loader when refetching (not on initial fetch)
	if (isRefetching) {
		return (
			<span title='Syncing devices...'>
				<Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
			</span>
		)
	}

	// Return empty span to maintain layout consistency
	return <span className='h-4 w-4' />
}
