import { expect, test } from '@playwright/test'
import { Client } from 'pg'

const PROD_DB = process.env.PROD_DATABASE_URL
if (!PROD_DB) throw new Error('PROD_DATABASE_URL is required for the prod suite')

async function query(
	text: string,
	params: unknown[] = [],
): Promise<Record<string, unknown>[]> {
	const client = new Client({ connectionString: PROD_DB })
	await client.connect()
	try {
		return (await client.query(text, params)).rows
	} finally {
		await client.end()
	}
}

// Session comes from globalSetup storageState — one login per run, because
// rapid repeated sign-ins trip better-auth's rate limit.
async function loginDemo(page: import('@playwright/test').Page) {
	await page.goto('/app')
	await page.waitForURL('**/app/**', { timeout: 20000 })
}

test.describe('Production validation', () => {
	test('marketing site is live with the AI-pitmaster pitch', async ({
		page,
	}) => {
		await page.goto('https://pitminder.com')
		await expect(page.locator('body')).toContainText(/pitminder/i, {
			timeout: 15000,
		})
		await expect(page.locator('body')).toContainText(/AI|pitmaster|smoker/i)
	})

	test('demo login reaches the live simulated smoker', async ({ page }) => {
		await loginDemo(page)
		const [device] = await query(
			`select id from devices where product_name = 'Demo Smoker' and is_simulated limit 1`,
		)
		expect(device?.id).toBeTruthy()
		await page.goto(`/app/device/${device.id}`)
		await expect(page.getByTestId('temperature-display')).toBeVisible({
			timeout: 30000,
		})
		const reading = await page.getByTestId('temperature-display').textContent()
		expect(reading).not.toBe('—')
		// New feature surfaces: photo card present
		await expect(page.getByTestId('cook-photos')).toBeVisible()
	})

	test('worker is stepping the simulated cook', async () => {
		const [row] = await query(
			`select (sim_state->>'lastStepMs')::bigint as last_step,
			        extract(epoch from now()) * 1000 as now_ms
			 from devices where product_name = 'Demo Smoker' and is_simulated limit 1`,
		)
		const ageMs = Number(row.now_ms) - Number(row.last_step)
		// Worker cycles every 60s; allow generous slack for cold deploys
		expect(ageMs).toBeLessThan(5 * 60_000)
	})

	test('messages feed shows the coaching feed with actions and push toggle', async ({
		page,
	}) => {
		await loginDemo(page)
		await page.goto('/app/messages')
		await expect(
			page
				.locator('[data-testid="message-card"], [data-testid="message-pending"]')
				.first(),
		).toBeVisible({ timeout: 30000 })
		await expect(page.getByTestId('push-toggle')).toBeVisible()
	})

	test('fresh signups are held at the waitlist and cannot reach admin', async ({
		browser,
	}) => {
		const ctx = await browser.newContext({ storageState: undefined })
		const page = await ctx.newPage()
		const email = `prod-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@pitminder-test.example`
		await page.goto('/auth/signup')
		await page.getByTestId('signup-email').fill(email)
		await page.getByTestId('signup-password').fill('prod-e2e-password-1')
		await page.getByTestId('signup-submit').click()
		await page.waitForURL('**/waitlist', { timeout: 20000 })
		await expect(page.locator('body')).toContainText(/waitlist|private beta/i)

		// Non-admin cannot view the admin dashboard
		await page.goto('/app/admin')
		await page.waitForURL((url) => !url.pathname.includes('/admin'), {
			timeout: 15000,
		})

		// Clean the throwaway account back out of prod
		await query(`delete from users where email = $1`, [email])
		await query(`delete from "user" where email = $1`, [email])
		await ctx.close()
	})

	test('demo user is not an admin in prod', async () => {
		const rows = await query(
			`select coalesce(role, 'user') as role from "user" where email = 'demo@pitminder.com'`,
		)
		expect(rows[0]?.role).not.toBe('admin')
	})
})

test('director check-ins are visible in the feed', async ({ page }) => {
	await loginDemo(page)
	await page.goto('/app/messages')
	const runs = page.getByTestId('director-run')
	await expect(runs.first()).toBeVisible({ timeout: 30000 })
	await expect(runs.first()).toContainText('Pit director check-in')
})

test('pit chat steers from live MCP tools', async ({ page }) => {
	test.setTimeout(120_000)
	await loginDemo(page)
	await page.goto('/app/messages')
	const input = page.getByTestId('pit-chat-input')
	await expect(input).toBeVisible({ timeout: 30000 })
	await input.fill(
		'What is the current pit temperature? One short sentence with the °C number.',
	)
	await page.getByTestId('pit-chat-send').click()
	await expect(page.getByTestId('chat-message').last()).toContainText(
		/°C|degrees/i,
		{ timeout: 60000 },
	)
})
