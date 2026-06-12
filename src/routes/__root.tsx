import { DefaultCatchBoundary } from '@/components/default-catch-boundry.tsx'
import { NotFound } from '@/components/not-found.tsx'
import type { ErrorComponentProps } from '@tanstack/react-router'
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

// Import CSS as a URL
import { getCachedUser, setCachedUser } from '@/lib/user-cache'
import appCss from '@/styles.css?url'
import { createServerFn } from '@tanstack/react-start'

const fetchUser = createServerFn({
	method: 'GET',
}).handler(async () => {
	const [{ auth }, { signZeroToken }, { getWebRequest }, { provisionUser }] =
		await Promise.all([
			import('@/lib/auth'),
			import('@/lib/zero-jwt'),
			import('@tanstack/react-start/server'),
			import('@/server/user-provision'),
		])

	const request = getWebRequest()
	if (!request) return null

	const session = await auth.api.getSession({ headers: request.headers })
	if (!session?.user?.email) {
		return null
	}

	const user = {
		id: session.user.id,
		email: session.user.email,
		name: session.user.name || session.user.email.split('@')[0],
	}

	const provisioned = await provisionUser(user)

	return {
		...user,
		whitelisted: provisioned.whitelisted,
		isAdmin: provisioned.isAdmin,
		impersonatedBy:
			(session.session as { impersonatedBy?: string | null })?.impersonatedBy ??
			null,
		accessToken: await signZeroToken(user),
	}
})

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
			{import.meta.env.DEV && (
				<TanStackRouterDevtools position='bottom-right' />
			)}
		</RootDocument>
	)
}

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{
				title: 'PitMinder',
			},
		],

		links: [
			{
				rel: 'stylesheet',
				href: appCss,
			},
			{
				rel: 'icon',
				href: '/favicon.ico',
				sizes: '32x32',
			},
			{
				rel: 'icon',
				href: '/icon.svg',
				type: 'image/svg+xml',
			},
			{
				rel: 'apple-touch-icon',
				href: '/apple-touch-icon.png',
			},
		],
	}),

	beforeLoad: async () => {
		// Root beforeLoad runs on every navigation — only pay the server
		// round-trip once per page load; auth flows clear the cache.
		if (typeof window !== 'undefined') {
			const cached = getCachedUser()
			if (cached) return { user: cached.user }
		}

		const user = await fetchUser()
		if (typeof window !== 'undefined') setCachedUser(user)

		return {
			user,
		}
	},

	errorComponent: (props: ErrorComponentProps) => {
		return (
			<RootDocument>
				<DefaultCatchBoundary {...props} />
			</RootDocument>
		)
	},

	notFoundComponent: () => <NotFound />,

	component: RootComponent,
})

function RootDocument({ children }: { children: React.ReactNode }) {
	const ctx = Route.useRouteContext()

	const user = ctx.user

	console.log('Server-side route context:', { user })

	return (
		<html lang='en'>
			<head>
				<HeadContent />
			</head>
			<body className='overscroll-none'>
				{children}
				<Scripts />
			</body>
		</html>
	)
}
