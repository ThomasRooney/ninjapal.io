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
export type DeviceHistory = Row<typeof zeroSchema.tables.deviceHistory>
export type InsertUser = InsertValue<typeof zeroSchema.tables.users>
export type InsertNinjaConnection = InsertValue<
	typeof zeroSchema.tables.ninjaConnections
>
export type InsertDevice = InsertValue<typeof zeroSchema.tables.devices>
export type InsertDeviceHistory = InsertValue<
	typeof zeroSchema.tables.deviceHistory
>
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

		const allowIfSelfSession = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'cookSessions'>,
		) => cmp('userId', authData.sub as string)

		const allowIfSelfPhoto = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'cookPhotos'>,
		) => cmp('userId', authData.sub as string)

		const allowIfSelfCommand = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'deviceCommands'>,
		) => cmp('userId', authData.sub as string)

		const allowIfSelfMessage = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'cookMessages'>,
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
			deviceHistory: {
				row: {
					// Allow all authenticated users to read device history
					// The component will filter to only show history for their devices
					select: [
						(_authData, { cmp }: ExpressionBuilder<Schema, 'deviceHistory'>) =>
							cmp('id', '>', 0), // Allow all rows for authenticated users
					],
					// Only server-side operations can insert
					insert: [],
					// No updates or deletes allowed on history
					update: {
						preMutation: [],
						postMutation: [],
					},
					delete: [],
				},
			},
			cookPhotos: {
				row: {
					select: [allowIfSelfPhoto],
					insert: [], // server fn uploads
					update: { preMutation: [], postMutation: [] },
					delete: [allowIfSelfPhoto],
				},
			},
			deviceCommands: {
				row: {
					select: [allowIfSelfCommand],
					// Enqueued via the custom mutator / worker only
					insert: [],
					update: { preMutation: [], postMutation: [] },
					delete: [allowIfSelfCommand],
				},
			},
			cookMessages: {
				row: {
					select: [allowIfSelfMessage],
					// Created server-side (worker/seed); clients only ack
					insert: [],
					update: {
						preMutation: [allowIfSelfMessage],
						postMutation: [allowIfSelfMessage],
					},
					delete: [allowIfSelfMessage],
				},
			},
			cookSessions: {
				row: {
					select: [allowIfSelfSession],
					// Sessions are created/ended server-side (sync worker / seed);
					// clients may rename their own sessions.
					insert: [],
					update: {
						preMutation: [allowIfSelfSession],
						postMutation: [allowIfSelfSession],
					},
					delete: [allowIfSelfSession],
				},
			},
		} satisfies PermissionsConfig<AuthData, Schema>
	},
)
