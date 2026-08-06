import { type APIRequestContext, expect, test } from '@playwright/test'

/**
 * Scale-to-zero endpoints, unconfigured environment (no POWER_TABLE — the
 * local/Vercel default): /api/ready fails open on the DB probe alone,
 * /api/wake and /api/activity require auth and no-op cleanly.
 */

function uniqueEmail() {
	return `power-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

/** Signs up a fresh user; returns the session cookie header value. */
async function signUp(request: APIRequestContext): Promise<string> {
	const res = await request.post('/api/auth/sign-up/email', {
		data: {
			email: uniqueEmail(),
			password: 'testpassword123',
			name: 'Power E2E',
		},
	})
	expect(res.status()).toBe(200)
	const setCookie = res.headers()['set-cookie'] ?? ''
	const match = setCookie.match(/better-auth\.session_token=[^;]+/)
	if (!match) throw new Error('signup did not set a session cookie')
	return match[0]
}

test.describe('power endpoints (unconfigured)', () => {
	test('/api/ready fails open to 200 when the DB answers', async ({
		request,
	}) => {
		const res = await request.get('/api/ready')
		expect(res.status()).toBe(200)
		const body = await res.json()
		expect(body.ready).toBe(true)
		expect(res.headers()['cache-control']).toContain('no-store')
	})

	test('/api/wake requires auth', async ({ request }) => {
		const res = await request.post('/api/wake')
		expect(res.status()).toBe(401)
	})

	test('/api/wake no-ops for an authenticated user without POWER_TABLE', async ({
		request,
	}) => {
		const cookie = await signUp(request)
		const res = await request.post('/api/wake', {
			headers: { cookie },
		})
		expect(res.status()).toBe(200)
		expect(await res.json()).toEqual({ ok: true, configured: false })
	})

	test('/api/activity requires auth and never stamps for anonymous pings', async ({
		request,
	}) => {
		const res = await request.post('/api/activity')
		expect(res.status()).toBe(401)
	})

	test('/api/activity accepts an authenticated beacon', async ({ request }) => {
		const cookie = await signUp(request)
		const res = await request.post('/api/activity', {
			headers: { cookie },
		})
		expect(res.status()).toBe(204)
	})
})
