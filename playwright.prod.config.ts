// Production smoke/validation suite: bunx playwright test -c playwright.prod.config.ts
// Needs PROD_DATABASE_URL in the environment for DB-level assertions.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e-prod',
	fullyParallel: false,
	workers: 1,
	retries: 1,
	reporter: 'line',
	timeout: 60_000,
	use: {
		baseURL: 'https://app.pitminder.com',
		trace: 'on-first-retry',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
