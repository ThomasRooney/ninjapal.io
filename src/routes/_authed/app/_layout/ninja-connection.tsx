import NavApp from '@/components/nav-app.tsx'
// import { NinjaConnectionDebug } from '@/components/ninja-connection-debug.tsx'
// import { NinjaConnectionForm } from '@/components/ninja-connection-form.tsx'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/app/_layout/ninja-connection')({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className='container flex flex-col min-h-screen'>
			<NavApp title='Ninja Connection' />
			<div className='flex flex-col grow overflow-y-auto space-y-6 p-6'>
				{/* <NinjaConnectionForm /> */}
				{/* <NinjaConnectionDebug /> */}
			</div>
		</div>
	)
}
