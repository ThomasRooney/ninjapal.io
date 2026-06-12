import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core'
import { devices } from './devices'

/**
 * Command queue for device control. The app (manual control) and the
 * autopilot policy enqueue intents; the Railway worker executes them
 * against the Ayla API (or logs them in DRY_RUN) and records the outcome.
 */
export const deviceCommands = pgTable(
	'device_commands',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		deviceId: uuid('device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),
		userId: uuid('user_id').notNull(),

		// set_pit_temp | hold_warm | raw_datapoint
		kind: varchar('kind', { length: 50 }).notNull(),
		// e.g. { setpointC: 110, reason: 'stall nudge' } or { property, value }
		payload: jsonb('payload').notNull(),
		// user | autopilot
		source: varchar('source', { length: 20 }).notNull().default('user'),

		// pending | sent | dry_run | failed | rejected
		status: varchar('status', { length: 20 }).notNull().default('pending'),
		error: text('error'),

		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		executedAt: timestamp('executed_at', { withTimezone: true }),
	},
	(table) => ({
		deviceIdx: index('idx_device_commands_device_id').on(table.deviceId),
		statusIdx: index('idx_device_commands_status').on(table.status),
		createdIdx: index('idx_device_commands_created_at').on(table.createdAt),
	}),
)
