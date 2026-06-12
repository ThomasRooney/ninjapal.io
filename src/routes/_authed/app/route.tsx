import { AppSidebar } from '@/components/app-sidebar.tsx'
import { SidebarProvider } from '@/components/ui/sidebar.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'
import { initializeZero, zeroAtom } from '@/lib/zero-setup.ts'
import { ZeroProvider } from '@rocicorp/zero/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
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

		// Access is whitelist-gated while there's no billing
		if (!user.whitelisted && !user.isAdmin) {
			throw redirect({ to: '/waitlist' })
		}

		return { user }
	},
	component: RouteComponent,
	ssr: false,
})

function AppContent() {
	const { user } = Route.useLoaderData()
	return (
		<>
			{user?.impersonatedBy && (
				<div
					className='fixed top-0 inset-x-0 z-50 bg-amber-500 text-black text-center text-sm font-semibold py-1'
					data-testid='impersonation-banner'
				>
					Impersonating {user.email} —{' '}
					<button
						type='button'
						className='underline'
						onClick={async () => {
							const { authClient } = await import('@/lib/auth-client')
							await authClient.admin.stopImpersonating()
							window.location.href = '/app/admin'
						}}
					>
						stop
					</button>
				</div>
			)}
			<AppSidebar variant='inset' />
			<div className='flex-1 p-2'>
				<main className='h-full border border-border bg-background rounded flex flex-col overflow-y-auto'>
					<Outlet />
				</main>
			</div>
		</>
	)
}

function RouteComponent() {
	// Get the initialized zero instance from the loader data
	const { user } = Route.useLoaderData()

	const zero = zeroAtom.value ?? initializeZero(user)

	return (
		<Suspense fallback={null}>
			<QueryClientProvider client={queryClient}>
				<ZeroProvider zero={zero}>
					<SidebarProvider className='flex h-screen'>
						<AppContent />
					</SidebarProvider>
					<Toaster />
				</ZeroProvider>
			</QueryClientProvider>
		</Suspense>
	)
}
