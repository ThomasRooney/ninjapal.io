import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useTenderizationTelemetry } from '@/hooks/use-tenderization-telemetry'
import { useZero } from '@/hooks/use-typed-zero'
import { formatTemperature } from '@/lib/temperature-utils'
import {
	type TenderizationResult,
	calculateTenderization,
	tenderizationSamples,
} from '@/lib/tenderization'
import { useQuery } from '@rocicorp/zero/react'
import { useEffect, useId, useMemo, useState } from 'react'

const HOUR = 3_600_000

export function exposureDuration(ms: number): string {
	if (ms > 0 && ms < 60_000) return '<1m'
	const minutes = Math.floor(ms / 60_000)
	return minutes >= 60
		? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
		: `${minutes}m`
}

/** Read-only estimate. Rest is opt-in and stops before the next cook. */
export function TenderizationCard({
	deviceId,
	start,
	endedAt,
	prefersCelsius,
}: {
	deviceId: string
	start: number
	endedAt: number | null
	prefersCelsius: boolean
}) {
	const z = useZero()
	const [probe, setProbe] = useState<1 | 2>(1)
	const [restHours, setRestHours] = useState(0)
	const [now, setNow] = useState(Date.now)
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 30_000)
		return () => clearInterval(timer)
	}, [])
	const [nextSessions, nextStatus] = useQuery(
		z.query.cookSessions
			.where('deviceId', deviceId)
			.where('startedAt', '>', start)
			.orderBy('startedAt', 'asc')
			.limit(1),
	)
	const nextStart = nextSessions?.[0]?.startedAt
	const requestedEnd = endedAt === null ? now : endedAt + restHours * HOUR
	const end = Math.max(
		start,
		Math.min(
			now,
			requestedEnd,
			nextStart == null ? Number.POSITIVE_INFINITY : nextStart - 1,
		),
	)
	const { snapshots, loading } = useTenderizationTelemetry(deviceId, start, end)
	const result = useMemo(
		() =>
			calculateTenderization(
				tenderizationSamples(snapshots, probe),
				start,
				end,
			),
		[snapshots, probe, start, end],
	)
	const restResult = useMemo(
		() =>
			endedAt !== null && end > endedAt
				? calculateTenderization(
						tenderizationSamples(snapshots, probe),
						endedAt,
						end,
					)
				: null,
		[snapshots, probe, endedAt, end],
	)
	return (
		<TenderizationCardView
			result={result}
			restResult={restResult}
			loading={loading || nextStatus.type !== 'complete'}
			probe={probe}
			onProbeChange={setProbe}
			restHours={restHours}
			onRestHoursChange={setRestHours}
			ended={endedAt !== null}
			restCapped={
				restHours > 0 && nextStart != null && nextStart < requestedEnd
			}
			prefersCelsius={prefersCelsius}
		/>
	)
}

export interface TenderizationCardViewProps {
	result: TenderizationResult
	restResult: TenderizationResult | null
	loading: boolean
	probe: 1 | 2
	onProbeChange: (probe: 1 | 2) => void
	restHours: number
	onRestHoursChange: (hours: number) => void
	ended: boolean
	restCapped: boolean
	prefersCelsius: boolean
}

