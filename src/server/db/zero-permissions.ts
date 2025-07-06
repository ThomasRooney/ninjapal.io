import { schema as zeroSchema } from '@/server/db/zero-schema.gen'
import type { Schema } from '@/server/db/zero-schema.gen'
// https://github.com/BriefHQ/drizzle-zero
import {
	type ExpressionBuilder,
	type InsertValue,
	type PermissionsConfig,
	type Row,
	// type Schema,
	definePermissions,
} from '@rocicorp/zero'
// import * as drizzleSchema from './schema'

// AuthData is the JWT sub claim plus the users row (email & name)
export type AuthData = { sub: User['id'] | null } & Partial<
	Pick<User, 'email' | 'name'>
>

// Must export `schema`
export const schema = zeroSchema

// Define permissions with explicit types
export type ZeroSchema = Schema

export type User = Row<typeof zeroSchema.tables.users>
export type NinjaConnection = Row<typeof zeroSchema.tables.ninjaConnections>
export type Device = Row<typeof zeroSchema.tables.devices>
export type InsertUser = InsertValue<typeof zeroSchema.tables.users>
export type InsertNinjaConnection = InsertValue<
	typeof zeroSchema.tables.ninjaConnections
>
export type InsertDevice = InsertValue<typeof zeroSchema.tables.devices>
export const permissions = definePermissions<AuthData, Schema>(
	zeroSchema,
	() => {
		const allowIfSelf = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'users'>,
		) => cmp('id', authData.sub as string)

		const allowIfSelfNinja = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'ninjaConnections'>,
		) => cmp('userId', authData.sub as string)

		const allowIfSelfDevice = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'devices'>,
		) => cmp('userId', authData.sub as string)

		return {
			users: {
				row: {
					select: [allowIfSelf],
					insert: [allowIfSelf],
					delete: [allowIfSelf],
				},
			},
			ninjaConnections: {
				row: {
					select: [allowIfSelfNinja],
					insert: [allowIfSelfNinja],
					update: {
						preMutation: [allowIfSelfNinja],
						postMutation: [allowIfSelfNinja],
					},
					delete: [allowIfSelfNinja],
				},
			},
			devices: {
				row: {
					select: [allowIfSelfDevice],
					insert: [allowIfSelfDevice],
					update: {
						preMutation: [allowIfSelfDevice],
						postMutation: [allowIfSelfDevice],
					},
					delete: [allowIfSelfDevice],
				},
			},
		} satisfies PermissionsConfig<AuthData, Schema>
	},
)
