import { sql } from 'drizzle-orm'
import {
	bigint,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'
import { devices } from './devices'

export const deviceHistory = pgTable(
	'device_history',
	{
		// Primary key - using bigint for better performance
		id: bigint('id', { mode: 'number' })
			.primaryKey()
			.generatedByDefaultAsIdentity(),

		// Reference to the device
		deviceId: uuid('device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),

		// Denormalized owner of the device — powers the own-rows-only Zero
		// select permission (the generated Zero schema has no relationships to
		// join through). Nullable for expand/migrate/contract; backfilled from
		// devices.user_id.
		userId: uuid('user_id'),

		// When the change was recorded
		recordedAt: timestamp('recorded_at', { withTimezone: true })
			.defaultNow()
			.notNull(),

		// Type of history record
		historyType: text('history_type', {
			enum: ['snapshot', 'patch'],
		}).notNull(),

		// Who/what made the change (nullable for system changes)
		changedBy: uuid('changed_by'), // User ID if available

		// The actual changes - stores only what changed (or full record for INSERT/DELETE)
		changes: jsonb('changes').notNull(),
	},
	(table) => ({
		// Performance indexes
		deviceIdIdx: index('idx_device_history_device_id').on(table.deviceId),
		recordedAtIdx: index('idx_device_history_recorded_at').on(table.recordedAt),

		// Ensure only one snapshot per device per minute.
		// AT TIME ZONE 'UTC' makes the expression immutable (date_trunc on a
		// bare timestamptz is only stable, which Postgres rejects in indexes).
		oneSnapshotPerMinuteIdx: uniqueIndex('one_snapshot_per_minute_idx')
			.on(
				table.deviceId,
				sql`date_trunc('minute', ${table.recordedAt} AT TIME ZONE 'UTC')`,
			)
			.where(sql`${table.historyType} = 'snapshot'`),
	}),
)