export function TenderizationCardView({
	result,
	restResult,
	loading,
	probe,
	onProbeChange,
	restHours,
	onRestHoursChange,
	ended,
	restCapped,
	prefersCelsius,
}: TenderizationCardViewProps) {
	const id = useId()
	const [delayed, setDelayed] = useState(false)
	useEffect(() => {
		setDelayed(false)
		if (!loading) return
		const timer = setTimeout(() => setDelayed(true), 15_000)
		return () => clearTimeout(timer)
	}, [loading])
	const reference = formatTemperature(195, prefersCelsius, 'fahrenheit')
	const hasData = result.observedMs > 0
	const totalMs = result.observedMs + result.missingMs
	const coverage =
		totalMs > 0 ? Math.floor((100 * result.observedMs) / totalMs) : 0
	const selectClass =
		'h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2'
	return (
		<Card data-testid='tenderization-card' className='shadow-none'>
			<CardHeader className='gap-4'>
				<div className='flex flex-wrap items-center gap-3'>
					<h2 className='font-semibold'>Brisket tenderization</h2>
					<Badge variant='outline'>Experimental</Badge>
				</div>
				<p className='max-w-prose text-sm text-muted-foreground'>
					Time and temperature together tell more than a target temperature
					alone. Use this estimate to compare brisket cooks and check tenderness
					by feel.
				</p>
				<div className='flex flex-wrap gap-4'>
					<label
						htmlFor={`${id}-probe`}
						className='flex items-center gap-2 text-sm'
					>
						Meat probe
						<select
							id={`${id}-probe`}
							className={selectClass}
							value={probe}
							onChange={(e) => onProbeChange(Number(e.target.value) as 1 | 2)}
							data-testid='tenderization-probe'
						>
							<option value={1}>Probe 1</option>
							<option value={2}>Probe 2</option>
						</select>
					</label>
					{ended && (
						<label
							htmlFor={`${id}-rest`}
							className='flex items-center gap-2 text-sm'
						>
							Include rest
							<select
								id={`${id}-rest`}
								className={selectClass}
								value={restHours}
								onChange={(e) => onRestHoursChange(Number(e.target.value))}
								data-testid='tenderization-rest'
							>
								<option value={0}>Cook only</option>
								{[1, 2, 4, 8, 12].map((hours) => (
									<option value={hours} key={hours}>
										Up to {hours}h after cook
									</option>
								))}
							</select>
						</label>
					)}
				</div>
			</CardHeader>
			<CardContent className='space-y-4' aria-busy={loading}>
				{loading ? (
					<output
						className='text-sm text-muted-foreground'
						data-testid='tenderization-loading'
					>
						{delayed
							? 'Probe history is taking longer than expected. Check your connection and reload this page to retry.'
							: 'Loading probe history…'}
					</output>
				) : !hasData ? (
					<output
						className='text-sm text-muted-foreground'
						data-testid='tenderization-empty'
					>
						No usable history for Probe {probe}. Keep the probe connected and in
						the meat; at least two readings within five minutes are needed.
					</output>
				) : (
					<>
						<dl className='grid gap-5 border-y py-5 sm:grid-cols-3'>
							<div>
								<dt className='text-sm text-muted-foreground'>
									Equivalent time at {reference}
								</dt>
								<dd
									className='mt-1 text-2xl font-semibold tabular-nums'
									data-testid='tenderization-dose'
								>
									{exposureDuration(result.equivalentMinutes * 60_000)}
								</dd>
							</div>
							<div>
								<dt className='text-sm text-muted-foreground'>
									Recorded time at or above {reference}
								</dt>
								<dd
									className='mt-1 text-2xl font-semibold tabular-nums'
									data-testid='tenderization-hot-time'
								>
									{exposureDuration(result.fastZoneMs)}
								</dd>
							</div>
							<div>
								<dt className='text-sm text-muted-foreground'>
									Probe history coverage
								</dt>
								<dd
									className='mt-1 text-2xl font-semibold tabular-nums'
									data-testid='tenderization-coverage'
								>
									{coverage}%
								</dd>
							</div>
						</dl>
						<p className='max-w-prose text-sm text-muted-foreground'>
							This is the estimated thermal exposure of{' '}
							{exposureDuration(result.equivalentMinutes * 60_000)} at a steady{' '}
							{reference}. It is not a percentage of collagen converted or a
							doneness target.
						</p>
						{result.missingMs > 60_000 && (
							<p
								className='text-sm text-warning'
								data-testid='tenderization-incomplete'
							>
								Incomplete history: {exposureDuration(result.missingMs)} could
								not be counted. Gaps and unavailable probe readings are
								excluded.
							</p>
						)}
					</>
				)}
				{restHours > 0 && ended && (
					<p
						className='max-w-prose text-sm text-muted-foreground'
						data-testid='tenderization-rest-note'
					>
						Only include rest if this probe stayed in the same brisket. Missing
						readings are never replaced with the oven setting.
						{!loading &&
							restResult &&
							` Recorded rest adds ${exposureDuration(restResult.equivalentMinutes * 60_000)} of equivalent time.`}
						{restCapped && ' Tracking stops at the next cook.'}
					</p>
				)}
				<details className='text-sm text-muted-foreground'>
					<summary className='w-fit cursor-pointer rounded-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2'>
						How this estimate works
					</summary>
					<div className='mt-3 max-w-prose space-y-3'>
						<p>
							Based on{' '}
							<a
								href='https://www.youtube.com/watch?v=7fW16i40ZDQ&t=305s'
								target='_blank'
								rel='noreferrer'
								className='text-foreground underline underline-offset-4'
							>
								Chris Young’s brisket experiment
							</a>
							: each 20°F (11.1°C) increase multiplies the estimated rate by 1.8
							below 195°F (90.6°C), and by 2.8 above it.
						</p>
						<p>
							For example, one hour at 175°F (79.4°C) counts like 33 minutes at
							195°F; one hour at 205°F (96.1°C) counts like 100 minutes. Heating
							and cooling both count.
						</p>
						<p>
							This model only counts exposure from 140–212°F (60–100°C). Below
							that, the contribution is omitted, not proven to be zero. Rates
							and the temperature boundary are approximations. Cut, moisture,
							probe placement, and the animal all affect the result.
						</p>
						<p>
							Coverage describes available probe history, not model accuracy.
							This estimate does not measure food safety and does not control
							the grill.
						</p>
					</div>
				</details>
			</CardContent>
		</Card>
	)
}
