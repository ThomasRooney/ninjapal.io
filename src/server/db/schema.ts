import { boolean, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
	id: varchar('id').primaryKey(),
	email: varchar('email').notNull(),
	name: varchar('name').notNull(),
	prefers_celsius: boolean('prefers_celsius'),
	whitelisted: boolean('whitelisted').default(false),
	last_login_at: timestamp('last_login_at', { withTimezone: true }),
})

export * from './schema/ninja'
export * from './schema/devices'
export * from './schema/device-history'
export * from './schema/auth'
export * from './schema/cook-sessions'
export * from './schema/cook-messages'
export * from './schema/device-commands'
export * from './schema/platform'
