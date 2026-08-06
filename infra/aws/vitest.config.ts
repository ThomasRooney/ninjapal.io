import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		include: ['test/**/*.test.ts'],
		// CDK assertion tests bundle the Lambdas with esbuild during synth.
		testTimeout: 120_000,
	},
})
