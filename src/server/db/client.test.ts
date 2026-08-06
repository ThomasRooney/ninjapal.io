import { describe, expect, it } from 'vitest'
import { resolvePoolMax } from './client'

describe('resolvePoolMax', () => {
	it('keeps the long-standing default of 4 off Lambda', () => {
		expect(resolvePoolMax({})).toBe(4)
	})

	it('defaults to 2 when running inside Lambda', () => {
		expect(resolvePoolMax({ AWS_LAMBDA_FUNCTION_NAME: 'pitminder-ssr' })).toBe(
			2,
		)
	})

	it('lets PG_POOL_MAX override both defaults', () => {
		expect(resolvePoolMax({ PG_POOL_MAX: '8' })).toBe(8)
		expect(
			resolvePoolMax({ PG_POOL_MAX: '1', AWS_LAMBDA_FUNCTION_NAME: 'x' }),
		).toBe(1)
	})

	it('ignores garbage or non-positive PG_POOL_MAX values', () => {
		expect(resolvePoolMax({ PG_POOL_MAX: 'lots' })).toBe(4)
		expect(resolvePoolMax({ PG_POOL_MAX: '0' })).toBe(4)
		expect(
			resolvePoolMax({ PG_POOL_MAX: '-2', AWS_LAMBDA_FUNCTION_NAME: 'x' }),
		).toBe(2)
	})

	it('floors fractional values', () => {
		expect(resolvePoolMax({ PG_POOL_MAX: '3.7' })).toBe(3)
	})
})
