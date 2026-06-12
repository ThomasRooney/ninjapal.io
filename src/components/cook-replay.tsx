import { TempGauge } from '@/components/temp-gauge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { useCookWindowTelemetry } from '@/hooks/use-cook-window-telemetry'
import { formatTemperature } from '@/lib/temperature-utils'
import { Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Scrub through a finished (or ongoing) cook: drag the timeline and the
 * gauges snap to the reconstructed state at that moment.
 */
export function CookReplay({
	deviceId,
	start,
	end,
	setpointC,
	prefersCelsius,
}: {
	deviceId: string
	start: number
	end: number
	setpointC: number | null
	prefersCelsius: boolean
}) {
	const { snapshots } = useCookWindowTelemetry(deviceId, start, end)
	const [position, setPosition] = useState(1) // 0..1 across the window
	const [playing, setPlaying] = useState(false)
	const raf = useRef<number | null>(null)

	const t = start + (end - start) * position

	const stateAt = useMemo(() => {
		let current: Record<string, unknown> | null = null
		for (const s of snapshots) {
			if ((s.recordedAt ?? 0) <= t) current = s.state
			else break
		}
		return current
	}, [snapshots, t])

	useEffect(() => {
		if (!playing) {
			if (raf.current) cancelAnimationFrame(raf.current)
			return
		}
		let last = performance.now()
		const SPEED = 1 / 20_000 // full cook in ~20s
		const tick = (now: number) => {
			const dt = now - last
			last = now
			setPosition((p) => {
				const next = p + dt * SPEED
				if (next >= 1) {
					setPlaying(false)
					return 1
				}
				return next
			})
			raf.current = requestAnimationFrame(tick)
		}
		raf.current = requestAnimationFrame(tick)
		return () => {
			if (raf.current) cancelAnimationFrame(raf.current)
		}
	}, [playing])

	const num = (key: string): number | null => {
		const v = stateAt?.[key]
		return typeof v === 'number' ? v : null
	}

	return (
		<Card data-testid='cook-replay'>
			<CardHeader className='flex flex-row items-center justify-between space-y-0'>
				<CardTitle>Replay</CardTitle>
				<span className='text-sm font-mono text-muted-foreground'>
					{new Date(t).toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit',
					})}
				</span>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='grid grid-cols-3 gap-2'>
					<TempGauge
						label='Grill'
						valueC={num('temp_grill')}
						setpointC={setpointC}
						prefersCelsius={prefersCelsius}
						size={88}
					/>
					<TempGauge
						label='Chamber'
						valueC={num('temp_air')}
						setpointC={setpointC}
						prefersCelsius={prefersCelsius}
						size={88}
					/>
					<TempGauge
						label='Probe'
						valueC={num('probe1_temp_a')}
						setpointC={null}
						prefersCelsius={prefersCelsius}
						size={88}
					/>
				</div>
				<div className='flex items-center gap-3'>
					<Button
						size='icon'
						variant='outline'
						className='h-8 w-8 shrink-0'
						onClick={() => {
							if (position >= 1) setPosition(0)
							setPlaying((p) => !p)
						}}
						data-testid='replay-play'
					>
						{playing ? (
							<Pause className='h-4 w-4' />
						) : (
							<Play className='h-4 w-4' />
						)}
					</Button>
					<Slider
						value={[position * 1000]}
						max={1000}
						step={1}
						onValueChange={(v) => {
							setPlaying(false)
							setPosition(v[0] / 1000)
						}}
						data-testid='replay-slider'
					/>
				</div>
				<div className='flex justify-between text-xs text-muted-foreground'>
					<span>
						lid: {stateAt?.is_lid_open === true ? 'open' : 'closed'} · state:{' '}
						{String(stateAt?.cook_state ?? '—')}
					</span>
					<span>
						{stateAt && typeof stateAt.probe1_temp_a === 'number'
							? `probe ${formatTemperature(stateAt.probe1_temp_a as number, prefersCelsius)}`
							: ''}
					</span>
				</div>
			</CardContent>
		</Card>
	)
}
