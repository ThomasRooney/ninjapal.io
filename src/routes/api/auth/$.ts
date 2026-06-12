import { auth } from '@/lib/auth'
import { createFileRoute } from '@tanstack/react-router'

/** better-auth handler — serves all /api/auth/* endpoints. */
export const Route = createFileRoute('/api/auth/$')({
	server: {
		handlers: {
			GET: ({ request }) => auth.handler(request),
			POST: ({ request }) => auth.handler(request),
		},
	},
})
