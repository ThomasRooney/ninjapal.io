import { expect, test } from '@playwright/test'
import { query } from './lib/db'

/**
 * Web-push subscription flow: grant notification permission, toggle the
 * bell on the messages page, and confirm the subscription row lands in
 * push_subscriptions (and is removed again on toggle-off).
 */
test.describe('Push notifications', () => {
	test.use({ permissions: ['notifications'] })

	test.beforeEach(async ({ page }) => {
		// Playwright's Chromium ships without FCM API keys, so the real
		// browser↔push-service registration can never succeed here. Stub ONLY
		// that hop (external service); the toggle, server fns, and Postgres
		// writes all stay real.
		await page.addInitScript(() => {
			const w = window as unknown as { __pushSub: unknown }
			const fake = {
				endpoint: `https://fcm.googleapis.com/fcm/send/e2e-fake-${Math.random().toString(36).slice(2)}`,
				toJSON() {
					return {
						endpoint: this.endpoint,
						keys: { p256dh: 'BFakeP256dhKeyForE2E', auth: 'fake-auth-e2e' },
					}
				},
				async unsubscribe() {
					w.__pushSub = null
					return true
				},
			}
			PushManager.prototype.subscribe = async function () {
				w.__pushSub = fake
				return fake as unknown as PushSubscription
			}
			PushManager.prototype.getSubscription = async function () {
				return (w.__pushSub ?? null) as PushSubscription | null
			}
		})
		await page.goto('/auth/login')
		await page.getByTestId('login-email').fill('demo@pitminder.com')
		await page.getByTestId('login-password').fill('demo-smoker-2026')
		await page.getByTestId('login-submit').click()
		await page.waitForURL('**/app/**', { timeout: 15000 })
	})

	test('subscribe and unsubscribe round-trip', async ({ page }) => {
		// Prior aborted runs leave orphaned fake endpoints behind
		await query(
			`delete from push_subscriptions where user_id in
			 (select id::uuid from users where email = 'demo@pitminder.com')`,
		)
		await page.goto('/app/messages')
		const toggle = page.getByTestId('push-toggle')
		await expect(toggle).toBeVisible({ timeout: 20000 })
		await expect(toggle).toHaveAttribute('data-push-state', /on|off/, {
			timeout: 15000,
		})

		// Clean slate: if a previous run left it on, turn it off first
		if ((await toggle.getAttribute('data-push-state')) === 'on') {
			await toggle.click()
			await expect(toggle).toHaveAttribute('data-push-state', 'off', {
				timeout: 15000,
			})
		}

		await toggle.click()
		await expect(toggle).toHaveAttribute('data-push-state', 'on', {
			timeout: 20000,
		})

		const rows = await query(
			`select ps.endpoint from push_subscriptions ps
			 join users u on u.id::uuid = ps.user_id
			 where u.email = 'demo@pitminder.com'`,
		)
		expect(rows.length).toBeGreaterThan(0)
		expect(String(rows[0].endpoint)).toMatch(/^https:\/\//)

		await toggle.click()
		await expect(toggle).toHaveAttribute('data-push-state', 'off', {
			timeout: 15000,
		})
		const after = await query(
			`select 1 from push_subscriptions ps
			 join users u on u.id::uuid = ps.user_id
			 where u.email = 'demo@pitminder.com'`,
		)
		expect(after.length).toBe(0)
	})
})
