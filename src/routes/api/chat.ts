import { createFileRoute } from '@tanstack/react-router'

const CHAT_SYSTEM = `You are PitMinder's pitmaster — the same intelligence that runs the user's smoker between check-ins, now in direct conversation. The user types here to steer the cook, ask questions, or hand you tasks.

You see and act on the smoker ONLY through your tools. Ground every answer in fresh tool data — call get_telemetry before making claims about the current state.

Style: technical and numeric (°C, °C/h, concrete times), short paragraphs, no filler. You are talking to the cook standing at the pit.

Acting:
- Setpoint changes go through set_pit_temp — a deterministic safety envelope validates them and the worker applies them within a minute. Tell the user exactly what you queued and why.
- When they steer ("wrap it", "I want to eat at 7", "keep it hotter"), translate that into concrete action and/or a clear plan with temps and times.
- If something looks unsafe or contradictory, say so plainly and do not act on it.
- Never invent telemetry. If a tool fails, say what failed.`

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/api/chat')({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const [
					{ auth },
					{ createPitMinderMcpServer },
					{ getSql },
					{ anthropic },
					ai,
					{ Client },
					{ InMemoryTransport },
					{ createLogger },
					{ partsWithinCap, selectRecentTurns, steerRowsToUIMessages },
				] = await Promise.all([
					import('@/lib/auth'),
					import('@/server/mcp/pitminder-server'),
					import('@/server/db/client'),
					import('@ai-sdk/anthropic'),
					import('ai'),
					import('@modelcontextprotocol/sdk/client/index.js'),
					import('@modelcontextprotocol/sdk/inMemory.js'),
					import('@/lib/log'),
					import('@/lib/steer-chat'),
				])

				const log = createLogger('chat')

				const session = await auth.api.getSession({ headers: request.headers })
				if (!session?.user) {
					return new Response('Unauthorized', { status: 401 })
				}
				const userId = session.user.id

				const body = (await request.json()) as {
					messages?: unknown
					deviceId?: unknown
					threadId?: unknown
					turnId?: unknown
				}
				const { messages, deviceId, threadId, turnId } = body
				if (
					typeof deviceId !== 'string' ||
					!UUID_PATTERN.test(deviceId) ||
					typeof threadId !== 'string' ||
					!UUID_PATTERN.test(threadId) ||
					typeof turnId !== 'string' ||
					!UUID_PATTERN.test(turnId) ||
					!Array.isArray(messages) ||
					messages.length === 0
				) {
					log.warn('bad request body', { userId })
					return new Response('Bad Request', { status: 400 })
				}

				log.info('request start', { userId, deviceId, threadId, turnId })

				const sql = getSql()

				// The DB is canonical — fail closed on anything the client
				// claims about devices or threads.
				const [device] = await sql`
					select id from devices
					where id = ${deviceId}::uuid and user_id = ${userId}::uuid
				`
				if (!device) {
					log.warn('device not owned', { userId, deviceId })
					return new Response('Forbidden', { status: 403 })
				}
				const [thread] = await sql`
					select id, closed_at from steer_threads
					where id = ${threadId}::uuid and user_id = ${userId}::uuid
						and device_id = ${deviceId}::uuid
				`
				if (!thread || thread.closed_at != null) {
					log.warn('thread missing or closed', { userId, deviceId, threadId })
					return new Response('Forbidden', { status: 403 })
				}

				const lastMessage = messages[messages.length - 1] as {
					role?: unknown
					parts?: unknown
				}
				if (lastMessage?.role !== 'user' || !Array.isArray(lastMessage.parts)) {
					log.warn('last message is not a user message', { userId, threadId })
					return new Response('Bad Request', { status: 400 })
				}
				if (!partsWithinCap(lastMessage.parts)) {
					log.warn('user parts over size cap', { userId, threadId, turnId })
					return new Response('Payload Too Large', { status: 413 })
				}

				// Stamp the active cook session if one exists — attribution
				// only, never the thread boundary.
				const [activeSession] = await sql`
					select id from cook_sessions
					where device_id = ${deviceId}::uuid and user_id = ${userId}::uuid
						and ended_at is null
					order by started_at desc limit 1
				`
				const sessionId = (activeSession?.id as string | undefined) ?? null

				// Persist the user half BEFORE generation; the unique index
				// makes a retried request a no-op instead of a double-write.
				const insertedUser = await sql`
					insert into steer_messages
						(thread_id, user_id, device_id, session_id, turn_id, role, parts)
					values
						(${threadId}::uuid, ${userId}::uuid, ${deviceId}::uuid,
						${sessionId}, ${turnId}::uuid, 'user', ${sql.json(lastMessage.parts as never)})
					on conflict (thread_id, turn_id, role) do nothing
					returning id
				`
				log.info('user turn persisted', {
					userId,
					threadId,
					turnId,
					deduped: insertedUser.length === 0,
				})

				// Build the model context from the DB, not the client array.
				const rows = await sql`
					select id, turn_id, role, parts, created_at from steer_messages
					where thread_id = ${threadId}::uuid
					order by created_at asc
				`
				const contextRows = selectRecentTurns(
					rows.map((r) => ({
						id: r.id as string,
						turnId: r.turn_id as string,
						role: r.role as string,
						parts: r.parts,
						createdAt: new Date(r.created_at as string).getTime(),
					})),
				)
				const contextMessages = steerRowsToUIMessages(contextRows)

				// Model is admin-configurable, shared with the pit director
				const [modelRow] = await sql`
					select value from app_config where key = 'pit_director_model'
				`
				const modelId =
					(typeof modelRow?.value === 'string' ? modelRow.value : null) ??
					'claude-haiku-4-5-20251001'

				// The chat loop talks to the SAME MCP server that external agents
				// get at /api/mcp — here over an in-memory transport (no HTTP hop),
				// scoped to the device this thread belongs to.
				const mcpServer = createPitMinderMcpServer(userId, { deviceId })
				const [clientTransport, serverTransport] =
					InMemoryTransport.createLinkedPair()
				await mcpServer.connect(serverTransport)
				const mcp = new Client({ name: 'pitminder-chat', version: '1.0.0' })
				await mcp.connect(clientTransport)

				const { tools: mcpTools } = await mcp.listTools()
				const tools = Object.fromEntries(
					mcpTools.map((t) => [
						t.name,
						ai.tool({
							description: t.description,
							inputSchema: ai.jsonSchema(t.inputSchema as never),
							execute: async (args: unknown) => {
								const result = await mcp.callTool({
									name: t.name,
									arguments: (args ?? {}) as Record<string, unknown>,
								})
								const content = result.content as Array<{
									type: string
									text?: string
								}>
								return content
									.filter((c) => c.type === 'text')
									.map((c) => c.text)
									.join('\n')
							},
						}),
					]),
				)

				const startedAt = Date.now()
				const result = ai.streamText({
					model: anthropic(modelId),
					system: CHAT_SYSTEM,
					messages: await ai.convertToModelMessages(contextMessages),
					tools,
					stopWhen: ai.stepCountIs(8),
					onFinish: async ({ steps }) => {
						log.info('generation finished', {
							userId,
							threadId,
							turnId,
							model: modelId,
							durationMs: Date.now() - startedAt,
							steps: steps.length,
						})
						await mcp.close().catch(() => {})
					},
					onError: async ({ error }: { error: unknown }) => {
						log.error('stream failed', {
							userId,
							threadId,
							turnId,
							model: modelId,
							error: chatErrorForLog(error),
						})
						await mcp.close().catch(() => {})
					},
				})

				// Run the stream to completion server-side even if the client
				// disconnects, so the assistant half below always lands.
				void result.consumeStream()

				return result.toUIMessageStreamResponse({
					originalMessages: contextMessages,
					onFinish: async ({ responseMessage, isAborted }) => {
						try {
							const parts = responseMessage.parts ?? []
							if (parts.length === 0) {
								log.warn('assistant turn empty — not persisted', {
									userId,
									threadId,
									turnId,
									isAborted,
								})
								return
							}
							if (!partsWithinCap(parts)) {
								// Server-generated and bounded by stepCountIs(8); log
								// loudly but keep the history rather than lose the turn.
								log.warn('assistant parts over size cap — persisting anyway', {
									userId,
									threadId,
									turnId,
								})
							}
							// Persist against the thread captured at request start
							// even if a reset closed it mid-stream: history is
							// preserved in the archived thread and the UI already
							// shows the fresh one.
							const inserted = await sql`
								insert into steer_messages
									(thread_id, user_id, device_id, session_id, turn_id, role, parts)
								values
									(${threadId}::uuid, ${userId}::uuid, ${deviceId}::uuid,
									${sessionId}, ${turnId}::uuid, 'assistant', ${sql.json(parts as never)})
								on conflict (thread_id, turn_id, role) do nothing
								returning id
							`
							log.info('assistant turn persisted', {
								userId,
								threadId,
								turnId,
								isAborted,
								deduped: inserted.length === 0,
							})
						} catch (error) {
							log.error('assistant turn persistence failed', {
								userId,
								threadId,
								turnId,
								error: chatErrorForLog(error),
							})
						}
					},
					onError: chatErrorForUser,
				})
			},
		},
	},
})

function chatErrorForUser(error: unknown) {
	const statusCode = errorStatusCode(error)
	if (statusCode === 401 || statusCode === 403) {
		return 'PitMinder chat is offline locally: the AI provider rejected the configured API key. Update ANTHROPIC_API_KEY and retry.'
	}
	return 'PitMinder chat failed while contacting the AI provider. Check the local server log for details and retry.'
}

function chatErrorForLog(error: unknown) {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			statusCode: errorStatusCode(error),
		}
	}
	return error
}

function errorStatusCode(error: unknown) {
	return typeof error === 'object' &&
		error !== null &&
		'statusCode' in error &&
		typeof error.statusCode === 'number'
		? error.statusCode
		: null
}
