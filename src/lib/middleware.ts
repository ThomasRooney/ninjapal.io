import { createMiddleware } from '@tanstack/react-start'

export const corsMiddleware = createMiddleware({ type: 'request' }).server(
	async ({ next, request }) => {
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			})
		}

		// Continue with request
		const result = await next()

		// Add CORS headers to response
		if (result instanceof Response) {
			const newHeaders = new Headers(result.headers)
			newHeaders.set('Access-Control-Allow-Origin', '*')
			newHeaders.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
			newHeaders.set(
				'Access-Control-Allow-Headers',
				'Content-Type, Authorization',
			)

			return new Response(result.body, {
				status: result.status,
				statusText: result.statusText,
				headers: newHeaders,
			})
		}

		return result
	},
)

export const authMiddleware = createMiddleware({ type: 'request' }).server(
	async ({ next, request }) => {
		// Extract JWT from Authorization header
		const authHeader = request.headers.get('authorization') ?? ''
		const token = authHeader.replace(/^Bearer\s+/, '')
		const sub = token ? parseSub(token) : null

		// Pass auth data through context
		const result = await next({
			context: {
				authData: { sub },
			},
		})

		return result
	},
)

/** Helper – decode the `sub` from your JWT token payload */
function parseSub(jwt: string): string | null {
	try {
		const [, payload] = jwt.split('.')
		const data = JSON.parse(atob(payload))
		return data.sub ?? null
	} catch {
		return null
	}
}
