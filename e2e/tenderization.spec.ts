import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import dotenv from 'dotenv'
import { Client } from 'pg'

dotenv.config({ path: '.env' })
const connectionString = process.env.ZERO_UPSTREAM_DB
if (!connectionString || !['localhost', '127.0.0.1'].includes(new URL(connectionString).hostname)) {
	throw new Error('Tenderization fixture tests require the local Postgres database')
}

const deviceId = randomUUID()
const sessionId = randomUUID()
const nextSessionId = randomUUID()
const MIN = 60_000
const start = Math.floor((Date.now() - 4 * 3_600_000) / MIN) * MIN
const refC = ((195 - 32) * 5) / 9

test.beforeAll(async () => {
	const db = new Client({ connectionString })
	await db.connect()
	try {
		const user = (await db.query('select id from "user" where email = $1', ['demo@pitminder.com'])).rows[0]
		if (!user) throw new Error('Seed the demo account before running browser tests')
		await db.query('insert into devices (id, user_id, dsn, product_name) values ($1, $2, $3, $4)', [deviceId, user.id, `tenderization-test-${deviceId}`, 'Tenderization test'])
		for (const [id, from, to] of [[sessionId, 0, 60], [nextSessionId, 90, 100]] as const) {
			await db.query('insert into cook_sessions (id, device_id, user_id, name, started_at, ended_at) values ($1, $2, $3, $4, $5, $6)', [id, deviceId, user.id, 'Brisket exposure test', new Date(start + from * MIN), new Date(start + to * MIN)])
		}
		// A baseline and pre-window patch catch history-ordering regressions.
		for (let m = -2; m <= 100; m++) {
			const changes = m === -2
				? { probe1_temp_a: 70, probe2_temp_a: null, connectionStatus: 'Online', is_probe1_installed: true, is_probe2_installed: false }
				: { probe1_temp_a: m >= 90 ? 100 : refC }
			await db.query('insert into device_history (device_id, user_id, recorded_at, history_type, changes) values ($1, $2, $3, $4, $5)', [deviceId, user.id, new Date(start + m * MIN), m === -2 ? 'snapshot' : 'patch', JSON.stringify(changes)])
		}
	} finally { await db.end() }
})

test.afterAll(async () => {
	const db = new Client({ connectionString })
	await db.connect()
	try { await db.query('delete from devices where id = $1', [deviceId]) }
	finally { await db.end() }
})

for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
	test(`tracks a cook and rest with real synced history at ${viewport.width}px`, async ({ page }, testInfo) => {
		test.setTimeout(90_000)
		await page.setViewportSize(viewport)
		await page.goto('/auth/login')
		await page.getByTestId('login-email').fill('demo@pitminder.com')
		await page.getByTestId('login-password').fill('demo-smoker-2026')
		await page.getByTestId('login-submit').click()
		await page.waitForURL('**/app/**', { timeout: 30_000 })
		await page.goto(`/app/cook/${sessionId}`)
		const card = page.getByTestId('tenderization-card')
		await expect(card.getByTestId('tenderization-dose')).toHaveText('1h 0m', { timeout: 30_000 })
		await expect(card.getByTestId('tenderization-coverage')).toHaveText('100%')
		await card.getByLabel('Meat probe').selectOption('2')
		await expect(card.getByTestId('tenderization-empty')).toContainText('Probe 2')
		await expect(card.getByTestId('tenderization-dose')).toHaveCount(0)
		await card.getByLabel('Meat probe').selectOption('1')
		await card.getByLabel('Include rest').selectOption('2')
		// The next cook's 100°C samples must never count toward this brisket.
		await expect(card.getByTestId('tenderization-dose')).toHaveText('1h 29m')
		await expect(card.getByTestId('tenderization-rest-note')).toContainText('stops at the next cook')
		await expect(card.getByTestId('tenderization-rest-note')).toContainText('adds 29m')
		await card.getByText('How this estimate works').click()
		await expect(card.getByRole('link', { name: 'Chris Young’s brisket experiment' })).toBeVisible()
		await expect(card).toContainText('not a percentage of collagen converted')
		await card.getByText('How this estimate works').click()
		await card.getByRole('heading', { name: 'Brisket tenderization' }).scrollIntoViewIfNeeded()
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
		await page.screenshot({ path: testInfo.outputPath(`tenderization-${viewport.width}.png`) })
		await card.getByLabel('Include rest').selectOption('0')
		await expect(card.getByTestId('tenderization-dose')).toHaveText('1h 0m')
	})
}
