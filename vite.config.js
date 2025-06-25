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
		tanstackStart({}),
		tailwindcss(),
	],
	test: {
		globals: true,
		environment: 'jsdom',
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},
})
