import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * The marketing site lives on the apex domain (pitminder.com, separate
 * deploy from marketing/). The app's root just forwards into the app —
 * the /_authed guard bounces unauthenticated visitors to login.
 */
export const Route = createFileRoute('/')({
	beforeLoad: () => {
		throw redirect({ to: '/app' })
	},
})
