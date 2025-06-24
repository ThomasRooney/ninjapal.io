import { createFileRoute } from '@tanstack/react-router'

import { FormAddress } from '@/components/form-address.tsx'
import { FormSimple } from '@/components/form-simple.tsx'
import NavApp from '@/components/nav-app.tsx'
import {
	TsServerAction,
	tsServerActionLoader,
} from '@/components/ts-server-action.tsx'

export const Route = createFileRoute('/_authed/app/_layout/tanstack-examples')({
	component: RouteComponent,
	loader: async () => ({
		tsServerAction: await tsServerActionLoader(),
	}),
})

function RouteComponent() {
	return (
		<div className='container flex flex-col h-full overflow-y-auto'>
			<NavApp title='Tanstack Examples' />
			<div className='flex flex-col grow overflow-y-auto'>
				<div className='flex flex-col gap-8'>
					<div className='flex flex-col gap-4 max-w-2xl'>
						<FormSimple />
						<FormAddress />
						<TsServerAction />
					</div>
				</div>
			</div>
		</div>
	)
}
