import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart'
import {
	type TemperatureDataPoint,
	generateTemperatureData,
} from '@/lib/mock-data'
import { useMemo } from 'react'
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from 'recharts'

const chartConfig = {
	temp: {
		label: 'Grill Temperature',
		color: 'hsl(var(--chart-1))',
	},
	thermometer1: {
		label: 'Thermometer 1',
		color: 'hsl(var(--chart-2))',
	},
	thermometer2: {
		label: 'Thermometer 2',
		color: 'hsl(var(--chart-3))',
	},
} satisfies ChartConfig

export default function TemperatureChart() {
	const data = useMemo(() => generateTemperatureData(), [])

	return (
		<Card>
			<CardHeader>
				<CardTitle>Temperature History</CardTitle>
				<CardDescription>Last 4 hours of cooking data</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className='h-[400px] w-full'>
					<ResponsiveContainer width='100%' height='100%'>
						<AreaChart data={data}>
							<defs>
								<linearGradient id='grillGradient' x1='0' y1='0' x2='0' y2='1'>
									<stop
										offset='5%'
										stopColor='hsl(var(--chart-1))'
										stopOpacity={0.8}
									/>
									<stop
										offset='95%'
										stopColor='hsl(var(--chart-1))'
										stopOpacity={0.1}
									/>
								</linearGradient>
								<linearGradient
									id='thermo1Gradient'
									x1='0'
									y1='0'
									x2='0'
									y2='1'
								>
									<stop
										offset='5%'
										stopColor='hsl(var(--chart-2))'
										stopOpacity={0.8}
									/>
									<stop
										offset='95%'
										stopColor='hsl(var(--chart-2))'
										stopOpacity={0.1}
									/>
								</linearGradient>
								<linearGradient
									id='thermo2Gradient'
									x1='0'
									y1='0'
									x2='0'
									y2='1'
								>
									<stop
										offset='5%'
										stopColor='hsl(var(--chart-3))'
										stopOpacity={0.8}
									/>
									<stop
										offset='95%'
										stopColor='hsl(var(--chart-3))'
										stopOpacity={0.1}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
							<XAxis
								dataKey='time'
								className='text-xs'
								tick={{ fill: 'hsl(var(--foreground))' }}
							/>
							<YAxis
								className='text-xs'
								tick={{ fill: 'hsl(var(--foreground))' }}
								label={{
									value: 'Temperature (°F)',
									angle: -90,
									position: 'insideLeft',
								}}
							/>
							<ChartTooltip content={<ChartTooltipContent />} />
							<Area
								type='monotone'
								dataKey='temp'
								stroke='hsl(var(--chart-1))'
								strokeWidth={2}
								fill='url(#grillGradient)'
								fillOpacity={0.4}
							/>
							<Area
								type='monotone'
								dataKey='thermometer1'
								stroke='hsl(var(--chart-2))'
								strokeWidth={2}
								fill='url(#thermo1Gradient)'
								fillOpacity={0.4}
							/>
							<Area
								type='monotone'
								dataKey='thermometer2'
								stroke='hsl(var(--chart-3))'
								strokeWidth={2}
								fill='url(#thermo2Gradient)'
								fillOpacity={0.4}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}
