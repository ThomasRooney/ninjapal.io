import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { ArrowDown, Bot, Loader2, Send, UserRound } from 'lucide-react'

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
 * Direct line to the pitmaster: an agentic chat over the PitMinder MCP
 * server (telemetry, history, pellets, photos, safety-enveloped control).
 */
export function PitChat({
	className,
	variant = 'default',
}: {
	className?: string
	variant?: 'default' | 'dark'
}) {
	const runtime = useChatRuntime({
		transport: new AssistantChatTransport({ api: '/api/chat' }),
	})
	const dark = variant === 'dark'

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<Card
				className={cn(
					'overflow-hidden',
					dark && 'border-stone-700 bg-stone-900 text-stone-100 shadow-none',
					className,
				)}
				data-testid='pit-chat'
			>
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
										className={cn(
											'sticky bottom-2 left-full h-7 w-7 rounded-full shadow',
											dark &&
												'border-stone-700 bg-stone-800 text-stone-100 hover:bg-stone-700',
										)}
									>
										<ArrowDown className='h-3.5 w-3.5' />
									</Button>
								</ThreadPrimitive.ScrollToBottom>
							</ThreadPrimitive.Viewport>
						</ThreadPrimitive.If>
						<ComposerPrimitive.Root
							className={cn(
								'flex min-w-0 items-center gap-2 border-t bg-muted/30 px-3 py-2',
								dark && 'border-stone-700 bg-stone-800/80',
							)}
						>
							<Bot
								className={cn(
									'h-4 w-4 text-muted-foreground shrink-0',
									dark && 'text-amber-400',
								)}
							/>
							<ComposerPrimitive.Input
								placeholder='Steer the cook — "wrap it", "dinner at 7", "how are the pellets?"'
								className={cn(
									'min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/70',
									dark && 'text-stone-100 placeholder:text-stone-500',
								)}
								data-testid='pit-chat-input'
							/>
							<ComposerPrimitive.Send asChild>
								<Button
									size='icon'
									className={cn(
										'h-8 w-8 shrink-0',
										dark && 'bg-red-600 text-white hover:bg-red-700',
									)}
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
