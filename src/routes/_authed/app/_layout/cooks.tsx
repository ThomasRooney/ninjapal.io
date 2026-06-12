import NavApp from '@/components/nav-app.tsx'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useZero } from '@/hooks/use-typed-zero'
import { formatTemperature } from '@/lib/temperature-utils'
import { useQuery } from '@rocicorp/zero/react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Flame } from 'lucide-react'

export const Route = createFileRoute('/_authed/app/_layout/cooks')({
	component: CooksPage,
	ssr: false,
})

function formatDuration(ms: number): string {
	const mins = Math.round(ms / 60000)
	if (mins < 60) return `${mins}m`
	return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function scoreColor(score: number | null): string {
	if (score == null) return 'text-muted-foreground'
	if (score >= 80) return 'text-green-600'
	if (score >= 60) return 'text-amber-600'
	return 'text-red-600'
}

function CooksPage() {
	const z = useZero()
	const [sessions] = useQuery(z.query.cookSessions.orderBy('startedAt', 'desc'))
	const [users] = useQuery(z.query.users)
	const prefersCelsius = users?.[0]?.prefers_celsius ?? false

	return (
		<div className='container flex flex-col min-h-screen'>
			<NavApp title='Cooks' />
			<div className='p-4 md:p-8'>
				<h1 className='text-3xl font-bold'>Cooks</h1>
				<p className='text-muted-foreground mt-2 mb-6'>
					Every session your grill has run, with the receipts
				</p>

				{sessions === undefined ? null : sessions.length === 0 ? (
					<Card>
						<CardContent className='py-12 text-center text-muted-foreground'>
							No cooks recorded yet — fire up the grill and PitMinder will start
							the log automatically.
						</CardContent>
					</Card>
				) : (
					<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
						{sessions.map((session) => {
							const active = session.endedAt == null
							const duration = active
								? Date.now() - (session.startedAt ?? 0)
								: (session.endedAt ?? 0) - (session.startedAt ?? 0)
							return (
								<Link
									key={session.id}
									to='/app/cook/$sessionId'
									params={{ sessionId: session.id ?? '' }}
									className='block transition-transform hover:scale-[1.02]'
									data-testid='cook-card'
								>
									<Card className={active ? 'border-green-500/50' : ''}>
										<CardContent className='pt-6'>
											<div className='flex items-start justify-between'>
												<div>
													<p className='font-semibold'>{session.name}</p>
													<p className='text-sm text-muted-foreground'>
														{session.startedAt
															? new Date(session.startedAt).toLocaleDateString(
																	[],
																	{
																		weekday: 'short',
																		day: 'numeric',
																		month: 'short',
																	},
																)
															: '—'}{' '}
														· {formatDuration(duration)}
														{session.cook_mode && ` · ${session.cook_mode}`}
													</p>
												</div>
												{active ? (
													<Badge className='bg-green-600'>
														<Flame className='h-3 w-3 mr-1' />
														Live
													</Badge>
												) : (
													<div className='text-right'>
														<p
															className={`text-2xl font-bold tabular-nums ${scoreColor(session.stability_score)}`}
														>
															{session.stability_score ?? '—'}
														</p>
														<p className='text-[10px] text-muted-foreground uppercase tracking-wide'>
															stability
														</p>
													</div>
												)}
											</div>
											<div className='mt-4 grid grid-cols-3 gap-2 text-center text-sm'>
												<div>
													<p className='text-muted-foreground text-xs'>Peak</p>
													<p className='font-medium'>
														{session.max_temp_grill != null
															? formatTemperature(
																	Number(session.max_temp_grill),
																	prefersCelsius,
																)
															: '—'}
													</p>
												</div>
												<div>
													<p className='text-muted-foreground text-xs'>Probe</p>
													<p className='font-medium'>
														{session.max_probe1_temp != null
															? formatTemperature(
																	Number(session.max_probe1_temp),
																	prefersCelsius,
																)
															: '—'}
													</p>
												</div>
												<div>
													<p className='text-muted-foreground text-xs'>Stall</p>
													<p className='font-medium'>
														{session.stall_seconds
															? formatDuration(session.stall_seconds * 1000)
															: '0m'}
													</p>
												</div>
											</div>
										</CardContent>
									</Card>
								</Link>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
