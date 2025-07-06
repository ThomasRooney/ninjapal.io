'use client'

import { Button } from '@/components/ui/button'
import { useZero } from '@/hooks/use-typed-zero'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'

export function DeviceSyncButton() {
	const z = useZero()
	const queryClient = useQueryClient()

	const syncMutation = useMutation({
		mutationFn: async () => {
			// Manually set the query as fetching
			await queryClient.setQueryData(['devices', 'syncPoller'], undefined)
			return z.mutate.devices.syncRealDevices().server()
		},
		mutationKey: ['devices', 'syncPoller'],
		onSuccess: () => {
			// Invalidate the query to trigger a refetch
			queryClient.invalidateQueries({ queryKey: ['devices', 'syncPoller'] })
		},
	})

	return (
		<Button
			onClick={() => syncMutation.mutate()}
			disabled={syncMutation.isPending}
			variant='outline'
			size='sm'
		>
			{syncMutation.isPending ? (
				<>
					<Loader2 className='mr-2 h-4 w-4 animate-spin' />
					Syncing...
				</>
			) : (
				<>
					<RefreshCw className='mr-2 h-4 w-4' />
					Sync Devices
				</>
			)}
		</Button>
	)
}
