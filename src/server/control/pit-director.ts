/**
 * Pit director — the agentic judgment layer above the deterministic
 * autopilot. Every ~10 min per active cook, an LLM inspects the cook via
 * tools and may adjust the pit (through the safety envelope) or message
 * the user. The loop is transport-agnostic: the worker injects tool
 * handlers, this module owns the prompt, tool schemas, and the
 * tool-use iteration.
 *
 * Safety: "the LLM proposes; a deterministic policy disposes" —
 * set_pit_temp is validated/clamped by validateIntent before execution,
 * and per-run action caps bound the blast radius regardless of what the
 * model asks for.
 */
import type Anthropic from '@anthropic-ai/sdk'

export const DEFAULT_DIRECTOR_MODEL = 'claude-haiku-4-5-20251001'
export const MAX_ITERATIONS = 8
export const MAX_SETPOINT_CHANGES_PER_RUN = 1
export const MAX_MESSAGES_PER_RUN = 2

export interface DirectorToolHandlers {
	/** Current device snapshot: temps, setpoint, probes, targets, state. */
	get_telemetry(): Promise<unknown>
	/** Downsampled temperature series for the active cook. */
	get_cook_history(args: { hours?: number }): Promise<unknown>
	/** Stats from previous completed cooks on this smoker. */
	list_past_sessions(): Promise<unknown>
	/** Recent feed messages including user button choices and steers. */
	get_recent_messages(): Promise<unknown>
	/** Pellet hopper burn model: remaining kg, rate, run-dry forecast. */
	get_pellet_status(): Promise<unknown>
	/** Photos the user uploaded for this cook (urls). */
	list_photos(): Promise<unknown>
	/** Request a pit setpoint change — validated by the safety envelope. */
	set_pit_temp(args: { setpointC: number; reason: string }): Promise<unknown>
	/** Send a message to the user's feed. */
	send_message(args: {
		title: string
		body: string
		requiresAck?: boolean
		actions?: Array<{ id: string; label: string }>
	}): Promise<unknown>
}

export const DIRECTOR_TOOLS: Anthropic.Tool[] = [
	{
		name: 'get_telemetry',
		description:
			'Current smoker snapshot: pit/air/smoke temps (°C), setpoint, probe temps and doneness targets, cook state, lid, mode.',
		input_schema: { type: 'object', properties: {} },
	},
	{
		name: 'get_cook_history',
		description:
			'Temperature series for the active cook (downsampled). Use to judge trend, stall, and recovery.',
		input_schema: {
			type: 'object',
			properties: {
				hours: {
					type: 'number',
					description: 'How far back to look (default 6, max 24)',
				},
			},
		},
	},
	{
		name: 'list_past_sessions',
		description:
			'Stats from previous completed cooks on this smoker: duration, avg/max pit, max probe, stability, stall time. Use to calibrate expectations.',
		input_schema: { type: 'object', properties: {} },
	},
	{
		name: 'get_recent_messages',
		description:
			'Recent feed messages with the user response (button id or free-text steer). ALWAYS check before messaging — never repeat advice, and honor steers.',
		input_schema: { type: 'object', properties: {} },
	},
	{
		name: 'get_pellet_status',
		description:
			'Pellet hopper model: kg burned/remaining, current burn rate, predicted run-dry time.',
		input_schema: { type: 'object', properties: {} },
	},
	{
		name: 'list_photos',
		description:
			'Photos the user uploaded for this cook (bark/smoke-ring checks). Returns URLs; may be empty.',
		input_schema: { type: 'object', properties: {} },
	},
	{
		name: 'set_pit_temp',
		description:
			'Change the pit setpoint (°C). Goes through a deterministic safety envelope: mode temperature bounds, raise-step limit (+15°C max per change; lowering unrestricted). The result tells you what actually applied — it may be clamped or rejected. If you change the temperature you MUST also send_message telling the user what you did and why, with the numbers.',
		input_schema: {
			type: 'object',
			properties: {
				setpointC: { type: 'number', description: 'Target pit °C' },
				reason: {
					type: 'string',
					description:
						'Short operator-log reason, e.g. "stall at 67°C for 50min"',
				},
			},
			required: ['setpointC', 'reason'],
		},
	},
	{
		name: 'send_message',
		description:
			'Message the user\'s feed. Technical and specific: include temperatures and times ("Pit 107°C, brisket 64.2°C and climbing 2.1°C/h — on pace for 18:30"). Set requiresAck with action buttons when the user must do or decide something physical (spritz, wrap, refill, pull). Plain (no ack) for status and AI-action notices.',
		input_schema: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					description: 'Short headline, may use one emoji',
				},
				body: {
					type: 'string',
					description: 'One-to-three technical sentences',
				},
				requiresAck: {
					type: 'boolean',
					description: 'true when the user must act or decide',
				},
				actions: {
					type: 'array',
					description:
						'Decision buttons when requiresAck, e.g. [{"id":"wrap","label":"Wrap it 🧻"},{"id":"ride","label":"Ride it out"}]',
					items: {
						type: 'object',
						properties: {
							id: { type: 'string' },
							label: { type: 'string' },
						},
						required: ['id', 'label'],
					},
				},
			},
			required: ['title', 'body'],
		},
	},
]

