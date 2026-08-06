import { createHash, randomBytes } from 'node:crypto'
import { type APIRequestContext, expect, test } from '@playwright/test'

/**
 * MCP OAuth e2e — request-level tests against a dedicated vite on :5473
 * (`bun vite dev --port 5473`), NOT the shared dev stack on :5173.
 *
 * The OAuth issuer/audience stay pinned to the env config
 * (BETTER_AUTH_URL=http://localhost:5173, PITMINDER_MCP_RESOURCE) — tokens
 * are strings compared exactly, so the serving port does not matter.
 */
const BASE = process.env.MCP_OAUTH_BASE_URL ?? 'http://localhost:5473'
const RESOURCE =
	process.env.PITMINDER_MCP_RESOURCE ?? 'http://localhost:5173/api/mcp'
const TRUSTED_ORIGIN = process.env.BETTER_AUTH_URL ?? 'http://localhost:5173'
const REDIRECT_URI = 'http://127.0.0.1:8976/callback'

test.skip(
	({ browserName }) => browserName !== 'chromium',
	'request-level suite runs once',
)

function uniqueEmail() {
	return `mcp-oauth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

/** Signs up a fresh user; returns the session cookie header value. */
async function signUp(request: APIRequestContext): Promise<string> {
	const res = await request.post(`${BASE}/api/auth/sign-up/email`, {
		data: {
			email: uniqueEmail(),
			password: 'testpassword123',
			name: 'MCP OAuth E2E',
		},
	})
	expect(res.status()).toBe(200)
	const setCookie = res.headers()['set-cookie'] ?? ''
	const match = setCookie.match(/better-auth\.session_token=[^;]+/)
	if (!match) throw new Error('signup did not set a session cookie')
	return match[0]
}

function pkcePair() {
	const verifier = randomBytes(32).toString('base64url')
	const challenge = createHash('sha256').update(verifier).digest('base64url')
	return { verifier, challenge }
}

async function registerClient(
	request: APIRequestContext,
	scope: string,
): Promise<string> {
	const res = await request.post(`${BASE}/api/auth/oauth2/register`, {
		// The playwright cookie jar attaches the signup session cookie, which
		// makes better-auth demand a trusted Origin. Cookie-less clients (the
		// real DCR case, verified with curl) need no Origin at all.
		headers: { Origin: TRUSTED_ORIGIN },
		data: {
			client_name: 'pitminder-e2e',
			redirect_uris: [REDIRECT_URI],
			token_endpoint_auth_method: 'none',
			grant_types: ['authorization_code'],
			response_types: ['code'],
			scope,
		},
	})
	// The plugin returns 200 (not RFC 7591's 201) — accept both.
	expect([200, 201], await res.text()).toContain(res.status())
	const body = await res.json()
	expect(typeof body.client_id).toBe('string')
	return body.client_id as string
}

/** Full authorization-code + PKCE dance; returns the token response body. */
async function authorizationCodeFlow(
	request: APIRequestContext,
	cookie: string,
	scope: string,
): Promise<Record<string, unknown>> {
	const clientId = await registerClient(request, scope)
	const { verifier, challenge } = pkcePair()
	const state = randomBytes(8).toString('hex')

	const authorizeUrl =
		`${BASE}/api/auth/oauth2/authorize?response_type=code` +
		`&client_id=${encodeURIComponent(clientId)}` +
		`&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
		`&scope=${encodeURIComponent(scope)}` +
		`&state=${state}` +
		`&code_challenge=${challenge}&code_challenge_method=S256`
	const authorize = await request.get(authorizeUrl, {
		headers: { Cookie: cookie },
		maxRedirects: 0,
	})
	expect(authorize.status()).toBe(302)
	const location = authorize.headers().location ?? ''
	expect(location.startsWith('/consent?')).toBe(true)
	const oauthQuery = location.slice('/consent?'.length)

	const consent = await request.post(`${BASE}/api/auth/oauth2/consent`, {
		headers: { Cookie: cookie, Origin: TRUSTED_ORIGIN },
		data: { accept: true, oauth_query: oauthQuery },
	})
	expect(consent.status(), await consent.text()).toBe(200)
	const { url } = (await consent.json()) as { url: string }
	const redirected = new URL(url)
	expect(redirected.origin + redirected.pathname).toBe(REDIRECT_URI)
	expect(redirected.searchParams.get('state')).toBe(state)
	const code = redirected.searchParams.get('code')
	expect(code).toBeTruthy()

	const token = await request.post(`${BASE}/api/auth/oauth2/token`, {
		headers: { Origin: TRUSTED_ORIGIN }, // jar cookie rides along, see above
		form: {
			grant_type: 'authorization_code',
			code: code as string,
			redirect_uri: REDIRECT_URI,
			client_id: clientId,
			code_verifier: verifier,
			resource: RESOURCE,
		},
	})
	expect(token.status(), await token.text()).toBe(200)
	return (await token.json()) as Record<string, unknown>
}

