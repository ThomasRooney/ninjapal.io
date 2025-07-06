'use client'

import { useIsFetching } from '@tanstack/react-query'
import { Link, useMatches } from '@tanstack/react-router'
import { Activity, Cpu, Loader2, Mail, Unplug, UserIcon } from 'lucide-react'

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
		title: 'Emails',
		url: '/app/email-preview',
		icon: Mail,
	},
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
		title: 'Devices',
		url: '/app/devices',
		icon: Cpu,
	},
]

export function NavExamples() {
	const matches = useMatches()
	const currentPath = matches[matches.length - 1]?.pathname
	const isSyncing = useIsFetching({ queryKey: ['devices', 'syncPoller'] })
	const isDeviceSyncLoading = isSyncing > 0

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Examples</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								tooltip={item.title}
								isActive={currentPath === item.url}
							>
								<Link to={item.url}>
									{item.icon && <item.icon className='h-4 w-4' />}
									<span>{item.title}</span>
									{item.title === 'Devices' && isDeviceSyncLoading && (
										<Loader2 className='h-3 w-3 animate-spin ml-auto' />
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
