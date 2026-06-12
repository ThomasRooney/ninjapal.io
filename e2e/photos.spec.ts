import { expect, test } from '@playwright/test'
import { query } from './lib/db'

// 1×1 red PNG
const TINY_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64',
)

/**
 * Cook photo upload → Vercel Blob → cook_photos → Zero-synced thumbnail,
 * then delete. Talks to the real Blob store (cleaned up by the delete).
 */
test.describe('Cook photos', () => {
	test('upload and delete round-trip', async ({ page }) => {
		await page.goto('/auth/login')
		await page.getByTestId('login-email').fill('demo@pitminder.com')
		await page.getByTestId('login-password').fill('demo-smoker-2026')
		await page.getByTestId('login-submit').click()
		await page.waitForURL('**/app/**', { timeout: 15000 })

		const [device] = await query(
			`select d.id from devices d
			 join users u on u.id::uuid = d.user_id
			 where u.email = 'demo@pitminder.com' limit 1`,
		)
		expect(device?.id).toBeTruthy()
		await page.goto(`/app/device/${device.id}`)

		const card = page.getByTestId('cook-photos')
		await expect(card).toBeVisible({ timeout: 20000 })
		const before = await card.getByTestId('cook-photo').count()

		await page
			.getByTestId('photo-file-input')
			.setInputFiles({ name: 'bark.png', mimeType: 'image/png', buffer: TINY_PNG })

		await expect(card.getByTestId('cook-photo')).toHaveCount(before + 1, {
			timeout: 30000,
		})

		const rows = await query(
			`select id, url from cook_photos where device_id = $1 order by created_at desc limit 1`,
			[device.id],
		)
		expect(rows.length).toBe(1)
		expect(String(rows[0].url)).toContain('blob.vercel-storage.com')

		// Delete through the UI (removes the blob too)
		const photoId = String(rows[0].id)
		await card.getByTestId(`photo-delete-${photoId}`).click({ force: true })
		await expect(card.getByTestId('cook-photo')).toHaveCount(before, {
			timeout: 20000,
		})
		const after = await query(`select 1 from cook_photos where id = $1`, [
			photoId,
		])
		expect(after.length).toBe(0)
	})
})
