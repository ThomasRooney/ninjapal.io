import { expect, test } from '@playwright/test'
import { Client } from 'pg'

async function query(text: string): Promise<Record<string, unknown>[]> {
	const client = new Client({ connectionString: process.env.PROD_DATABASE_URL })
	await client.connect()
	try {
		return (await client.query(text)).rows
	} finally {
		await client.end()
	}
}

test('debug sim smoker page', async ({ page }) => {
	const errs: string[] = []
	page.on('console', (m) => {
		if (m.type() === 'error') errs.push(`console: ${m.text().slice(0, 200)}`)
	})
	page.on('pageerror', (e) => errs.push(`pageerror: ${String(e).slice(0, 300)}`))
	page.on('requestfailed', (r) =>
		errs.push(`reqfail: ${r.url().slice(0, 100)} ${r.failure()?.errorText}`),
	)
	await page.goto('/app')
	await page.waitForURL('**/app/**', { timeout: 20000 })
	const [device] = await query(
		`select id from devices where product_name = 'Demo Smoker' and is_simulated limit 1`,
	)
	console.log('device id:', JSON.stringify(device))
	await page.goto(`/app/device/${device.id}`)
	const ok = await page
		.getByTestId('temperature-display')
		.waitFor({ timeout: 30000 })
		.then(() => true)
		.catch(() => false)
	console.log('visible:', ok)
	if (!ok) {
		console.log('url:', page.url())
		console.log('text:', (await page.locator('body').textContent())?.slice(0, 250))
		console.log('errors:\n' + errs.slice(0, 10).join('\n'))
	}
	expect(ok).toBe(true)
})
