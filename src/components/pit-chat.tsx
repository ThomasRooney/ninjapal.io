import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useZero } from '@/hooks/use-typed-zero'
import {
	type SteerMessageRowLike,
	steerRowsToUIMessages,
} from '@/lib/steer-chat'
import { cn } from '@/lib/utils'
import {
	AssistantRuntimeProvider,
	ComposerPrimitive,
	ErrorPrimitive,
	MessagePrimitive,
	ThreadPrimitive,
} from '@assistant-ui/react'
import {
	AssistantChatTransport,
	useChatRuntime,
} from '@assistant-ui/react-ai-sdk'
import { useQuery } from '@rocicorp/zero/react'
import { createServerFn } from '@tanstack/react-start'
import type { UIMessage } from 'ai'
import {
	ArrowDown,
	Bot,
	Loader2,
	RotateCcw,
	Send,
	UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const ensureSteerThreadFn = createServerFn({ method: 'POST' })
	.validator((d: { deviceId: string }) => d)
	.handler(async ({ data }) => {
		const { ensureOpenSteerThread } = await import('@/server/steer-threads')
		return ensureOpenSteerThread(data.deviceId)
	})

const resetSteerThreadFn = createServerFn({ method: 'POST' })
	.validator((d: { deviceId: string }) => d)
	.handler(async ({ data }) => {
		const { resetSteerThread } = await import('@/server/steer-threads')
		return resetSteerThread(data.deviceId)
	})

function ChatMessage() {
	return (
		<MessagePrimitive.Root
			className='flex gap-2.5 py-2'
			data-testid='chat-message'
		>
			<MessagePrimitive.If user>
				<div className='h-7 w-7 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center mt-0.5'>
					<UserRound className='h-3.5 w-3.5' />
				</div>
			</MessagePrimitive.If>
			<MessagePrimitive.If assistant>
				<div className='h-7 w-7 shrink-0 rounded-full bg-muted text-muted-foreground flex items-center justify-center mt-0.5'>
					<Bot className='h-3.5 w-3.5' />
				</div>
			</MessagePrimitive.If>
			<div className='flex-1 min-w-0 text-sm leading-relaxed whitespace-pre-wrap [&_p]:mb-1'>
				<MessagePrimitive.Parts
					components={{
						tools: {
							Fallback: ({ toolName }) => (
								<p
									className='text-[11px] text-muted-foreground/80 italic my-1'
									data-testid='chat-tool-call'
								>
									⚙ {toolName.replace(/_/g, ' ')}…
								</p>
							),
						},
					}}
				/>
				<MessagePrimitive.Error>
					<ErrorPrimitive.Root
						className='mt-1 rounded border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive'
						data-testid='chat-error'
					>
						<ErrorPrimitive.Message />
					</ErrorPrimitive.Root>
				</MessagePrimitive.Error>
			</div>
		</MessagePrimitive.Root>
	)
}

/**
 * The live chat runtime for ONE thread. Mounted with a `key` of the
 * thread id so a reset (thread rotation) tears the runtime down and
 * brings up a clean one — hydrated messages are only read at mount.
 */
function PitChatThread({
	deviceId,
	threadId,
	initialMessages,
	className,
}: {
	deviceId: string
	threadId: string
	initialMessages: UIMessage[]
	className?: string
}) {
	// Captured once: useChat only reads initial messages when it creates
	// the Chat instance for this mount.
	const [hydrated] = useState(initialMessages)
	const transport = useMemo(
		() =>
			new AssistantChatTransport({
				api: '/api/chat',
				// Resolved per request: the server verifies all three and
				// fails closed. A fresh turnId per send keeps retried
				// requests idempotent on the server's unique index.
				body: () => ({
					deviceId,
					threadId,
					turnId: crypto.randomUUID(),
				}),
			}),
		[deviceId, threadId],
	)
	const runtime = useChatRuntime({
		messages: hydrated,
		transport,
	})

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<Card className={cn('overflow-hidden', className)} data-testid='pit-chat'>
				<CardContent className='p-0'>
					<ThreadPrimitive.Root className='flex flex-col'>
						<ThreadPrimitive.If empty={false}>
							<ThreadPrimitive.Viewport className='max-h-80 overflow-y-auto px-4 pt-3 relative scroll-smooth'>
								<ThreadPrimitive.Messages
									components={{ Message: ChatMessage }}
								/>
								<ThreadPrimitive.If running>
									<p className='flex items-center gap-1.5 text-xs text-muted-foreground py-2'>
										<Loader2 className='h-3 w-3 animate-spin' /> checking the
										pit…
									</p>
								</ThreadPrimitive.If>
								<ThreadPrimitive.ScrollToBottom asChild>
									<Button
										size='icon'
										variant='outline'
										className='sticky bottom-2 left-full h-7 w-7 rounded-full shadow'
									>
										<ArrowDown className='h-3.5 w-3.5' />
									</Button>
								</ThreadPrimitive.ScrollToBottom>
							</ThreadPrimitive.Viewport>
						</ThreadPrimitive.If>
						<ComposerPrimitive.Root className='flex min-w-0 items-center gap-2 border-t bg-muted/30 px-3 py-2'>
							<Bot className='h-4 w-4 text-primary shrink-0' />
							<ComposerPrimitive.Input
								placeholder='Steer the cook — "wrap it", "dinner at 7", "how are the pellets?"'
								className='min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground'
								data-testid='pit-chat-input'
							/>
							<ComposerPrimitive.Send asChild>
								<Button
									size='icon'
									className='h-8 w-8 shrink-0'
									data-testid='pit-chat-send'
								>
									<Send className='h-3.5 w-3.5' />
								</Button>
							</ComposerPrimitive.Send>
						</ComposerPrimitive.Root>
					</ThreadPrimitive.Root>
				</CardContent>
			</Card>
		</AssistantRuntimeProvider>
	)
}

