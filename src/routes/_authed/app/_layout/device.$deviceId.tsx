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
import { getSupabaseServerClient } from '@/lib/supabase'
import { formatTemperature } from '@/lib/temperature-utils'
import { createDb } from '@/server/db/db'
import * as schema from '@/server/db/schema'
import { users } from '@/server/db/schema'
import { useQuery, useZero } from '@rocicorp/zero/react'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import {
	Activity,
	AlertCircle,
	Clock,
	Loader2,
	Thermometer,
	Wifi,
	WifiOff,
} from 'lucide-react'

const getUserPreferences = createServerFn({
	method: 'GET',
}).handler(async () => {
	const supabase = await getSupabaseServerClient()
	const {
		data: { session },
	} = await supabase.auth.getSession()

	if (!session?.user?.id) {
		return { prefers_celsius: false }
	}

	const databaseUrl =
		process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL
	if (!databaseUrl) {
		throw new Error('Database URL not configured')
	}

	const db = await createDb(databaseUrl, schema)
	const result = await db
		.select({ prefers_celsius: users.prefers_celsius })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1)

	return { prefers_celsius: result[0]?.prefers_celsius ?? false }
})

export const Route = createFileRoute('/_authed/app/_layout/device/$deviceId')({
	component: DeviceDetailPage,
	ssr: false,
	loader: async () => {
		const preferences = await getUserPreferences()
		return { preferences }
	},
})

function DeviceDetailPage() {
	const { deviceId } = Route.useParams()
	const { preferences } = Route.useLoaderData()
	const z = useZero()
	const [devices] = useQuery(z.query.devices.where('id', deviceId))

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
										<p className='text-2xl font-bold' data-testid='temperature-display'>
											{grillState?.inputs?.temps?.grill
												? formatTemperature(
														grillState.inputs.temps.grill,
														preferences.prefers_celsius,
													)
												: '—'}
										</p>
										{device.temperature_setpoint && (
											<p className='text-sm text-muted-foreground'>
												Target:{' '}
												{formatTemperature(
													device.temperature_setpoint,
													preferences.prefers_celsius,
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
								<div className='flex items-center justify-between'>
									<Clock className='h-5 w-5 text-muted-foreground' />
									<div className='text-right'>
										<p className='text-xl font-semibold'>
											{grillState?.['seconds left']
												? `${Math.floor(grillState['seconds left'] / 60)}m`
												: '—'}
										</p>
										{grillState?.['seconds set'] && (
											<p className='text-sm text-muted-foreground'>
												of {Math.floor(grillState['seconds set'] / 60)}m
											</p>
										)}
									</div>
								</div>
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
															preferences.prefers_celsius,
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
														preferences.prefers_celsius,
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
