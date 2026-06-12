import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core'

/** Admin-editable key/value configuration (e.g. pit_director_model). */
export const appConfig = pgTable('app_config', {
	key: varchar('key', { length: 100 }).primaryKey(),
	value: jsonb('value').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})

/** Web-push subscriptions, one row per browser endpoint. */
export const pushSubscriptions = pgTable(
	'push_subscriptions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id').notNull(),
		endpoint: text('endpoint').notNull().unique(),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		failCount: integer('fail_count').notNull().default(0),
	},
	(table) => ({
		userIdx: index('idx_push_subscriptions_user_id').on(table.userId),
	}),
)

/** Cook photos stored in Vercel Blob (60-day TTL via worker cleanup). */
export const cookPhotos = pgTable(
	'cook_photos',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id').notNull(),
		deviceId: uuid('device_id'),
		sessionId: uuid('session_id'),
		url: text('url').notNull(),
		pathname: text('pathname').notNull(),
		contentType: varchar('content_type', { length: 100 }),
		sizeBytes: integer('size_bytes'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		userIdx: index('idx_cook_photos_user_id').on(table.userId),
		createdIdx: index('idx_cook_photos_created_at').on(table.createdAt),
	}),
)

/**
 * One row per pit-director check-in — the user-visible trace of what the
 * AI observed and did each run ("thoughts"), success or failure.
 */
export const directorRuns = pgTable(
	'director_runs',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id').notNull(),
		deviceId: uuid('device_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		model: varchar('model', { length: 100 }).notNull(),
		status: varchar('status', { length: 20 }).notNull().default('ok'), // ok | error
		summary: text('summary'),
		error: text('error'),
		iterations: integer('iterations').notNull().default(0),
		setpointChanges: integer('setpoint_changes').notNull().default(0),
		messagesSent: integer('messages_sent').notNull().default(0),
		toolCalls: jsonb('tool_calls'), // string[] of tool names in call order
	},
	(table) => ({
		deviceIdx: index('idx_director_runs_device_id').on(table.deviceId),
		userIdx: index('idx_director_runs_user_id').on(table.userId),
		createdIdx: index('idx_director_runs_created_at').on(table.createdAt),
	}),
)
