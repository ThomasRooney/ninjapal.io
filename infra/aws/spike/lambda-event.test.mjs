import { describe, expect, it } from 'vitest'
import { parseLambdaEvent } from './lambda-event.mjs'

/** Minimal API GW REST proxy (payload v1.0) event. */
const v1Event = (overrides = {}) => ({
	resource: '/{proxy+}',
	path: '/api/spike-stream',
	httpMethod: 'GET',
	headers: { Host: 'spike.example', 'User-Agent': 'vitest' },
	multiValueHeaders: {},
	queryStringParameters: null,
	multiValueQueryStringParameters: null,
	requestContext: { identity: {}, stage: 'spike' },
	body: null,
	isBase64Encoded: false,
	...overrides,
})

/** Minimal Function URL (payload v2.0) event. */
const v2Event = (overrides = {}) => ({
	version: '2.0',
	rawPath: '/api/spike-stream',
	rawQueryString: '',
	headers: { host: 'x.lambda-url.eu-west-2.on.aws' },
	requestContext: { http: { method: 'GET', path: '/api/spike-stream' } },
	body: null,
	isBase64Encoded: false,
	...overrides,
})

describe('parseLambdaEvent — API GW REST payload v1.0', () => {
	it('parses path, method and headers', () => {
		const parsed = parseLambdaEvent(
			v1Event({ path: '/auth/login', httpMethod: 'POST' }),
		)
		expect(parsed.url).toBe('/auth/login')
		expect(parsed.method).toBe('POST')
		expect(parsed.headers).toMatchObject({
			Host: 'spike.example',
			'User-Agent': 'vitest',
		})
	})

	it('keeps every value of a repeated query parameter (multi-value map wins)', () => {
		// AWS sends BOTH maps; the single-value map only carries the LAST value.
		const parsed = parseLambdaEvent(
			v1Event({
				queryStringParameters: { tag: 'brisket', limit: '5' },
				multiValueQueryStringParameters: {
					tag: ['pork', 'brisket'],
					limit: ['5'],
				},
			}),
		)
		expect(parsed.query.tag).toEqual(['pork', 'brisket'])
		expect(parsed.query.limit).toEqual(['5'])
		expect(parsed.url).toContain('tag=pork')
		expect(parsed.url).toContain('tag=brisket')
	})

	it('passes base64 binary bodies through byte-identical (multipart upload)', () => {
		// Multipart body wrapping bytes that are NOT valid UTF-8 (0x89, 0xff...)
		// — a .toString('utf8') round-trip replaces them with U+FFFD.
		const binary = Buffer.concat([
			Buffer.from(
				'--boundary\r\ncontent-disposition: form-data; name="photo"; filename="pit.png"\r\ncontent-type: image/png\r\n\r\n',
			),
			Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
			Buffer.from(Array.from({ length: 256 }, (_, i) => i)),
			Buffer.from('\r\n--boundary--\r\n'),
		])
		const parsed = parseLambdaEvent(
			v1Event({
				httpMethod: 'POST',
				body: binary.toString('base64'),
				isBase64Encoded: true,
			}),
		)
		expect(Buffer.isBuffer(parsed.body)).toBe(true)
		expect(parsed.body.equals(binary)).toBe(true)
		// regression guard for the utf8-decode bug: the mangled form differs
		expect(
			Buffer.from(binary.toString('utf8'), 'utf8').equals(binary),
		).toBe(false)
	})

	it('leaves non-base64 string bodies untouched', () => {
		const parsed = parseLambdaEvent(
			v1Event({ httpMethod: 'POST', body: '{"messages":[]}' }),
		)
		expect(parsed.body).toBe('{"messages":[]}')
	})

	it('handles null query maps', () => {
		const parsed = parseLambdaEvent(v1Event())
		expect(parsed.query).toEqual({})
		expect(parsed.url).toBe('/api/spike-stream')
	})
})

describe('parseLambdaEvent — Function URL payload v2.0', () => {
	it('uses rawPath + requestContext.http.method and joins cookies', () => {
		const parsed = parseLambdaEvent(
			v2Event({
				rawPath: '/app',
				requestContext: { http: { method: 'PUT', path: '/app' } },
				cookies: ['session=abc', 'theme=dark'],
			}),
		)
		expect(parsed.url).toBe('/app')
		expect(parsed.method).toBe('PUT')
		expect(parsed.headers.cookie).toBe('session=abc;theme=dark')
	})

	it('adds no cookie header when the event has none', () => {
		const parsed = parseLambdaEvent(v2Event())
		expect(parsed.headers.cookie).toBeUndefined()
		expect(parsed.method).toBe('GET')
	})

	it('uses the single-value query map (v2.0 has no multi-value map)', () => {
		const parsed = parseLambdaEvent(
			v2Event({ queryStringParameters: { a: '1' } }),
		)
		expect(parsed.query).toEqual({ a: '1' })
		expect(parsed.url).toBe('/api/spike-stream?a=1')
	})
})
