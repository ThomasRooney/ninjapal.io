import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useZero } from '@/hooks/use-typed-zero'
import {
	type HistoryChange,
	calculateHistoryDiffs,
	reconstructHistorySnapshots,
} from '@/lib/historyUtils'
import { useQuery } from '@rocicorp/zero/react'
import { createFileRoute } from '@tanstack/react-router'
import { History, Loader2 } from 'lucide-react'
import { useMemo } from 'react'

export const Route = createFileRoute(
	'/_authed/app/_layout/device/$deviceId/history',
)({
	component: DeviceHistoryPage,
	ssr: false,
})

// Field name mapping for better display
const FIELD_NAME_MAP: Record<string, string> = {
	productName: 'Product Name',
	connectionStatus: 'Connection Status',
	lanIp: 'IP Address',
	mac: 'MAC Address',
	rssi: 'WiFi Signal',
	bt_rssi: 'Bluetooth Signal',
	is_lid_open: 'Lid Open',
	temp_air: 'Air Temperature',
	temp_grill: 'Grill Temperature',
	temp_uipcb: 'UI PCB Temperature',
	temp_mainpcb: 'Main PCB Temperature',
	probe1_temp: 'Probe 1 Temperature',
	probe2_temp: 'Probe 2 Temperature',
	cook_mode: 'Cook Mode',
	cook_state: 'Cook State',
	cook_smoke_level: 'Smoke Level',
	power_state: 'Power State',
	error_code: 'Error Code',
	ota_fw_version: 'Firmware Version',
	wifi_fw_version: 'WiFi Firmware',
	main_pcb_fw_version: 'Main PCB Firmware',
	// Mappings for common nested properties
	'additional_device_properties.firmwareVersion': 'Additional Firmware Version',
	'additional_device_properties.hardwareVersion': 'Hardware Version',
	'grill_state.mode': 'Grill Mode',
	'grill_state.state': 'Grill State',
	'grill_state.setpoint': 'Temperature Setpoint',
	'probe_state.probe1.temp': 'Probe 1 Temperature',
	'probe_state.probe2.temp': 'Probe 2 Temperature',
}

function DeviceHistoryPage() {
	const { deviceId } = Route.useParams()
	const z = useZero()
	const [historyRecords] = useQuery(
		z.query.deviceHistory
			.where('deviceId', deviceId)
			.orderBy('recordedAt', 'desc')
			.limit(50),
	)

	// Process the records to extract full device state at each point in time
	// and calculate the differences between consecutive entries
	const history = useMemo(() => {
		if (!historyRecords) return []
		const snapshots = reconstructHistorySnapshots(historyRecords)
		return calculateHistoryDiffs(snapshots)
	}, [historyRecords])

	if (!historyRecords) {
		return (
			<div className='flex items-center justify-center p-8'>
				<Loader2 className='h-6 w-6 animate-spin' />
			</div>
		)
	}

	if (history.length === 0) {
		return (
			<Card>
				<CardContent className='flex flex-col items-center justify-center py-12'>
					<History className='h-12 w-12 text-muted-foreground mb-4' />
					<h3 className='text-lg font-semibold mb-2'>No history available</h3>
					<p className='text-muted-foreground text-center'>
						Device changes will appear here once recorded
					</p>
				</CardContent>
			</Card>
		)
	}

	const formatFieldValue = (value: unknown): string => {
		if (value === null || value === undefined) return '—'
		if (typeof value === 'boolean') return value ? 'Yes' : 'No'
		if (typeof value === 'number') return value.toString()
		if (value instanceof Date) return value.toLocaleString()
		return String(value)
	}

	const getFieldDisplayName = (field: string): string => {
		// First, check for an exact match for full control
		if (FIELD_NAME_MAP[field]) {
			return FIELD_NAME_MAP[field]
		}

		// Fallback for unmapped fields: split by dots, capitalize, and join
		return field
			.split('.')
			.map((part) =>
				part.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
			)
			.join(' → ')
	}

	return (
		<div className='space-y-4'>
			{history.map((entry) => (
				<Card key={entry.id}>
					<CardHeader className='pb-3'>
						<div className='flex items-center justify-between'>
							<CardTitle className='text-base'>
								{entry.historyType === 'snapshot' && 'Hourly Snapshot'}
								{entry.historyType === 'patch' && 'Device State Updated'}
							</CardTitle>
							<span className='text-sm text-muted-foreground'>
								{entry.recordedAt
									? new Date(entry.recordedAt).toLocaleString()
									: '—'}
							</span>
						</div>
					</CardHeader>
					{Object.keys(entry.fields).length > 0 ? (
						<CardContent>
							<div className='space-y-2'>
								{Object.entries(entry.fields)
									.sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
									.map(([field, value]) => (
										<div
											key={`${entry.id}-${field}`}
											className='flex items-start justify-between text-sm'
										>
											<span className='font-medium mr-2'>
												{getFieldDisplayName(field)}:
											</span>
											<span className='text-right'>
												{value.status === 'added' && (
													<span className='text-green-600'>
														{formatFieldValue(value.to)}
													</span>
												)}
												{value.status === 'removed' && (
													<span className='text-red-500 line-through'>
														{formatFieldValue(value.from)}
													</span>
												)}
												{value.status === 'changed' && (
													<>
														<span className='text-red-500 line-through'>
															{formatFieldValue(value.from)}
														</span>
														<span className='mx-1 text-muted-foreground'>
															→
														</span>
														<span className='text-green-600'>
															{formatFieldValue(value.to)}
														</span>
													</>
												)}
											</span>
										</div>
									))}
							</div>
						</CardContent>
					) : (
						<CardContent>
							<p className='text-sm text-muted-foreground'>
								No changes detected in this event.
							</p>
						</CardContent>
					)}
				</Card>
			))}
		</div>
	)
}
