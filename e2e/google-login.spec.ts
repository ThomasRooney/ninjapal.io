import { expect, test } from '@playwright/test'

// Real app + real local Postgres. Only Google's authorization page is mocked.
for (const width of [1440, 390]) {
	test(`Google cancellation returns to login with a retry at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 900 })
		const errors: string[] = []
		page.on('pageerror', error => errors.push(error.message))
		let authorization: URL | undefined
		await page.route('https://accounts.google.com/**', async route => {
			authorization = new URL(route.request().url())
			const callback = new URL(authorization.searchParams.get('redirect_uri')!)
			callback.searchParams.set('state', authorization.searchParams.get('state')!)
			callback.searchParams.set('error', 'access_denied')
			await route.fulfill({ status: 302, headers: { location: callback.href } })
		})
		await page.goto('/auth/login')
		await page.getByTestId('login-google').click()
		await expect(page.getByTestId('login-google-error')).toContainText('cancelled')
		await expect(page.getByTestId('login-google')).toBeEnabled()
		expect(authorization?.searchParams.get('redirect_uri')).toBe('http://localhost:5173/api/auth/callback/google')
		expect(authorization?.searchParams.get('code_challenge_method')).toBe('S256')
		expect(authorization?.searchParams.get('scope')?.split(' ').sort()).toEqual(['email', 'openid', 'profile'])
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
		await page.screenshot({ path: testInfo.outputPath(`google-login-${width}.png`) })
		expect(errors).toEqual([])
	})
}

test('Google retry retains the signed MCP continuation without provider error fields', async ({ page }) => {
	const query = 'client_id=test-client&sig=test-signature&scope=pitminder%3Aread&state=mcp-state'
	await page.goto(`/auth/login?${query}&error=access_denied&error_description=Cancelled`)
	await expect(page.getByTestId('login-google-error')).toContainText('cancelled')
	// Let the real app create the OAuth state; stop only the external navigation.
	await page.route('https://accounts.google.com/**', route => route.fulfill({ contentType: 'text/html', body: 'Mock Google consent page' }))
	const post = page.waitForRequest(request => request.url().endsWith('/api/auth/sign-in/social'))
	await page.getByTestId('login-google').click()
	expect((await post).postDataJSON()).toMatchObject({
		provider: 'google',
		callbackURL: `/api/auth/oauth2/authorize?${query}`,
		errorCallbackURL: `/auth/login?${query}`,
	})
})
