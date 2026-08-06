import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * PowerGate — the warming UX for the scale-to-zero stack
 * (infra/aws/ARCHITECTURE.md). While the backing services sleep, an
 * authenticated dashboard visit must wake them and show honest progress
 * instead of a broken app.
 *
 * Triggers (DB-unavailable-style failures only — never the happy path):
 *  - /api/ready answering 202 on the mount check
 *  - Zero dropping offline (debounced, then confirmed against /api/ready)
 *
 * While warming: POST /api/wake (re-posted periodically), poll /api/ready
 * every 2s, gate all inputs behind an inert overlay, and give up into a
 * retryable error state after the wake budget. Unconfigured environments
 * (Vercel/local) answer 200 immediately, so the gate never engages there.
 */

export const READY_POLL_INTERVAL_MS = 2_000
/** ≥150s per the wake spec: RDS start alone can take minutes off a cold stop. */
export const WAKE_BUDGET_MS = 180_000
export const WAKE_REPOST_INTERVAL_MS = 30_000
/** Zero flaps offline briefly on token refresh — confirm before gating. */
export const OFFLINE_CONFIRM_DELAY_MS = 3_000

type GatePhase = 'ready' | 'warming' | 'failed'

interface PowerInfo {
	state: string | null
	progress: string | null
}

const STATE_STEPS: Record<string, { label: string; step: number }> = {
	SLEEPING: { label: 'Rousing the pit crew…', step: 1 },
	SLEEP_MAINTENANCE: { label: 'Rousing the pit crew…', step: 1 },
	STOPPING_DB: { label: 'Rousing the pit crew…', step: 1 },
	DRAINING: { label: 'Rousing the pit crew…', step: 1 },
	WAKING_DB: { label: 'Stoking the coals — starting the database…', step: 2 },
	WAKING_SERVICES: {
		label: 'Rolling smoke — starting realtime sync…',
		step: 3,
	},
	AWAKE: { label: 'Nearly there — final checks…', step: 4 },
}
const TOTAL_STEPS = 4

function describe(power: PowerInfo | null): { label: string; step: number } {
	const known = power?.state ? STATE_STEPS[power.state] : undefined
	return known ?? { label: 'Warming up…', step: 1 }
}

export interface PowerGateProps {
	children?: React.ReactNode
	/**
	 * Subscribe to connection-online changes (wired to Zero in the app
	 * shell); returns an unsubscribe. Optional so the gate stays inert and
	 * testable without a Zero instance.
	 */
	watchOnline?: (onChange: (online: boolean) => void) => () => void
}

