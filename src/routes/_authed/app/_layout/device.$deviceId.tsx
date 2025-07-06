import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCountdown } from '@/hooks/useCountdown'
import { formatTemperature } from '@/lib/temperature-utils'
import { createDb } from '@/server/db/db'
import * as schema from '@/server/db/schema'
import { deviceHistory } from '@/server/db/schema'
import { useQuery, useZero } from '@rocicorp/zero/react'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import {
	Activity,
	AlertCircle,
	Clock,
	History,
	Loader2,
	Thermometer,
	Wifi,
	WifiOff,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type ChangeRecord = { field: string; old?: any; new?: any }
type HistoryEntry = {
	id: number
	operation: string
	recordedAt: string | Date
	changedBy: string | null
	changes: ChangeRecord[]
}

const getDeviceHistory = createServerFn({
	method: 'GET',
})
	.validator((input: { deviceId: string }) => input)
	.handler(async ({ data }) => {
		const { deviceId } = data
		const databaseUrl =
			process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL
		if (!databaseUrl) {
			throw new Error('Database URL not configured')
		}

		const db = await createDb(databaseUrl, schema)

		// Fetch device history records
		const historyRecords = await db
			.select()
			.from(deviceHistory)
			.where(eq(deviceHistory.deviceId, deviceId))
			.orderBy(desc(deviceHistory.recordedAt))
			.limit(50)

		// Process records to extract changes in a UI-friendly format
		return historyRecords.map((record) => {
			const changes = record.changes as Record<string, unknown>
			let changesList: ChangeRecord[] = []

			if (record.operation === 'UPDATE' && typeof changes === 'object') {
				// For UPDATE, changes should be in format { field: { old: x, new: y } }
				changesList = Object.entries(changes).map(([field, change]) => ({
					field,
					old: (change as { old?: unknown; new?: unknown })?.old,
					new: (change as { old?: unknown; new?: unknown })?.new,
				}))
			} else if (record.operation === 'INSERT' && typeof changes === 'object') {
				// For INSERT, changes contains the full initial record
				changesList = Object.entries(changes)
					.filter(
						([field]) =>
							field !== 'id' &&
							field !== 'userId' &&
							field !== 'createdAt' &&
							field !== 'updatedAt',
					)
					.map(([field, value]) => ({
						field,
						new: value,
					}))
			} else if (record.operation === 'DELETE' && typeof changes === 'object') {
				// For DELETE, changes contains the final state
				changesList = Object.entries(changes)
					.filter(
						([field]) =>
							field !== 'id' &&
							field !== 'userId' &&
							field !== 'createdAt' &&
							field !== 'updatedAt',
					)
					.map(([field, value]) => ({
						field,
						old: value,
					}))
			}

			return {
				id: record.id,
				operation: record.operation,
				recordedAt: record.recordedAt,
				changedBy: record.changedBy,
				changes: changesList,
			}
		})
	})

export const Route = createFileRoute('/_authed/app/_layout/device/$deviceId')({
	component: DeviceDetailPage,
	ssr: false,
})

interface CookTimeDisplayProps {
	device: {
		estimated_end_at?: string | null
	}
	grillState: {
		'seconds left'?: number
		'seconds set'?: number
	} | null
}

function CookTimeDisplay({ device, grillState }: CookTimeDisplayProps) {
	// Calculate estimated end time from available data - memoized to prevent recalculation on every tick
	const estimatedEndTime = useMemo(() => {
		// First, check if we have estimated_end_at in the database
		if (device.estimated_end_at) {
			return device.estimated_end_at
		}

		// Otherwise, calculate from seconds left if available
		if (grillState?.['seconds left'] && grillState['seconds left'] > 0) {
			const endTime = new Date()
			endTime.setSeconds(endTime.getSeconds() + grillState['seconds left'])
			return endTime.toISOString()
		}

		return null
	}, [device.estimated_end_at, grillState])

	const countdown = useCountdown(estimatedEndTime)

	// Check if timer has expired
	const isExpired = estimatedEndTime && new Date(estimatedEndTime) <= new Date()

	return (
		<div className='flex items-center justify-between'>
			<Clock className='h-5 w-5 text-muted-foreground' />
			<div className='text-right'>
				{estimatedEndTime && !isExpired ? (
					<>
						<p className='text-xl font-semibold font-mono'>
							{countdown.formatted}
						</p>
						{grillState?.['seconds set'] && (
							<p className='text-sm text-muted-foreground'>
								of {Math.floor(grillState['seconds set'] / 60)}m total
							</p>
						)}
					</>
				) : grillState?.['seconds left'] ? (
					<>
						<p className='text-xl font-semibold'>Timer Complete</p>
						<p className='text-sm text-muted-foreground'>Cook time finished</p>
					</>
				) : (
					<p className='text-xl font-semibold'>—</p>
				)}
			</div>
		</div>
	)
}

function DeviceDetailPage() {
	const { deviceId } = Route.useParams()
	const z = useZero()
	const [devices] = useQuery(z.query.devices.where('id', deviceId))

	// Get the current user from route context
	const { user } = Route.useRouteContext()
	const [zeroUser] = useQuery(z.query.users.where('id', user?.id || '').one())

	const device = devices?.[0]

	if (devices && !device) {
		return null
	}

	if (!devices) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<Loader2 className='h-8 w-8 animate-spin' />
			</div>
		)
	}

	const parseJsonSafely = (jsonString: string | null) => {
		if (!jsonString) return null
		try {
			return JSON.parse(jsonString)
		} catch {
			return null
		}
	}

	interface Probe {
		name: string
		'plugged in': number
		active: number
		temp: number
		progress: number
	}

	const grillState = parseJsonSafely(device.grill_state_raw)
	const probeState = parseJsonSafely(device.probe_state_raw)

	return (
		<div className='container mx-auto p-6 max-w-6xl'>
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

			<Tabs defaultValue='overview' className='space-y-4'>
				<TabsList>
					<TabsTrigger value='overview'>Overview</TabsTrigger>
					<TabsTrigger value='status'>Status</TabsTrigger>
					<TabsTrigger value='technical'>Technical</TabsTrigger>
					<TabsTrigger value='history'>History</TabsTrigger>
					<TabsTrigger value='raw'>Raw Data</TabsTrigger>
				</TabsList>

				<TabsContent value='overview' className='space-y-4'>
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
						<Card>
							<CardHeader className='pb-3'>
								<CardTitle className='text-base font-medium'>
									Temperature
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className='flex items-center justify-between'>
									<Thermometer className='h-5 w-5 text-muted-foreground' />
									<div className='text-right'>
										<p
											className='text-2xl font-bold'
											data-testid='temperature-display'
										>
											{grillState?.inputs?.temps?.grill
												? formatTemperature(
														grillState.inputs.temps.grill,
														zeroUser?.prefers_celsius ?? false,
													)
												: '—'}
										</p>
										{device.temperature_setpoint && (
											<p className='text-sm text-muted-foreground'>
												Target:{' '}
												{formatTemperature(
													device.temperature_setpoint,
													zeroUser?.prefers_celsius ?? false,
												)}
											</p>
										)}
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<CardTitle className='text-base font-medium'>
									Cook Mode
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className='flex items-center justify-between'>
									<Activity className='h-5 w-5 text-muted-foreground' />
									<div className='text-right'>
										<p className='text-xl font-semibold capitalize'>
											{grillState?.mode || device.cooking_mode || '—'}
										</p>
										<p className='text-sm text-muted-foreground capitalize'>
											{grillState?.state || device.cooking_state || 'Idle'}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='pb-3'>
								<CardTitle className='text-base font-medium'>
									Cook Time
								</CardTitle>
							</CardHeader>
							<CardContent>
								<CookTimeDisplay device={device} grillState={grillState} />
							</CardContent>
						</Card>
					</div>

					{probeState?.probes && probeState.probes.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Probes</CardTitle>
								<CardDescription>Temperature probe readings</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-3'>
									{probeState.probes.map((probe: Probe) => (
										<div
											key={probe.name}
											className='flex items-center justify-between p-3 rounded-lg bg-muted/50'
										>
											<div>
												<p className='font-medium capitalize'>
													{probe.name.replace('probe', 'Probe ')}
												</p>
												<p className='text-sm text-muted-foreground'>
													{probe['plugged in'] ? 'Connected' : 'Not connected'}
												</p>
											</div>
											{probe['plugged in'] && (
												<div className='text-right'>
													<p className='text-xl font-semibold'>
														{formatTemperature(
															probe.temp,
															zeroUser?.prefers_celsius ?? false,
														)}
													</p>
													{probe.progress < 100 && (
														<p className='text-sm text-muted-foreground'>
															{probe.progress}% done
														</p>
													)}
												</div>
											)}
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				<TabsContent value='status' className='space-y-4'>
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
									<p className='text-sm text-muted-foreground'>
										Bluetooth Signal
									</p>
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
										<p className='text-sm text-muted-foreground'>Smoke Level</p>
										<p>{grillState.smoke || device.cook_smoke_level || '—'}</p>
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
				</TabsContent>

				<TabsContent value='technical' className='space-y-4'>
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
									<dt className='text-sm text-muted-foreground'>
										WiFi Firmware
									</dt>
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
										{device.oem_model || '—'}
									</dd>
								</div>
								<div>
									<dt className='text-sm text-muted-foreground'>
										Build Factory
									</dt>
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
									<dt className='text-sm text-muted-foreground'>
										Last Connected
									</dt>
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
				</TabsContent>

				<TabsContent value='history' className='space-y-4'>
					<DeviceHistoryView deviceId={deviceId} />
				</TabsContent>

				<TabsContent value='raw' className='space-y-4'>
					<Card>
						<CardHeader>
							<CardTitle>Raw Device Data</CardTitle>
							<CardDescription>
								Complete device record from the database
							</CardDescription>
						</CardHeader>
						<CardContent>
							<pre className='text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[600px]'>
								{JSON.stringify(device, null, 2)}
							</pre>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	)
}

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
}

function DeviceHistoryView({ deviceId }: { deviceId: string }) {
	const [history, setHistory] = useState<HistoryEntry[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		async function fetchHistory() {
			try {
				setLoading(true)
				const data = await getDeviceHistory({ data: { deviceId } })
				setHistory(data)
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load history')
			} finally {
				setLoading(false)
			}
		}

		fetchHistory()
	}, [deviceId])

	if (loading) {
		return (
			<div className='flex items-center justify-center p-8'>
				<Loader2 className='h-6 w-6 animate-spin' />
			</div>
		)
	}

	if (error) {
		return (
			<Alert variant='destructive'>
				<AlertCircle className='h-4 w-4' />
				<AlertTitle>Error</AlertTitle>
				<AlertDescription>{error}</AlertDescription>
			</Alert>
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

	const formatFieldValue = (value: any): string => {
		if (value === null || value === undefined) return '—'
		if (typeof value === 'boolean') return value ? 'Yes' : 'No'
		if (typeof value === 'number') return value.toString()
		if (value instanceof Date) return value.toLocaleString()
		return String(value)
	}

	const getFieldDisplayName = (field: string): string => {
		return (
			FIELD_NAME_MAP[field] ||
			field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
		)
	}

	return (
		<div className='space-y-4'>
			{history.map((entry) => (
				<Card key={entry.id}>
					<CardHeader className='pb-3'>
						<div className='flex items-center justify-between'>
							<CardTitle className='text-base'>
								{entry.operation === 'INSERT' && 'Device Created'}
								{entry.operation === 'UPDATE' && 'Device Updated'}
								{entry.operation === 'DELETE' && 'Device Deleted'}
							</CardTitle>
							<span className='text-sm text-muted-foreground'>
								{new Date(entry.recordedAt).toLocaleString()}
							</span>
						</div>
					</CardHeader>
					{entry.changes.length > 0 && (
						<CardContent>
							<div className='space-y-2'>
								{entry.changes.map((change: ChangeRecord, idx: number) => (
									<div
										key={`${entry.id}-${change.field}-${idx}`}
										className='flex items-start justify-between text-sm'
									>
										<span className='font-medium mr-2'>
											{getFieldDisplayName(change.field)}:
										</span>
										<div className='text-right'>
											{change.old !== undefined && change.new !== undefined ? (
												<>
													<span className='text-muted-foreground'>
														{formatFieldValue(change.old)}
													</span>
													<span className='mx-2'>→</span>
													<span>{formatFieldValue(change.new)}</span>
												</>
											) : change.new !== undefined ? (
												<span className='text-green-600 dark:text-green-400'>
													{formatFieldValue(change.new)}
												</span>
											) : (
												<span className='text-red-600 dark:text-red-400 line-through'>
													{formatFieldValue(change.old)}
												</span>
											)}
										</div>
									</div>
								))}
							</div>
						</CardContent>
					)}
				</Card>
			))}
		</div>
	)
}
