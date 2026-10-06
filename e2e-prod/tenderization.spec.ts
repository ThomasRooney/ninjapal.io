import { expect, test } from '@playwright/test'

// Read-only production checks against existing demo history. No DB writes,
// grill commands, chat messages, or fixture creation in the live environment.
for (const width of [1440, 390]) {
	test(`deployed tenderization tracker works at ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 })
		const assetFailures: string[] = []
		const pageErrors: string[] = []
		page.on('response', (response) => {
			if (response.url().includes('/assets/') && response.status() >= 400) {
				assetFailures.push(`${response.status()} ${new URL(response.url()).pathname}`)
			}
		})
		page.on('pageerror', (error) => pageErrors.push(error.message))
		await page.goto('/app/cooks')
		const cook = page.getByTestId('cook-card').filter({ hasNotText: 'Live' }).first()
		await expect(cook).toBeVisible({ timeout: 30_000 })
		await cook.click()
		const card = page.getByTestId('tenderization-card')
		await expect(card.getByTestId('tenderization-dose')).toBeVisible({ timeout: 30_000 })
		await expect(card.getByTestId('tenderization-coverage')).toContainText('%')
		const before = await card.getByTestId('tenderization-dose').innerText()
		await card.getByLabel('Meat probe').selectOption('2')
		await expect(card.getByTestId('tenderization-loading')).toHaveCount(0)
		await expect(card.locator('[data-testid="tenderization-dose"], [data-testid="tenderization-empty"]')).toHaveCount(1)
		await card.getByLabel('Meat probe').selectOption('1')
		await expect(card.getByTestId('tenderization-dose')).toHaveText(before)
		await card.getByLabel('Include rest').selectOption('1')
		await expect(card.getByTestId('tenderization-loading')).toHaveCount(0)
		await expect(card.getByTestId('tenderization-rest-note')).toContainText('same brisket')
		await card.getByLabel('Include rest').selectOption('0')
		await expect(card.getByTestId('tenderization-dose')).toHaveText(before)
		await card.getByText('How this estimate works').click()
		await expect(card.getByRole('link', { name: 'Chris Young’s brisket experiment' })).toBeVisible()
		await card.getByText('How this estimate works').click()
		await card.getByRole('heading').scrollIntoViewIfNeeded()
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
		await page.screenshot({ path: testInfo.outputPath(`production-tenderization-${width}.png`) })
		expect(assetFailures).toEqual([])
		expect(pageErrors).toEqual([])
	})
}
