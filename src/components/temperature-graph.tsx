import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useZero } from '@/hooks/use-typed-zero'
import { type TempPoint, detectStall, projectETA } from '@/lib/cook-analysis'
import { reconstructHistorySnapshots } from '@/lib/historyUtils'
import { celsiusToFahrenheit, formatTemperature } from '@/lib/temperature-utils'
import { cn } from '@/lib/utils'
import { useQuery } from '@rocicorp/zero/react'
import { Loader2 } from 'lucide-react'
import { type PointerEvent, useMemo, useState } from 'react'

export type GraphSeries = {
	attributeName: string
	name: string
	color: string
}

type ChartDataPoint = Record<string, number | null>

const CHART = {
	background: 'var(--background)',
	border: 'var(--border)',
	foreground: 'var(--foreground)',
	muted: 'var(--muted-foreground)',
	popover: 'var(--popover)',
	popoverForeground: 'var(--popover-foreground)',
	lid: 'var(--chart-5)',
	stall: 'var(--chart-4)',
	target: 'var(--chart-4)',
	projection: 'var(--chart-5)',
} as const

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

	const { chartData, bands, probeSeries, setpointSeries } = useMemo(() => {
		const empty = {
			chartData: [] as Array<Record<string, number | null>>,
			bands: {
				lid: [] as Array<{ start: number; end: number }>,
				stall: [] as Array<{ start: number; end: number }>,
			},
			probeSeries: [] as TempPoint[],
			setpointSeries: [] as TempPoint[],
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
		const setpointSeries = buildSetpointSeries(
			snapshots.map((snapshot) => ({
				recordedAt: snapshot.recordedAt,
				state: snapshot.state,
			})),
		)

		return { chartData, bands: { lid, stall }, probeSeries, setpointSeries }
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
		<Card className={cn('min-w-0', className)} data-testid='temperature-graph'>
			<CardHeader className='flex flex-col items-start justify-between gap-3 space-y-0 sm:flex-row sm:items-center'>
				<CardTitle>{title}</CardTitle>
				{!fixedWindow && (
					<div className='flex flex-wrap gap-1 sm:justify-end'>
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
					<MarketingTemperaturePlot
						data={mergedData}
						realData={chartData}
						series={series}
						bands={bands}
						prefersCelsius={prefersCelsius}
						setpointC={setpointC}
						setpointSeries={setpointSeries}
						probeTargetC={probeTargetC}
					/>
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

const SVG_WIDTH = 760
const SVG_HEIGHT = 260
const PLOT_LEFT = 48
const PLOT_RIGHT = 736
const PLOT_TOP = 24
const PLOT_BOTTOM = 204

function MarketingTemperaturePlot({
	data,
	realData,
	series,
	bands,
	prefersCelsius,
	setpointC,
	setpointSeries,
	probeTargetC,
}: {
	data: ChartDataPoint[]
	realData: ChartDataPoint[]
	series: GraphSeries[]
	bands: {
		lid: Array<{ start: number; end: number }>
		stall: Array<{ start: number; end: number }>
	}
	prefersCelsius: boolean
	setpointC?: number | null
	setpointSeries: TempPoint[]
	probeTargetC?: number | null
}) {
	const [hoverIndex, setHoverIndex] = useState<number | null>(null)

	const plot = useMemo(() => {
		const points = data.filter((d) => typeof d.time === 'number')
		const times = points.map((d) => d.time as number)
		const rawMin = Math.min(...times)
		const rawMax = Math.max(...times)
		const padMs = 60_000
		const xMin = rawMin === rawMax ? rawMin - padMs : rawMin
		const xMax = rawMin === rawMax ? rawMax + padMs : rawMax

		const values: number[] = []
		for (const point of points) {
			for (const s of series) {
				const value = point[s.attributeName]
				if (typeof value === 'number' && Number.isFinite(value)) {
					values.push(value)
				}
			}
			const projected = point.__projection
			if (typeof projected === 'number' && Number.isFinite(projected)) {
				values.push(projected)
			}
		}
		for (const point of setpointSeries) values.push(point.value)
		if (setpointC != null && setpointSeries.length === 0) values.push(setpointC)
		if (probeTargetC != null) values.push(probeTargetC)

		const domain = niceTemperatureDomain(values)
		const xFor = (time: number) =>
			PLOT_LEFT +
			((time - xMin) / Math.max(1, xMax - xMin)) * (PLOT_RIGHT - PLOT_LEFT)
		const yFor = (temp: number) =>
			PLOT_BOTTOM -
			((temp - domain.min) / Math.max(1, domain.max - domain.min)) *
				(PLOT_BOTTOM - PLOT_TOP)

		return {
			points,
			xMin,
			xMax,
			xFor,
			yFor,
			yTicks: domain.ticks,
			xTicks: buildTimeTicks(xMin, xMax),
		}
	}, [data, probeTargetC, series, setpointC, setpointSeries])

	if (plot.points.length === 0) return null

	const lastReal =
		realData[realData.length - 1] ?? plot.points[plot.points.length - 1]
	const latestSetpointC =
		setpointSeries[setpointSeries.length - 1]?.value ?? setpointC ?? null
	const setpointPath =
		setpointSeries.length > 0
			? buildSteppedSetpointPath(
					setpointSeries,
					plot.xMax,
					plot.xFor,
					plot.yFor,
				)
			: null
	const hovered = hoverIndex == null ? null : (plot.points[hoverIndex] ?? null)
	const hoverX =
		hovered && typeof hovered.time === 'number' ? plot.xFor(hovered.time) : null
	const hoverEntries = hovered
		? series
				.map((s) => ({ ...s, value: hovered[s.attributeName] }))
				.filter((entry) => typeof entry.value === 'number')
		: []
	const projectedHover =
		hovered && typeof hovered.__projection === 'number'
			? hovered.__projection
			: null
	const tooltipWidth = 164
	const tooltipHeight =
		34 + (hoverEntries.length + (projectedHover != null ? 1 : 0)) * 18
	const tooltipX =
		hoverX != null && hoverX > SVG_WIDTH - tooltipWidth - 18
			? hoverX - tooltipWidth - 12
			: (hoverX ?? PLOT_LEFT) + 12
	const showPointDots = realData.length < 4

	const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
		const rect = event.currentTarget.getBoundingClientRect()
		const viewX = ((event.clientX - rect.left) / rect.width) * SVG_WIDTH
		const time =
			plot.xMin +
			((viewX - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT)) * (plot.xMax - plot.xMin)
		let nearest = 0
		let nearestDistance = Number.POSITIVE_INFINITY
		for (let i = 0; i < plot.points.length; i++) {
			const pointTime = plot.points[i].time
			if (typeof pointTime !== 'number') continue
			const distance = Math.abs(pointTime - time)
			if (distance < nearestDistance) {
				nearest = i
				nearestDistance = distance
			}
		}
		setHoverIndex(nearest)
	}

	return (
		<div className='overflow-hidden rounded-lg border border-border bg-card p-3 text-card-foreground sm:p-4'>
			<svg
				viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
				className='block w-full'
				role='img'
				aria-label='Temperature timeline'
				onPointerMove={handlePointerMove}
				onPointerLeave={() => setHoverIndex(null)}
			>
				<rect
					width={SVG_WIDTH}
					height={SVG_HEIGHT}
					fill={CHART.background}
					rx='10'
				/>

				{bands.lid.map((band) => (
					<rect
						key={`lid-${band.start}`}
						x={plot.xFor(band.start)}
						y={PLOT_TOP}
						width={Math.max(1, plot.xFor(band.end) - plot.xFor(band.start))}
						height={PLOT_BOTTOM - PLOT_TOP}
						fill={CHART.lid}
						opacity='0.12'
					/>
				))}
				{bands.stall.map((band, index) => (
					<g key={`stall-${band.start}`}>
						<rect
							x={plot.xFor(band.start)}
							y={PLOT_TOP}
							width={Math.max(1, plot.xFor(band.end) - plot.xFor(band.start))}
							height={PLOT_BOTTOM - PLOT_TOP}
							fill={CHART.stall}
							opacity='0.12'
						/>
						{index === 0 && (
							<text
								x={plot.xFor(band.start) + 8}
								y={PLOT_TOP + 18}
								fill={CHART.stall}
								fontSize='12'
								fontFamily='ui-sans-serif, system-ui'
							>
								stall
							</text>
						)}
					</g>
				))}

				<g stroke={CHART.border} strokeWidth='1'>
					{plot.yTicks.map((tick) => (
						<line
							key={`grid-${tick}`}
							x1={PLOT_LEFT}
							x2={PLOT_RIGHT}
							y1={plot.yFor(tick)}
							y2={plot.yFor(tick)}
						/>
					))}
				</g>
				<g
					fill={CHART.muted}
					fontSize='11'
					fontFamily='ui-monospace, monospace'
				>
					{plot.yTicks.map((tick) => (
						<text key={`y-${tick}`} x='6' y={plot.yFor(tick) + 4}>
							{formatAxisTemperature(tick, prefersCelsius)}
						</text>
					))}
					{plot.xTicks.map((tick) => (
						<text
							key={`x-${tick}`}
							x={plot.xFor(tick)}
							y='232'
							textAnchor='middle'
						>
							{formatChartTime(tick)}
						</text>
					))}
				</g>

				{setpointPath ? (
					<g>
						<path
							d={setpointPath}
							fill='none'
							stroke={CHART.foreground}
							strokeWidth='1.5'
							strokeDasharray='5 5'
							opacity='0.55'
						/>
					</g>
				) : (
					setpointC != null && (
						<line
							x1={PLOT_LEFT}
							x2={PLOT_RIGHT}
							y1={plot.yFor(setpointC)}
							y2={plot.yFor(setpointC)}
							stroke={CHART.foreground}
							strokeWidth='1.5'
							strokeDasharray='5 5'
							opacity='0.55'
						/>
					)
				)}
				{latestSetpointC != null && (
					<text
						x={PLOT_RIGHT - 4}
						y={plot.yFor(latestSetpointC) - 7}
						textAnchor='end'
						fill={CHART.foreground}
						opacity='0.8'
						fontSize='11'
						fontFamily='ui-monospace, monospace'
					>
						set {formatTemperature(latestSetpointC, prefersCelsius)}
					</text>
				)}
				{probeTargetC != null && (
					<g>
						<line
							x1={PLOT_LEFT}
							x2={PLOT_RIGHT}
							y1={plot.yFor(probeTargetC)}
							y2={plot.yFor(probeTargetC)}
							stroke={CHART.target}
							strokeWidth='1.5'
							strokeDasharray='5 5'
							opacity='0.6'
						/>
						<text
							x={PLOT_RIGHT - 4}
							y={plot.yFor(probeTargetC) - 7}
							textAnchor='end'
							fill={CHART.target}
							fontSize='11'
							fontFamily='ui-monospace, monospace'
						>
							target {formatTemperature(probeTargetC, prefersCelsius)}
						</text>
					</g>
				)}

				{series.map((s) => (
					<path
						key={s.attributeName}
						d={buildSeriesPath(
							plot.points,
							s.attributeName,
							plot.xFor,
							plot.yFor,
						)}
						fill='none'
						stroke={s.color}
						strokeWidth='2.5'
						strokeLinejoin='round'
						strokeLinecap='round'
					/>
				))}
				<path
					d={buildSeriesPath(plot.points, '__projection', plot.xFor, plot.yFor)}
					fill='none'
					stroke={CHART.projection}
					strokeWidth='2'
					strokeDasharray='4 5'
					strokeLinejoin='round'
					strokeLinecap='round'
					opacity='0.75'
				/>

				{showPointDots &&
					realData.map((point) =>
						series.map((s) => {
							const value = point[s.attributeName]
							if (typeof point.time !== 'number' || typeof value !== 'number') {
								return null
							}
							return (
								<circle
									key={`${point.time}-${s.attributeName}`}
									cx={plot.xFor(point.time)}
									cy={plot.yFor(value)}
									r='3.5'
									fill={s.color}
								/>
							)
						}),
					)}

				{hovered && hoverX != null && (
					<g pointerEvents='none'>
						<line
							x1={hoverX}
							x2={hoverX}
							y1={PLOT_TOP}
							y2={PLOT_BOTTOM}
							stroke={CHART.foreground}
							strokeWidth='1'
							opacity='0.28'
						/>
						{hoverEntries.map((entry) => (
							<circle
								key={`hover-${entry.attributeName}`}
								cx={hoverX}
								cy={plot.yFor(entry.value as number)}
								r='4'
								fill={entry.color}
								stroke={CHART.background}
								strokeWidth='2'
							/>
						))}
						<g transform={`translate(${tooltipX} 30)`}>
							<rect
								width={tooltipWidth}
								height={tooltipHeight}
								rx='8'
								fill={CHART.popover}
								stroke={CHART.border}
							/>
							<text
								x='10'
								y='18'
								fill={CHART.popoverForeground}
								fontSize='11'
								fontFamily='ui-monospace, monospace'
							>
								{formatChartTime(hovered.time as number)}
							</text>
							{hoverEntries.map((entry, index) => (
								<g
									key={`tip-${entry.attributeName}`}
									transform={`translate(10 ${38 + index * 18})`}
								>
									<line
										x1='0'
										x2='16'
										y1='-4'
										y2='-4'
										stroke={entry.color}
										strokeWidth='3'
										strokeLinecap='round'
									/>
									<text
										x='24'
										y='0'
										fill={CHART.popoverForeground}
										fontSize='11'
									>
										{entry.name}{' '}
										{formatTemperature(entry.value as number, prefersCelsius)}
									</text>
								</g>
							))}
							{projectedHover != null && (
								<text
									x='10'
									y={38 + hoverEntries.length * 18}
									fill={CHART.target}
									fontSize='11'
								>
									projected {formatTemperature(projectedHover, prefersCelsius)}
								</text>
							)}
						</g>
					</g>
				)}
			</svg>
			<div className='mt-3 flex flex-wrap gap-x-5 gap-y-2 px-1 text-xs text-muted-foreground'>
				{series.map((s) => (
					<span key={s.attributeName}>
						<span
							className='mr-2 inline-block h-0.5 w-5 rounded align-middle'
							style={{ backgroundColor: s.color }}
						/>
						{s.name}{' '}
						<span className='text-foreground'>
							{formatLatestValue(lastReal, s.attributeName, prefersCelsius)}
						</span>
					</span>
				))}
				{latestSetpointC != null && (
					<span>
						<span className='mr-2 inline-block h-0.5 w-5 rounded bg-foreground align-middle opacity-60' />
						Setpoint{' '}
						<span className='text-foreground'>
							{formatTemperature(latestSetpointC, prefersCelsius)}
						</span>
					</span>
				)}
			</div>
		</div>
	)
}

function buildSeriesPath(
	data: ChartDataPoint[],
	key: string,
	xFor: (time: number) => number,
	yFor: (temp: number) => number,
) {
	let path = ''
	let hasOpenSegment = false
	for (const point of data) {
		const time = point.time
		const value = point[key]
		if (typeof time !== 'number' || typeof value !== 'number') {
			hasOpenSegment = false
			continue
		}
		const command = hasOpenSegment ? 'L' : 'M'
		path += `${command} ${xFor(time).toFixed(2)} ${yFor(value).toFixed(2)} `
		hasOpenSegment = true
	}
	return path.trim()
}

type SetpointSnapshot = {
	recordedAt: number | null
	state: Record<string, unknown>
}

export function buildSetpointSeries(
	snapshots: SetpointSnapshot[],
): TempPoint[] {
	const points: TempPoint[] = []
	for (const snapshot of snapshots) {
		const t = snapshot.recordedAt
		const value = readSetpointC(snapshot.state)
		if (
			typeof t !== 'number' ||
			typeof value !== 'number' ||
			!Number.isFinite(value)
		) {
			continue
		}
		const rounded = Math.round(value * 10) / 10
		if (points[points.length - 1]?.value === rounded) continue
		points.push({ t, value: rounded })
	}
	return points
}

export function buildSteppedSetpointPath(
	points: TempPoint[],
	xEnd: number,
	xFor: (time: number) => number,
	yFor: (temp: number) => number,
) {
	if (points.length === 0) return ''

	const [first, ...rest] = points
	let path = `M ${xFor(first.t).toFixed(2)} ${yFor(first.value).toFixed(2)} `
	let previous = first
	for (const point of rest) {
		path += `L ${xFor(point.t).toFixed(2)} ${yFor(previous.value).toFixed(2)} `
		path += `L ${xFor(point.t).toFixed(2)} ${yFor(point.value).toFixed(2)} `
		previous = point
	}
	path += `L ${xFor(xEnd).toFixed(2)} ${yFor(previous.value).toFixed(2)}`
	return path.trim()
}

function readSetpointC(state: Record<string, unknown>): number | null {
	for (const key of [
		'setpoint',
		'grill_state.setpoint',
		'grillState.setpoint',
	]) {
		const value = state[key]
		if (typeof value === 'number' && Number.isFinite(value)) return value
	}

	for (const key of ['grill_state', 'grillState']) {
		const value = state[key]
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			const setpoint = (value as Record<string, unknown>).setpoint
			if (typeof setpoint === 'number' && Number.isFinite(setpoint)) {
				return setpoint
			}
		}
	}

	const raw = state.grill_state_raw
	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw) as unknown
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				const setpoint = (parsed as Record<string, unknown>).setpoint
				if (typeof setpoint === 'number' && Number.isFinite(setpoint)) {
					return setpoint
				}
			}
		} catch {
			return null
		}
	}
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		const setpoint = (raw as Record<string, unknown>).setpoint
		if (typeof setpoint === 'number' && Number.isFinite(setpoint)) {
			return setpoint
		}
	}

	return null
}

