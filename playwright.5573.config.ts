// Scratch config for this worktree's own vite on :5573 (the shared dev
// stack owns :5173). Not part of CI — `bunx playwright test -c
// playwright.5573.config.ts` with the server started manually.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	retries: 0,
	workers: 4,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:5573',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
})
