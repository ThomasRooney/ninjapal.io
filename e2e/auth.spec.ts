import { expect, test } from '@playwright/test'
import { whitelistUser } from './lib/db'

test.describe('Authentication Flow', () => {
	test('should create a new account', async ({ page }) => {
		// Generate unique email for this test
		const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
		const password = 'testpassword123'

		// Navigate to signup page
		await page.goto('/auth/signup')

		// Fill in the signup form
		await page.getByTestId('signup-email').fill(uniqueEmail)
		await page.getByTestId('signup-password').fill(password)

		// Submit the form
		await page.getByTestId('signup-submit').click()

		// Private beta: fresh signups land on the waitlist page
		await page.waitForURL('**/waitlist', { timeout: 10000 })
		expect(page.url()).toContain('/waitlist')

		// Once whitelisted (admin dashboard), the same account reaches the app
		await whitelistUser(uniqueEmail)
		await page.goto('/app')
		await page.waitForURL('**/app/**', { timeout: 10000 })
		expect(page.url()).not.toContain('/waitlist')
	})

	test('should login with existing account', async ({ page, context }) => {
		// First create a user by signing up
		const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
		const password = 'testpassword123'

		// Sign up first (auto-signs-in)
		await page.goto('/auth/signup')
		await page.getByTestId('signup-email').fill(uniqueEmail)
		await page.getByTestId('signup-password').fill(password)
		await page.getByTestId('signup-submit').click()
		await page.waitForURL('**/waitlist', { timeout: 10000 })
		await whitelistUser(uniqueEmail)

		// Clear the session so we can exercise login from scratch
		await context.clearCookies()

		// Now go to login page
		await page.goto('/auth/login')

		// Fill in the login form
		await page.getByTestId('login-email').fill(uniqueEmail)
		await page.getByTestId('login-password').fill(password)

		// Submit the form
		await page.getByTestId('login-submit').click()

		// Should redirect to /app
		await page.waitForURL('**/app/**', { timeout: 10000 })
		expect(page.url()).toContain('/app')
	})

	test('should reject a wrong password', async ({ page }) => {
		const uniqueEmail = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
		const password = 'testpassword123'

		await page.goto('/auth/signup')
		await page.getByTestId('signup-email').fill(uniqueEmail)
		await page.getByTestId('signup-password').fill(password)
		await page.getByTestId('signup-submit').click()
		await page.waitForURL('**/waitlist', { timeout: 10000 })

		await page.context().clearCookies()
		await page.goto('/auth/login')
		await page.getByTestId('login-email').fill(uniqueEmail)
		await page.getByTestId('login-password').fill('wrong-password-1')
		await page.getByTestId('login-submit').click()

		// Stays on the login page and shows an error
		await expect(page.getByText(/invalid email or password/i)).toBeVisible()
		expect(page.url()).toContain('/auth/login')
	})
})
