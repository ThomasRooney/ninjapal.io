import { createServerFileRoute } from '@tanstack/react-start/server'

/**
 * PitMinder MCP over streamable HTTP (stateless: one server instance per
 * request, scoped to the session user). External agents authenticate with
 * the same better-auth session cookie as the app.
 */
export const ServerRoute = createServerFileRoute('/api/mcp').methods({
	POST: async ({ request }) => {
		const [
			{ auth },
			{ createPitMinderMcpServer },
			{ StreamableHTTPServerTransport },
			{ toFetchResponse, toReqRes },
		] = await Promise.all([
			import('@/lib/auth'),
			import('@/server/mcp/pitminder-server'),
			import('@modelcontextprotocol/sdk/server/streamableHttp.js'),
			import('fetch-to-node'),
		])

		const session = await auth.api.getSession({ headers: request.headers })
		if (!session?.user) {
			return new Response('Unauthorized', { status: 401 })
		}

		const { req, res } = toReqRes(request)
		const server = createPitMinderMcpServer(session.user.id)
		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined, // stateless
		})
		await server.connect(transport)
		await transport.handleRequest(req, res, await request.json())
		res.on('close', () => {
			transport.close()
			server.close()
		})
		return toFetchResponse(res)
	},
	GET: async () =>
		new Response('Method Not Allowed', {
			status: 405,
			headers: { Allow: 'POST' },
		}),
})
