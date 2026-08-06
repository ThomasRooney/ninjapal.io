import { createFileRoute } from '@tanstack/react-router'

// Spike route: sets two cookies so we can verify multi Set-Cookie survival
// through the API GW REST streaming prelude (`cookies` metadata key).
export const Route = createFileRoute('/api/spike-cookie')({
	server: {
		handlers: {
			GET: async () => {
				const headers = new Headers({ 'Content-Type': 'application/json' })
				headers.append(
					'Set-Cookie',
					'spike_a=alpha; Path=/; HttpOnly; SameSite=Lax',
				)
				headers.append('Set-Cookie', 'spike_b=beta; Path=/; SameSite=Lax')
				return new Response(JSON.stringify({ ok: true, cookies: 2 }), {
					status: 200,
					headers,
				})
			},
		},
	},
})
