import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	getPublicOrigin,
	publicOriginEnv,
	withPublicOrigin,
} from './public-origin'

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('publicOriginEnv', () => {
	it('returns null when PUBLIC_ORIGIN is unset', () => {
		vi.stubEnv('PUBLIC_ORIGIN', '')
		expect(publicOriginEnv()).toBeNull()
	})

	it('normalizes trailing slashes', () => {
		vi.stubEnv('PUBLIC_ORIGIN', 'https://app.pitminder.com/')
		expect(publicOriginEnv()).toBe('https://app.pitminder.com')
	})

	it('canonicalizes host casing and default ports', () => {
		vi.stubEnv('PUBLIC_ORIGIN', 'https://App.PitMinder.com:443')
		expect(publicOriginEnv()).toBe('https://app.pitminder.com')
	})

	it('throws for garbage values instead of silently falling back', () => {
		vi.stubEnv('PUBLIC_ORIGIN', 'not a url')
		expect(() => publicOriginEnv()).toThrow(/PUBLIC_ORIGIN/)
	})

	it('throws for origin-less URLs', () => {
		vi.stubEnv('PUBLIC_ORIGIN', 'mailto:ops@pitminder.com')
		expect(() => publicOriginEnv()).toThrow(/PUBLIC_ORIGIN/)
	})
})

describe('getPublicOrigin', () => {
	it('falls back to the request origin when unset', () => {
		vi.stubEnv('PUBLIC_ORIGIN', '')
		const request = new Request('http://localhost:5173/api/mcp')
		expect(getPublicOrigin(request)).toBe('http://localhost:5173')
	})

	it('prefers PUBLIC_ORIGIN over the request origin', () => {
		vi.stubEnv('PUBLIC_ORIGIN', 'https://app.pitminder.com')
		const request = new Request(
			'https://abc123.execute-api.eu-west-2.amazonaws.com/api/mcp',
		)
		expect(getPublicOrigin(request)).toBe('https://app.pitminder.com')
	})
})

describe('withPublicOrigin', () => {
	it('returns the request unchanged when unset', () => {
		vi.stubEnv('PUBLIC_ORIGIN', '')
		const request = new Request(
			'http://localhost:5173/.well-known/oauth-authorization-server',
		)
		expect(withPublicOrigin(request)).toBe(request)
	})

	it('rewrites the origin but keeps path, query, method and headers', () => {
		vi.stubEnv('PUBLIC_ORIGIN', 'https://app.pitminder.com')
		const request = new Request(
			'https://gateway.example.com/.well-known/oauth-authorization-server?x=1',
			{ headers: { cookie: 'a=b' } },
		)
		const rewritten = withPublicOrigin(request)
		expect(rewritten.url).toBe(
			'https://app.pitminder.com/.well-known/oauth-authorization-server?x=1',
		)
		expect(rewritten.method).toBe('GET')
		expect(rewritten.headers.get('cookie')).toBe('a=b')
	})

	it('returns the request unchanged when the origin already matches', () => {
		vi.stubEnv('PUBLIC_ORIGIN', 'https://app.pitminder.com')
		const request = new Request(
			'https://app.pitminder.com/.well-known/oauth-authorization-server',
		)
		expect(withPublicOrigin(request)).toBe(request)
	})
})
