'use client'

import { useZero } from '@/hooks/use-typed-zero'
import { useQuery as useZeroQuery } from '@rocicorp/zero/react'
import { useQuery } from '@tanstack/react-query'

export function DeviceSyncPoller() {
	const z = useZero()

	// 1. Subscribe to the connection status using Zero's useQuery
	const [connections] = useZeroQuery(z.query.ninjaConnections)

	// 2. Determine if polling should be active based on the live data.
	const hasActiveConnection = connections?.some((c) => !!c.aylaAccessToken)
	const isPollingEnabled = !!connections && hasActiveConnection

	// 3. Run the polling query, which is controlled by the `enabled` flag.
	useQuery({
		// This key is unique to the polling action.
		queryKey: ['devices', 'syncPoller'],
		// The "query" is actually our mutation. TanStack Query handles it.
		queryFn: () => z.mutate.devices.syncRealDevices().server(),

		// --- Critical Configuration ---
		enabled: isPollingEnabled,
		refetchInterval: 60 * 1000, // 1 minute

		// We only want the interval to trigger this.
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: true, // Run once immediately when enabled.

		// A background poll should not have aggressive retries.
		// The self-healing loop is the "retry" mechanism.
		retry: false,

		// The data from this is a status, not critical state to display.
		// Matching staleTime to the interval is a good practice.
		staleTime: 60 * 1000,
	})

	// This component is a side-effect hook; it renders nothing.
	return null
}
