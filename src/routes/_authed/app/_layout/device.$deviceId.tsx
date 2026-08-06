import { CookPhotos } from '@/components/cook-photos'
import { PitChat, SteerResetButton } from '@/components/pit-chat'
import {
	EtaLine,
	PitControl,
	PitGauges,
	ProbeRow,
	StallBadge,
} from '@/components/pit-dashboard'
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
	Bot,
	CheckCircle2,
	Clock,
	CloudSnow,
	DoorOpen,
	Loader2,
	MessageSquareText,
	Thermometer,
	Utensils,
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
		estimated_end_at?: string | number | null
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
		// (Zero delivers timestamps as epoch ms)
		if (device.estimated_end_at) {
			return typeof device.estimated_end_at === 'number'
				? new Date(device.estimated_end_at).toISOString()
				: device.estimated_end_at
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

function formatClockFromSeconds(secondsLeft: number | undefined) {
	if (!secondsLeft || secondsLeft <= 0) return null
	const end = new Date(Date.now() + secondsLeft * 1000)
	return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function numberOrNull(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function PitmasterCommandBand({
	device,
	grillState,
	probeState,
	prefersCelsius,
}: {
	device: DeviceOverviewPageProps['device']
	grillState: GrillState | null
	probeState: ProbeState | null
	prefersCelsius: boolean
}) {
	const grillC = numberOrNull(grillState?.inputs?.temps?.grill)
	const airC = numberOrNull(grillState?.inputs?.temps?.air)
	const probeC =
		device.probe1_temp_a != null ? Number(device.probe1_temp_a) : null
	const setpointC = numberOrNull(grillState?.setpoint)
	const finishAt = formatClockFromSeconds(grillState?.['seconds left'])
	const connectedProbes =
		probeState?.probes.filter((probe) => probe['plugged in'] === 1).length ?? 0
	const autopilotEnabled = device.autopilot_enabled === true

	const phase = autopilotEnabled
		? 'AI managed'
		: grillState?.state?.toLowerCase() === 'cooking'
			? 'Manual cook'
			: 'Ready'

	return (
		<section
			className='relative grid min-w-0 gap-4 overflow-hidden rounded-lg border bg-card p-4 text-card-foreground shadow-sm sm:p-5 lg:grid-cols-[1fr_420px]'
			data-testid='pitmaster-command-band'
		>
			{/* Ember glow bleeding in from the top corner — the pit is lit. */}
			<div
				aria-hidden='true'
				className='pointer-events-none absolute -top-32 -right-20 h-72 w-96 rounded-full bg-primary/10 blur-3xl'
			/>
			<div className='relative min-w-0 space-y-4 sm:space-y-5'>
				<div className='flex flex-wrap items-start justify-between gap-3'>
					<div>
						<div className='mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary'>
							<Bot className='h-3.5 w-3.5' />
							PitMinder
						</div>
						<h2 className='text-2xl font-bold leading-tight sm:text-3xl'>
							Tell it what is cooking and when you want to eat.
						</h2>
						<p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>
							PitMinder turns that sentence into a cook plan, watches the stall,
							projects the finish, and can drop the pit to hold-warm when the
							meat lands.
						</p>
					</div>
					<span
						className={`rounded-full px-3 py-1 text-xs font-bold ${
							autopilotEnabled
								? 'bg-primary text-primary-foreground'
								: 'border bg-secondary text-secondary-foreground'
						}`}
					>
						{phase}
					</span>
				</div>

				<div className='grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4'>
					<BriefStat
						label='Pit'
						value={formatTemperature(grillC, prefersCelsius)}
						sub={
							setpointC != null
								? `set ${formatTemperature(setpointC, prefersCelsius)}`
								: 'setpoint --'
						}
						color='text-chart-1'
					/>
					<BriefStat
						label='Chamber'
						value={formatTemperature(airC, prefersCelsius)}
						sub='live air'
						color='text-chart-2'
					/>
					<BriefStat
						label='Probe 1'
						value={formatTemperature(probeC, prefersCelsius)}
						sub={
							connectedProbes
								? `${connectedProbes} probe connected`
								: 'no probe'
						}
						color='text-chart-3'
					/>
					<BriefStat
						label='Timer'
						value={finishAt ?? '--'}
						sub='estimated finish'
						color='text-success'
					/>
				</div>

				<div className='hidden gap-3 text-sm text-muted-foreground lg:grid lg:grid-cols-3'>
					<div className='flex items-start gap-2 rounded border border-border/70 bg-background/50 p-3'>
						<Utensils className='mt-0.5 h-4 w-4 text-chart-1' />
						<span>
							Say “beef short-rib, bark first, eat at 2pm” and steer from there.
						</span>
					</div>
					<div className='flex items-start gap-2 rounded border border-border/70 bg-background/50 p-3'>
						<Thermometer className='mt-0.5 h-4 w-4 text-chart-3' />
						<span>
							Stall and ETA come from the real probe climb rate, not a canned
							timer.
						</span>
					</div>
					<div className='flex items-start gap-2 rounded border border-border/70 bg-background/50 p-3'>
						<MessageSquareText className='mt-0.5 h-4 w-4 text-chart-2' />
						<span>
							Coaching appears as action cards: spritz, wrap, refill, hold, or
							grab the wheel.
						</span>
					</div>
				</div>
			</div>
			<div className='relative min-w-0 space-y-3'>
				<div className='flex items-start justify-between gap-2'>
					<div>
						<p className='text-sm font-semibold'>Steer this cook</p>
						<p className='hidden text-xs text-muted-foreground sm:block'>
							Ask for a plan, change dinner time, or tell it what you just did.
						</p>
					</div>
					{device.id && <SteerResetButton deviceId={device.id} />}
				</div>
				{device.id && <PitChat deviceId={device.id} />}
			</div>
		</section>
	)
}

function BriefStat({
	label,
	value,
	sub,
	color,
}: {
	label: string
	value: string
	sub: string
	color: string
}) {
	return (
		<div className='rounded border border-border/60 bg-background/50 p-2.5 sm:p-3'>
			<p className='text-xs uppercase tracking-wide text-muted-foreground'>
				{label}
			</p>
			<p className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${color}`}>
				{value}
			</p>
			<p className='mt-0.5 text-xs text-muted-foreground'>{sub}</p>
		</div>
	)
}

interface DeviceOverviewPageProps {
	device: {
		id: string | null
		cooking_mode?: string | null
		cooking_state?: string | null
		estimated_end_at?: string | number | null
		grill_state_raw?: string | null
		probe_state_raw?: string | null
		connectionStatus?: string | null
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
	const parseJsonSafely = (jsonString: string | null | undefined) => {
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
			<PitmasterCommandBand
				device={device}
				grillState={grillState}
				probeState={probeState}
				prefersCelsius={zeroUser?.prefers_celsius ?? false}
			/>

			{/* Live cook graph mirrors the homepage's primary cook timeline. */}
			<TemperatureGraph
				deviceId={device.id ?? ''}
				prefersCelsius={zeroUser?.prefers_celsius ?? false}
				setpointC={
					typeof grillState?.setpoint === 'number' ? grillState.setpoint : null
				}
				probeTargetC={
					device.probe1_target_temp != null
						? Number(device.probe1_target_temp)
						: null
				}
				live={
					typeof grillState?.state === 'string' &&
					['cooking', 'preheating'].includes(grillState.state.toLowerCase())
				}
				title='Live cook timeline'
				series={[
					{
						attributeName: 'temp_grill',
						name: 'Grill Temp',
						color: 'var(--chart-1)',
					},
					{
						attributeName: 'temp_air',
						name: 'Air Temp',
						color: 'var(--chart-2)',
					},
					{
						attributeName: 'probe1_temp_a',
						name: 'Probe 1',
						color: 'var(--chart-3)',
					},
					{
						attributeName: 'probe2_temp_a',
						name: 'Probe 2',
						color: 'var(--chart-4)',
					},
				]}
			/>

			{/* Primary cards row */}
			<div className='grid gap-4 md:grid-cols-2'>
				{/* Cook Status Card - Enhanced */}
				<Card data-testid='device-status'>
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
						<StallBadge deviceId={device.id ?? ''} />

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
							<EtaLine
								deviceId={device.id ?? ''}
								targetC={
									device.probe1_target_temp != null
										? Number(device.probe1_target_temp)
										: null
								}
								prefersCelsius={zeroUser?.prefers_celsius ?? false}
							/>
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
						<PitGauges
							deviceId={device.id ?? ''}
							setpointC={
								typeof grillState?.setpoint === 'number'
									? grillState.setpoint
									: null
							}
							prefersCelsius={zeroUser?.prefers_celsius ?? false}
						/>
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
										<CheckCircle2 className='h-4 w-4 text-success' />
										<span className='text-sm font-medium'>Status</span>
									</div>
									<span className='text-sm text-success font-medium'>OK</span>
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
												? 'text-warning'
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
									<span className='text-sm font-medium'>Connected Probes</span>
								</div>
								<span className='text-sm font-medium'>
									{viewModel?.deviceStatus === 'Offline'
										? '—'
										: (viewModel?.activeProbeCount ?? 0)}
								</span>
							</div>

							<div className='border-t pt-3'>
								<PitControl
									deviceId={device.id ?? ''}
									autopilotEnabled={device.autopilot_enabled === true}
									currentSetpointC={
										typeof grillState?.setpoint === 'number'
											? grillState.setpoint
											: null
									}
									prefersCelsius={zeroUser?.prefers_celsius ?? false}
								/>
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
								{viewModel.connectedProbes.map((probe, idx) => {
									const probeIndex = (idx + 1) as 1 | 2
									const tempKey =
										probeIndex === 1 ? 'probe1_temp_a' : 'probe2_temp_a'
									const targetKey =
										probeIndex === 1
											? 'probe1_target_temp'
											: 'probe2_target_temp'
									return (
										<ProbeRow
											key={probe.name}
											deviceId={device.id ?? ''}
											probeIndex={probeIndex}
											name={`Probe ${probeIndex}`}
											active={probe.active === 1}
											tempC={
												device[tempKey] != null ? Number(device[tempKey]) : null
											}
											targetC={
												device[targetKey] != null
													? Number(device[targetKey])
													: null
											}
											prefersCelsius={zeroUser?.prefers_celsius ?? false}
										/>
									)
								})}
							</div>
						</CardContent>
					</Card>
				)}
			</div>

			<CookPhotos deviceId={device.id ?? ''} />
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
		<div className='mx-auto w-full max-w-6xl min-w-0 px-4 py-4 sm:px-6 sm:py-6'>
			{/* Shared Header */}
			<div className='mb-6'>
				<div className='mb-2 flex flex-wrap items-start justify-between gap-3'>
					<h1 className='min-w-0 text-3xl font-bold break-words'>
						{device.productName || 'Unnamed Device'}
					</h1>
					<Badge
						variant={
							device.connectionStatus === 'Online' ? 'default' : 'secondary'
						}
						className='shrink-0 px-3 py-1 text-base'
					>
						{device.connectionStatus === 'Online' ? (
							<Wifi className='h-4 w-4 mr-1' />
						) : (
							<WifiOff className='h-4 w-4 mr-1' />
						)}
						{device.connectionStatus || 'Unknown'}
					</Badge>
				</div>
				<p className='break-words text-muted-foreground'>
					Model: {device.model || 'Unknown'} • DSN: {device.dsn}
				</p>
			</div>

			{/* Navigation (replaces TabsList) */}
			<div className='mb-4 max-w-full overflow-x-auto pb-1'>
				<div className='inline-flex h-10 min-w-max items-center justify-center rounded-md bg-muted p-1 text-muted-foreground'>
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
