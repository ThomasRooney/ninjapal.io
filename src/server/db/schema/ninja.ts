import {
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core'

export const ninjaConnections = pgTable('ninja_connections', {
	userId: uuid('user_id').primaryKey(), // Foreign key to auth.users.id
	username: varchar('username', { length: 255 }).notNull(),
	password: text('password').notNull(),
	attempts: integer('attempts').notNull().default(0),
	oauthAccessToken: text('oauth_access_token'),
	oauthRefreshToken: text('oauth_refresh_token'),
	oauthExpiresAt: timestamp('oauth_expires_at', { withTimezone: true }),
	aylaAccessToken: text('ayla_access_token'),
	aylaRefreshToken: text('ayla_refresh_token'),
	aylaExpiresAt: timestamp('ayla_expires_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull(),
})
