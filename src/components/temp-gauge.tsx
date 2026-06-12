import { formatTemperature } from '@/lib/temperature-utils'
import { cn } from '@/lib/utils'

interface TempGaugeProps {
	label: string
	/** Current temperature °C */
	valueC: number | null
	/** Gauge target/setpoint °C — drawn as a tick; also sets the scale */
	setpointC?: number | null
	prefersCelsius: boolean
	size?: number
	className?: string
}

/**
 * Radial temperature gauge: 270° arc, fill animates to the current value,
 * tick at the setpoint. Scale runs 0 → ~130% of setpoint (or 300°C).
 */
export function TempGauge({
	label,
	valueC,
	setpointC,
	prefersCelsius,
	size = 120,
	className,
}: TempGaugeProps) {
	const maxC = setpointC ? Math.max(setpointC * 1.3, 60) : 300
	const fraction = valueC != null ? Math.max(0, Math.min(1, valueC / maxC)) : 0
	const setFraction =
		setpointC != null ? Math.max(0, Math.min(1, setpointC / maxC)) : null

	const r = (size - 16) / 2
	const cx = size / 2
	const cy = size / 2
	const startAngle = 135
	const sweep = 270
	const circumference = 2 * Math.PI * r
	const arcLen = (sweep / 360) * circumference

	// Color: blue cold → amber near temp → red over
	let color = '#3b82f6'
	if (setpointC != null && valueC != null) {
		const ratio = valueC / setpointC
		if (ratio > 1.05) color = '#dc2626'
		else if (ratio > 0.9) color = '#22c55e'
		else if (ratio > 0.6) color = '#f59e0b'
	}

	const tickAngle =
		setFraction != null ? startAngle + sweep * setFraction : null

	return (
		<div
			className={cn('flex flex-col items-center', className)}
			data-testid={`gauge-${label.toLowerCase().replace(/\s+/g, '-')}`}
		>
			<div className='relative' style={{ width: size, height: size }}>
				<svg width={size} height={size} role='img' aria-label={label}>
					<title>{label}</title>
					{/* Track */}
					<circle
						cx={cx}
						cy={cy}
						r={r}
						fill='none'
						stroke='currentColor'
						strokeOpacity={0.12}
						strokeWidth={8}
						strokeLinecap='round'
						strokeDasharray={`${arcLen} ${circumference}`}
						transform={`rotate(${startAngle} ${cx} ${cy})`}
					/>
					{/* Fill */}
					<circle
						cx={cx}
						cy={cy}
						r={r}
						fill='none'
						stroke={color}
						strokeWidth={8}
						strokeLinecap='round'
						strokeDasharray={`${arcLen * fraction} ${circumference}`}
						transform={`rotate(${startAngle} ${cx} ${cy})`}
						style={{
							transition: 'stroke-dasharray 0.8s ease, stroke 0.8s ease',
						}}
					/>
					{/* Setpoint tick */}
					{tickAngle != null && (
						<line
							x1={cx + (r - 7) * Math.cos((tickAngle * Math.PI) / 180)}
							y1={cy + (r - 7) * Math.sin((tickAngle * Math.PI) / 180)}
							x2={cx + (r + 7) * Math.cos((tickAngle * Math.PI) / 180)}
							y2={cy + (r + 7) * Math.sin((tickAngle * Math.PI) / 180)}
							stroke='currentColor'
							strokeOpacity={0.6}
							strokeWidth={2}
						/>
					)}
				</svg>
				<div className='absolute inset-0 flex flex-col items-center justify-center'>
					<span className='text-xl font-bold tabular-nums'>
						{valueC != null
							? formatTemperature(Math.round(valueC * 10) / 10, prefersCelsius)
							: '—'}
					</span>
					{setpointC != null && (
						<span className='text-[10px] text-muted-foreground'>
							/ {formatTemperature(setpointC, prefersCelsius)}
						</span>
					)}
				</div>
			</div>
			<span className='mt-1 text-xs font-medium text-muted-foreground'>
				{label}
			</span>
		</div>
	)
}
