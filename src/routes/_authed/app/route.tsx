import { AppSidebar } from '@/components/app-sidebar.tsx'
import { SidebarProvider } from '@/components/ui/sidebar.tsx'
import { useSyncUserZero } from '@/hooks/use-sync-user-zero.ts'
import { initializeZero, zeroAtom } from '@/lib/zero-setup.ts'
import { ZeroProvider } from '@rocicorp/zero/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Suspense } from 'react'

const queryClient = new QueryClient()

export const Route = createFileRoute('/_authed/app')({
	loader: async ({ context }) => {
		// Get user from parent _authed route context
		const user = context.user

		if (!user) {
			// This should be handled by the _authed route, but it's a good safeguard
			throw redirect({ to: '/auth/login' })
		}

		return { user }
	},
	component: RouteComponent,
	ssr: false,
})

function AppContent() {
	const { syncUser } = useSyncUserZero()

	// Sync user data with Zero database when app loads
	useEffect(() => {
		syncUser()
	}, [syncUser])

	return (
		<>
			<AppSidebar variant='inset' />
			<div className='flex-1 p-2'>
				<main className='h-full border border-border bg-background rounded flex flex-col overflow-hidden'>
					<Outlet />
				</main>
			</div>
		</>
	)
}

function RouteComponent() {
	// Get the initialized zero instance from the loader data
	const { user } = Route.useLoaderData()

	if (!zeroAtom.value) {
		initializeZero(user)
	}

	return (
		<Suspense fallback={null}>
			<QueryClientProvider client={queryClient}>
				<ZeroProvider zero={zeroAtom.value!}>
					<SidebarProvider className='flex h-screen'>
						<AppContent />
					</SidebarProvider>
				</ZeroProvider>
			</QueryClientProvider>
		</Suspense>
	)
}
