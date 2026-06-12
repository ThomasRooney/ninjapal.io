import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useZero } from '@/hooks/use-typed-zero'
import { type TempPoint, detectStall, projectETA } from '@/lib/cook-analysis'
import { reconstructHistorySnapshots } from '@/lib/historyUtils'
import { celsiusToFahrenheit, formatTemperature } from '@/lib/temperature-utils'
import { useQuery } from '@rocicorp/zero/react'
import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
	Brush,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ReferenceArea,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'

export type GraphSeries = {
	attributeName: string
	name: string
	color: string
}

const RANGE_OPTIONS = [
	{ label: '1h', hours: 1 },
	{ label: '6h', hours: 6 },
	{ label: '24h', hours: 24 },
	{ label: 'All', hours: 24 * 30 },
] as const

interface TemperatureGraphProps {
	deviceId: string
	series: GraphSeries[]
	prefersCelsius: boolean
	className?: string
	/** Fixed window (session view); hides the range picker */
	window?: { start: number; end: number }
	/** Default range when the picker is shown */
	timeWindowHours?: number
	/** Grill setpoint (°C) — drawn as a reference line */
	setpointC?: number | null
	/** Probe doneness target (°C) — reference line + ETA projection */
	probeTargetC?: number | null
	/** Live cook: project the probe's ETA as a dotted line */
	live?: boolean
	title?: string
}

