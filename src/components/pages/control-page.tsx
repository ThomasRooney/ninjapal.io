import CookControls from '@/components/cook-controls'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { getSelectedDevice } from '@/lib/mock-data'

export default function ControlPage() {
	const device = getSelectedDevice()

	return (
		<div className='container mx-auto p-4'>
			<div className='grid gap-4 md:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle>Device Status</CardTitle>
						<CardDescription>Current device information</CardDescription>
					</CardHeader>
					<CardContent className='space-y-2'>
						<div className='flex justify-between'>
							<span className='text-sm text-muted-foreground'>Device</span>
							<span className='text-sm font-medium'>{device.product_name}</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-sm text-muted-foreground'>Model</span>
							<span className='text-sm font-medium'>{device.oem_model}</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-sm text-muted-foreground'>Status</span>
							<Badge
								variant={
									device.connection_status === 'Online'
										? 'default'
										: 'secondary'
								}
							>
								{device.connection_status}
							</Badge>
						</div>
						<div className='flex justify-between'>
							<span className='text-sm text-muted-foreground'>
								Thermometer 1
							</span>
							<span className='text-sm font-medium'>
								{device.thermometer1}°F
							</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-sm text-muted-foreground'>
								Thermometer 2
							</span>
							<span className='text-sm font-medium'>
								{device.thermometer2}°F
							</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-sm text-muted-foreground'>
								Grill Temperature
							</span>
							<span className='text-sm font-medium'>
								{device.grillTemperature}°F
							</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-sm text-muted-foreground'>Cook Time</span>
							<span className='text-sm font-medium'>
								{Math.floor(device.cookTime / 60)}h {device.cookTime % 60}m
							</span>
						</div>
						<div className='flex justify-between'>
							<span className='text-sm text-muted-foreground'>Mode</span>
							<Badge
								variant={
									device.mode === 'grill' || device.mode === 'air fry'
										? 'destructive'
										: device.mode === 'smoker' || device.mode === 'roast'
											? 'default'
											: 'secondary'
								}
							>
								{device.mode
									.split(' ')
									.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
									.join(' ')}
							</Badge>
						</div>
					</CardContent>
				</Card>

				<CookControls />
			</div>
		</div>
	)
}
