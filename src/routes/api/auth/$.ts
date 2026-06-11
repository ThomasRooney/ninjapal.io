import { auth } from '@/lib/auth'
import { createServerFileRoute } from '@tanstack/react-start/server'

/** better-auth handler — serves all /api/auth/* endpoints. */
export const ServerRoute = createServerFileRoute('/api/auth/$').methods({
	GET: ({ request }) => auth.handler(request),
	POST: ({ request }) => auth.handler(request),
})
