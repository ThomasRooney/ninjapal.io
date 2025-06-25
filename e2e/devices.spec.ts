import { test, expect } from '@playwright/test'

test.describe('Devices Navigation', () => {
	test('should navigate to devices page and see device list', async ({ page }) => {
		// First, sign up a new user
		const email = `test-${Date.now()}@example.com`
		const password = 'password123'

		await page.goto('/sign-up')
		await page.getByTestId('signup-email').fill(email)
		await page.getByTestId('signup-password').fill(password)
		await page.getByTestId('signup-submit').click()

		// Should redirect to app after signup
		await page.waitForURL('/app', { timeout: 10000 })

		// Click on Devices in the sidebar
		await page.getByTestId('nav-devices-link').click()
		
		// Should navigate to devices page
		await expect(page).toHaveURL('/app/devices')
		
		// Should show devices page content
		await expect(page.getByText('Devices')).toBeVisible()
		await expect(page.getByText('Manage and monitor your connected devices')).toBeVisible()
		
		// Should show "No devices found" message when no devices exist
		await expect(page.getByText('No devices found')).toBeVisible()
		await expect(page.getByText('Connect your first device to get started')).toBeVisible()
	})

	test('should navigate to a device detail page', async ({ page }) => {
		// Mock the Ninja API to return a device
		await page.route('**/api.getninjas.com/v2/devices', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					status: 'success',
					devices: [
						{
							dsn: 'TEST123456',
							productName: 'Test Grill',
							model: 'TEST-MODEL',
							connection_status: 'Online',
							lan_ip: '192.168.1.100',
							mac: 'aa:bb:cc:dd:ee:ff',
							rssi: -50,
							fw_version: '1.0.0',
							properties: {
								grill_state: JSON.stringify({
									state: 'cooking',
									mode: 'smoker',
									setpoint: 225,
									inputs: {
										temps: {
											grill: 220,
										},
									},
								}),
							},
						},
					],
				}),
			})
		})

		// Sign up and navigate to app
		const email = `test-${Date.now()}@example.com`
		const password = 'password123'

		await page.goto('/sign-up')
		await page.getByTestId('signup-email').fill(email)
		await page.getByTestId('signup-password').fill(password)
		await page.getByTestId('signup-submit').click()
		await page.waitForURL('/app', { timeout: 10000 })

		// First sync devices from Ninja API
		await page.goto('/app/status')
		await page.getByRole('button', { name: /Sync Real Devices/i }).click()
		
		// Wait for sync to complete
		await expect(page.getByRole('button', { name: /Sync Real Devices/i })).not.toHaveClass(/animate-spin/, { timeout: 10000 })

		// Navigate to devices page
		await page.getByTestId('nav-devices-link').click()
		await expect(page).toHaveURL('/app/devices')

		// Should now show the device card
		const deviceCard = page.getByTestId('device-card-').first()
		await expect(deviceCard).toBeVisible()
		await expect(deviceCard.getByText('Test Grill')).toBeVisible()
		await expect(deviceCard.getByText('TEST-MODEL')).toBeVisible()
		await expect(deviceCard.getByText('Online')).toBeVisible()

		// Click on the device card to navigate to detail page
		await deviceCard.click()

		// Should navigate to device detail page
		await expect(page.url()).toMatch(/\/app\/device\/[a-f0-9-]+/)

		// Should show device details
		await expect(page.getByText('Test Grill').first()).toBeVisible()
		await expect(page.getByText('Model: TEST-MODEL')).toBeVisible()
		await expect(page.getByText('DSN: TEST123456')).toBeVisible()

		// Check tabs are visible
		await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible()
		await expect(page.getByRole('tab', { name: 'Status' })).toBeVisible()
		await expect(page.getByRole('tab', { name: 'Technical' })).toBeVisible()
		await expect(page.getByRole('tab', { name: 'Raw Data' })).toBeVisible()

		// Check overview tab content
		await expect(page.getByText('Temperature')).toBeVisible()
		await expect(page.getByText('220°F')).toBeVisible()
		await expect(page.getByText('Cook Mode')).toBeVisible()
		await expect(page.getByText('smoker')).toBeVisible()
	})

	test('should show a not found page for an invalid device id', async ({ page }) => {
		// Sign up and navigate to app
		const email = `test-${Date.now()}@example.com`
		const password = 'password123'

		await page.goto('/sign-up')
		await page.getByTestId('signup-email').fill(email)
		await page.getByTestId('signup-password').fill(password)
		await page.getByTestId('signup-submit').click()
		await page.waitForURL('/app', { timeout: 10000 })

		// Navigate directly to an invalid device ID
		await page.goto('/app/device/invalid-device-id')

		// Should show not found error
		await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10000 })
	})
})