import { expect, test } from '@playwright/test'

/** Interaction-speed measurements against prod. Run before + after fixes. */
test('measure navigation timings', async ({ page }) => {
	test.setTimeout(180_000)
	await page.goto('/auth/login')
	await page.getByTestId('login-email').fill('demo@pitminder.com')
	await page.getByTestId('login-password').fill('demo-smoker-2026')
	const loginStart = Date.now()
	await page.getByTestId('login-submit').click()
	await page.waitForURL('**/app/**', { timeout: 30000 })
	console.log(`login->app: ${Date.now() - loginStart}ms`)

	// Wait for the app shell to settle
	await page.getByTestId('nav-devices-link').waitFor({ timeout: 30000 })

	const targets = [
		{ name: 'messages', click: () => page.getByRole('link', { name: 'Messages' }).first().click(), settle: () => page.getByRole('heading', { name: 'Messages', level: 1 }).waitFor() },
		{ name: 'cooks', click: () => page.getByRole('link', { name: 'Cooks' }).first().click(), settle: () => page.getByRole('heading', { name: /cook/i, level: 1 }).first().waitFor() },
		{ name: 'devices', click: () => page.getByTestId('nav-devices-link').click(), settle: () => page.getByRole('heading', { name: 'Devices', exact: true }).waitFor() },
	]

	const timings: Record<string, number[]> = {}
	for (let round = 1; round <= 3; round++) {
		for (const t of targets) {
			const start = Date.now()
			await t.click()
			await t.settle()
			const ms = Date.now() - start
			;(timings[t.name] ??= []).push(ms)
			console.log(`round${round} nav->${t.name}: ${ms}ms`)
		}
	}
	// Warm SPA navigations must be fast: no server round-trip per nav.
	// (Round 1 may pay a one-off code-split chunk fetch — judge the median.)
	for (const [name, ms] of Object.entries(timings)) {
		const median = [...ms].sort((a, b) => a - b)[Math.floor(ms.length / 2)]
		console.log(`median nav->${name}: ${median}ms`)
		expect(median, `${name} nav too slow`).toBeLessThan(400)
	}
})
