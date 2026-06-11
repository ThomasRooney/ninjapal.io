import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useZero } from '@/hooks/use-typed-zero'
import { reconstructHistorySnapshots } from '@/lib/historyUtils'
import { celsiusToFahrenheit, formatTemperature } from '@/lib/temperature-utils'
import { useQuery } from '@rocicorp/zero/react'
import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
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

interface TemperatureGraphProps {
	deviceId: string
	series: GraphSeries[]
	timeWindowHours?: number
	prefersCelsius: boolean
	className?: string
}

export function TemperatureGraph({
	deviceId,
	series,
	timeWindowHours = 6,
	prefersCelsius,
	className,
}: TemperatureGraphProps) {
	const z = useZero()

	// Calculate the start time for the query
	const startTime = useMemo(() => {
		const time = new Date()
		time.setHours(time.getHours() - timeWindowHours)
		return time.getTime()
	}, [timeWindowHours])

	// First, find the most recent snapshot before our time window
	const [baselineSnapshot] = useQuery(
		z.query.deviceHistory
			.where('deviceId', deviceId)
			.where('historyType', 'snapshot')
			.where('recordedAt', '<=', startTime)
			.orderBy('recordedAt', 'desc')
			.limit(1),
	)

	// Then, get all records within our time window
	const [windowRecords] = useQuery(
		z.query.deviceHistory
			.where('deviceId', deviceId)
			.where('recordedAt', '>', startTime)
			.orderBy('recordedAt', 'desc'),
	)

	// Process the data
	const chartData = useMemo(() => {
		if (!windowRecords) return []

		// Combine baseline snapshot (if exists) with window records
		const allRecords = []
		if (baselineSnapshot?.[0]) {
			allRecords.push(baselineSnapshot[0])
		}
		allRecords.push(...windowRecords)

		// If we have no records at all, return empty
		if (allRecords.length === 0) return []

		// Reconstruct full states
		const snapshots = reconstructHistorySnapshots(allRecords)

		// Filter to only include data within our time window
		const filteredSnapshots = snapshots.filter(
			(snapshot) => snapshot.recordedAt && snapshot.recordedAt > startTime,
		)

		// Transform to chart format (chronological order)
		return filteredSnapshots.reverse().map((snapshot) => {
			const dataPoint: Record<string, number | null> = {
				time: snapshot.recordedAt || 0,
			}

			for (const s of series) {
				const value = snapshot.state[s.attributeName]
				dataPoint[s.attributeName] = typeof value === 'number' ? value : null
			}

			return dataPoint
		})
	}, [windowRecords, baselineSnapshot, series, startTime])

	// Calculate stats for each series
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
					current: chartData[chartData.length - 1]?.[s.attributeName] as
						| number
						| null,
				}
			}
		}

		return result
	}, [chartData, series])

	// Loading state
	if (windowRecords === undefined || baselineSnapshot === undefined) {
		return (
			<Card className={className}>
				<CardContent className='flex items-center justify-center h-[400px]'>
					<Loader2 className='h-6 w-6 animate-spin' />
				</CardContent>
			</Card>
		)
	}

	// Empty state
	if (chartData.length === 0) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle>Temperature History</CardTitle>
				</CardHeader>
				<CardContent className='flex items-center justify-center h-[300px]'>
					<p className='text-muted-foreground'>
						No temperature data available for the selected time period
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>Temperature History</CardTitle>
			</CardHeader>
			<CardContent>
				<div className='h-[300px] w-full'>
					<ResponsiveContainer width='100%' height='100%'>
						<LineChart data={chartData}>
							<CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
							<XAxis
								dataKey='time'
								type='number'
								domain={['dataMin', 'dataMax']}
								tickFormatter={(unixTime) =>
									new Date(unixTime).toLocaleTimeString([], {
										hour: '2-digit',
										minute: '2-digit',
									})
								}
								className='text-xs'
							/>
							<YAxis
								tickFormatter={(temp) =>
									String(
										prefersCelsius ? temp : (celsiusToFahrenheit(temp) ?? temp),
									)
								}
								className='text-xs'
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
									name,
								]}
								contentStyle={{
									backgroundColor: 'hsl(var(--background))',
									border: '1px solid hsl(var(--border))',
									borderRadius: '6px',
								}}
							/>
							<Legend />
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
								/>
							))}
						</LineChart>
					</ResponsiveContainer>
				</div>

				{/* Stats section */}
				{stats && (
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
													? formatTemperature(
															seriesStats.current,
															prefersCelsius,
														)
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
				)}
			</CardContent>
		</Card>
	)
}