function PitChatSkeleton({ className }: { className?: string }) {
	return (
		<Card
			className={cn('overflow-hidden', className)}
			data-testid='pit-chat-loading'
		>
			<CardContent className='p-0'>
				<div className='flex items-center gap-2 border-t bg-muted/30 px-3 py-2'>
					<Bot className='h-4 w-4 text-primary shrink-0' />
					<Skeleton className='h-8 flex-1' />
					<Skeleton className='h-8 w-8 shrink-0' />
				</div>
			</CardContent>
		</Card>
	)
}

/**
 * Direct line to the pitmaster: an agentic chat over the PitMinder MCP
 * server (telemetry, history, pellets, photos, safety-enveloped control),
 * scoped to one device. The conversation is persisted server-side per
 * (user, device) thread and survives page refreshes; the reset button
 * rotates to a fresh thread.
 */
export function PitChat({
	deviceId,
	className,
}: {
	deviceId: string
	className?: string
}) {
	const z = useZero()

	const [threads, threadsResult] = useQuery(
		z.query.steerThreads
			.where('deviceId', deviceId)
			.where('closedAt', 'IS', null)
			.orderBy('createdAt', 'desc')
			.limit(1),
	)
	const activeThread = threads?.[0]
	const threadId = activeThread?.id ?? null

	// No open thread for this device yet — ask the server to create one;
	// the Zero live query picks it up. Guarded per device against
	// re-entry (StrictMode double-effects, query flickers).
	const ensuringForDevice = useRef<string | null>(null)
	useEffect(() => {
		if (threadsResult.type !== 'complete') return
		if (threadId) {
			ensuringForDevice.current = null
			return
		}
		if (ensuringForDevice.current === deviceId) return
		ensuringForDevice.current = deviceId
		ensureSteerThreadFn({ data: { deviceId } }).catch(() => {
			// Allow a retry on the next render pass (e.g. transient network)
			ensuringForDevice.current = null
		})
	}, [threadsResult.type, threadId, deviceId])

	const [messageRows, messagesResult] = useQuery(
		z.query.steerMessages
			.where('threadId', threadId ?? '00000000-0000-0000-0000-000000000000')
			.orderBy('createdAt', 'asc'),
	)

	const initialMessages = useMemo(
		() =>
			steerRowsToUIMessages(
				(messageRows ?? []).flatMap((row): SteerMessageRowLike[] =>
					row.id && row.turnId && row.createdAt != null
						? [
								{
									id: row.id,
									turnId: row.turnId,
									role: row.role ?? 'user',
									parts: row.parts,
									createdAt: row.createdAt,
								},
							]
						: [],
				),
			),
		[messageRows],
	)

	// Render the runtime only once the thread AND its history are known —
	// mounting an empty runtime early would latch an empty transcript and
	// drop the persisted history for this pageview.
	if (!threadId || messagesResult.type !== 'complete') {
		return <PitChatSkeleton className={className} />
	}

	return (
		<PitChatThread
			key={threadId}
			deviceId={deviceId}
			threadId={threadId}
			initialMessages={initialMessages}
			className={className}
		/>
	)
}

/**
 * Small reset control for the "Steer this cook" header: confirm popover,
 * then rotate the thread server-side. The Zero live query in PitChat
 * swaps the UI to the fresh empty thread — no page reload.
 */
export function SteerResetButton({ deviceId }: { deviceId: string }) {
	const [confirming, setConfirming] = useState(false)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function doReset() {
		setBusy(true)
		setError(null)
		try {
			await resetSteerThreadFn({ data: { deviceId } })
			setConfirming(false)
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Reset failed')
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className='relative shrink-0'>
			<Button
				size='sm'
				variant='ghost'
				className='h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground'
				data-testid='steer-reset'
				onClick={() => {
					setError(null)
					setConfirming((v) => !v)
				}}
			>
				<RotateCcw className='h-3 w-3' />
				Reset
			</Button>
			{confirming && (
				<div
					className='absolute right-0 top-full z-20 mt-1 w-60 rounded-md border bg-card p-3 text-card-foreground shadow-md'
					data-testid='steer-reset-confirm-popover'
				>
					<p className='text-xs text-muted-foreground'>
						Start a fresh chat for this smoker? The old conversation is
						archived, not deleted.
					</p>
					{error && (
						<p
							className='mt-2 text-xs text-destructive'
							data-testid='steer-reset-error'
						>
							{error}
						</p>
					)}
					<div className='mt-2 flex items-center gap-2'>
						<Button
							size='sm'
							className='h-7 text-xs'
							disabled={busy}
							data-testid='steer-reset-confirm'
							onClick={doReset}
						>
							{busy ? (
								<Loader2 className='h-3 w-3 animate-spin' />
							) : (
								'Start fresh'
							)}
						</Button>
						<Button
							size='sm'
							variant='outline'
							className='h-7 text-xs'
							disabled={busy}
							data-testid='steer-reset-cancel'
							onClick={() => setConfirming(false)}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
