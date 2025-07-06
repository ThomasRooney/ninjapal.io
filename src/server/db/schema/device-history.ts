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

		// Ensure only one snapshot per device per hour
		oneSnapshotPerHourIdx: uniqueIndex('one_snapshot_per_hour_idx')
			.on(
				table.deviceId,
				sql`date_trunc('hour', ${table.recordedAt}::timestamptz)`,
			)
			.where(sql`${table.historyType} = 'snapshot'`),
	}),
)
