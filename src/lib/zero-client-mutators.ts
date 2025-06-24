import type { AuthData } from '@/server/db/zero-permissions.ts'
import {
	type SharedMutators,
	createSharedMutators,
} from '@/server/db/zero-shared-mutators.ts'

/**
 * Client mutators that use shared mutators directly
 * Following the zbugs pattern where client uses shared mutators as-is
 */
export function createClientMutators(authData: AuthData): SharedMutators {
	// Client mutators are just the shared mutators
	// No additional client-specific logic needed for now
	return createSharedMutators(authData)
}

export type ClientMutators = SharedMutators
