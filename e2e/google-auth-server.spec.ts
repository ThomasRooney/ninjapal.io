import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import dotenv from 'dotenv'
import { Client } from 'pg'

dotenv.config({ path: '.env' })
const connectionString = process.env.ZERO_UPSTREAM_DB
if (!connectionString || !['localhost', '127.0.0.1'].includes(new URL(connectionString).hostname)) {
	throw new Error('Google auth fixtures require local Postgres')
}

// The real app auth handler and real database; only Google's token service is
// mocked. No test bypasses are added to the application or its auth configuration.
test.describe.configure({ mode: 'serial' })
const origin = 'http://localhost:5173'
const googleSubject = randomUUID()
const email = `google-e2e-${googleSubject}@example.com`
const localUserId = randomUUID()
const db = new Client({ connectionString })
let auth: typeof import('../src/lib/auth').auth
let restoreFetch: () => void
const states: string[] = []
let exchanges = 0

test.beforeAll(async () => {
	process.env.BETTER_AUTH_URL = origin
	process.env.GOOGLE_CLIENT_ID = '123456789-test.apps.googleusercontent.com'
	process.env.GOOGLE_CLIENT_SECRET = 'test-only-google-secret'
	await db.connect()
	;({ auth } = await import('../src/lib/auth'))
	const originalFetch = globalThis.fetch
	globalThis.fetch = async (input, init) => {
		const request = new Request(input, init)
		if (request.url !== 'https://oauth2.googleapis.com/token') return originalFetch(input, init)
		exchanges++
		const data = new URLSearchParams(await request.text())
		expect(data.get('grant_type')).toBe('authorization_code')
		expect(data.get('redirect_uri')).toBe(`${origin}/api/auth/callback/google`)
		expect(data.get('code_verifier')?.length).toBeGreaterThanOrEqual(43)
		expect(data.get('client_secret')).toBe('test-only-google-secret')
		const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
		// A token returned by the mocked, authenticated Google token exchange.
		const idToken = `${encode({ alg: 'RS256' })}.${encode({ sub: googleSubject, email, email_verified: true, name: 'Google E2E', aud: process.env.GOOGLE_CLIENT_ID, iss: 'https://accounts.google.com', exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`
		return Response.json({ access_token: 'test-access-token', token_type: 'Bearer', expires_in: 3600, id_token: idToken, scope: 'openid email profile' })
	}
	restoreFetch = () => { globalThis.fetch = originalFetch }
})

test.afterAll(async () => {
	restoreFetch?.()
	await db.query('delete from "user" where email = $1', [email])
	await db.query('delete from verification where identifier = any($1::text[])', [states])
	await db.end()
	const { getSql } = await import('../src/server/db/client')
	await getSql().end()
})

function cookie(response: Response) {
	return response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
}

async function start(callbackURL = '/app') {
	const response = await auth.handler(new Request(`${origin}/api/auth/sign-in/social`, {
		method: 'POST',
		headers: { origin, 'content-type': 'application/json' },
		body: JSON.stringify({ provider: 'google', callbackURL, errorCallbackURL: '/auth/login', disableRedirect: true }),
	}))
	expect(response.status).toBe(200)
	const url = new URL((await response.json()).url)
	const state = url.searchParams.get('state')!
	states.push(state)
	return { state, cookie: cookie(response) }
}

async function complete(flow: Awaited<ReturnType<typeof start>>, params = 'code=test-code') {
	return auth.handler(new Request(`${origin}/api/auth/callback/google?state=${flow.state}&${params}`, { headers: { cookie: flow.cookie } }))
}

test('rejects linking an unverified password account', async () => {
	await db.query('insert into "user" (id, email, name, email_verified) values ($1, $2, $3, false)', [localUserId, email, 'Existing cook owner'])
	const response = await complete(await start())
	expect(response.status).toBe(302)
	expect(response.headers.get('location')).toContain('/auth/login?error=account_not_linked')
	expect((await db.query('select id from account where user_id=$1', [localUserId])).rowCount).toBe(0)
	expect(cookie(response)).not.toContain('session_token=')
})

test('links a verified existing account without changing its user ID, then signs in again', async () => {
	await db.query('update "user" set email_verified=true where id=$1', [localUserId])
	for (let i = 0; i < 2; i++) {
		const response = await complete(await start())
		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe('/app')
		const session = await auth.handler(new Request(`${origin}/api/auth/get-session`, { headers: { cookie: cookie(response) } }))
		expect((await session.json()).user.id).toBe(localUserId)
	}
	expect((await db.query('select id from "user" where email=$1', [email])).rowCount).toBe(1)
	const accounts = (await db.query('select provider_id, account_id, user_id from account where user_id=$1', [localUserId])).rows
	expect(accounts).toEqual([{ provider_id: 'google', account_id: googleSubject, user_id: localUserId }])
})

test('creates a new Google account and preserves the MCP return path', async () => {
	await db.query('delete from "user" where id=$1', [localUserId])
	const callbackURL = '/api/auth/oauth2/authorize?client_id=test&sig=signed'
	const response = await complete(await start(callbackURL))
	expect(response.headers.get('location')).toBe(callbackURL)
	const session = await auth.handler(new Request(`${origin}/api/auth/get-session`, { headers: { cookie: cookie(response) } }))
	const user = (await session.json()).user
	expect(user.email).toBe(email)
	expect(user.emailVerified).toBe(true)
	expect(user.id).toMatch(/^[\da-f-]{36}$/)
})

test('denial and missing state never exchange tokens or create sessions', async () => {
	const before = exchanges
	const denied = await complete(await start(), 'error=access_denied')
	expect(denied.headers.get('location')).toBe('/auth/login?error=access_denied')
	expect(cookie(denied)).not.toContain('session_token=')
	const noCookie = await start()
	noCookie.cookie = ''
	const invalid = await complete(noCookie)
	expect(invalid.headers.get('location')).toContain('error=state_mismatch')
	expect(cookie(invalid)).not.toContain('session_token=')
	expect(exchanges).toBe(before)
})

test('rejects an external callback destination', async () => {
	const response = await auth.handler(new Request(`${origin}/api/auth/sign-in/social`, {
		method: 'POST', headers: { origin, 'content-type': 'application/json' },
		body: JSON.stringify({ provider: 'google', callbackURL: 'https://evil.example' }),
	}))
	expect(response.status).toBe(403)
})
