import { Badge } from '@/components/ui/badge'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { mockDevices } from '@/lib/mock-data'

interface DeviceSelectorProps {
	value: string
	onValueChange: (value: string) => void
}

export default function DeviceSelector({
	value,
	onValueChange,
}: DeviceSelectorProps) {
	const selectedDevice =
		mockDevices.find((d) => d.dsn === value) || mockDevices[0]

	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger className='w-[220px]'>
				<SelectValue>
					<div className='flex items-center gap-2'>
						<span className='truncate'>{selectedDevice.product_name}</span>
						<Badge
							variant={
								selectedDevice.connection_status === 'Online'
									? 'default'
									: 'secondary'
							}
							className='text-xs'
						>
							{selectedDevice.connection_status}
						</Badge>
					</div>
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{mockDevices.map((device) => (
					<SelectItem key={device.dsn} value={device.dsn}>
						<div className='flex items-center justify-between w-full gap-2'>
							<span>{device.product_name}</span>
							<Badge
								variant={
									device.connection_status === 'Online'
										? 'default'
										: 'secondary'
								}
								className='text-xs'
							>
								{device.connection_status}
							</Badge>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
