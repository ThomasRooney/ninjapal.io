// Custom nitro entry for AWS Lambda response streaming (validated on
// spike/lambda-streaming behind Regional REST API Gateway with
// responseTransferMode=STREAM). Accepts BOTH event shapes:
//   - API Gateway REST proxy integration (payload format v1.0: event.path,
//     event.httpMethod, multiValueHeaders) — what responseTransferMode=STREAM sends
//   - Lambda Function URL (payload format v2.0: event.rawPath,
//     event.requestContext.http.method, event.cookies) — the fallback path
//
// nitropack 2.13.4's stock `aws-lambda-streaming` runtime only parses v2.0, so
// REST-API events arrive with `url: undefined` there. This file is the stock
// runtime (nitropack/dist/presets/aws-lambda/runtime/aws-lambda-streaming.mjs)
// plus v1.0 parsing. Wired in via nitro `entry` with `awsLambda.streaming`
// left false so the preset's rollup:before hook does not append `-streaming`
// to this path.
//
// Output uses awslambda.HttpResponseStream.from(), which writes the prelude
// API Gateway requires: metadata JSON + 8 NUL bytes, then raw payload chunks.
import '#nitro-internal-pollyfills'
import { useNitroApp } from 'nitropack/runtime'
import {
	normalizeCookieHeader,
	normalizeLambdaIncomingHeaders,
	normalizeLambdaOutgoingHeaders,
} from 'nitropack/runtime/internal'
import { withQuery } from 'ufo'

const nitroApp = useNitroApp()

export const handler = awslambda.streamifyResponse(
	async (event, responseStream, context) => {
		const isV2 = 'rawPath' in event && !!event.rawPath
		const path = isV2 ? event.rawPath : event.path
		const method = isV2
			? event.requestContext?.http?.method || 'get'
			: event.httpMethod || 'get'
		const query = {
			...(event.multiValueQueryStringParameters || {}),
			...(event.queryStringParameters || {}),
		}
		const headers = { ...(event.headers || {}) }
		if (isV2 && event.cookies) {
			headers.cookie = event.cookies.join(';')
		}
		const url = withQuery(path, query)

		const r = await nitroApp.localCall({
			event,
			url,
			context,
			headers: normalizeLambdaIncomingHeaders(headers),
			method,
			query,
			body: event.isBase64Encoded
				? Buffer.from(event.body || '', 'base64').toString('utf8')
				: event.body,
		})

		const cookies = normalizeCookieHeader(r.headers['set-cookie'])
		const httpResponseMetadata = {
			statusCode: r.status,
			// The REST-API streaming metadata contract supports `cookies` (verified
			// against the developer guide); Function URLs use the same key.
			...(cookies.length > 0 && { cookies }),
			headers: {
				...normalizeLambdaOutgoingHeaders(r.headers, true),
				'Transfer-Encoding': 'chunked',
			},
		}

		const body =
			r.body ??
			new ReadableStream({
				start(controller) {
					controller.enqueue('')
					controller.close()
				},
			})

		const writer = awslambda.HttpResponseStream.from(
			responseStream,
			httpResponseMetadata,
		)

		if (!body.getReader) {
			// Non-stream bodies (nitro serves static assets as Buffers): write raw
			// bytes. Coercing via String() UTF-8-mangles binary payloads (measured:
			// favicon.ico 4286B -> 6608B with U+FFFD replacements).
			writer.write(typeof body === 'string' ? Buffer.from(body) : body)
			writer.end()
			return
		}

		const reader = body.getReader()
		let readResult = await reader.read()
		while (!readResult.done) {
			writer.write(readResult.value)
			readResult = await reader.read()
		}
		writer.end()
	},
)