export function TemperatureGraph({
	deviceId,
	series,
	prefersCelsius,
	className,
	window: fixedWindow,
	timeWindowHours = 6,
	setpointC,
	probeTargetC,
	live = false,
	title = 'Temperature History',
}: TemperatureGraphProps) {
	const z = useZero()
	const [rangeHours, setRangeHours] = useState(timeWindowHours)

	const startTime = useMemo(() => {
		if (fixedWindow) return fixedWindow.start
		return Date.now() - rangeHours * 3_600_000
	}, [fixedWindow, rangeHours])
	const endTime = fixedWindow?.end

	// Most recent snapshot before the window (baseline for reconstruction)
	const [baselineSnapshot] = useQuery(
		z.query.deviceHistory
			.where('deviceId', deviceId)
			.where('historyType', 'snapshot')
			.where('recordedAt', '<=', startTime)
			.orderBy('recordedAt', 'desc')
			.limit(1),
	)

	const [windowRecords] = useQuery(
		endTime
			? z.query.deviceHistory
					.where('deviceId', deviceId)
					.where('recordedAt', '>', startTime)
					.where('recordedAt', '<=', endTime)
					.orderBy('recordedAt', 'desc')
			: z.query.deviceHistory
					.where('deviceId', deviceId)
					.where('recordedAt', '>', startTime)
					.orderBy('recordedAt', 'desc'),
	)

	const { chartData, bands, probeSeries } = useMemo(() => {
		const empty = {
			chartData: [] as Array<Record<string, number | null>>,
			bands: {
				lid: [] as Array<{ start: number; end: number }>,
				stall: [] as Array<{ start: number; end: number }>,
			},
			probeSeries: [] as TempPoint[],
		}
		if (!windowRecords) return empty

		const allRecords = []
		if (baselineSnapshot?.[0]) allRecords.push(baselineSnapshot[0])
		allRecords.push(...windowRecords)
		if (allRecords.length === 0) return empty

		const snapshots = reconstructHistorySnapshots(allRecords)
			.filter((s) => s.recordedAt && s.recordedAt > startTime)
			.reverse() // chronological

		const chartData = snapshots.map((snapshot) => {
			const dataPoint: Record<string, number | null> = {
				time: snapshot.recordedAt || 0,
			}
			for (const s of series) {
				const value = snapshot.state[s.attributeName]
				dataPoint[s.attributeName] = typeof value === 'number' ? value : null
			}
			return dataPoint
		})

		// Lid-open shading from reconstructed io state
		const lid: Array<{ start: number; end: number }> = []
		let lidStart: number | null = null
		for (const s of snapshots) {
			const open = s.state.is_lid_open === true
			const t = s.recordedAt as number
			if (open && lidStart === null) lidStart = t
			if (!open && lidStart !== null) {
				lid.push({ start: lidStart, end: t })
				lidStart = null
			}
		}
		if (lidStart !== null && snapshots.length) {
			lid.push({
				start: lidStart,
				end: snapshots[snapshots.length - 1].recordedAt as number,
			})
		}

		// Stall regions on the first probe series present
		const probeAttr = series.find((s) =>
			s.attributeName.startsWith('probe'),
		)?.attributeName
		const probeSeries: TempPoint[] = probeAttr
			? chartData
					.filter((d) => typeof d[probeAttr] === 'number')
					.map((d) => ({ t: d.time as number, value: d[probeAttr] as number }))
			: []
		const stall = detectStall(probeSeries).regions

		return { chartData, bands: { lid, stall }, probeSeries }
	}, [windowRecords, baselineSnapshot, series, startTime])

	// ETA projection for live cooks with a probe target
	const projection = useMemo(() => {
		if (!live || !probeTargetC || probeSeries.length < 3) return null
		const result = projectETA(probeSeries, probeTargetC)
		return result.etaMs ? result : null
	}, [live, probeTargetC, probeSeries])

	const mergedData = useMemo(() => {
		if (!projection) return chartData
		const projected = projection.projection.map((p) => ({
			time: p.t,
			__projection: p.value,
		}))
		// Anchor: connect projection to the last real point
		const last = chartData[chartData.length - 1]
		const probeAttr = series.find((s) =>
			s.attributeName.startsWith('probe'),
		)?.attributeName
		if (last && probeAttr) {
			return [
				...chartData.slice(0, -1),
				{ ...last, __projection: last[probeAttr] },
				...projected,
			]
		}
		return [...chartData, ...projected]
	}, [chartData, projection, series])

	const formatTick = (temp: number) =>
		String(prefersCelsius ? temp : (celsiusToFahrenheit(temp) ?? temp))
	const formatTime = (unixTime: number) =>
		new Date(unixTime).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
		})

	if (windowRecords === undefined || baselineSnapshot === undefined) {
		return (
			<Card className={className}>
				<CardContent className='flex items-center justify-center h-[400px]'>
					<Loader2 className='h-6 w-6 animate-spin' />
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className={className} data-testid='temperature-graph'>
			<CardHeader className='flex flex-row items-center justify-between space-y-0'>
				<CardTitle>{title}</CardTitle>
				{!fixedWindow && (
					<div className='flex gap-1'>
						{RANGE_OPTIONS.map((opt) => (
							<Button
								key={opt.label}
								size='sm'
								variant={rangeHours === opt.hours ? 'default' : 'outline'}
								className='h-7 px-2 text-xs'
								data-testid={`graph-range-${opt.label}`}
								onClick={() => setRangeHours(opt.hours)}
							>
								{opt.label}
							</Button>
						))}
					</div>
				)}
			</CardHeader>
			<CardContent>
				{chartData.length === 0 ? (
					<div className='flex items-center justify-center h-[300px]'>
						<p className='text-muted-foreground'>
							No temperature data available for the selected time period
						</p>
					</div>
				) : (
					<div className='h-[340px] w-full'>
						<ResponsiveContainer width='100%' height='100%'>
							<LineChart data={mergedData}>
								<CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
								<XAxis
									dataKey='time'
									type='number'
									domain={['dataMin', 'dataMax']}
									tickFormatter={formatTime}
									className='text-xs'
								/>
								<YAxis
									tickFormatter={formatTick}
									className='text-xs'
									domain={['auto', 'auto']}
									label={{
										value: prefersCelsius ? '°C' : '°F',
										position: 'insideLeft',
										style: { textAnchor: 'middle' },
									}}
								/>
								<Tooltip
									labelFormatter={(unixTime) =>
										new Date(unixTime as number).toLocaleString()
									}
									formatter={(value, name) => [
										formatTemperature(value as number, prefersCelsius),
										name === '__projection' ? 'Projected' : name,
									]}
									contentStyle={{
										backgroundColor: 'hsl(var(--background))',
										border: '1px solid hsl(var(--border))',
										borderRadius: '6px',
									}}
								/>
								<Legend
									formatter={(value) =>
										value === '__projection' ? 'Projected' : value
									}
								/>

								{/* Lid-open shading */}
								{bands.lid.map((b) => (
									<ReferenceArea
										key={`lid-${b.start}`}
										x1={b.start}
										x2={b.end}
										fill='#f59e0b'
										fillOpacity={0.12}
									/>
								))}
								{/* Stall shading + badge */}
								{bands.stall.map((b, i) => (
									<ReferenceArea
										key={`stall-${b.start}`}
										x1={b.start}
										x2={b.end}
										fill='#8b5cf6'
										fillOpacity={0.1}
										label={
											i === 0
												? {
														value: 'the stall 😤',
														position: 'insideTop',
														fill: '#8b5cf6',
														fontSize: 12,
													}
												: undefined
										}
									/>
								))}

								{/* Setpoint + target reference lines */}
								{setpointC != null && (
									<ReferenceLine
										y={setpointC}
										stroke='#ef4444'
										strokeDasharray='6 4'
										strokeOpacity={0.6}
										label={{
											value: `set ${formatTemperature(setpointC, prefersCelsius)}`,
											position: 'right',
											fill: '#ef4444',
											fontSize: 11,
										}}
									/>
								)}
								{probeTargetC != null && (
									<ReferenceLine
										y={probeTargetC}
										stroke='#f59e0b'
										strokeDasharray='6 4'
										strokeOpacity={0.7}
										label={{
											value: `target ${formatTemperature(probeTargetC, prefersCelsius)}`,
											position: 'right',
											fill: '#f59e0b',
											fontSize: 11,
										}}
									/>
								)}

								{series.map((s) => (
									<Line
										key={s.attributeName}
										type='monotone'
										dataKey={s.attributeName}
										name={s.name}
										stroke={s.color}
										strokeWidth={2}
										dot={false}
										connectNulls={false}
										isAnimationActive={false}
									/>
								))}
								{projection && (
									<Line
										type='monotone'
										dataKey='__projection'
										name='__projection'
										stroke='#f59e0b'
										strokeWidth={2}
										strokeDasharray='4 5'
										strokeOpacity={0.7}
										dot={false}
										isAnimationActive={false}
									/>
								)}

								<Brush
									dataKey='time'
									height={24}
									travellerWidth={8}
									stroke='hsl(var(--muted-foreground))'
									tickFormatter={formatTime}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				)}

				{projection?.etaMs && (
					<p
						className='mt-2 text-sm text-muted-foreground text-center'
						data-testid='eta-display'
					>
						At {projection.ratePerHour.toFixed(1)}°C/h, probe hits{' '}
						{formatTemperature(probeTargetC as number, prefersCelsius)} around{' '}
						<span className='font-semibold text-foreground'>
							{new Date(projection.etaMs).toLocaleTimeString([], {
								hour: '2-digit',
								minute: '2-digit',
							})}
						</span>
					</p>
				)}

				<GraphStats
					chartData={chartData}
					series={series}
					prefersCelsius={prefersCelsius}
				/>
			</CardContent>
		</Card>
	)
}

