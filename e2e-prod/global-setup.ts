import { chromium } from '@playwright/test'

export const PROD_STATE = '/tmp/pitminder-prod-storage-state.json'

/**
 * Logs the demo account in ONCE per run and shares the session via
 * storageState — repeated rapid sign-ins trip better-auth's rate limit.
 */
export default async function globalSetup() {
	const browser = await chromium.launch()
	const page = await browser.newPage()
	await page.goto('https://app.pitminder.com/auth/login')
	await page.getByTestId('login-email').fill('demo@pitminder.com')
	await page.getByTestId('login-password').fill('demo-smoker-2026')
	await page.getByTestId('login-submit').click()
	await page.waitForURL('**/app/**', { timeout: 30000 })
	await page.context().storageState({ path: PROD_STATE })
	await browser.close()
}
