import { test, expect } from '@playwright/test'

test.describe('Temperature Conversion', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to login page
		await page.goto('/auth/login')
		
		// TODO: Add proper authentication steps here
		// For now, this is a placeholder to show the test structure
	})

	test('should display temperatures in Fahrenheit by default', async ({ page }) => {
		// Navigate to a device page
		await page.goto('/app/device/a7353707-f4eb-4d84-b993-fb893921e9c7')
		
		// Wait for temperature display to load
		await page.waitForSelector('[data-testid="temperature-display"]', { 
			state: 'visible',
			timeout: 10000 
		})
		
		// Check that temperatures are displayed in Fahrenheit
		const temperatureText = await page.textContent('[data-testid="temperature-display"]')
		expect(temperatureText).toContain('°F')
	})

	test('should toggle temperature units in account settings', async ({ page }) => {
		// Navigate to account page
		await page.goto('/app/account')
		
		// Wait for preferences section
		await page.waitForSelector('text=Preferences', { state: 'visible' })
		
		// Find and click the temperature toggle
		const toggle = page.locator('#temperature-unit')
		await toggle.click()
		
		// Wait for the change to be saved
		await page.waitForTimeout(1000)
		
		// Navigate to device page
		await page.goto('/app/device/a7353707-f4eb-4d84-b993-fb893921e9c7')
		
		// Check that temperatures are now displayed in Celsius
		const temperatureText = await page.textContent('[data-testid="temperature-display"]')
		expect(temperatureText).toContain('°C')
	})

	test('should persist temperature preference across sessions', async ({ page }) => {
		// Navigate to account page
		await page.goto('/app/account')
		
		// Wait for preferences section
		await page.waitForSelector('text=Preferences', { state: 'visible' })
		
		// Check current state of toggle
		const toggle = page.locator('#temperature-unit')
		const initialState = await toggle.isChecked()
		
		// Toggle the preference
		await toggle.click()
		await page.waitForTimeout(1000)
		
		// Reload the page
		await page.reload()
		
		// Check that the preference persisted
		const newState = await toggle.isChecked()
		expect(newState).toBe(!initialState)
	})
})