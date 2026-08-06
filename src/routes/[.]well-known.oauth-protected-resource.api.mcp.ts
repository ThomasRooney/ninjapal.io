import { createFileRoute } from '@tanstack/react-router'

/**
 * RFC 9728 protected-resource metadata for the MCP endpoint. MCP clients
 * resolve this from the WWW-Authenticate resource_metadata hint to learn
 * which authorization server (and scopes) guard /api/mcp.
 */
export const Route = createFileRoute(
	'/.well-known/oauth-protected-resource/api/mcp',
)({
	server: {
		handlers: {
			GET: async () => {
				const { MCP_RESOURCE, MCP_SCOPES, getAuthIssuer } = await import(
					'@/lib/auth'
				)
				return Response.json(
					{
						resource: MCP_RESOURCE,
						authorization_servers: [getAuthIssuer()],
						scopes_supported: [...MCP_SCOPES],
						bearer_methods_supported: ['header'],
					},
					{
						headers: {
							'Cache-Control':
								'public, max-age=15, stale-while-revalidate=15, stale-if-error=86400',
						},
					},
				)
			},
		},
	},
})
