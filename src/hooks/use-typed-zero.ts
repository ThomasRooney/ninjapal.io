import type { Schema } from '@/server/db/zero-schema.gen'
import type { SharedMutators } from '@/server/db/zero-shared-mutators'
import { useZero as useBaseZero } from '@rocicorp/zero/react'

/**
 * A pre-typed version of Rocicorp's `useZero` hook for our project's
 * schema and mutators.
 *
 * @important DO NOT import `useZero` directly from '@rocicorp/zero/react'.
 * Always use this hook to ensure correct typing is applied project-wide.
 * A CI/pre-commit check enforces this convention.
 */
export function useZero() {
	return useBaseZero<Schema, SharedMutators>()
}
