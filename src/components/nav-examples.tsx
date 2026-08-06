'use client'

import { useZero } from '@/hooks/use-typed-zero'
import { useQuery } from '@rocicorp/zero/react'
import { useIsFetching } from '@tanstack/react-query'
import { Link, useMatches } from '@tanstack/react-router'
import {
	Activity,
	Bell,
	Cpu,
	Flame,
	Loader2,
	ShieldCheck,
	Unplug,
	UserIcon,
} from 'lucide-react'

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@/components/ui/sidebar.tsx'

const items = [
	{
		title: 'Account',
		url: '/app/account',
		icon: UserIcon,
	},
	{
		title: 'Ninja Connection',
		url: '/app/ninja-connection',
		icon: Unplug,
	},
	{
		title: 'Device Status',
		url: '/app/status',
		icon: Activity,
	},
	{
		title: 'Messages',
		url: '/app/messages',
		icon: Bell,
	},
	{
		title: 'Cooks',
		url: '/app/cooks',
		icon: Flame,
	},
	{
		title: 'Devices',
		url: '/app/devices',
		icon: Cpu,
	},
]

export function NavExamples() {
	const matches = useMatches()
	const rootMatch = matches[0] as
		| { context?: { user?: { isAdmin?: boolean } } }
		| undefined
	const isAdmin = rootMatch?.context?.user?.isAdmin === true
	const currentPath = matches[matches.length - 1]?.pathname
	const isSyncing = useIsFetching({ queryKey: ['devices', 'syncPoller'] })
	const z = useZero()
	const [ackable] = useQuery(z.query.cookMessages.where('requiresAck', true))
	const [sessions] = useQuery(
		z.query.cookSessions.orderBy('startedAt', 'desc').limit(50),
	)
	const pendingCount =
		ackable
			?.filter((m) => m.ackedAt == null)
			.filter((m) => isCurrentCookMessage(m, sessions)).length ?? 0
	const isDeviceSyncLoading = isSyncing > 0

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Pit</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{[
						...items,
						...(isAdmin
							? [
									{
										title: 'Admin',
										url: '/app/admin' as const,
										icon: ShieldCheck,
									},
								]
							: []),
					].map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								tooltip={item.title}
								isActive={currentPath === item.url}
							>
								<Link
									to={item.url}
									data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}-link`}
								>
									{item.icon && <item.icon className='h-4 w-4' />}
									<span>{item.title}</span>
									{item.title === 'Devices' && isDeviceSyncLoading && (
										<Loader2 className='h-3 w-3 animate-spin ml-auto' />
									)}
									{item.title === 'Messages' && pendingCount > 0 && (
										<span
											className='ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground'
											data-testid='messages-badge'
										>
											{pendingCount}
										</span>
									)}
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}

type CookSessionForNav = {
	id: string | null
	deviceId: string | null
	startedAt: number | null
	endedAt: number | null
}

function isCurrentCookMessage(
	message: {
		sessionId: string | null
		deviceId: string | null
		createdAt: number | null
	},
	sessions: CookSessionForNav[] | undefined,
) {
	const active = (sessions ?? []).filter((s) => s.endedAt == null)
	const activeSessionIds = new Set(active.map((s) => s.id).filter(Boolean))
	if (message.sessionId) return activeSessionIds.has(message.sessionId)
	if (!message.deviceId || !message.createdAt) return false

	let activeStartedAt: number | null = null
	for (const session of active) {
		if (session.deviceId !== message.deviceId || !session.startedAt) continue
		if (activeStartedAt == null || session.startedAt > activeStartedAt) {
			activeStartedAt = session.startedAt
		}
	}
	return activeStartedAt != null && message.createdAt >= activeStartedAt
}
