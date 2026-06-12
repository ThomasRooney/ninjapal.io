import { expect, test } from '@playwright/test'

/**
 * Cook sessions flows against the seeded demo account (assumes
 * `bun scripts/seed-demo.ts` has run, like the local dev stack does).
 */
test.describe('Cook Sessions', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/auth/login')
		await page.getByTestId('login-email').fill('demo@pitminder.com')
		await page.getByTestId('login-password').fill('demo-smoker-2026')
		await page.getByTestId('login-submit').click()
		await page.waitForURL('**/app/**', { timeout: 15000 })
	})

	test('lists seeded cooks with stability scores', async ({ page }) => {
		await page.goto('/app/cooks')
		await expect(page.getByTestId('cook-card').first()).toBeVisible({
			timeout: 20000,
		})
		const cards = page.getByTestId('cook-card')
		expect(await cards.count()).toBeGreaterThanOrEqual(3)
		await expect(page.getByText('Baby Back Ribs')).toBeVisible()
		await expect(page.getByText('Live').first()).toBeVisible()
	})

	test('cook detail shows stats, histogram, and replay', async ({ page }) => {
		await page.goto('/app/cooks')
		await page
			.getByTestId('cook-card')
			.filter({ hasText: 'Baby Back Ribs' })
			.click()
		await expect(page.getByTestId('stat-stability')).toBeVisible({
			timeout: 20000,
		})
		await expect(page.getByTestId('stat-peak-grill')).toContainText('°')
		await expect(page.getByTestId('temp-histogram')).toBeVisible()
		await expect(page.getByTestId('cook-replay')).toBeVisible()

		// Replay scrubs
		await page.getByTestId('replay-play').click()
		await page.waitForTimeout(1500)
		await expect(page.getByTestId('replay-play')).toBeVisible()
	})

	test('device overview shows gauges and probe target', async ({ page }) => {
		await page.goto('/app/devices')
		await page
			.getByTestId('device-card')
			.filter({ hasText: 'Demo Smoker' })
			.click()
		await expect(page.getByTestId('gauge-grill')).toBeVisible({
			timeout: 20000,
		})
		expect(await page.locator('[data-testid^="gauge-"]').count()).toBe(3)
		await expect(page.getByTestId('probe-row-1')).toBeVisible()
		await expect(page.getByTestId('temperature-graph')).toBeVisible()
	})
})
