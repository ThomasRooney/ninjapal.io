import { TemperatureGraph } from '@/components/temperature-graph'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useZero } from '@/hooks/use-typed-zero'
import { useCountdown } from '@/hooks/useCountdown'
import { useGrillViewModel } from '@/hooks/useGrillViewModel'
import { formatTemperature } from '@/lib/temperature-utils'
import type { GrillState, ProbeState } from '@/types/grill'
import { useQuery } from '@rocicorp/zero/react'
import {
	Link,
	Outlet,
	createFileRoute,
	useMatchRoute,
} from '@tanstack/react-router'
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	CloudSnow,
	DoorOpen,
	Flame,
	Loader2,
	Thermometer,
	Wifi,
	WifiOff,
} from 'lucide-react'
import { useMemo } from 'react'

export const Route = createFileRoute('/_authed/app/_layout/device/$deviceId')({
	component: DeviceDetailLayout,
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

interface DeviceOverviewPageProps {
	device: {
		id: string
		cooking_mode?: string | null
		cooking_state?: string | null
		estimated_end_at?: string | null
		grill_state_raw?: string | null
		probe_state_raw?: string | null
		[key: string]: unknown
	}
	zeroUser:
		| {
				prefers_celsius?: boolean | null
				[key: string]: unknown
		  }
		| undefined
}

function DeviceOverviewPage({ device, zeroUser }: DeviceOverviewPageProps) {
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
	const probeState = device
		? (parseJsonSafely(device.probe_state_raw) as ProbeState | null)
		: null
	const viewModel = useGrillViewModel(
		grillState,
		probeState,
		device.connectionStatus,
	)

	if (!device) {
		return null
	}

	return (
		<div className='space-y-4 pb-8'>
			{/* Primary cards row */}
			<div className='grid gap-4 md:grid-cols-2'>
				{/* Cook Status Card - Enhanced */}
				<Card>
					<CardHeader>
						<CardTitle>Cook Status</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='flex items-center justify-between'>
							<div>
								<p className='text-sm text-muted-foreground'>Mode</p>
								<p className='text-lg font-semibold capitalize'>
									{grillState?.mode || device.cooking_mode || '—'}
								</p>
							</div>
							<div className='text-right'>
								<p className='text-sm text-muted-foreground'>State</p>
								<p className='text-lg font-semibold capitalize'>
									{grillState?.state || device.cooking_state || 'Idle'}
								</p>
							</div>
						</div>

						<div className='space-y-2'>
							<div className='flex items-center justify-between'>
								<span className='text-sm text-muted-foreground'>
									Grill Temperature
								</span>
								<div className='flex items-center gap-2'>
									<span
										className='text-2xl font-bold'
										data-testid='temperature-display'
									>
										{grillState?.inputs?.temps?.grill
											? formatTemperature(
													grillState.inputs.temps.grill,
													zeroUser?.prefers_celsius ?? false,
												)
											: '—'}
									</span>
									{grillState?.setpoint && (
										<span className='text-sm text-muted-foreground'>
											/{' '}
											{formatTemperature(
												grillState.setpoint,
												zeroUser?.prefers_celsius ?? false,
											)}
										</span>
									)}
								</div>
							</div>

							<CookTimeDisplay device={device} grillState={grillState} />
						</div>
					</CardContent>
				</Card>

				{/* Grill Environment Card */}
				<Card>
					<CardHeader>
						<CardTitle>Grill Environment</CardTitle>
						<CardDescription>Temperature readings</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='space-y-3'>
							{viewModel?.displayTemperatures.map((temp) => (
								<div
									key={temp.name}
									className='flex items-center justify-between'
								>
									<div className='flex items-center gap-2'>
										{temp.name === 'Chamber' && (
											<Thermometer className='h-4 w-4 text-muted-foreground' />
										)}
										{temp.name === 'Exhaust' && (
											<CloudSnow className='h-4 w-4 text-muted-foreground' />
										)}
										{temp.name === 'Grill' && (
											<Flame className='h-4 w-4 text-muted-foreground' />
										)}
										<span className='text-sm font-medium'>{temp.name}</span>
									</div>
									<span className='text-lg font-semibold'>
										{formatTemperature(
											temp.temp,
											zeroUser?.prefers_celsius ?? false,
										)}
									</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Secondary cards row */}
			<div className='grid gap-4 md:grid-cols-2'>
				{/* System Vitals Card */}
				<Card>
					<CardHeader>
						<CardTitle>System Vitals</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='space-y-3'>
							{/* System Status */}
							{viewModel?.deviceStatus === 'Offline' ? (
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<WifiOff className='h-4 w-4 text-muted-foreground' />
										<span className='text-sm font-medium'>Status</span>
									</div>
									<span className='text-sm text-muted-foreground font-medium'>
										Offline
									</span>
								</div>
							) : viewModel?.errorStatus.hasError ? (
								<Alert variant='destructive'>
									<AlertCircle className='h-4 w-4' />
									<AlertTitle>Error</AlertTitle>
									<AlertDescription>
										{viewModel.errorStatus.message}
									</AlertDescription>
								</Alert>
							) : (
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										<CheckCircle2 className='h-4 w-4 text-green-600' />
										<span className='text-sm font-medium'>Status</span>
									</div>
									<span className='text-sm text-green-600 font-medium'>OK</span>
								</div>
							)}

							{/* Lid Status */}
							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-2'>
									<DoorOpen className='h-4 w-4 text-muted-foreground' />
									<span className='text-sm font-medium'>Lid</span>
								</div>
								<span
									className={`text-sm font-medium ${
										viewModel?.deviceStatus === 'Offline'
											? 'text-muted-foreground'
											: viewModel?.lidIsOpen
												? 'text-yellow-600'
												: 'text-muted-foreground'
									}`}
								>
									{viewModel?.deviceStatus === 'Offline'
										? '—'
										: viewModel?.lidIsOpen
											? 'Open'
											: 'Closed'}
								</span>
							</div>

							{/* Smoke Status */}
							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-2'>
									<CloudSnow className='h-4 w-4 text-muted-foreground' />
									<span className='text-sm font-medium'>Smoke</span>
								</div>
								<span className='text-sm font-medium'>
									{viewModel?.deviceStatus === 'Offline'
										? '—'
										: viewModel?.smokeIsOn
											? 'On'
											: 'Off'}
								</span>
							</div>

							{/* Active Probes Count */}
							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-2'>
									<Thermometer className='h-4 w-4 text-muted-foreground' />
									<span className='text-sm font-medium'>Active Probes</span>
								</div>
								<span className='text-sm font-medium'>
									{viewModel?.deviceStatus === 'Offline'
										? '—'
										: (viewModel?.activeProbeCount ?? 0)}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Food Probes Card - Conditional */}
				{viewModel?.connectedProbes && viewModel.connectedProbes.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Food Probes</CardTitle>
							<CardDescription>Temperature probe readings</CardDescription>
						</CardHeader>
						<CardContent>
							<div className='space-y-3'>
								{viewModel.connectedProbes.map((probe) => (
									<div
										key={probe.name}
										className={`flex items-center justify-between p-3 rounded-lg ${
											probe.active ? 'bg-primary/10' : 'bg-muted/50'
										}`}
									>
										<div>
											<p className='font-medium capitalize'>
												{probe.name.replace('probe', 'Probe ')}
											</p>
											<p className='text-sm text-muted-foreground'>
												{probe.active ? 'Active' : 'Monitoring'}
											</p>
										</div>
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
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			{/* Temperature History Graph */}
			<TemperatureGraph
				deviceId={device.id}
				prefersCelsius={zeroUser?.prefers_celsius ?? false}
				series={[
					{ attributeName: 'temp_grill', name: 'Grill Temp', color: '#ef4444' },
					{ attributeName: 'temp_air', name: 'Air Temp', color: '#3b82f6' },
				]}
				className='mt-4 mb-8'
			/>
		</div>
	)
}

function DeviceDetailLayout() {
	const { deviceId } = Route.useParams()
	const z = useZero()
	const matchRoute = useMatchRoute()

	// Check if we're on the index route using the route's own path
	const isIndex = matchRoute({ to: Route.fullPath, fuzzy: false })

	// Get the current user from route context
	const { user } = Route.useRouteContext()
	const [zeroUser] = useQuery(z.query.users.where('id', user?.id || '').one())

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

			{/* Conditionally render overview or child routes */}
			{isIndex ? (
				<DeviceOverviewPage device={device} zeroUser={zeroUser} />
			) : (
				<Outlet />
			)}
		</div>
	)
}
