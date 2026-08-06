import { expect, test } from '@playwright/test'
import { insertTestDevice, query, whitelistUser } from './lib/db'

/**
 * Persistence mechanics of the "Steer this cook" chat. No LLM completion
 * is required: the user turn is persisted BEFORE generation, so send →
 * reload → still-there works even without a (valid) ANTHROPIC_API_KEY.
 * When a key exists an assistant reply may also appear — tolerated, never
 * asserted.
 *
 * Must run against a stack serving code WITH the steer tables (schema +
 * zero-cache). Defaults to the repo's standard dev stack; set
 * STEER_E2E_BASE_URL to point at a side-stack (e.g. http://localhost:5373)
 * when the main stack is still on an older branch.
 */
const baseURLOverride = process.env.STEER_E2E_BASE_URL
if (baseURLOverride) {
	test.use({ baseURL: baseURLOverride })
}

async function signUpWithDevice(page: import('@playwright/test').Page) {
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

	const deviceId = await insertTestDevice(email, {
		dsn: `STEER${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
	})
	return { email, deviceId }
}

test.describe('Steer chat persistence', () => {
	test('survives a page refresh and resets to a fresh thread', async ({
		page,
	}) => {
		const { deviceId } = await signUpWithDevice(page)

		await page.goto(`/app/device/${deviceId}`)

		// The chat mounts once the (auto-created) thread and its history
		// have synced — the skeleton must give way to the live composer.
		const chat = page.getByTestId('pit-chat')
		await expect(chat).toBeVisible({ timeout: 20000 })

		const marker = `persistence check ${Math.random().toString(36).slice(2, 8)}`
		await page.getByTestId('pit-chat-input').fill(marker)
		await page.getByTestId('pit-chat-send').click()

		// The user turn renders immediately from the in-memory runtime…
		await expect(
			page.getByTestId('chat-message').filter({ hasText: marker }),
		).toBeVisible({ timeout: 10000 })

		// …and is persisted server-side BEFORE generation.
		await expect
			.poll(
				async () => {
					const rows = await query(
						`select count(*)::int as count from steer_messages
						 where device_id = $1 and role = 'user'`,
						[deviceId],
					)
					return Number(rows[0]?.count ?? 0)
				},
				{ timeout: 15000 },
			)
			.toBeGreaterThan(0)

		// Refresh: the transcript must hydrate back from the database.
		await page.reload()
		await expect(page.getByTestId('pit-chat')).toBeVisible({ timeout: 20000 })
		await expect(
			page.getByTestId('chat-message').filter({ hasText: marker }),
		).toBeVisible({ timeout: 20000 })

		// Reset rotates to a fresh, empty thread (confirm popover first).
		await page.getByTestId('steer-reset').click()
		await expect(
			page.getByTestId('steer-reset-confirm-popover'),
		).toBeVisible()
		await page.getByTestId('steer-reset-confirm').click()

		await expect(
			page.getByTestId('chat-message').filter({ hasText: marker }),
		).toBeHidden({ timeout: 20000 })
		// The composer stays available on the fresh thread.
		await expect(page.getByTestId('pit-chat-input')).toBeVisible()

		// History rotated, not deleted: old thread closed, a new one open,
		// the marker row still in the archived thread.
		const threads = await query(
			`select closed_at from steer_threads where device_id = $1
			 order by created_at asc`,
			[deviceId],
		)
		expect(threads.length).toBeGreaterThanOrEqual(2)
		expect(threads[threads.length - 1].closed_at).toBeNull()
		expect(
			threads.slice(0, -1).every((t) => t.closed_at != null),
		).toBe(true)

		const persisted = await query(
			`select count(*)::int as count from steer_messages
			 where device_id = $1 and role = 'user'`,
			[deviceId],
		)
		expect(Number(persisted[0]?.count)).toBeGreaterThan(0)
	})

	test('cancelling the reset confirm keeps the conversation', async ({
		page,
	}) => {
		const { deviceId } = await signUpWithDevice(page)

		await page.goto(`/app/device/${deviceId}`)
		await expect(page.getByTestId('pit-chat')).toBeVisible({ timeout: 20000 })

		const marker = `keep me ${Math.random().toString(36).slice(2, 8)}`
		await page.getByTestId('pit-chat-input').fill(marker)
		await page.getByTestId('pit-chat-send').click()
		await expect(
			page.getByTestId('chat-message').filter({ hasText: marker }),
		).toBeVisible({ timeout: 10000 })

		await page.getByTestId('steer-reset').click()
		await expect(
			page.getByTestId('steer-reset-confirm-popover'),
		).toBeVisible()
		await page.getByTestId('steer-reset-cancel').click()
		await expect(
			page.getByTestId('steer-reset-confirm-popover'),
		).toBeHidden()

		// Nothing rotated — the message is still on screen.
		await expect(
			page.getByTestId('chat-message').filter({ hasText: marker }),
		).toBeVisible()
	})
})