function GraphStats({
	chartData,
	series,
	prefersCelsius,
}: {
	chartData: Array<Record<string, number | null>>
	series: GraphSeries[]
	prefersCelsius: boolean
}) {
	const stats = useMemo(() => {
		if (!chartData || chartData.length === 0) return null
		const result: Record<
			string,
			{ min: number; max: number; avg: number; current: number | null }
		> = {}
		for (const s of series) {
			const values = chartData
				.map((d) => d[s.attributeName])
				.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
			if (values.length > 0) {
				result[s.attributeName] = {
					min: Math.min(...values),
					max: Math.max(...values),
					avg: values.reduce((a, b) => a + b, 0) / values.length,
					current: values[values.length - 1],
				}
			}
		}
		return result
	}, [chartData, series])

	if (!stats) return null
	return (
		<div className='mt-6 grid grid-cols-2 md:grid-cols-4 gap-4'>
			{series.map((s) => {
				const seriesStats = stats[s.attributeName]
				if (!seriesStats) return null
				return (
					<div key={s.attributeName} className='space-y-1'>
						<p className='text-sm font-medium text-muted-foreground'>
							{s.name}
						</p>
						<div className='text-xs space-y-0.5'>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Current:</span>
								<span className='font-medium'>
									{seriesStats.current !== null
										? formatTemperature(seriesStats.current, prefersCelsius)
										: '—'}
								</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Min:</span>
								<span>
									{formatTemperature(seriesStats.min, prefersCelsius)}
								</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Max:</span>
								<span>
									{formatTemperature(seriesStats.max, prefersCelsius)}
								</span>
							</div>
							<div className='flex justify-between'>
								<span className='text-muted-foreground'>Avg:</span>
								<span>
									{formatTemperature(
										Math.round(seriesStats.avg),
										prefersCelsius,
									)}
								</span>
							</div>
						</div>
					</div>
				)
			})}
		</div>
	)
}
