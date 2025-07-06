import {
	bigint,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core'
import { devices } from './devices'

export const deviceHistory = pgTable('device_history', {
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

	// What operation was performed
	operation: text('operation', {
		enum: ['INSERT', 'UPDATE', 'DELETE'],
	}).notNull(),

	// Who/what made the change (nullable for system changes)
	changedBy: uuid('changed_by'), // User ID if available

	// The actual changes - stores only what changed (or full record for INSERT/DELETE)
	changes: jsonb('changes').notNull(),
})

// Create indexes for performance
export const deviceHistoryIndexes = {
	deviceIdIdx:
		'CREATE INDEX idx_device_history_device_id ON device_history(device_id)',
	recordedAtIdx:
		'CREATE INDEX idx_device_history_recorded_at ON device_history(recorded_at DESC)',
}