function niceTemperatureDomain(values: number[]) {
	const finite = values.filter((value) => Number.isFinite(value))
	if (finite.length === 0) {
		return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] }
	}
	let min = Math.min(...finite)
	let max = Math.max(...finite)
	if (min === max) {
		min -= 10
		max += 10
	}
	const padding = Math.max(5, (max - min) * 0.12)
	min = Math.max(0, Math.floor((min - padding) / 10) * 10)
	max = Math.ceil((max + padding) / 10) * 10
	if (max - min < 20) max = min + 20
	return { min, max, ticks: buildNumericTicks(min, max, 5) }
}

function buildNumericTicks(min: number, max: number, count: number) {
	return Array.from({ length: count }, (_, index) =>
		Math.round(min + ((max - min) * index) / (count - 1)),
	)
}

function buildTimeTicks(min: number, max: number) {
	return Array.from({ length: 5 }, (_, index) =>
		Math.round(min + ((max - min) * index) / 4),
	)
}

function formatAxisTemperature(tempC: number, prefersCelsius: boolean) {
	const value = prefersCelsius ? tempC : (celsiusToFahrenheit(tempC) ?? tempC)
	return `${Math.round(value)}°`
}

function formatChartTime(time: number) {
	return new Date(time).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
	})
}

function formatLatestValue(
	point: ChartDataPoint | undefined,
	key: string,
	prefersCelsius: boolean,
) {
	const value = point?.[key]
	return typeof value === 'number'
		? formatTemperature(value, prefersCelsius)
		: '--'
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
