import type { TempPoint } from '@/lib/cook-analysis'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'

/** Minimal inline trend line (no axes/grid) for the trailing window. */
export function Sparkline({
	points,
	color = '#3b82f6',
	height = 28,
}: {
	points: TempPoint[]
	color?: string
	height?: number
}) {
	if (points.length < 2) return <div style={{ height }} />
	return (
		<div style={{ height }} className='w-full'>
			<ResponsiveContainer width='100%' height='100%'>
				<LineChart
					data={points.map((p) => ({ t: p.t, v: p.value }))}
					margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
				>
					<YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
					<Line
						type='monotone'
						dataKey='v'
						stroke={color}
						strokeWidth={1.5}
						dot={false}
						isAnimationActive={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	)
}
