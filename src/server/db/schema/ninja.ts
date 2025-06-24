import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const ninjaConnections = pgTable('ninja_connections', {
	userId: uuid('user_id').primaryKey().notNull(), // Foreign key to auth.users.id
	accessToken: text('access_token').notNull(),
	refreshToken: text('refresh_token').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})
