import {
	boolean,
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
 * Coaching messages from PitMinder to the user — the phone-like feed.
 * Messages with requires_ack stay "pending" until the user acknowledges
 * them; the worker (and later the AI planner) emits them on telemetry
 * transitions.
 */
export const cookMessages = pgTable(
	'cook_messages',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id').notNull(),
		deviceId: uuid('device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),
		sessionId: uuid('session_id'),

		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),

		// spritz | stall_start | stall_end | target_reached | pit_drop |
		// pit_recovered | session_start | session_end | hold_warm
		kind: varchar('kind', { length: 50 }).notNull(),
		title: varchar('title', { length: 256 }).notNull(),
		body: text('body'),

		requiresAck: boolean('requires_ack').notNull().default(false),
		// Decision buttons: [{ id: 'wrap', label: 'Wrap it 🧻' }, ...]
		actions: jsonb('actions'),
		// Chosen action id, or free-text steer from the user
		response: text('response'),
		ackedAt: timestamp('acked_at', { withTimezone: true }),
	},
	(table) => ({
		userIdx: index('idx_cook_messages_user_id').on(table.userId),
		deviceIdx: index('idx_cook_messages_device_id').on(table.deviceId),
		createdIdx: index('idx_cook_messages_created_at').on(table.createdAt),
	}),
)
