import { createFileRoute } from '@tanstack/react-router'

// Spike route: 302 so we can verify redirect status + Location survive the
// API GW REST streaming path.
export const Route = createFileRoute('/api/spike-redirect')({
	server: {
		handlers: {
			GET: async () =>
				new Response(null, {
					status: 302,
					headers: { Location: '/api/spike-cookie' },
				}),
		},
	},
})
