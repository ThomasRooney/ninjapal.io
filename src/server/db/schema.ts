import { boolean, pgTable, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
	id: varchar('id').primaryKey(),
	email: varchar('email').notNull(),
	name: varchar('name').notNull(),
	prefers_celsius: boolean('prefers_celsius'),
})

export * from './schema/ninja'
export * from './schema/devices'
export * from './schema/device-history'
export * from './schema/auth'
export * from './schema/cook-sessions'
