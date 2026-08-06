import {
	index,
	jsonb,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core'
import { devices } from './devices'

/**
 * A "Steer this cook" chat thread — one continuous conversation per
 * (user, device). Threads rotate on manual reset: the open thread gets
 * closedAt stamped and a fresh row is inserted, so history is never
 * deleted, just hidden. The ACTIVE thread is the newest row for
 * (user, device) with closedAt null.
 */
export const steerThreads = pgTable(
	'steer_threads',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id').notNull(),
		deviceId: uuid('device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		closedAt: timestamp('closed_at', { withTimezone: true }), // null = open
	},
	(table) => ({
		userDeviceCreatedIdx: index('idx_steer_threads_user_device_created').on(
			table.userId,
			table.deviceId,
			table.createdAt,
		),
	}),
)

/**
 * A persisted chat turn half: the completed AI-SDK UIMessage.parts array,
 * verbatim and immutable once written. The server is the only writer —
 * the user half lands BEFORE generation, the assistant half in
 * streamText's onFinish (same turnId), so a refresh mid-stream keeps the
 * question and picks up the answer when it completes.
 */
export const steerMessages = pgTable(
	'steer_messages',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		threadId: uuid('thread_id')
			.notNull()
			.references(() => steerThreads.id, { onDelete: 'cascade' }),
		userId: uuid('user_id').notNull(),
		deviceId: uuid('device_id').notNull(),
		// Stamped from the active cook_sessions row if one exists —
		// attribution only, NOT the thread boundary.
		sessionId: uuid('session_id'),
		// One turnId per send; the unique index below makes retried
		// requests idempotent (ON CONFLICT DO NOTHING).
		turnId: uuid('turn_id').notNull(),
		role: varchar('role', { length: 16 }).notNull(), // 'user' | 'assistant'
		parts: jsonb('parts').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		threadTurnRoleUq: uniqueIndex('uq_steer_messages_thread_turn_role').on(
			table.threadId,
			table.turnId,
			table.role,
		),
		threadCreatedIdx: index('idx_steer_messages_thread_created').on(
			table.threadId,
			table.createdAt,
		),
	}),
)