async function mcpToolsList(
	request: APIRequestContext,
	headers: Record<string, string>,
) {
	return request.post(`${BASE}/api/mcp`, {
		headers,
		data: { jsonrpc: '2.0', method: 'tools/list', id: 1 },
	})
}

async function toolNames(res: Awaited<ReturnType<APIRequestContext['post']>>) {
	const body = await res.json()
	return (body.result.tools as Array<{ name: string }>)
		.map((t) => t.name)
		.sort()
}

test.describe('OAuth metadata', () => {
	test('authorization-server metadata is spec-compliant (bare + suffixed path)', async ({
		request,
	}) => {
		for (const path of [
			'/.well-known/oauth-authorization-server',
			'/.well-known/oauth-authorization-server/api/auth',
		]) {
			const res = await request.get(`${BASE}${path}`)
			expect(res.status(), path).toBe(200)
			expect(res.headers()['content-type']).toContain('application/json')
			const meta = await res.json()
			expect(meta.issuer).toBe(`${TRUSTED_ORIGIN}/api/auth`)
			expect(meta.authorization_endpoint).toBe(
				`${TRUSTED_ORIGIN}/api/auth/oauth2/authorize`,
			)
			expect(meta.token_endpoint).toBe(
				`${TRUSTED_ORIGIN}/api/auth/oauth2/token`,
			)
			expect(meta.registration_endpoint).toBe(
				`${TRUSTED_ORIGIN}/api/auth/oauth2/register`,
			)
			expect(meta.jwks_uri).toBe(`${TRUSTED_ORIGIN}/api/auth/jwks`)
			expect(meta.scopes_supported).toEqual([
				'pitminder:read',
				'pitminder:control',
			])
			expect(meta.code_challenge_methods_supported).toEqual(['S256'])
			expect(meta.response_types_supported).toContain('code')
		}
	})

	test('protected-resource metadata is spec-compliant', async ({ request }) => {
		const res = await request.get(
			`${BASE}/.well-known/oauth-protected-resource/api/mcp`,
		)
		expect(res.status()).toBe(200)
		expect(res.headers()['content-type']).toContain('application/json')
		expect(await res.json()).toEqual({
			resource: RESOURCE,
			authorization_servers: [`${TRUSTED_ORIGIN}/api/auth`],
			scopes_supported: ['pitminder:read', 'pitminder:control'],
			bearer_methods_supported: ['header'],
		})
	})
})

test.describe('/api/mcp auth contract', () => {
	test('no credentials → 401 with WWW-Authenticate resource_metadata', async ({
		request,
	}) => {
		const res = await mcpToolsList(request, {})
		expect(res.status()).toBe(401)
		const www = res.headers()['www-authenticate'] ?? ''
		expect(www).toContain('Bearer')
		expect(www).toContain(
			`resource_metadata="${BASE}/.well-known/oauth-protected-resource/api/mcp"`,
		)
	})

	test('garbage Bearer + VALID session cookie → 401, never cookie fallback', async ({
		request,
	}) => {
		const cookie = await signUp(request)
		// Prove the cookie alone authenticates…
		const cookieOnly = await mcpToolsList(request, { Cookie: cookie })
		expect(cookieOnly.status()).toBe(200)
		// …then that a bad Bearer is rejected even though the cookie rides along.
		const res = await mcpToolsList(request, {
			Cookie: cookie,
			Authorization: 'Bearer garbage',
		})
		expect(res.status()).toBe(401)
		const www = res.headers()['www-authenticate'] ?? ''
		expect(www).toContain('error="invalid_token"')
		expect(www).toContain('resource_metadata=')
	})

	test('malformed Authorization scheme → 401 even with a valid cookie', async ({
		request,
	}) => {
		const cookie = await signUp(request)
		const res = await mcpToolsList(request, {
			Cookie: cookie,
			Authorization: 'Basic dXNlcjpwYXNz',
		})
		expect(res.status()).toBe(401)
	})

	test('session cookie alone lists every tool (full grant)', async ({
		request,
	}) => {
		const cookie = await signUp(request)
		const res = await mcpToolsList(request, { Cookie: cookie })
		expect(res.status()).toBe(200)
		const names = await toolNames(res)
		expect(names).toContain('get_telemetry')
		expect(names).toContain('set_pit_temp')
		expect(names).toContain('respond_to_message')
	})
})

