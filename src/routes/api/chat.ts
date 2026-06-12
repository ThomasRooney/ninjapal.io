import { createFileRoute } from '@tanstack/react-router'

const CHAT_SYSTEM = `You are PitMinder's pitmaster — the same intelligence that runs the user's smoker between check-ins, now in direct conversation. The user types here to steer the cook, ask questions, or hand you tasks.

You see and act on the smoker ONLY through your tools. Ground every answer in fresh tool data — call get_telemetry before making claims about the current state.

Style: technical and numeric (°C, °C/h, concrete times), short paragraphs, no filler. You are talking to the cook standing at the pit.

Acting:
- Setpoint changes go through set_pit_temp — a deterministic safety envelope validates them and the worker applies them within a minute. Tell the user exactly what you queued and why.
- When they steer ("wrap it", "I want to eat at 7", "keep it hotter"), translate that into concrete action and/or a clear plan with temps and times.
- If something looks unsafe or contradictory, say so plainly and do not act on it.
- Never invent telemetry. If a tool fails, say what failed.`

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
				] = await Promise.all([
					import('@/lib/auth'),
					import('@/server/mcp/pitminder-server'),
					import('@/server/db/client'),
					import('@ai-sdk/anthropic'),
					import('ai'),
					import('@modelcontextprotocol/sdk/client/index.js'),
					import('@modelcontextprotocol/sdk/inMemory.js'),
				])

				const session = await auth.api.getSession({ headers: request.headers })
				if (!session?.user) {
					return new Response('Unauthorized', { status: 401 })
				}

				const { messages } = await request.json()

				// Model is admin-configurable, shared with the pit director
				const sql = getSql()
				const [modelRow] = await sql`
			select value from app_config where key = 'pit_director_model'
		`
				const modelId =
					(typeof modelRow?.value === 'string' ? modelRow.value : null) ??
					'claude-haiku-4-5-20251001'

				// The chat loop talks to the SAME MCP server that external agents
				// get at /api/mcp — here over an in-memory transport (no HTTP hop).
				const mcpServer = createPitMinderMcpServer(session.user.id)
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

				const result = ai.streamText({
					model: anthropic(modelId),
					system: CHAT_SYSTEM,
					messages: await ai.convertToModelMessages(messages),
					tools,
					stopWhen: ai.stepCountIs(8),
					onFinish: async () => {
						await mcp.close().catch(() => {})
					},
				})

				return result.toUIMessageStreamResponse()
			},
		},
	},
})
