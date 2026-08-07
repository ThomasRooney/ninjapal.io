// Spike: custom nitro entry for AWS Lambda response streaming that accepts
// BOTH event shapes:
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
import { parseLambdaEvent } from './lambda-event.mjs'

const nitroApp = useNitroApp()

export const handler = awslambda.streamifyResponse(
	async (event, responseStream, context) => {
		// Freeze the sandbox as soon as the response completes instead of
		// waiting for the event loop to drain. Measured live (2026-08-07):
		// postgres.js keeps idle pooled sockets (idle_timeout 20s in
		// src/server/db/client.ts) on the loop, so without this EVERY
		// invocation ran ~20s past its response — billed 24s for a 4s page,
		// sandboxes never freed, and each sequential request paid a fresh
		// ~4s first-request module eval. With it, connections freeze warm in
		// the sandbox and thaw on the next invoke (the classic Lambda+RDBMS
		// pattern).
		context.callbackWaitsForEmptyEventLoop = false
		// Pure, unit-tested parsing (v1.0 + v2.0): infra/aws/spike/lambda-event.mjs
		const { url, method, query, headers, body } = parseLambdaEvent(event)

		const r = await nitroApp.localCall({
			event,
			url,
			context,
			headers: normalizeLambdaIncomingHeaders(headers),
			method,
			query,
			body,
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

		const resBody =
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

		if (!resBody.getReader) {
			// Non-stream bodies (nitro serves static assets as Buffers): write raw
			// bytes. Coercing via String() UTF-8-mangles binary payloads (measured:
			// favicon.ico 4286B -> 6608B with U+FFFD replacements).
			writer.write(typeof resBody === 'string' ? Buffer.from(resBody) : resBody)
			writer.end()
			return
		}

		const reader = resBody.getReader()
		let readResult = await reader.read()
		while (!readResult.done) {
			writer.write(readResult.value)
			readResult = await reader.read()
		}
		writer.end()
	},
)
