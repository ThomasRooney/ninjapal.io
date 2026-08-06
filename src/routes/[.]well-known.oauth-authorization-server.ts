import { createFileRoute } from '@tanstack/react-router'

/**
 * RFC 8414 authorization-server metadata at the root well-known path.
 * better-auth serves this internally under its basePath
 * (/api/auth/.well-known/oauth-authorization-server); MCP clients look for
 * it at the origin root, so forward via the plugin's exported helper.
 */
async function serveAuthServerMetadata(request: Request): Promise<Response> {
	const [{ auth }, { oauthProviderAuthServerMetadata }] = await Promise.all([
		import('@/lib/auth'),
		import('@better-auth/oauth-provider'),
	])
	return oauthProviderAuthServerMetadata(auth)(request)
}

export const Route = createFileRoute('/.well-known/oauth-authorization-server')({
	server: {
		handlers: {
			GET: ({ request }: { request: Request }) =>
				serveAuthServerMetadata(request),
		},
	},
})

export { serveAuthServerMetadata }