export function PowerGate({ children, watchOnline }: PowerGateProps) {
	const [phase, setPhase] = useState<GatePhase>('ready')
	const [power, setPower] = useState<PowerInfo | null>(null)
	const [elapsedS, setElapsedS] = useState(0)
	const phaseRef = useRef(phase)
	phaseRef.current = phase

	/** One-shot readiness check; only 202/ERROR flip the gate closed. */
	const checkReady = useCallback(async () => {
		if (phaseRef.current !== 'ready') return
		try {
			const res = await fetch('/api/ready', {
				headers: { accept: 'application/json' },
			})
			if (res.status === 200) return
			const body = (await res.json().catch(() => null)) as {
				state?: string | null
				progress?: string | null
			} | null
			setPower({
				state: body?.state ?? null,
				progress: body?.progress ?? null,
			})
			if (res.status === 202 || res.status === 503) {
				setPhase('warming')
			}
		} catch {
			// The readiness endpoint itself unreachable ≈ client network flap;
			// Zero's own retry handles that. Never gate on it.
		}
	}, [])

	// Mount check: an authenticated visit to a sleeping stack starts warming.
	useEffect(() => {
		void checkReady()
	}, [checkReady])

	// Zero connection watcher: offline (debounced) → confirm with /api/ready.
	useEffect(() => {
		if (!watchOnline) return
		let debounce: ReturnType<typeof setTimeout> | undefined
		const unsubscribe = watchOnline((online) => {
			clearTimeout(debounce)
			if (online) return
			debounce = setTimeout(() => {
				void checkReady()
			}, OFFLINE_CONFIRM_DELAY_MS)
		})
		return () => {
			clearTimeout(debounce)
			unsubscribe()
		}
	}, [watchOnline, checkReady])

	// Warming loop: wake + poll until ready, failed, or budget spent.
	useEffect(() => {
		if (phase !== 'warming') return
		let cancelled = false
		const startedMs = Date.now()
		let lastWakeMs = 0
		setElapsedS(0)

		const postWake = () => {
			lastWakeMs = Date.now()
			fetch('/api/wake', {
				method: 'POST',
				credentials: 'same-origin',
			}).catch(() => {
				// Best-effort: the poll below keeps the state honest.
			})
		}
		postWake()

		const tick = async () => {
			if (cancelled) return
			setElapsedS(Math.round((Date.now() - startedMs) / 1000))
			if (Date.now() - startedMs > WAKE_BUDGET_MS) {
				setPhase('failed')
				return
			}
			if (Date.now() - lastWakeMs >= WAKE_REPOST_INTERVAL_MS) postWake()
			try {
				const res = await fetch('/api/ready', {
					headers: { accept: 'application/json' },
				})
				if (cancelled) return
				if (res.status === 200) {
					setPhase('ready')
					return
				}
				const body = (await res.json().catch(() => null)) as {
					state?: string | null
					progress?: string | null
				} | null
				if (cancelled) return
				setPower({
					state: body?.state ?? null,
					progress: body?.progress ?? null,
				})
				if (res.status === 503 && body?.state === 'ERROR') {
					setPhase('failed')
				}
			} catch {
				// Poll failure while warming: keep trying inside the budget.
			}
		}
		const interval = setInterval(() => void tick(), READY_POLL_INTERVAL_MS)
		return () => {
			cancelled = true
			clearInterval(interval)
		}
	}, [phase])

	const gated = phase !== 'ready'
	const { label, step } = describe(power)

	return (
		<>
			<div
				className={gated ? 'contents pointer-events-none' : 'contents'}
				inert={gated || undefined}
				data-testid='power-gate-content'
			>
				{children}
			</div>
			{gated && (
				<div
					className='fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background px-6 text-center'
					data-testid='power-gate-warming'
					aria-live='polite'
				>
					<style>{emberKeyframes}</style>
					<div className='relative h-28 w-28' aria-hidden='true'>
						{/* smoke wisps */}
						<div className='pg-smoke absolute left-1/2 top-6 h-10 w-10 rounded-full bg-muted-foreground/20 blur-md' />
						<div
							className='pg-smoke absolute left-1/3 top-8 h-8 w-8 rounded-full bg-muted-foreground/15 blur-md'
							style={{ animationDelay: '1.1s' }}
						/>
						<div
							className='pg-smoke absolute left-2/3 top-8 h-7 w-7 rounded-full bg-muted-foreground/15 blur-md'
							style={{ animationDelay: '2.2s' }}
						/>
						{/* ember */}
						<div className='pg-ember absolute inset-x-0 bottom-0 mx-auto h-14 w-14 rounded-full bg-gradient-to-t from-orange-600 via-amber-500 to-yellow-300' />
						<div className='pg-ember-glow absolute inset-x-0 bottom-[-6px] mx-auto h-16 w-16 rounded-full bg-orange-500/40 blur-xl' />
					</div>
					{phase === 'warming' ? (
						<>
							<div className='space-y-2'>
								<h1 className='text-2xl font-semibold tracking-tight'>
									Firing up the pit…
								</h1>
								<p
									className='text-sm text-muted-foreground'
									data-testid='power-gate-progress'
								>
									{label}
									{power?.progress ? ` ${power.progress}` : ''}
								</p>
							</div>
							<div className='w-64'>
								<div className='h-1.5 w-full overflow-hidden rounded-full bg-muted'>
									<div
										className='h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-400 transition-all duration-700'
										style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
									/>
								</div>
								<p className='mt-2 text-xs text-muted-foreground/70'>
									The smoker&apos;s been idle — waking everything can take a
									couple of minutes.
									{elapsedS > 0 ? ` ${elapsedS}s` : ''}
								</p>
							</div>
						</>
					) : (
						<>
							<div className='space-y-2'>
								<h1 className='text-2xl font-semibold tracking-tight'>
									The pit didn&apos;t light
								</h1>
								<p
									className='text-sm text-muted-foreground'
									data-testid='power-gate-error'
								>
									Waking the stack took longer than expected. Give it another
									go, or come back in a minute.
								</p>
							</div>
							<button
								type='button'
								className='rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
								onClick={() => setPhase('warming')}
								data-testid='power-gate-retry'
							>
								Try again
							</button>
						</>
					)}
				</div>
			)}
		</>
	)
}

const emberKeyframes = `
@keyframes pg-ember-pulse {
	0%, 100% { transform: scale(1); filter: brightness(1); }
	50% { transform: scale(1.06); filter: brightness(1.25); }
}
@keyframes pg-smoke-rise {
	0% { transform: translateY(0) scale(0.7); opacity: 0; }
	25% { opacity: 0.7; }
	100% { transform: translateY(-56px) scale(1.5); opacity: 0; }
}
.pg-ember { animation: pg-ember-pulse 1.8s ease-in-out infinite; }
.pg-ember-glow { animation: pg-ember-pulse 1.8s ease-in-out infinite; }
.pg-smoke { animation: pg-smoke-rise 3.4s ease-in infinite; }
@media (prefers-reduced-motion: reduce) {
	.pg-ember, .pg-ember-glow, .pg-smoke { animation: none; }
}
`
