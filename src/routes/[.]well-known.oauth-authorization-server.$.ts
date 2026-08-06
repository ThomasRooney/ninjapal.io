import { createFileRoute } from '@tanstack/react-router'

/**
 * RFC 8414 metadata, path-suffixed variant. Clients that discover an issuer
 * with a path component (ours is {origin}/api/auth) request
 * /.well-known/oauth-authorization-server/api/auth — serve the same document.
 */
export const Route = createFileRoute(
	'/.well-known/oauth-authorization-server/$',
)({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const [
					{ auth },
					{ oauthProviderAuthServerMetadata },
					{ withPublicOrigin },
				] = await Promise.all([
					import('@/lib/auth'),
					import('@better-auth/oauth-provider'),
					import('@/lib/public-origin'),
				])
				// PUBLIC_ORIGIN pins the advertised issuer behind CloudFront;
				// unset → the request passes through untouched (current behavior).
				return oauthProviderAuthServerMetadata(auth)(withPublicOrigin(request))
			},
		},
	},
})
