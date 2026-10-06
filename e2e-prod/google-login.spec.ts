import { expect, test } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

// Exercises live app state/cookies/callbacks; Google denial is simulated. This
// does NOT prove that the Google Cloud client exists or accepts credentials.
for (const width of [1440, 390]) {
	test(`Google callback failure recovers on production at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 900 })
		const errors: string[] = []
		page.on('pageerror', error => errors.push(error.message))
		page.on('response', response => {
			if (response.url().includes('/assets/') && response.status() >= 400) errors.push(`asset ${response.status()}`)
		})
		await page.route('https://accounts.google.com/**', async route => {
			const authorization = new URL(route.request().url())
			const callback = new URL(authorization.searchParams.get('redirect_uri')!)
			expect(callback.href).toBe('https://app.pitminder.com/api/auth/callback/google')
			callback.searchParams.set('state', authorization.searchParams.get('state')!)
			callback.searchParams.set('error', 'access_denied')
			await route.fulfill({ status: 302, headers: { location: callback.href } })
		})
		await page.goto('/auth/login')
		await page.getByTestId('login-google').click()
		// Two auth round trips can each encounter a cold Lambda after a deploy.
		await expect(page.getByTestId('login-google-error')).toContainText('cancelled', { timeout: 30_000 })
		await expect(page.getByTestId('login-google')).toBeEnabled()
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
		await page.screenshot({ path: testInfo.outputPath(`production-google-${width}.png`) })
		expect(errors).toEqual([])
	})
}
