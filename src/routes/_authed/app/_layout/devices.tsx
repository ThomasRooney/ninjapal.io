import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useZero } from '@/hooks/use-typed-zero'
import { useQuery } from '@rocicorp/zero/react'
import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { Cpu, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/_authed/app/_layout/devices')({
	component: DevicesPage,
	ssr: false,
})

function DevicesPage() {
	const z = useZero()
	const [devices] = useQuery(z.query.devices)

	if (!devices) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<Loader2 className='h-8 w-8 animate-spin' />
			</div>
		)
	}

	return (
		<div className='container mx-auto p-6'>
			<div className='mb-6'>
				<h1 className='text-3xl font-bold'>Devices</h1>
				<p className='text-muted-foreground mt-2'>
					Manage and monitor your connected devices
				</p>
			</div>

			{devices.length === 0 ? (
				<Card>
					<CardContent className='flex flex-col items-center justify-center py-12'>
						<Cpu className='h-12 w-12 text-muted-foreground mb-4' />
						<h3 className='text-lg font-semibold mb-2'>No devices found</h3>
						<p className='text-muted-foreground text-center'>
							Connect your first device to get started
						</p>
					</CardContent>
				</Card>
			) : (
				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{devices.map((device) => (
						<Link
							key={device.id}
							to='/app/device/$deviceId'
							params={{ deviceId: device.id }}
							className='block transition-transform hover:scale-[1.02]'
							data-testid={`device-card-${device.id}`}
						>
							<Card className='h-full hover:shadow-lg transition-shadow cursor-pointer'>
								<CardHeader>
									<div className='flex items-start justify-between'>
										<div className='flex-1'>
											<CardTitle className='text-lg'>
												{device.productName || 'Unnamed Device'}
											</CardTitle>
											<CardDescription className='mt-1'>
												{device.model || 'Unknown Model'}
											</CardDescription>
										</div>
										<Badge
											variant={
												device.connectionStatus === 'Online'
													? 'default'
													: 'secondary'
											}
											className='ml-2'
										>
											{device.connectionStatus || 'Unknown'}
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<div className='space-y-2 text-sm'>
										<div className='flex justify-between'>
											<span className='text-muted-foreground'>DSN:</span>
											<span className='font-mono'>{device.dsn}</span>
										</div>
										{device.lanIp && (
											<div className='flex justify-between'>
												<span className='text-muted-foreground'>IP:</span>
												<span className='font-mono'>{device.lanIp}</span>
											</div>
										)}
										{device.rssi !== null && (
											<div className='flex justify-between'>
												<span className='text-muted-foreground'>Signal:</span>
												<span>{device.rssi} dBm</span>
											</div>
										)}
										{device.temperature_grill !== null && (
											<div className='flex justify-between'>
												<span className='text-muted-foreground'>Temp:</span>
												<span>{device.temperature_grill}°F</span>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	)
}
