'use client'

import { Button } from '@/components/ui/button'
import { useZero } from '@/hooks/use-typed-zero'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function DeviceSyncButton() {
	const z = useZero()
	const queryClient = useQueryClient()

	const syncMutation = useMutation({
		mutationFn: async () => {
			// Manually set the query as fetching
			await queryClient.setQueryData(['devices', 'syncPoller'], undefined)
			return z.mutate.devices.syncRealDevices().server
		},
		mutationKey: ['devices', 'syncPoller'],
		onSuccess: () => {
			// Invalidate the query to trigger a refetch
			queryClient.invalidateQueries({ queryKey: ['devices', 'syncPoller'] })
			toast.success('Devices synced successfully')
		},
		onError: (error: Error) => {
			console.error('Failed to sync devices:', error)
			if (error.message === 'No connection found for user') {
				toast.error('Please set up your Ninja account credentials first', {
					action: {
						label: 'Set up now',
						onClick: () => {
							window.location.href = '/app/ninja-connection'
						},
					},
				})
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
