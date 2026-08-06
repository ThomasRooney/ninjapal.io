import { describe, expect, it, vi } from 'vitest'
import { createLogger, redactSecrets, setLogLevel } from './log'

describe('redactSecrets', () => {
	it('redacts secret-looking keys at any depth', () => {
		const input = {
			username: 'thomas',
			password: 'hunter2',
			nested: {
				oauthAccessToken: 'eyJ...',
				aylaRefreshToken: 'abc',
				list: [{ Authorization: 'Bearer xyz', ok: 1 }],
			},
		}
		expect(redactSecrets(input)).toEqual({
			username: 'thomas',
			password: '[redacted]',
			nested: {
				oauthAccessToken: '[redacted]',
				aylaRefreshToken: '[redacted]',
				list: [{ Authorization: '[redacted]', ok: 1 }],
			},
		})
	})

	it('passes primitives and null through untouched', () => {
		expect(redactSecrets('plain')).toBe('plain')
		expect(redactSecrets(42)).toBe(42)
		expect(redactSecrets(null)).toBe(null)
	})

	it('redacts cookie and api key variants', () => {
		expect(
			redactSecrets({ 'set-cookie': 'a', api_key: 'b', apiKey: 'c' }),
		).toEqual({
			'set-cookie': '[redacted]',
			api_key: '[redacted]',
			apiKey: '[redacted]',
		})
	})
})

describe('createLogger', () => {
	it('emits namespaced lines with redacted data and respects level', () => {
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		try {
			setLogLevel('info')
			const log = createLogger('test-ns')
			log.info('hello', { password: 'x', n: 1 })
			log.debug('hidden')
			expect(infoSpy).toHaveBeenCalledTimes(1)
			const [line, data] = infoSpy.mock.calls[0] as [string, unknown]
			expect(line).toContain('[test-ns] hello')
			expect(data).toEqual({ password: '[redacted]', n: 1 })
			expect(logSpy).not.toHaveBeenCalled()

			expect(() => log.child('sub').info('nested')).not.toThrow()
			const childLine = (infoSpy.mock.calls[1] as [string])[0]
			expect(childLine).toContain('[test-ns:sub] nested')
		} finally {
			infoSpy.mockRestore()
			logSpy.mockRestore()
			setLogLevel('info')
		}
	})
})
