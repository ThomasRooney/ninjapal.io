import { AccountDebug } from '@/components/account-debug.tsx'
import { AccountLogout } from '@/components/account-logout.tsx'
import AccountOverview from '@/components/account-overview.tsx'
import NavApp from '@/components/nav-app.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/app/_layout/account')({
	component: RouteComponent,
	ssr: false,
})

function RouteComponent() {
	return (
		<div className='container flex flex-col min-h-screen'>
			<NavApp title='Account'>
				<div className='flex items-center gap-2'>
					<AccountDebug />
					<AccountLogout />
				</div>
			</NavApp>
			<div className='flex flex-col'>
				<AccountOverview />
			</div>
		</div>
	)
}
