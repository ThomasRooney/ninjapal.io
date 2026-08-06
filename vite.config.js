import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { resolve } from 'node:path'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tsConfigPaths from 'vite-tsconfig-paths'

// Deployment target: default stays the Vercel Build Output preset; the AWS
// migration (infra/aws/ARCHITECTURE.md) builds with NITRO_PRESET=aws-lambda.
// That path uses the custom streaming entry proven on spike/lambda-streaming:
// the decided gateway is Regional REST (payload v1.0 events), which nitro's
// stock aws-lambda-streaming runtime cannot parse (it only reads Function-URL
// v2.0 `rawPath`). awsLambda.streaming stays false because the preset's
// rollup:before hook appends '-streaming' to the entry path when true, which
// would break the custom entry; the entry itself streams via
// awslambda.streamifyResponse + HttpResponseStream.
const nitroPreset = process.env.NITRO_PRESET || 'vercel'
const nitroConfig =
	nitroPreset === 'aws-lambda'
		? {
				preset: 'aws-lambda',
				awsLambda: { streaming: false },
				entry: resolve(__dirname, 'infra/aws/lambda-entry.mjs'),
				// The single Lambda also serves /assets (CloudFront origin fallback)
				serveStatic: true,
			}
		: { preset: nitroPreset }

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
		// preset that produces .vercel/output (Build Output API). Preset is
		// env-selected (NITRO_PRESET) — see nitroConfig above.
		nitroV2Plugin(nitroConfig),
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
