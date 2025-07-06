import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useZero } from '@/hooks/use-typed-zero'
import { formatTemperature } from '@/lib/temperature-utils'
import type { GrillState } from '@/types/grill'
import { useQuery } from '@rocicorp/zero/react'
import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'

export const Route = createFileRoute(
	'/_authed/app/_layout/device/$deviceId/status',
)({
	component: DeviceStatusPage,
	ssr: false,
})

function DeviceStatusPage() {
	const { deviceId } = Route.useParams()
	const z = useZero()

	// Get the current user from route context
	const { user } = Route.useRouteContext()
	const [zeroUser] = useQuery(z.query.users.where('id', user?.id || '').one())

	const [devices] = useQuery(z.query.devices.where('id', deviceId))
	const device = devices?.[0]

	const parseJsonSafely = (jsonString: string | null) => {
		if (!jsonString) return null
		try {
			return JSON.parse(jsonString)
		} catch {
			return null
		}
	}

	const grillState = device
		? (parseJsonSafely(device.grill_state_raw) as GrillState | null)
		: null

	if (!device) {
		return null
	}

	return (
		<div className='space-y-4'>
			<Card>
				<CardHeader>
					<CardTitle>Connection Status</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3'>
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<p className='text-sm text-muted-foreground'>LAN IP</p>
							<p className='font-mono'>{device.lanIp || '—'}</p>
						</div>
						<div>
							<p className='text-sm text-muted-foreground'>MAC Address</p>
							<p className='font-mono'>{device.mac || '—'}</p>
						</div>
						<div>
							<p className='text-sm text-muted-foreground'>WiFi Signal</p>
							<p>{device.rssi ? `${device.rssi} dBm` : '—'}</p>
						</div>
						<div>
							<p className='text-sm text-muted-foreground'>Bluetooth Signal</p>
							<p>{device.bt_rssi ? `${device.bt_rssi} dBm` : '—'}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{grillState && (
				<Card>
					<CardHeader>
						<CardTitle>Grill Status</CardTitle>
					</CardHeader>
					<CardContent className='space-y-3'>
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<p className='text-sm text-muted-foreground'>State</p>
								<p className='capitalize'>{grillState.state || '—'}</p>
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Mode</p>
								<p className='capitalize'>{grillState.mode || '—'}</p>
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Setpoint</p>
								<p>
									{grillState.setpoint
										? formatTemperature(
												grillState.setpoint,
												zeroUser?.prefers_celsius ?? false,
											)
										: '—'}
								</p>
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Smoke</p>
								<p>{grillState.smoke ? 'On' : 'Off'}</p>
							</div>
							<div>
								<p className='text-sm text-muted-foreground'>Lid</p>
								<p>{grillState.inputs?.io?.['lid open'] ? 'Open' : 'Closed'}</p>
							</div>
						</div>
						{grillState.message && (
							<Alert>
								<AlertCircle className='h-4 w-4' />
								<AlertTitle>Message</AlertTitle>
								<AlertDescription>{grillState.message}</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	)
}
