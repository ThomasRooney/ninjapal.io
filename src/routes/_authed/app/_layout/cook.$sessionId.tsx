import { CookReplay } from '@/components/cook-replay'
import NavApp from '@/components/nav-app.tsx'
import { TemperatureGraph } from '@/components/temperature-graph'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCookWindowTelemetry } from '@/hooks/use-cook-window-telemetry'
import { useZero } from '@/hooks/use-typed-zero'
import { detectStall, stabilityScore, tempHistogram } from '@/lib/cook-analysis'
import { formatTemperature } from '@/lib/temperature-utils'
import { useQuery } from '@rocicorp/zero/react'
import { createFileRoute } from '@tanstack/react-router'
import { Flame, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
	Bar,
	BarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'

export const Route = createFileRoute('/_authed/app/_layout/cook/$sessionId')({
	component: CookDetailPage,
	ssr: false,
})

function formatDuration(ms: number): string {
	const mins = Math.round(ms / 60000)
	if (mins < 60) return `${mins}m`
	return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function CookDetailPage() {
	const { sessionId } = Route.useParams()
	const z = useZero()
	const [sessions] = useQuery(z.query.cookSessions.where('id', sessionId))
	const session = sessions?.[0]
	const [users] = useQuery(z.query.users)
	const prefersCelsius = users?.[0]?.prefers_celsius ?? false
	const [editingName, setEditingName] = useState(false)
	const [nameDraft, setNameDraft] = useState('')

	const active = session?.endedAt == null
	const windowStart = session?.startedAt ?? 0
	const windowEnd = session?.endedAt ?? Date.now()

	const { seriesOf, loading } = useCookWindowTelemetry(
		session?.deviceId ?? '',
		windowStart,
		windowEnd,
	)

	const grill = seriesOf('temp_grill')
	const probe = seriesOf('probe1_temp_a')
	const setpoint = session?.setpoint != null ? Number(session.setpoint) : null

	const liveStats = useMemo(() => {
		if (!session) return null
		const stall = detectStall(probe)
		const stallTotal = stall.regions.reduce(
			(acc, r) => acc + (r.end - r.start),
			0,
		)
		return {
			stability:
				session.stability_score ??
				(setpoint != null ? stabilityScore(grill, setpoint) : null),
			stallMs: session.stall_seconds
				? session.stall_seconds * 1000
				: stallTotal,
			peakGrill:
				session.max_temp_grill != null
					? Number(session.max_temp_grill)
					: grill.length
						? Math.max(...grill.map((p) => p.value))
						: null,
			peakProbe:
				session.max_probe1_temp != null
					? Number(session.max_probe1_temp)
					: probe.length
						? Math.max(...probe.map((p) => p.value))
						: null,
		}
	}, [session, grill, probe, setpoint])

	const histogram = useMemo(() => tempHistogram(grill, 5), [grill])

	if (sessions === undefined || loading) {
		return (
			<div className='container flex flex-col min-h-screen'>
				<NavApp title='Cook' />
			</div>
		)
	}
	if (!session) {
		return (
			<div className='container flex flex-col min-h-screen'>
				<NavApp title='Cook' />
				<div className='p-8 text-muted-foreground'>Cook not found.</div>
			</div>
		)
	}

	async function saveName() {
		if (nameDraft.trim()) {
			await z.mutate.cookSessions.rename({
				id: sessionId,
				name: nameDraft.trim(),
			})
		}
		setEditingName(false)
	}

	return (
		<div className='container flex flex-col min-h-screen'>
			<NavApp title={session.name ?? 'Cook'} />
			<div className='p-4 md:p-8 space-y-4'>
				<div className='flex items-center justify-between flex-wrap gap-2'>
					<div className='flex items-center gap-2'>
						{editingName ? (
							<div className='flex items-center gap-2'>
								<Input
									autoFocus
									value={nameDraft}
									onChange={(e) => setNameDraft(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && saveName()}
									className='h-9 w-64 text-xl font-bold'
									data-testid='cook-name-input'
								/>
								<Button
									size='sm'
									onClick={saveName}
									data-testid='cook-name-save'
								>
									Save
								</Button>
							</div>
						) : (
							<h1 className='text-3xl font-bold flex items-center gap-2'>
								{session.name}
								<button
									type='button'
									onClick={() => {
										setNameDraft(session.name ?? '')
										setEditingName(true)
									}}
									className='text-muted-foreground hover:text-foreground'
									data-testid='cook-name-edit'
								>
									<Pencil className='h-4 w-4' />
								</button>
							</h1>
						)}
						{active && (
							<Badge className='bg-green-600'>
								<Flame className='h-3 w-3 mr-1' />
								Live
							</Badge>
						)}
					</div>
					<p className='text-muted-foreground text-sm'>
						{new Date(windowStart).toLocaleString()} ·{' '}
						{formatDuration(windowEnd - windowStart)}
						{session.cook_mode && ` · ${session.cook_mode}`}
					</p>
				</div>

				{/* Stat tiles */}
				<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
					<StatTile
						label='Pit stability'
						value={
							liveStats?.stability != null ? `${liveStats.stability}` : '—'
						}
						sub='/100'
						testid='stat-stability'
					/>
					<StatTile
						label='Peak grill'
						value={
							liveStats?.peakGrill != null
								? formatTemperature(liveStats.peakGrill, prefersCelsius)
								: '—'
						}
						testid='stat-peak-grill'
					/>
					<StatTile
						label='Peak probe'
						value={
							liveStats?.peakProbe != null
								? formatTemperature(liveStats.peakProbe, prefersCelsius)
								: '—'
						}
						testid='stat-peak-probe'
					/>
					<StatTile
						label='Time stalled'
						value={
							liveStats?.stallMs ? formatDuration(liveStats.stallMs) : '0m'
						}
						sub={
							session.lid_open_count != null
								? `lid ×${session.lid_open_count}`
								: undefined
						}
						testid='stat-stall'
					/>
				</div>

				{/* Full-session graph */}
				<TemperatureGraph
					deviceId={session.deviceId ?? ''}
					prefersCelsius={prefersCelsius}
					window={{ start: windowStart, end: windowEnd }}
					setpointC={setpoint}
					title='Cook timeline'
					series={[
						{ attributeName: 'temp_grill', name: 'Grill', color: '#ef4444' },
						{ attributeName: 'temp_air', name: 'Chamber', color: '#3b82f6' },
						{
							attributeName: 'probe1_temp_a',
							name: 'Probe 1',
							color: '#f59e0b',
						},
					]}
				/>

				<div className='grid gap-4 md:grid-cols-2'>
					{/* Temperature distribution */}
					<Card data-testid='temp-histogram'>
						<CardHeader>
							<CardTitle>Grill temperature distribution</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='h-[200px]'>
								<ResponsiveContainer width='100%' height='100%'>
									<BarChart data={histogram}>
										<XAxis
											dataKey='from'
											tickFormatter={(v) =>
												formatTemperature(v, prefersCelsius, undefined)
											}
											className='text-xs'
										/>
										<YAxis hide />
										<Tooltip
											formatter={(value) => [`${value} readings`, 'count']}
											labelFormatter={(v) =>
												`${formatTemperature(Number(v), prefersCelsius)} bucket`
											}
										/>
										<Bar dataKey='count' fill='#ef4444' radius={[3, 3, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>

					{/* Replay */}
					<CookReplay
						deviceId={session.deviceId ?? ''}
						start={windowStart}
						end={windowEnd}
						setpointC={setpoint}
						prefersCelsius={prefersCelsius}
					/>
				</div>
			</div>
		</div>
	)
}

function StatTile({
	label,
	value,
	sub,
	testid,
}: {
	label: string
	value: string
	sub?: string
	testid: string
}) {
	return (
		<Card data-testid={testid}>
			<CardContent className='pt-6'>
				<p className='text-xs text-muted-foreground uppercase tracking-wide'>
					{label}
				</p>
				<p className='text-2xl font-bold tabular-nums'>
					{value}
					{sub && (
						<span className='text-sm font-normal text-muted-foreground ml-1'>
							{sub}
						</span>
					)}
				</p>
			</CardContent>
		</Card>
	)
}
