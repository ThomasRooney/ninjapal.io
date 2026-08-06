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

		const allowIfSelfHistory = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'deviceHistory'>,
		) => cmp('userId', authData.sub as string)

		const allowIfSelfSession = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'cookSessions'>,
		) => cmp('userId', authData.sub as string)

		const allowIfSelfPhoto = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'cookPhotos'>,
		) => cmp('userId', authData.sub as string)

		const allowIfSelfDirectorRun = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'directorRuns'>,
		) => cmp('userId', authData.sub as string)

		const allowIfSelfCommand = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'deviceCommands'>,
		) => cmp('userId', authData.sub as string)

		const allowIfSelfMessage = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'cookMessages'>,
		) => cmp('userId', authData.sub as string)

		const allowIfSelfSteerThread = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'steerThreads'>,
		) => cmp('userId', authData.sub as string)

		const allowIfSelfSteerMessage = (
			authData: AuthData,
			{ cmp }: ExpressionBuilder<Schema, 'steerMessages'>,
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
					// Own rows only — history rows carry a denormalized userId
					// stamped by every writer (server mutators, sync worker, seed)
					select: [allowIfSelfHistory],
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
			directorRuns: {
				row: {
					select: [allowIfSelfDirectorRun],
					insert: [], // worker-only writes
					update: { preMutation: [], postMutation: [] },
					delete: [],
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
			steerThreads: {
				row: {
					// Own rows only; every write goes through the server
					// (/api/chat + the reset server fn)
					select: [allowIfSelfSteerThread],
					insert: [],
					update: { preMutation: [], postMutation: [] },
					delete: [],
				},
			},
			steerMessages: {
				row: {
					// Own rows only; the chat API is the sole writer and rows
					// are immutable once written
					select: [allowIfSelfSteerMessage],
					insert: [],
					update: { preMutation: [], postMutation: [] },
					delete: [],
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
