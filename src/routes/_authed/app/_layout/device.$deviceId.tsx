import { Badge } from '@/components/ui/badge'
import { useZero } from '@/hooks/use-typed-zero'
import { useQuery } from '@rocicorp/zero/react'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { Loader2, Wifi, WifiOff } from 'lucide-react'

export const Route = createFileRoute('/_authed/app/_layout/device/$deviceId')({
	component: DeviceDetailLayout,
	ssr: false,
})

function DeviceDetailLayout() {
	const { deviceId } = Route.useParams()
	const z = useZero()

	const [devices] = useQuery(z.query.devices.where('id', deviceId))
	const device = devices?.[0]

	if (!devices) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<Loader2 className='h-8 w-8 animate-spin' />
			</div>
		)
	}

	if (!device) {
		// Or a proper "Not Found" component
		return <div>Device not found.</div>
	}

	return (
		<div className='container mx-auto p-6 max-w-6xl'>
			{/* Shared Header */}
			<div className='mb-6'>
				<div className='flex items-center justify-between mb-2'>
					<h1 className='text-3xl font-bold'>
						{device.productName || 'Unnamed Device'}
					</h1>
					<Badge
						variant={
							device.connectionStatus === 'Online' ? 'default' : 'secondary'
						}
						className='text-base px-3 py-1'
					>
						{device.connectionStatus === 'Online' ? (
							<Wifi className='h-4 w-4 mr-1' />
						) : (
							<WifiOff className='h-4 w-4 mr-1' />
						)}
						{device.connectionStatus || 'Unknown'}
					</Badge>
				</div>
				<p className='text-muted-foreground'>
					Model: {device.model || 'Unknown'} • DSN: {device.dsn}
				</p>
			</div>

			{/* Navigation (replaces TabsList) */}
			<div className='mb-4'>
				<div className='inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground'>
					<Link
						to='/app/device/$deviceId'
						params={{ deviceId }}
						className='inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all'
						activeProps={{
							className: 'bg-background text-foreground shadow-sm',
						}}
					>
						Overview
					</Link>
					<Link
						to='/app/device/$deviceId/status'
						params={{ deviceId }}
						className='inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all'
						activeProps={{
							className: 'bg-background text-foreground shadow-sm',
						}}
					>
						Status
					</Link>
					<Link
						to='/app/device/$deviceId/technical'
						params={{ deviceId }}
						className='inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all'
						activeProps={{
							className: 'bg-background text-foreground shadow-sm',
						}}
					>
						Technical
					</Link>
					<Link
						to='/app/device/$deviceId/history'
						params={{ deviceId }}
						className='inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all'
						activeProps={{
							className: 'bg-background text-foreground shadow-sm',
						}}
					>
						History
					</Link>
					<Link
						to='/app/device/$deviceId/raw'
						params={{ deviceId }}
						className='inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all'
						activeProps={{
							className: 'bg-background text-foreground shadow-sm',
						}}
					>
						Raw Data
					</Link>
				</div>
			</div>

			{/* Outlet for Child Routes */}
			<Outlet />
		</div>
	)
}
