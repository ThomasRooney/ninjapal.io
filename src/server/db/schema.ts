import { pgTable, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
	id: varchar('id').primaryKey(),
	email: varchar('email').notNull(),
	name: varchar('name').notNull(),
})

export * from './schema/ninja'
export * from './schema/devices'