test.describe('authorization-code + PKCE flow', () => {
	test('register → authorize → consent → token → Bearer tools/list', async ({
		request,
	}) => {
		const cookie = await signUp(request)
		const token = await authorizationCodeFlow(
			request,
			cookie,
			'pitminder:read pitminder:control',
		)
		expect(token.token_type).toBe('Bearer')
		expect(token.scope).toBe('pitminder:read pitminder:control')
		expect(typeof token.access_token).toBe('string')

		const res = await mcpToolsList(request, {
			Authorization: `Bearer ${token.access_token}`,
		})
		expect(res.status()).toBe(200)
		const names = await toolNames(res)
		expect(names).toContain('get_telemetry')
		expect(names).toContain('set_pit_temp')
	})

	test('read-only grant hides control tools and the handler stays gated', async ({
		request,
	}) => {
		const cookie = await signUp(request)
		const token = await authorizationCodeFlow(request, cookie, 'pitminder:read')
		expect(token.scope).toBe('pitminder:read')

		const res = await mcpToolsList(request, {
			Authorization: `Bearer ${token.access_token}`,
		})
		expect(res.status()).toBe(200)
		const names = await toolNames(res)
		expect(names).toContain('get_telemetry')
		expect(names).not.toContain('set_pit_temp')
		expect(names).not.toContain('respond_to_message')

		// tools/call on the unregistered control tool errors
		const call = await request.post(`${BASE}/api/mcp`, {
			headers: { Authorization: `Bearer ${token.access_token}` },
			data: {
				jsonrpc: '2.0',
				method: 'tools/call',
				id: 2,
				params: {
					name: 'set_pit_temp',
					arguments: { deviceId: 'x', setpointC: 100, reason: 'e2e' },
				},
			},
		})
		expect(call.status()).toBe(200)
		const body = await call.json()
		expect(JSON.stringify(body)).toMatch(/not found/i)
	})

	test('denying consent redirects back with access_denied and mints nothing', async ({
		request,
	}) => {
		const cookie = await signUp(request)
		const clientId = await registerClient(request, 'pitminder:read')
		const { challenge } = pkcePair()
		const authorize = await request.get(
			`${BASE}/api/auth/oauth2/authorize?response_type=code&client_id=${clientId}` +
				`&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=pitminder%3Aread` +
				`&state=abc&code_challenge=${challenge}&code_challenge_method=S256`,
			{ headers: { Cookie: cookie }, maxRedirects: 0 },
		)
		expect(authorize.status()).toBe(302)
		const oauthQuery = (authorize.headers().location ?? '').slice(
			'/consent?'.length,
		)
		const consent = await request.post(`${BASE}/api/auth/oauth2/consent`, {
			headers: { Cookie: cookie, Origin: TRUSTED_ORIGIN },
			data: { accept: false, oauth_query: oauthQuery },
		})
		expect(consent.status()).toBe(200)
		const { url } = (await consent.json()) as { url: string }
		expect(url).toContain('error=access_denied')
		expect(url).not.toContain('code=')
	})
})

test.describe('hand-minted token negatives', () => {
	test('JWT signed by an unknown key (right iss/aud) → 401', async ({
		request,
	}) => {
		const { SignJWT, generateKeyPair } = await import('jose')
		const { privateKey } = await generateKeyPair('EdDSA')
		const forged = await new SignJWT({
			scope: 'pitminder:read pitminder:control',
			azp: 'forged-client',
		})
			.setProtectedHeader({ alg: 'EdDSA', kid: 'forged' })
			.setSubject('00000000-0000-0000-0000-000000000000')
			.setIssuer(`${TRUSTED_ORIGIN}/api/auth`)
			.setAudience(RESOURCE)
			.setIssuedAt()
			.setExpirationTime('5m')
			.sign(privateKey)
		const res = await mcpToolsList(request, {
			Authorization: `Bearer ${forged}`,
		})
		expect(res.status()).toBe(401)
		expect(res.headers()['www-authenticate'] ?? '').toContain(
			'error="invalid_token"',
		)
	})

	test('legit-flow token presented with the WRONG audience → 401', async ({
		request,
	}) => {
		// Token bound to a different audience must not clear verification.
		const { SignJWT, generateKeyPair } = await import('jose')
		const { privateKey } = await generateKeyPair('EdDSA')
		const wrongAud = await new SignJWT({ scope: 'pitminder:read' })
			.setProtectedHeader({ alg: 'EdDSA', kid: 'forged' })
			.setSubject('00000000-0000-0000-0000-000000000000')
			.setIssuer(`${TRUSTED_ORIGIN}/api/auth`)
			.setAudience('https://evil.example/api/mcp')
			.setIssuedAt()
			.setExpirationTime('5m')
			.sign(privateKey)
		const res = await mcpToolsList(request, {
			Authorization: `Bearer ${wrongAud}`,
		})
		expect(res.status()).toBe(401)
	})
})
