import { expect, test } from '@playwright/test'

/** Message feed + ack flows against the seeded demo account. */
test.describe('Messages', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/auth/login')
		await page.getByTestId('login-email').fill('demo@pitminder.com')
		await page.getByTestId('login-password').fill('demo-smoker-2026')
		await page.getByTestId('login-submit').click()
		await page.waitForURL('**/app/**', { timeout: 15000 })
	})

	test('feed shows technical messages with recorded choices', async ({
		page,
	}) => {
		await page.goto('/app/messages')
		await expect(
			page
				.locator(
					'[data-testid="message-card"], [data-testid="message-pending"]',
				)
				.first(),
		).toBeVisible({ timeout: 20000 })
		await expect(page.getByText('run out of wood pellets')).toBeVisible()
		await expect(page.getByText('AI nudged pit')).toBeVisible()
		// previously-made choices are recorded
		expect(await page.getByTestId('message-acked').count()).toBeGreaterThan(0)
	})

	test('pending message has action buttons and steer input', async ({
		page,
	}) => {
		await page.goto('/app/messages')
		const pending = page.getByTestId('message-pending').first()
		await expect(pending).toBeVisible({ timeout: 20000 })
		// action buttons present
		expect(
			await pending.locator('[data-testid^="message-action-"]').count(),
		).toBeGreaterThan(0)
		// steer affordance opens a text input
		await pending.getByTestId('message-steer').click()
		await expect(pending.getByTestId('message-steer-input')).toBeVisible()
	})
})
