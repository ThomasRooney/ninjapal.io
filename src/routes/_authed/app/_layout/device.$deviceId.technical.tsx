import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useZero } from '@/hooks/use-typed-zero'
import { useQuery } from '@rocicorp/zero/react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
	'/_authed/app/_layout/device/$deviceId/technical',
)({
	component: DeviceTechnicalPage,
	ssr: false,
})

function DeviceTechnicalPage() {
	const { deviceId } = Route.useParams()
	const z = useZero()

	const [devices] = useQuery(z.query.devices.where('id', deviceId))
	const device = devices?.[0]

	if (!device) {
		return null
	}

	return (
		<div className='space-y-4'>
			<Card>
				<CardHeader>
					<CardTitle>Device Information</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className='space-y-3'>
						<div>
							<dt className='text-sm text-muted-foreground'>
								Firmware Version
							</dt>
							<dd className='font-mono text-sm'>
								{device.ota_fw_version || '—'}
							</dd>
						</div>
						<div>
							<dt className='text-sm text-muted-foreground'>WiFi Firmware</dt>
							<dd className='font-mono text-sm'>
								{device.wifi_fw_version || '—'}
							</dd>
						</div>
						<div>
							<dt className='text-sm text-muted-foreground'>
								Main PCB Version
							</dt>
							<dd className='font-mono text-sm'>
								{device.main_pcb_fw_version || '—'}
							</dd>
						</div>
						<div>
							<dt className='text-sm text-muted-foreground'>OEM Model</dt>
							<dd className='font-mono text-sm'>{device.oem_model || '—'}</dd>
						</div>
						<div>
							<dt className='text-sm text-muted-foreground'>Build Factory</dt>
							<dd className='font-mono text-sm'>
								{device.build_factory || '—'}
							</dd>
						</div>
						<div>
							<dt className='text-sm text-muted-foreground'>Device Type</dt>
							<dd>{device.device_type || '—'}</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Location & Sync</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className='space-y-3'>
						<div>
							<dt className='text-sm text-muted-foreground'>Location</dt>
							<dd>
								{device.lat && device.lng
									? `${device.lat}, ${device.lng}`
									: '—'}
								{device.locality && ` (${device.locality})`}
							</dd>
						</div>
						<div>
							<dt className='text-sm text-muted-foreground'>Last Connected</dt>
							<dd>
								{device.connected_at
									? new Date(device.connected_at).toLocaleString()
									: '—'}
							</dd>
						</div>
						<div>
							<dt className='text-sm text-muted-foreground'>Last Synced</dt>
							<dd>
								{device.lastSyncedAt
									? new Date(device.lastSyncedAt).toLocaleString()
									: '—'}
							</dd>
						</div>
					</dl>
				</CardContent>
			</Card>
		</div>
	)
}
