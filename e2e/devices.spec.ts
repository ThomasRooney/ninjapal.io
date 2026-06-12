import { test, expect } from '@playwright/test'
import { insertTestDevice, whitelistUser } from './lib/db'

test.describe('Devices Navigation', () => {
	test('should navigate to devices page and see device list', async ({ page }) => {
		// First, sign up a new user
		const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
		const password = 'password123'

		await page.goto('/auth/signup')
		await page.getByTestId('signup-email').fill(email)
		await page.getByTestId('signup-password').fill(password)
		await page.getByTestId('signup-submit').click()

		// Private beta gate: whitelist the fresh account, then enter the app
		await page.waitForURL('**/waitlist', { timeout: 10000 })
		await whitelistUser(email)
		await page.goto('/app')
		await page.waitForURL('**/app/**', { timeout: 10000 })

		// Click on Devices in the sidebar
		await page.getByTestId('nav-devices-link').click()
		
		// Should navigate to devices page
		await expect(page).toHaveURL('/app/devices')
		
		// Should show devices page content
		await expect(
			page.getByRole('heading', { name: 'Devices', exact: true }),
		).toBeVisible()
		await expect(page.getByText('Manage and monitor your connected devices')).toBeVisible()
		
		// Should show "No devices found" message when no devices exist
		await expect(page.getByText('No devices found')).toBeVisible()
		await expect(page.getByText('Connect your first device to get started')).toBeVisible()
	})

	test('should navigate to a device detail page', async ({ page }) => {
		// Sign up and navigate to app
		const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
		const password = 'password123'

		await page.goto('/auth/signup')
		await page.getByTestId('signup-email').fill(email)
		await page.getByTestId('signup-password').fill(password)
		await page.getByTestId('signup-submit').click()
		await page.waitForURL('**/waitlist', { timeout: 10000 })
		await whitelistUser(email)
		await page.goto('/app')
		await page.waitForURL('**/app/**', { timeout: 10000 })

		// Seed a device for this user directly (sync flows are covered in device-sync.spec)
		await insertTestDevice(email)

		// Navigate to devices page
		await page.goto('/app/devices')
		await expect(page).toHaveURL('/app/devices')

		// Should now show the device card (synced via Zero)
		const deviceCard = page.getByTestId('device-card').first()
		await expect(deviceCard).toBeVisible({ timeout: 15000 })
		await expect(deviceCard.getByText('Test Grill')).toBeVisible()

		// Click on the device card to navigate to detail page
		await deviceCard.click()

		// Should navigate to device detail page
		await page.waitForURL(/\/app\/device\/[a-f0-9-]+/)

		// Should show device details
		await expect(page.getByText('Test Grill').first()).toBeVisible()
		await expect(page.getByText(/TEST-MODEL/)).toBeVisible()
		await expect(page.getByText(/TEST123456/)).toBeVisible()

		// Detail sub-navigation is present
		await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible()
		await expect(page.getByRole('link', { name: 'History' })).toBeVisible()

		// Temperature history graph (empty state for a fresh device)
		await expect(page.getByText('Temperature History')).toBeVisible()
	})

	test('should show a not found page for an invalid device id', async ({ page }) => {
		// Sign up and navigate to app
		const email = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
		const password = 'password123'

		await page.goto('/auth/signup')
		await page.getByTestId('signup-email').fill(email)
		await page.getByTestId('signup-password').fill(password)
		await page.getByTestId('signup-submit').click()
		await page.waitForURL('**/waitlist', { timeout: 10000 })
		await whitelistUser(email)
		await page.goto('/app')
		await page.waitForURL('**/app/**', { timeout: 10000 })

		// Navigate directly to an invalid device ID
		await page.goto('/app/device/invalid-device-id')

		// Should show not found error
		await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10000 })
	})
})