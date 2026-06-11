import { expect, test } from '@playwright/test'

test('root redirects unauthenticated visitors to login', async ({ page }) => {
	await page.goto('/')

	// / -> /app -> auth guard -> login
	await page.waitForURL('**/auth/login**', { timeout: 10000 })

	const heading = page.getByTestId('main-heading')
	await expect(heading).toBeVisible()
	await expect(heading).toHaveText('PitMinder')
})
