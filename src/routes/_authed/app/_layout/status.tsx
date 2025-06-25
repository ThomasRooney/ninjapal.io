import AppNav from '@/components/nav-app.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table.tsx'
import { useQuery, useZero } from '@rocicorp/zero/react'
import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { useCallback, useState } from 'react'

export const Route = createFileRoute('/_authed/app/_layout/status')({
	component: RouteComponent,
	ssr: false,
})

interface Device {
	id: string
	userId: string
	dsn: string
	productName?: string | null
	model?: string | null
	mac?: string | null
	lanIp?: string | null
	connectionStatus?: string | null
	additionalDeviceProperties?: Record<string, unknown> | null
	createdAt?: number | null
	updatedAt?: number | null
}

function RouteComponent() {
	const z = useZero()
	const [devices] = useQuery(z.query.devices)
	const [selectedDevice, setSelectedDevice] = useState<Record<
		string,
		unknown
	> | null>(null)
	const [isRefreshing, setIsRefreshing] = useState(false)

	const handleRefresh = useCallback(async () => {
		setIsRefreshing(true)
		try {
			// TODO: Fix type issue with syncRealDevices
			// @ts-ignore
			await z.mutate.syncRealDevices()
		} catch (error) {
			console.error('Failed to sync devices:', error)
			// Optionally show an error toast/notification here
		} finally {
			setIsRefreshing(false)
		}
	}, [z.mutate])

	const handleRowClick = useCallback((device: Device) => {
		// Merge all device properties including additionalDeviceProperties
		const mergedData = {
			...device,
			...(device.additionalDeviceProperties || {}),
		}
		// Remove the additionalDeviceProperties from the merged object to avoid duplication
		mergedData.additionalDeviceProperties = undefined
		setSelectedDevice(mergedData)
	}, [])

	return (
		<div className='flex flex-col h-full overflow-y-auto w-full'>
			<AppNav title='Device Status'>
				<Button
					variant='outline'
					size='xs'
					onClick={handleRefresh}
					disabled={isRefreshing}
				>
					<RefreshCw
						className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
					/>
					Refresh Status
				</Button>
			</AppNav>

			<div className='flex flex-col grow overflow-y-auto'>
				<div className='px-4 py-4'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>DSN</TableHead>
								<TableHead>Product Name</TableHead>
								<TableHead>Model</TableHead>
								<TableHead>MAC Address</TableHead>
								<TableHead>LAN IP</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{devices?.map((device) => (
								<TableRow
									key={device.id}
									onClick={() => handleRowClick(device as Device)}
									className='cursor-pointer hover:bg-secondary/40'
								>
									<TableCell className='font-mono text-sm'>
										{device.dsn}
									</TableCell>
									<TableCell>{device.productName || '-'}</TableCell>
									<TableCell>{device.model || '-'}</TableCell>
									<TableCell className='font-mono text-sm'>
										{device.mac || '-'}
									</TableCell>
									<TableCell className='font-mono text-sm'>
										{device.lanIp || '-'}
									</TableCell>
									<TableCell>
										<span
											className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
												device.connectionStatus === 'online'
													? 'bg-green-100 text-green-800'
													: 'bg-gray-100 text-gray-800'
											}`}
										>
											{device.connectionStatus || 'unknown'}
										</span>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					{(!devices || devices.length === 0) && (
						<div className='flex items-center justify-center h-32'>
							<p className='text-sm text-muted-foreground'>
								No devices found. Click "Refresh Status" to sync devices from
								your Ninja account.
							</p>
						</div>
					)}
				</div>
			</div>

			<Dialog
				open={!!selectedDevice}
				onOpenChange={(open) => !open && setSelectedDevice(null)}
			>
				<DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>
							Device Details: {selectedDevice?.dsn as string}
						</DialogTitle>
					</DialogHeader>
					<div className='mt-4'>
						<pre className='bg-muted p-4 rounded-lg overflow-x-auto text-xs'>
							{JSON.stringify(selectedDevice, null, 2)}
						</pre>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
