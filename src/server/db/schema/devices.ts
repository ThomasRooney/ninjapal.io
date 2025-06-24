import {
	boolean,
	jsonb,
	numeric,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core'

export const devices = pgTable('devices', {
	// Core fields
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').notNull(), // RLS will handle the auth.users relationship

	// Device identifiers
	dsn: varchar('dsn', { length: 256 }).unique().notNull(), // Unique device serial number

	// Essential device info
	productName: varchar('product_name', { length: 256 }),
	model: varchar('model', { length: 256 }),

	// Network info
	mac: varchar('mac', { length: 17 }), // Standard MAC address format
	lanIp: varchar('lan_ip', { length: 45 }), // Supports IPv4 and IPv6

	// Status
	connectionStatus: varchar('connection_status', { length: 50 }), // online, offline, etc.

	// Properties from the properties endpoint
	additionalDeviceProperties: jsonb('additional_device_properties'),

	// Timestamps
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})
