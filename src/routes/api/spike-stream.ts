import { createFileRoute } from '@tanstack/react-router'

// Spike route (branch spike/lambda-streaming): emits 10 SSE chunks at 500ms
// intervals. Streaming through API GW REST STREAM => TTFB ~0.5s; buffered
// anywhere in the chain => TTFB ~= total (~5s). No DB, no auth, no secrets.
export const Route = createFileRoute('/api/spike-stream')({
	server: {
		handlers: {
			GET: async () => {
				const encoder = new TextEncoder()
				const started = Date.now()
				const stream = new ReadableStream<Uint8Array>({
					async start(controller) {
						for (let i = 0; i < 10; i++) {
							controller.enqueue(
								encoder.encode(
									`data: chunk=${i} elapsedMs=${Date.now() - started}\n\n`,
								),
							)
							await new Promise((r) => setTimeout(r, 500))
						}
						controller.enqueue(encoder.encode('data: done\n\n'))
						controller.close()
					},
				})
				return new Response(stream, {
					status: 200,
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache, no-transform',
					},
				})
			},
		},
	},
})