export const DIRECTOR_SYSTEM_PROMPT = `You are PitMinder's pit director: a seasoned BBQ pitmaster supervising a Ninja Woodfire smoker between your 10-minute check-ins. You see the cook through tools and can act through tools — nothing else reaches the user or the grill.

Division of labour: a deterministic autopilot already handles hold-warm-at-doneness and stall nudges, and a pellet model already warns when the hopper runs low. You are the judgment layer on top: spot what the rules miss, time coaching (spritz, wrap decisions, ETA updates), honor the user's steers, and catch anomalies (pit oscillation, probe disconnects, lid left open, cook drifting off the dinner plan).

Procedure each check-in:
1. ALWAYS call get_telemetry and get_recent_messages first. Usually also get_cook_history.
2. If the user replied or steered since the last check-in, that is your highest priority — honor it and confirm with a message stating what you changed.
3. Decide: most check-ins need NO action. Silence is professional; chatter is not.

Rules:
- Never repeat or rephrase a message that already exists in the recent feed. One spritz reminder per cook unless conditions change materially.
- Be technical and numeric: temperatures in °C, rates in °C/h, concrete times.
- If you change the pit temperature, you MUST send a message saying exactly what you changed and why ("Dropped pit 107→90°C: brisket past the stall at 71°C, protecting the bark").
- When the user must physically act or decide, send requiresAck with 2-3 action buttons. Never ask them to "reply X" — give buttons.
- When unsure or the situation looks abnormal (sensor contradiction, temps that make no sense, possible fire-safety concern), do NOT guess at controls — send an ack-required message escalating to the user with what you see and the options.
- Hard budget: at most ${MAX_SETPOINT_CHANGES_PER_RUN} setpoint change and ${MAX_MESSAGES_PER_RUN} messages per check-in. The harness enforces this; plan accordingly.
- When done, reply with a one-line summary of what you observed and did (this goes to the operator log, not the user).`

export interface DirectorRunResult {
	summary: string
	iterations: number
	setpointChanges: number
	messagesSent: number
	toolCalls: string[]
}

/**
 * Runs one director check-in: a bounded tool-use loop. `client` only needs
 * messages.create, so tests can inject a fake.
 */
export async function runDirectorLoop(opts: {
	client: Pick<Anthropic, 'messages'>
	model: string
	contextNote: string
	handlers: DirectorToolHandlers
}): Promise<DirectorRunResult> {
	const { client, model, handlers } = opts
	const messages: Anthropic.MessageParam[] = [
		{
			role: 'user',
			content: `Check-in time. ${opts.contextNote}\nInspect the cook and act if needed.`,
		},
	]
	const result: DirectorRunResult = {
		summary: '',
		iterations: 0,
		setpointChanges: 0,
		messagesSent: 0,
		toolCalls: [],
	}

	for (let i = 0; i < MAX_ITERATIONS; i++) {
		result.iterations = i + 1
		const response = await client.messages.create({
			model,
			max_tokens: 1024,
			system: DIRECTOR_SYSTEM_PROMPT,
			tools: DIRECTOR_TOOLS,
			messages,
		})

		const toolUses = response.content.filter(
			(b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
		)
		const text = response.content
			.filter((b): b is Anthropic.TextBlock => b.type === 'text')
			.map((b) => b.text)
			.join('\n')
		if (text) result.summary = text

		if (response.stop_reason !== 'tool_use' || toolUses.length === 0) break

		messages.push({ role: 'assistant', content: response.content })
		const toolResults: Anthropic.ToolResultBlockParam[] = []
		for (const use of toolUses) {
			result.toolCalls.push(use.name)
			let output: unknown
			let isError = false
			try {
				output = await dispatchTool(use, handlers, result)
			} catch (error) {
				isError = true
				output = error instanceof Error ? error.message : String(error)
			}
			toolResults.push({
				type: 'tool_result',
				tool_use_id: use.id,
				content: JSON.stringify(output ?? null),
				is_error: isError || undefined,
			})
		}
		messages.push({ role: 'user', content: toolResults })
	}

	return result
}

async function dispatchTool(
	use: Anthropic.ToolUseBlock,
	handlers: DirectorToolHandlers,
	run: DirectorRunResult,
): Promise<unknown> {
	const input = (use.input ?? {}) as Record<string, unknown>
	switch (use.name) {
		case 'get_telemetry':
			return handlers.get_telemetry()
		case 'get_cook_history':
			return handlers.get_cook_history({
				hours: typeof input.hours === 'number' ? input.hours : undefined,
			})
		case 'list_past_sessions':
			return handlers.list_past_sessions()
		case 'get_recent_messages':
			return handlers.get_recent_messages()
		case 'get_pellet_status':
			return handlers.get_pellet_status()
		case 'list_photos':
			return handlers.list_photos()
		case 'set_pit_temp': {
			if (run.setpointChanges >= MAX_SETPOINT_CHANGES_PER_RUN) {
				throw new Error(
					'Setpoint budget for this check-in is spent; wait for the next one.',
				)
			}
			if (typeof input.setpointC !== 'number' || !input.reason) {
				throw new Error('set_pit_temp requires numeric setpointC and a reason')
			}
			run.setpointChanges++
			return handlers.set_pit_temp({
				setpointC: input.setpointC,
				reason: String(input.reason),
			})
		}
		case 'send_message': {
			if (run.messagesSent >= MAX_MESSAGES_PER_RUN) {
				throw new Error(
					'Message budget for this check-in is spent; wait for the next one.',
				)
			}
			if (!input.title || !input.body) {
				throw new Error('send_message requires title and body')
			}
			run.messagesSent++
			return handlers.send_message({
				title: String(input.title),
				body: String(input.body),
				requiresAck: input.requiresAck === true,
				actions: Array.isArray(input.actions)
					? (input.actions as Array<{ id: string; label: string }>)
					: undefined,
			})
		}
		default:
			throw new Error(`Unknown tool: ${use.name}`)
	}
}
