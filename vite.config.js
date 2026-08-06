import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { resolve } from 'node:path'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tsConfigPaths from 'vite-tsconfig-paths'

// Spike (branch spike/lambda-streaming): NITRO_PRESET_SPIKE env-switches the
// nitro target so the Vercel build stays untouched.
//   aws-stock — nitro's own aws-lambda preset with awsLambda.streaming:true
//               (Function-URL/v2.0 event shape only; build-compat check)
//   aws-apigw — aws-lambda preset with a custom streaming entry that also
//               parses API Gateway REST (payload v1.0) events; the artifact
//               deployed behind responseTransferMode=STREAM. serveStatic so
//               the single Lambda also serves /assets for the spike.
const nitroSpikeConfig = () => {
	switch (process.env.NITRO_PRESET_SPIKE) {
		case 'aws-stock':
			return { preset: 'aws-lambda', awsLambda: { streaming: true } }
		case 'aws-apigw':
			return {
				preset: 'aws-lambda',
				// keep false: the preset's rollup:before hook appends '-streaming'
				// to the entry path when true, which would break the custom entry
				awsLambda: { streaming: false },
				entry: resolve(__dirname, 'infra/aws/spike/lambda-entry.mjs'),
				serveStatic: true,
			}
		default:
			return { preset: 'vercel' }
	}
}

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
		}),
		// Start 1.16x removed nitro; this official bridge restores the vercel
		// preset that produces .vercel/output (Build Output API)
		nitroV2Plugin(nitroSpikeConfig()),
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
			'.claude/**', // agent worktrees carry their own copies of the suite
		],
	},
	// The nitro bridge builds its server entry through this target too —
	// the browser-era default (es2020) chokes on the generated code.
	build: {
		target: 'esnext',
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
