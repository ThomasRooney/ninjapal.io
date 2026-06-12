/**
 * PitMinder MCP server: every read and (safety-enveloped) control surface
 * an agent needs, bound to one authenticated user. Powers the in-app chat
 * loop via an in-memory transport, and is mountable over HTTP at /api/mcp
 * for external agents.
 */
import { reconstructHistorySnapshots } from '@/lib/historyUtils'
import { hopperStatus } from '@/lib/pellet-model'
import { validateIntent } from '@/server/control/safety'
import { getSql } from '@/server/db/client'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

function text(value: unknown) {
	return {
		content: [{ type: 'text' as const, text: JSON.stringify(value, null, 1) }],
	}
}

export function createPitMinderMcpServer(userId: string): McpServer {
	const sql = getSql()
	const server = new McpServer({ name: 'pitminder', version: '1.0.0' })

	// registerTool's generics hit TS2589 (excessively deep instantiation)
	// with zod raw shapes — bind through a plain signature instead.
	const register = server.registerTool.bind(server) as (
		name: string,
		config: { description: string; inputSchema: Record<string, z.ZodTypeAny> },
		// biome-ignore lint/suspicious/noExplicitAny: boundary cast, see above
		handler: (args: any) => Promise<ReturnType<typeof text>>,
	) => void

	register(
		'get_telemetry',
		{
			description:
				'Current snapshot of every smoker on the account: pit/air/smoke °C, setpoint, probes with doneness targets, cook state, autopilot flag.',
			inputSchema: {},
		},
		async () => {
			const rows = await sql`
				select id, product_name, connection_status, cook_state, cook_mode,
					temp_grill, temp_air, temp_smoke, is_lid_open,
					probe1_temp_a, probe1_target_temp, probe2_temp_a, probe2_target_temp,
					autopilot_enabled, is_simulated, grill_state_raw
				from devices where user_id = ${userId}::uuid
			`
			return text(
				rows.map((d) => {
					let setpointC: number | null = null
					try {
						const gs = JSON.parse((d.grill_state_raw as string) ?? '{}')
						if (typeof gs.setpoint === 'number') setpointC = gs.setpoint
					} catch {}
					return {
						deviceId: d.id,
						name: d.product_name,
						online: d.connection_status === 'Online',
						cookState: d.cook_state,
						mode: d.cook_mode,
						setpointC,
						pitC: d.temp_grill != null ? Number(d.temp_grill) : null,
						airC: d.temp_air != null ? Number(d.temp_air) : null,
						smokeC: d.temp_smoke != null ? Number(d.temp_smoke) : null,
						lidOpen: d.is_lid_open === true,
						probe1C: d.probe1_temp_a != null ? Number(d.probe1_temp_a) : null,
						probe1TargetC:
							d.probe1_target_temp != null
								? Number(d.probe1_target_temp)
								: null,
						probe2C: d.probe2_temp_a != null ? Number(d.probe2_temp_a) : null,
						probe2TargetC:
							d.probe2_target_temp != null
								? Number(d.probe2_target_temp)
								: null,
						autopilotEnabled: d.autopilot_enabled === true,
						simulated: d.is_simulated === true,
					}
				}),
			)
		},
	)

	register(
		'get_cook_history',
		{
			description:
				'Temperature series for a device (downsampled to ≤48 points). Judge trend, stall, recovery, heating rate.',
			inputSchema: {
				deviceId: z.string().describe('Device id from get_telemetry'),
				hours: z
					.number()
					.optional()
					.describe('Lookback hours (default 6, max 24)'),
			},
		},
		async ({ deviceId, hours }) => {
			const h = Math.min(Math.max(hours ?? 6, 1), 24)
			const rows = await sql`
				select dh.id, dh.history_type, dh.recorded_at, dh.changed_by, dh.changes
				from device_history dh
				join devices d on d.id = dh.device_id
				where dh.device_id = ${deviceId} and d.user_id = ${userId}::uuid
					and dh.recorded_at > now() - make_interval(hours => ${h})
			`
			const snapshots = reconstructHistorySnapshots(
				rows
					.map((r) => ({
						id: Number(r.id),
						historyType: r.history_type as string,
						recordedAt: r.recorded_at
							? new Date(r.recorded_at as string).getTime()
							: null,
						changedBy: r.changed_by as string | null,
						changes: r.changes as never,
					}))
					.sort((a, b) => (b.recordedAt ?? 0) - (a.recordedAt ?? 0)),
			)
			const num = (v: unknown) => (typeof v === 'number' ? v : null)
			const points = snapshots
				.filter((s) => s.recordedAt)
				.map((s) => ({
					t: new Date(s.recordedAt as number).toISOString(),
					pitC: num(s.state.temp_grill),
					probe1C: num(s.state.probe1_temp_a),
					probe2C: num(s.state.probe2_temp_a),
				}))
				.sort((a, b) => a.t.localeCompare(b.t))
			const step = Math.max(1, Math.ceil(points.length / 48))
			return text(
				points.filter((_, i) => i % step === 0 || i === points.length - 1),
			)
		},
	)

	register(
		'list_past_sessions',
		{
			description:
				'Completed cooks on the account: duration, setpoint, avg/max pit, max probe, stability score, stall time.',
			inputSchema: {},
		},
		async () => {
			const rows = await sql`
				select cs.name, cs.cook_mode, cs.started_at, cs.ended_at, cs.setpoint,
					cs.avg_temp_grill, cs.max_probe1_temp, cs.stability_score, cs.stall_seconds
				from cook_sessions cs
				where cs.user_id = ${userId}::uuid and cs.ended_at is not null
				order by cs.started_at desc limit 8
			`
			return text(
				rows.map((s) => ({
					name: s.name,
					mode: s.cook_mode,
					startedAt: s.started_at,
					hours:
						s.ended_at && s.started_at
							? Math.round(
									((new Date(s.ended_at as string).getTime() -
										new Date(s.started_at as string).getTime()) /
										3_600_000) *
										10,
								) / 10
							: null,
					setpointC: s.setpoint != null ? Number(s.setpoint) : null,
					avgPitC: s.avg_temp_grill != null ? Number(s.avg_temp_grill) : null,
					maxProbeC:
						s.max_probe1_temp != null ? Number(s.max_probe1_temp) : null,
					stabilityScore: s.stability_score,
					stallSeconds: s.stall_seconds,
				})),
			)
		},
	)

	register(
		'get_recent_messages',
		{
			description:
				'Recent coaching-feed messages with user responses (button id or free-text steer) and director check-ins.',
			inputSchema: {},
		},
		async () => {
			const messages = await sql`
				select created_at, kind, title, body, requires_ack, response, acked_at
				from cook_messages where user_id = ${userId}::uuid
				order by created_at desc limit 15
			`
			const runs = await sql`
				select created_at, status, summary, setpoint_changes, messages_sent
				from director_runs where user_id = ${userId}::uuid
				order by created_at desc limit 5
			`
			return text({
				messages: messages.map((m) => ({
					at: m.created_at,
					kind: m.kind,
					title: m.title,
					body: m.body,
					requiresAck: m.requires_ack,
					userResponse: m.response,
					acked: m.acked_at != null,
				})),
				directorCheckIns: runs.map((r) => ({
					at: r.created_at,
					status: r.status,
					summary: r.summary,
				})),
			})
		},
	)

	register(
		'get_pellet_status',
		{
			description:
				'Pellet hopper model for a device: kg burned/remaining, burn rate, predicted run-dry time.',
			inputSchema: {
				deviceId: z.string().describe('Device id from get_telemetry'),
			},
		},
		async ({ deviceId }) => {
			const [device] = await sql`
				select hopper_capacity_kg, pellets_loaded_at from devices
				where id = ${deviceId} and user_id = ${userId}::uuid
			`
			if (!device) return text({ error: 'device not found' })
			const capacityKg =
				device.hopper_capacity_kg != null
					? Number(device.hopper_capacity_kg)
					: null
			const loadedAtMs = device.pellets_loaded_at
				? new Date(device.pellets_loaded_at as string).getTime()
				: null
			if (!capacityKg || !loadedAtMs) {
				return text({ configured: false, note: 'no hopper capacity/load time' })
			}
			const rows = await sql`
				select recorded_at, history_type, changes, id, changed_by from device_history
				where device_id = ${deviceId} and recorded_at >= to_timestamp(${loadedAtMs} / 1000.0)
			`
			const snapshots = reconstructHistorySnapshots(
				rows
					.map((r) => ({
						id: Number(r.id),
						historyType: r.history_type as string,
						recordedAt: r.recorded_at
							? new Date(r.recorded_at as string).getTime()
							: null,
						changedBy: r.changed_by as string | null,
						changes: r.changes as never,
					}))
					.sort((a, b) => (b.recordedAt ?? 0) - (a.recordedAt ?? 0)),
			)
			const grillSeries = snapshots
				.filter((s) => typeof s.state.temp_grill === 'number' && s.recordedAt)
				.map((s) => ({
					t: s.recordedAt as number,
					value: s.state.temp_grill as number,
				}))
			const status = hopperStatus({
				capacityKg,
				loadedAtMs,
				grillSeries,
				nowMs: Date.now(),
			})
			return text({
				configured: true,
				capacityKg,
				...status,
				emptyAt: status.emptyAtMs
					? new Date(status.emptyAtMs).toISOString()
					: null,
			})
		},
	)

	register(
		'list_photos',
		{
			description: 'Cook photos the user uploaded (newest first, public URLs).',
			inputSchema: {},
		},
		async () => {
			const rows = await sql`
				select url, created_at from cook_photos
				where user_id = ${userId}::uuid order by created_at desc limit 10
			`
			return text(rows.map((p) => ({ url: p.url, at: p.created_at })))
		},
	)

	register(
		'set_pit_temp',
		{
			description:
				'Queue a pit setpoint change (°C) for a device. Validated by the deterministic safety envelope (mode bounds, +15°C max raise; lowering unrestricted) and executed by the worker within ~1 minute. Returns what was queued or why it was rejected.',
			inputSchema: {
				deviceId: z.string().describe('Device id from get_telemetry'),
				setpointC: z.number().describe('Target pit °C'),
				reason: z.string().describe('Short reason shown in the command log'),
			},
		},
		async ({ deviceId, setpointC, reason }) => {
			const [device] = await sql`
				select cook_mode, grill_state_raw from devices
				where id = ${deviceId} and user_id = ${userId}::uuid
			`
			if (!device) return text({ ok: false, error: 'device not found' })
			let currentSetpointC: number | null = null
			try {
				const gs = JSON.parse((device.grill_state_raw as string) ?? '{}')
				if (typeof gs.setpoint === 'number') currentSetpointC = gs.setpoint
			} catch {}
			const verdict = validateIntent(
				{ kind: 'set_pit_temp', setpointC, reason },
				{ mode: (device.cook_mode as string) ?? null, currentSetpointC },
			)
			if (!verdict.ok) {
				return text({ ok: false, rejected: verdict.rejectReason })
			}
			await sql`
				insert into device_commands (device_id, user_id, kind, payload, source, status)
				values (${deviceId}, ${userId}::uuid, 'set_pit_temp',
					${sql.json({ setpointC: verdict.setpointC, reason })}, 'chat', 'pending')
			`
			return text({
				ok: true,
				queuedC: verdict.setpointC,
				clamped: verdict.setpointC !== setpointC,
				note: 'Executes within ~1 minute on the next worker cycle.',
			})
		},
	)

	register(
		'respond_to_message',
		{
			description:
				"Acknowledge a pending feed message on the user's behalf (only when they clearly asked for it). Pass the action id or short free text.",
			inputSchema: {
				title: z
					.string()
					.describe('Title (or unique fragment) of the pending message'),
				response: z.string().describe('Action id or short free-text response'),
			},
		},
		async ({ title, response }) => {
			const updated = await sql`
				update cook_messages set response = ${response}, acked_at = now()
				where user_id = ${userId}::uuid and acked_at is null and requires_ack
					and title ilike ${`%${title}%`}
				returning id, title
			`
			return text(
				updated.length
					? { ok: true, acknowledged: updated.map((u) => u.title) }
					: { ok: false, error: 'no matching pending message' },
			)
		},
	)

	return server
}
