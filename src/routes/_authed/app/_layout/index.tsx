import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/app/_layout/')({
	loader: () => {
		// Redirect to devices page as the default app landing
		throw redirect({ to: '/app/devices' })
	},
})
