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
	},
})
