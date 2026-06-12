import { Sparkline } from '@/components/sparkline'
import { TempGauge } from '@/components/temp-gauge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCookTelemetry } from '@/hooks/use-cook-telemetry'
import { useZero } from '@/hooks/use-typed-zero'
import { projectETA } from '@/lib/cook-analysis'
import { detectStall } from '@/lib/cook-analysis'
import {
	celsiusToFahrenheit,
	fahrenheitToCelsius,
	formatTemperature,
} from '@/lib/temperature-utils'
import { Flame, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'

const SPARK_WINDOW_MS = 45 * 60 * 1000

/** Gauge cluster + sparklines for the pit (grill/chamber/exhaust). */
export function PitGauges({
	deviceId,
	setpointC,
	prefersCelsius,
}: {
	deviceId: string
	setpointC: number | null
	prefersCelsius: boolean
}) {
	const { seriesOf } = useCookTelemetry(deviceId, 4)
	const cutoff = Date.now() - SPARK_WINDOW_MS

	const cells = [
		{ label: 'Grill', key: 'temp_grill', color: '#ef4444', withSetpoint: true },
		{ label: 'Chamber', key: 'temp_air', color: '#3b82f6', withSetpoint: true },
		{
			label: 'Exhaust',
			key: 'temp_smoke',
			color: '#94a3b8',
			withSetpoint: false,
		},
	]

	return (
		<div className='grid grid-cols-3 gap-2'>
			{cells.map((cell) => {
				const series = seriesOf(cell.key)
				const spark = series.filter((p) => p.t >= cutoff)
				const current = series.length ? series[series.length - 1].value : null
				return (
					<div key={cell.key} className='flex flex-col items-center'>
						<TempGauge
							label={cell.label}
							valueC={current}
							setpointC={cell.withSetpoint ? setpointC : null}
							prefersCelsius={prefersCelsius}
							size={104}
						/>
						<div className='w-full px-1'>
							<Sparkline points={spark} color={cell.color} />
						</div>
					</div>
				)
			})}
		</div>
	)
}

/** Live stall indicator for the cook status card. */
export function StallBadge({ deviceId }: { deviceId: string }) {
	const { seriesOf } = useCookTelemetry(deviceId, 4)
	const stall = useMemo(
		() => detectStall(seriesOf('probe1_temp_a')),
		[seriesOf],
	)
	if (!stall.inStall) return null
	const mins = Math.round(stall.currentStallMs / 60000)
	return (
		<div
			className='inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 px-2.5 py-0.5 text-xs font-semibold'
			data-testid='stall-badge'
		>
			<span className='inline-block h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse' />
			THE STALL —{' '}
			{mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}
		</div>
	)
}

/** Live ETA readout for the cook status card. */
export function EtaLine({
	deviceId,
	targetC,
	prefersCelsius,
}: {
	deviceId: string
	targetC: number | null
	prefersCelsius: boolean
}) {
	const { seriesOf } = useCookTelemetry(deviceId, 4)
	const eta = useMemo(() => {
		if (!targetC) return null
		const result = projectETA(seriesOf('probe1_temp_a'), targetC)
		return result.etaMs ? result : null
	}, [seriesOf, targetC])

	if (!eta?.etaMs || !targetC) return null
	return (
		<div className='flex items-center justify-between'>
			<span className='text-sm text-muted-foreground'>
				Probe → {formatTemperature(targetC, prefersCelsius)}
			</span>
			<span className='text-sm font-semibold' data-testid='overview-eta'>
				~
				{new Date(eta.etaMs).toLocaleTimeString([], {
					hour: '2-digit',
					minute: '2-digit',
				})}
			</span>
		</div>
	)
}

interface ProbeRowProps {
	deviceId: string
	probeIndex: 1 | 2
	name: string
	active: boolean
	tempC: number | null
	targetC: number | null
	prefersCelsius: boolean
}

function ProgressRing({
	fraction,
	size = 44,
}: { fraction: number; size?: number }) {
	const r = size / 2 - 4
	const c = 2 * Math.PI * r
	const filled = Math.max(0, Math.min(1, fraction))
	return (
		<svg width={size} height={size} className='-rotate-90'>
			<title>progress</title>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill='none'
				stroke='currentColor'
				strokeOpacity={0.15}
				strokeWidth={4}
			/>
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill='none'
				stroke={filled >= 1 ? '#22c55e' : '#f59e0b'}
				strokeWidth={4}
				strokeLinecap='round'
				strokeDasharray={`${c * filled} ${c}`}
				style={{ transition: 'stroke-dasharray 0.8s ease' }}
			/>
		</svg>
	)
}

/** A probe row: progress ring to target, temp, editable doneness target. */
export function ProbeRow({
	deviceId,
	probeIndex,
	name,
	active,
	tempC,
	targetC,
	prefersCelsius,
}: ProbeRowProps) {
	const z = useZero()
	const { seriesOf } = useCookTelemetry(deviceId, 4)
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState('')

	const spark = seriesOf(`probe${probeIndex}_temp_a`).filter(
		(p) => p.t >= Date.now() - SPARK_WINDOW_MS,
	)
	const fraction = tempC != null && targetC ? tempC / targetC : 0
	const pct = Math.min(100, Math.round(fraction * 100))

	async function saveTarget() {
		const display = Number.parseFloat(draft)
		if (Number.isNaN(display)) {
			setEditing(false)
			return
		}
		const c = prefersCelsius
			? display
			: (fahrenheitToCelsius(display) ?? display)
		await z.mutate.devices.update({
			id: deviceId,
			data: { [`probe${probeIndex}_target_temp`]: Math.round(c * 10) / 10 },
		})
		setEditing(false)
	}

	return (
		<div
			className={`flex items-center gap-3 p-3 rounded-lg ${
				active ? 'bg-primary/10' : 'bg-muted/50'
			}`}
			data-testid={`probe-row-${probeIndex}`}
		>
			<div className='relative shrink-0'>
				<ProgressRing fraction={fraction} />
				<span className='absolute inset-0 flex items-center justify-center text-[10px] font-bold rotate-0'>
					{targetC ? `${pct}%` : '—'}
				</span>
			</div>
			<div className='flex-1 min-w-0'>
				<p className='font-medium capitalize'>{name}</p>
				{editing ? (
					<div className='flex items-center gap-1 mt-1'>
						<Input
							autoFocus
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && saveTarget()}
							className='h-7 w-20 text-sm'
							placeholder={prefersCelsius ? '°C' : '°F'}
							data-testid={`probe-target-input-${probeIndex}`}
						/>
						<Button
							size='sm'
							className='h-7 px-2 text-xs'
							onClick={saveTarget}
							data-testid={`probe-target-save-${probeIndex}`}
						>
							Set
						</Button>
					</div>
				) : (
					<button
						type='button'
						className='flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
						onClick={() => {
							setDraft(
								targetC
									? String(
											prefersCelsius
												? targetC
												: Math.round(celsiusToFahrenheit(targetC) ?? targetC),
										)
									: '',
							)
							setEditing(true)
						}}
						data-testid={`probe-target-edit-${probeIndex}`}
					>
						<Flame className='h-3 w-3' />
						{targetC
							? `target ${formatTemperature(targetC, prefersCelsius)}`
							: 'set target'}
						<Pencil className='h-3 w-3 opacity-50' />
					</button>
				)}
				<div className='mt-1'>
					<Sparkline points={spark} color='#f59e0b' height={20} />
				</div>
			</div>
			<div className='text-right shrink-0'>
				<p className='text-xl font-semibold tabular-nums'>
					{tempC != null ? formatTemperature(tempC, prefersCelsius) : '—'}
				</p>
				<p className='text-xs text-muted-foreground'>
					{active ? 'Active' : 'Monitoring'}
				</p>
			</div>
		</div>
	)
}
