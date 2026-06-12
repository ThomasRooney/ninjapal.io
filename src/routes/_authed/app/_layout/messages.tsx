import NavApp from '@/components/nav-app.tsx'
import { PushToggle } from '@/components/push-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useZero } from '@/hooks/use-typed-zero'
import { cn } from '@/lib/utils'
import { useQuery } from '@rocicorp/zero/react'
import { createFileRoute } from '@tanstack/react-router'
import {
	AlertTriangle,
	Bell,
	Bot,
	Check,
	Droplets,
	Flame,
	PartyPopper,
	Send,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_authed/app/_layout/messages')({
	component: MessagesPage,
	ssr: false,
})

const KIND_ICONS: Record<string, typeof Bell> = {
	spritz: Droplets,
	stall_start: AlertTriangle,
	pit_drop: Flame,
	pit_recovered: Check,
	target_reached: PartyPopper,
	hold_warm: PartyPopper,
	ai_adjust: Bot,
	session_start: Flame,
	session_end: Check,
}

function timeLabel(ms: number): string {
	const d = new Date(ms)
	const today = new Date()
	const sameDay = d.toDateString() === today.toDateString()
	const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
	return sameDay
		? time
		: `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`
}

type MessageActions = Array<{ id: string; label: string }>

function MessageCard({
	message,
}: {
	message: {
		id: string | null
		kind: string
		title: string
		body: string | null
		requiresAck: boolean
		actions: unknown
		response: string | null
		ackedAt: number | null
		createdAt: number | null
	}
}) {
	const z = useZero()
	const [steering, setSteering] = useState(false)
	const [steerText, setSteerText] = useState('')

	const pending = message.requiresAck && message.ackedAt == null
	const actions = (Array.isArray(message.actions)
		? message.actions
		: []) as unknown as MessageActions
	const Icon = KIND_ICONS[message.kind] ?? Bell

	async function respond(response?: string) {
		if (!message.id) return
		await z.mutate.cookMessages.respond({ id: message.id, response })
	}

	const chosenLabel =
		message.response != null
			? (actions.find((a) => a.id === message.response)?.label ??
				message.response)
			: null

	return (
		<Card
			className={cn(
				'transition-colors',
				pending ? 'border-amber-500/60 bg-amber-500/5' : 'opacity-90',
			)}
			data-testid={pending ? 'message-pending' : 'message-card'}
		>
			<CardContent className='pt-4 pb-4'>
				<div className='flex gap-3'>
					<div
						className={cn(
							'mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center',
							pending
								? 'bg-amber-500/20 text-amber-600'
								: 'bg-muted text-muted-foreground',
						)}
					>
						<Icon className='h-4 w-4' />
					</div>
					<div className='flex-1 min-w-0'>
						<div className='flex items-baseline justify-between gap-2'>
							<p className='font-semibold text-sm'>{message.title}</p>
							<span className='text-[11px] text-muted-foreground font-mono shrink-0'>
								{message.createdAt ? timeLabel(message.createdAt) : ''}
							</span>
						</div>
						{message.body && (
							<p className='text-sm text-muted-foreground mt-1'>
								{message.body}
							</p>
						)}

						{pending && (
							<div className='mt-3 flex flex-wrap items-center gap-2'>
								{(actions.length
									? actions
									: [{ id: 'ack', label: 'Got it ✅' }]
								).map((action) => (
									<Button
										key={action.id}
										size='sm'
										className='h-8'
										data-testid={`message-action-${action.id}`}
										onClick={() => respond(action.id)}
									>
										{action.label}
									</Button>
								))}
								{steering ? (
									<div className='flex items-center gap-1 flex-1 min-w-[180px]'>
										<Input
											autoFocus
											value={steerText}
											onChange={(e) => setSteerText(e.target.value)}
											onKeyDown={(e) =>
												e.key === 'Enter' &&
												steerText.trim() &&
												respond(steerText.trim())
											}
											placeholder='steer in plain English…'
											className='h-8 text-sm'
											data-testid='message-steer-input'
										/>
										<Button
											size='icon'
											variant='outline'
											className='h-8 w-8 shrink-0'
											onClick={() =>
												steerText.trim() && respond(steerText.trim())
											}
											data-testid='message-steer-send'
										>
											<Send className='h-3.5 w-3.5' />
										</Button>
									</div>
								) : (
									<button
										type='button'
										className='text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground'
										onClick={() => setSteering(true)}
										data-testid='message-steer'
									>
										steer
									</button>
								)}
							</div>
						)}

						{!pending && message.ackedAt != null && message.requiresAck && (
							<p
								className='mt-2 text-xs text-muted-foreground flex items-center gap-1'
								data-testid='message-acked'
							>
								<Check className='h-3 w-3 text-green-600' />
								{chosenLabel ? (
									<>
										you chose <span className='font-medium'>{chosenLabel}</span>
									</>
								) : (
									'acknowledged'
								)}{' '}
								· {timeLabel(message.ackedAt)}
							</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

/** A pit-director check-in: the AI's per-run observations, always visible. */
function DirectorRunRow({
	run,
}: {
	run: {
		id: string | null
		createdAt: number | null
		status: string | null
		summary: string | null
		error: string | null
		setpointChanges: number | null
		messagesSent: number | null
		toolCalls: unknown
	}
}) {
	const tools = (Array.isArray(run.toolCalls) ? run.toolCalls : []) as string[]
	const consulted = [...new Set(tools)].filter(
		(t) => t !== 'send_message' && t !== 'set_pit_temp',
	)
	const failed = run.status === 'error'
	return (
		<div
			className='flex gap-3 px-3 py-2 rounded-md border border-dashed border-border/70 bg-muted/30'
			data-testid='director-run'
		>
			<Bot
				className={cn(
					'h-4 w-4 mt-0.5 shrink-0',
					failed ? 'text-destructive' : 'text-muted-foreground',
				)}
			/>
			<div className='flex-1 min-w-0'>
				<div className='flex items-baseline justify-between gap-2'>
					<p className='text-xs font-medium text-muted-foreground'>
						Pit director check-in
						{(run.setpointChanges ?? 0) > 0 && ' · adjusted the pit'}
						{(run.messagesSent ?? 0) > 0 && ' · messaged you'}
					</p>
					<span className='text-[11px] text-muted-foreground font-mono shrink-0'>
						{run.createdAt ? timeLabel(run.createdAt) : ''}
					</span>
				</div>
				<p
					className={cn(
						'text-xs mt-0.5 whitespace-pre-wrap',
						failed ? 'text-destructive' : 'text-muted-foreground',
					)}
				>
					{failed
						? `Check-in failed: ${run.error ?? 'unknown error'}`
						: (run.summary ?? 'No notes.')}
				</p>
				{consulted.length > 0 && (
					<p className='text-[10px] text-muted-foreground/70 mt-1'>
						looked at:{' '}
						{consulted
							.map((t) => t.replace(/^(get_|list_)/, '').replace(/_/g, ' '))
							.join(', ')}
					</p>
				)}
			</div>
		</div>
	)
}

function MessagesPage() {
	const z = useZero()
	const [messages] = useQuery(z.query.cookMessages.orderBy('createdAt', 'desc'))
	const [runs] = useQuery(
		z.query.directorRuns.orderBy('createdAt', 'desc').limit(50),
	)

	const pendingCount =
		messages?.filter((m) => m.requiresAck && m.ackedAt == null).length ?? 0

	// One feed: messages and director check-ins, newest first
	const feed = [
		...(messages ?? []).map((m) => ({
			type: 'message' as const,
			at: m.createdAt ?? 0,
			message: m,
		})),
		...(runs ?? []).map((r) => ({
			type: 'run' as const,
			at: r.createdAt ?? 0,
			run: r,
		})),
	].sort((a, b) => b.at - a.at)

	return (
		<div className='container flex flex-col min-h-screen'>
			<NavApp title='Messages' />
			<div className='p-4 md:p-8 max-w-2xl w-full mx-auto'>
				<div className='flex items-center justify-between'>
					<h1 className='text-3xl font-bold'>Messages</h1>
					<PushToggle />
				</div>
				<p className='text-muted-foreground mt-2 mb-6'>
					{pendingCount > 0
						? `${pendingCount} thing${pendingCount > 1 ? 's' : ''} need${pendingCount > 1 ? '' : 's'} your attention`
						: 'All caught up — the pit minds itself'}
				</p>

				{messages === undefined ? null : feed.length === 0 ? (
					<Card>
						<CardContent className='py-12 text-center text-muted-foreground'>
							No messages yet — they'll appear here as your cooks progress.
						</CardContent>
					</Card>
				) : (
					<div className='flex flex-col gap-3'>
						{feed.map((entry) =>
							entry.type === 'message' ? (
								<MessageCard
									key={entry.message.id}
									message={
										entry.message as unknown as Parameters<
											typeof MessageCard
										>[0]['message']
									}
								/>
							) : (
								<DirectorRunRow
									key={entry.run.id}
									run={
										entry.run as unknown as Parameters<
											typeof DirectorRunRow
										>[0]['run']
									}
								/>
							),
						)}
					</div>
				)}
			</div>
		</div>
	)
}
