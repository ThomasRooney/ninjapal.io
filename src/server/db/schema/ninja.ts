import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const ninjaConnections = pgTable('ninja_connections', {
	userId: uuid('user_id').primaryKey().notNull(), // Foreign key to auth.users.id
	username: varchar('username', { length: 255 }).notNull(),
	password: text('password').notNull(),
	oauthAccessToken: text('oauth_access_token').notNull(),
	oauthRefreshToken: text('oauth_refresh_token').notNull(),
	oauthExpiresAt: timestamp('oauth_expires_at', {
		withTimezone: true,
	}).notNull(),
	aylaAccessToken: text('ayla_access_token').notNull(),
	aylaRefreshToken: text('ayla_refresh_token').notNull(),
	aylaExpiresAt: timestamp('ayla_expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})
