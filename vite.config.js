import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { resolve } from 'node:path'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tsConfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		tsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		tanstackStart({
			spa: {
				enabled: true,
			},
			// nitro deployment preset — produces .vercel/output (Build Output API)
			target: 'vercel',
		}),
		// Start 1.16x no longer bundles React Refresh — must follow tanstackStart()
		react(),
		tailwindcss(),
	],
	test: {
		globals: true,
		environment: 'jsdom',
		exclude: [
			'e2e/**',
			'e2e-prod/**',
			'playwright/**',
			'tests/**/*.spec.ts',
			'node_modules/**',
		],
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
		// One React instance everywhere — react 19.2 ships dual CJS/ESM and
		// vitest otherwise loads both (null dispatcher in renderHook).
		dedupe: ['react', 'react-dom'],
	},
	// Playwright is lazy-loaded for the Ninja OAuth flow and must never be
	// bundled (CLAUDE.md) — keep the optimizer/SSR pipeline away from it.
	optimizeDeps: {
		exclude: ['playwright', 'playwright-core'],
	},
	ssr: {
		external: ['playwright', 'playwright-core', 'chromium-bidi'],
	},
})
