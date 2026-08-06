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
import { PowerGate } from '@/components/power-gate.tsx'
import { getCachedUser, setCachedUser } from '@/lib/user-cache'
import appCss from '@/styles.css?url'
import { createServerFn } from '@tanstack/react-start'

interface FetchUserResult {
	user: Awaited<ReturnType<typeof fetchUserAttempt>> | null
	/**
	 * True when a power-managed stack (POWER_TABLE set) is not AWAKE or
	 * DB-backed auth failed in a DB-unavailable way — the root renders the
	 * DB-independent wake shell instead of redirecting to a login page that
	 * itself needs the database.
	 */
	powerWarming: boolean
}

// Helper only for typing FetchUserResult.user — never called.
async function fetchUserAttempt() {
	return null as unknown as {
		id: string
		email: string
		name: string
		whitelisted: boolean
		isAdmin: boolean
		impersonatedBy: string | null
		accessToken: string
	}
}

const fetchUser = createServerFn({
	method: 'GET',
}).handler(async (): Promise<FetchUserResult> => {
	const [
		{ auth },
		{ signZeroToken },
		{ getRequest, setCookie },
		{ provisionUser },
	] = await Promise.all([
		import('@/lib/auth'),
		import('@/lib/zero-jwt'),
		import('@tanstack/react-start/server'),
		import('@/server/user-provision'),
	])

	const request = getRequest()
	if (!request) return { user: null, powerWarming: false }

	// Power-managed stack not AWAKE → the DB is (or is about to be)
	// stopped: skip DB-backed auth entirely and hand over to the root wake
	// shell. Cheap DynamoDB read; no-op when POWER_TABLE is unset.
	const { powerConfig, readPowerRow } = await import('@/server/power/power-row')
	if (powerConfig()) {
		const row = await readPowerRow()
		const state = row?.state ?? null
		if (state !== null && state !== 'AWAKE') {
			return { user: null, powerWarming: true }
		}
	}

	// This runs during SSR of every shell: a thrown error here gets
	// dehydrated into the HTML and bricks hydration (blank app). Retry
	// transient DB hiccups once; degrade to logged-out rather than throw.
	const attempt = async () => {
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

		// Scale-to-zero idle signal: an authenticated shell load is web
		// activity. Throttled + no-op when POWER_TABLE is unset; readiness
		// polling never comes through here.
		const { stampWebActivity } = await import('@/server/power/activity')
		await stampWebActivity(user.id)

		// A validated session (DB up) refreshes the offline wake grant — the
		// only credential /api/wake accepts while the stack sleeps. Minted
		// everywhere (not just on AWS) so grants exist before the cutover.
		const {
			mintWakeGrant,
			shouldRefreshWakeGrant,
			WAKE_GRANT_COOKIE,
			WAKE_GRANT_TTL_MS,
		} = await import('@/server/power/wake-grant')
		const cookieHeader = request.headers.get('cookie')
		if (shouldRefreshWakeGrant(cookieHeader)) {
			const grant = mintWakeGrant(user.id)
			if (grant) {
				setCookie(WAKE_GRANT_COOKIE, grant, {
					httpOnly: true,
					sameSite: 'lax',
					path: '/',
					maxAge: Math.floor(WAKE_GRANT_TTL_MS / 1000),
					secure: new URL(request.url).protocol === 'https:',
				})
			}
		}

		return {
			...user,
			whitelisted: provisioned.whitelisted,
			isAdmin: provisioned.isAdmin,
			impersonatedBy:
				(session.session as { impersonatedBy?: string | null })
					?.impersonatedBy ?? null,
			accessToken: await signZeroToken(user),
		}
	}

	try {
		return { user: await attempt(), powerWarming: false }
	} catch (firstError) {
		console.error('fetchUser attempt 1 failed:', firstError)
		try {
			return { user: await attempt(), powerWarming: false }
		} catch (secondError) {
			console.error('fetchUser attempt 2 failed:', secondError)
			// Both attempts failing on a power-managed stack is a
			// DB-unavailable-style failure (the row can still say AWAKE right
			// after the DB stops) — warm instead of bouncing to a login page
			// that cannot work either.
			return { user: null, powerWarming: !!powerConfig() }
		}
	}
})

function RootComponent() {
	const { powerWarming } = Route.useRouteContext()

	// DB-independent wake shell (infra/aws/ARCHITECTURE.md): when the power
	// row says the stack is not AWAKE (or auth failed DB-unavailable-style),
	// even the login page cannot work — so the warming screen mounts HERE,
	// above all auth routing. It wakes the stack, polls readiness, and
	// reloads the page once ready so user loading is retried from scratch.
	if (powerWarming) {
		return (
			<RootDocument>
				<PowerGate
					standalone
					onReady={() => {
						window.location.reload()
					}}
				/>
			</RootDocument>
		)
	}

	return (
		<RootDocument>
			<Outlet />
			{import.meta.env.DEV &&
				import.meta.env.VITE_SHOW_ROUTER_DEVTOOLS === 'true' && (
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
				name: 'color-scheme',
				content: 'dark',
			},
			{
				name: 'theme-color',
				content: '#120d0a',
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
			if (cached) return { user: cached.user, powerWarming: false }
		}

		const result = await fetchUser()
		// Never cache the warming sentinel — the wake shell reloads anyway.
		if (typeof window !== 'undefined' && !result.powerWarming) {
			setCachedUser(result.user)
		}

		return {
			user: result.user,
			powerWarming: result.powerWarming,
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
	// PitMinder is dark-only: the class + colorScheme are locked at SSR time
	// so there is never a light flash.
	return (
		<html lang='en' className='dark' style={{ colorScheme: 'dark' }}>
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
