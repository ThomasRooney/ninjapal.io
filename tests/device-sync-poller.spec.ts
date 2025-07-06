import { expect, test } from '@playwright/test'

test.describe('DeviceSyncPoller', () => {
	test('should show sync button in sidebar', async ({ page }) => {
		// Navigate to the app
		await page.goto('/app')

		// Look for the sync button in the sidebar
		const syncButton = page.locator('[data-slot="sidebar-header"] button[title*="Sync devices"]')
		
		// Check that the button exists
		await expect(syncButton).toBeVisible()
		
		// Check that it shows the refresh icon by default
		await expect(syncButton.locator('svg')).toBeVisible()
	})

	test('should trigger sync when clicked', async ({ page }) => {
		// Navigate to the app
		await page.goto('/app')

		// Find the sync button
		const syncButton = page.locator('[data-slot="sidebar-header"] button[title*="Sync devices"]')
		
		// Click the button
		await syncButton.click()
		
		// Check that the button shows a loading state (spinner)
		await expect(syncButton.locator('.animate-spin')).toBeVisible()
		
		// The spinner should eventually disappear (sync completes)
		await expect(syncButton.locator('.animate-spin')).toBeHidden({ timeout: 10000 })
	})
})