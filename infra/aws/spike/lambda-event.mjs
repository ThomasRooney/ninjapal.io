// Pure event-parsing for the spike Lambda entry — no nitro/runtime imports so
// it is unit-testable with plain vitest (see lambda-event.test.mjs).
//
// Accepts BOTH shapes:
//   - API Gateway REST proxy integration, payload format v1.0
//     (event.path, event.httpMethod, multiValueQueryStringParameters)
//   - Lambda Function URL, payload format v2.0
//     (event.rawPath, event.requestContext.http.method, event.cookies)
import { withQuery } from 'ufo'

/**
 * @param {Record<string, unknown>} event
 * @returns {{ url: string, method: string, query: Record<string, string | string[]>, headers: Record<string, string>, body: Buffer | string | null | undefined }}
 */
export function parseLambdaEvent(event) {
	const isV2 = 'rawPath' in event && !!event.rawPath
	const path = isV2 ? event.rawPath : event.path
	const method = isV2
		? event.requestContext?.http?.method || 'get'
		: event.httpMethod || 'get'

	// v1.0: AWS documents multiValueQueryStringParameters as the COMPLETE list
	// (single values included), so it must take precedence — spreading the
	// single-value map last collapses repeated params to their final value.
	// Same precedence as nitro's buffered aws-lambda runtime.
	const query = {
		...(event.queryStringParameters || {}),
		...(event.multiValueQueryStringParameters || {}),
	}

	const headers = { ...(event.headers || {}) }
	if (isV2 && event.cookies) {
		headers.cookie = event.cookies.join(';')
	}

	// Binary request bodies must stay bytes: decoding base64 to a UTF-8 string
	// replaces invalid sequences with U+FFFD (mangles multipart uploads) before
	// nitro ever parses them. Pass the Buffer through untouched.
	// (nitro's own buffered runtime .toString('utf8')s here — upstream bug.)
	const body = event.isBase64Encoded
		? Buffer.from(event.body || '', 'base64')
		: event.body

	return { url: withQuery(path, query), method, query, headers, body }
}
