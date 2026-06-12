import {
	index,
	integer,
	numeric,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core'
import { devices } from './devices'

/**
 * A cook session: one contiguous run of the grill, detected from
 * cook_state transitions (idle → preheating/cooking → idle). Stats columns
 * are computed when the session ends; live sessions compute them
 * client-side from device_history.
 */
export const cookSessions = pgTable(
	'cook_sessions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		deviceId: uuid('device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),
		userId: uuid('user_id').notNull(),

		name: varchar('name', { length: 256 }), // user-editable; auto-generated default
		cook_mode: varchar('cook_mode', { length: 50 }),

		startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
		endedAt: timestamp('ended_at', { withTimezone: true }), // null = active

		// Set at session start (or latest observed)
		setpoint: numeric('setpoint', { precision: 5, scale: 1 }),

		// Computed at session end (°C)
		max_temp_grill: numeric('max_temp_grill', { precision: 5, scale: 1 }),
		avg_temp_grill: numeric('avg_temp_grill', { precision: 5, scale: 1 }),
		max_probe1_temp: numeric('max_probe1_temp', { precision: 5, scale: 1 }),
		stability_score: integer('stability_score'), // 0-100
		stall_seconds: integer('stall_seconds'),
		lid_open_count: integer('lid_open_count'),
	},
	(table) => ({
		deviceIdx: index('idx_cook_sessions_device_id').on(table.deviceId),
		userIdx: index('idx_cook_sessions_user_id').on(table.userId),
		startedIdx: index('idx_cook_sessions_started_at').on(table.startedAt),
	}),
)
