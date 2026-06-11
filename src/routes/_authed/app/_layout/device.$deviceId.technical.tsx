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

	// Fields the Ayla API returns that aren't flattened into columns live in
	// additionalDeviceProperties (see syncRealDevices).
	const extra = (device.additionalDeviceProperties ?? {}) as Record<
		string,
		unknown
	>
	const extraStr = (key: string): string | null =>
		typeof extra[key] === 'string' || typeof extra[key] === 'number'
			? String(extra[key])
			: null

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
							<dd className='font-mono text-sm'>
								{extraStr('oem_model') || '—'}
							</dd>
						</div>
						<div>
							<dt className='text-sm text-muted-foreground'>Build Factory</dt>
							<dd className='font-mono text-sm'>
								{device.build_factory || '—'}
							</dd>
						</div>
						<div>
							<dt className='text-sm text-muted-foreground'>Device Type</dt>
							<dd>{extraStr('device_type') || '—'}</dd>
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
								{extraStr('lat') && extraStr('lng')
									? `${extraStr('lat')}, ${extraStr('lng')}`
									: '—'}
								{extraStr('locality') && ` (${extraStr('locality')})`}
							</dd>
						</div>
						<div>
							<dt className='text-sm text-muted-foreground'>Last Connected</dt>
							<dd>
								{extraStr('connected_at')
									? new Date(
											extraStr('connected_at') as string,
										).toLocaleString()
									: '—'}
							</dd>
						</div>
						<div>
							<dt className='text-sm text-muted-foreground'>Last Synced</dt>
							<dd>
								{extraStr('lastSyncedAt')
									? new Date(
											extraStr('lastSyncedAt') as string,
										).toLocaleString()
									: '—'}
							</dd>
						</div>
					</dl>
				</CardContent>
			</Card>
		</div>
	)
}
