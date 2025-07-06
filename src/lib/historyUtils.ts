import type { ReadonlyJSONValue } from '@rocicorp/zero'

// Define types for clarity and type safety.
// These should ideally be generated or shared from your DB schema definitions.
type HistoryRecord = {
	id: number | null
	historyType: string
	recordedAt: number | null
	changedBy: string | null
	changes: ReadonlyJSONValue
}

export type ReconstructedState = {
	id: number | null
	recordedAt: number | null
	changedBy: string | null
	historyType: string
	state: Record<string, unknown>
}

export type FieldChange = {
	status: 'added' | 'removed' | 'changed'
	from?: unknown // The old value
	to?: unknown // The new value
}

export type HistoryChange = {
	id: number | null
	recordedAt: number | null
	changedBy: string | null
	historyType: string
	/**
	 * For the oldest entry, this contains all fields.
	 * For subsequent entries, only what changed.
	 */
	fields: Record<string, FieldChange>
}

/**
 * Reconstructs a time-series of full device snapshots from a mix of
 * snapshots and patches.
 *
 * @param records - An array of history records, assumed to be ordered by `recordedAt` descending.
 * @returns An array of reconstructed states, ordered by `recordedAt` descending.
 */
export function reconstructHistorySnapshots(
	records: readonly HistoryRecord[] | undefined | null,
): ReconstructedState[] {
	if (!records || records.length === 0) {
		return []
	}

	// Records are desc, reverse to process chronologically (oldest first).
	const chronologicalRecords = [...records].reverse()

	let currentState: Record<string, unknown> = {}
	const reconstructed: ReconstructedState[] = []

	for (const record of chronologicalRecords) {
		// Skip records with null changes
		if (!record.changes) {
			continue
		}

		// Parse changes if it's a string (from JSONB column)
		let changes: Record<string, unknown> | null = null
		try {
			changes =
				typeof record.changes === 'string'
					? JSON.parse(record.changes)
					: (record.changes as Record<string, unknown>)
		} catch (e) {
			console.error(
				'Failed to parse device history changes, skipping record:',
				{
					historyId: record.id,
					error: e,
				},
			)
			continue // Skip this corrupted record
		}

		if (!changes) {
			continue
		}

		if (record.historyType === 'snapshot') {
			// Snapshot resets the state. The 'changes' field contains the full object.
			// We filter out metadata fields that might be in the snapshot payload.
			const { id, userId, createdAt, updatedAt, ...deviceState } = changes
			currentState = deviceState
		} else if (record.historyType === 'patch') {
			// Patch is merged with the current state.
			currentState = { ...currentState, ...changes }
		}

		reconstructed.push({
			id: record.id,
			recordedAt: record.recordedAt,
			changedBy: record.changedBy,
			historyType: record.historyType,
			state: { ...currentState }, // Clone the current state
		})
	}

	// Reverse again to return to the original descending order for the UI.
	return reconstructed.reverse()
}

/**
 * Flattens a nested object into a single-level object with dot-notation keys.
 * It does not flatten arrays; they are treated as final values.
 * @param obj The object to flatten.
 * @param parentKey The base key for recursive calls.
 * @param result The object to accumulate results into.
 * @returns A flattened object.
 */
function flattenObject(
	obj: Record<string, unknown>,
	parentKey = '',
	result: Record<string, unknown> = {},
): Record<string, unknown> {
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const propName = parentKey ? `${parentKey}.${key}` : key
			const value = obj[key]

			// We only recurse into plain objects, not arrays or null.
			if (
				typeof value === 'object' &&
				value !== null &&
				!Array.isArray(value)
			) {
				flattenObject(value as Record<string, unknown>, propName, result)
			} else {
				result[propName] = value
			}
		}
	}
	return result
}

/**
 * Deep equality check that works in both server and browser environments.
 * Handles objects, arrays, primitives, null/undefined, and circular references.
 */
const isEqual = (a: unknown, b: unknown): boolean => {
	// Handle primitives and same reference
	if (a === b) return true

	// Handle null/undefined
	if (a == null || b == null) return false

	// Must be same type
	if (typeof a !== typeof b) return false

	// Handle arrays
	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) return false
		for (let i = 0; i < a.length; i++) {
			if (!isEqual(a[i], b[i])) return false
		}
		return true
	}

	// Handle objects
	if (typeof a === 'object') {
		const keysA = Object.keys(a as object)
		const keysB = Object.keys(b as object)

		if (keysA.length !== keysB.length) return false

		for (const key of keysA) {
			if (!Object.prototype.hasOwnProperty.call(b, key)) return false
			if (
				!isEqual(
					(a as Record<string, unknown>)[key],
					(b as Record<string, unknown>)[key],
				)
			)
				return false
		}

		return true
	}

	// All other types (functions, symbols, etc.)
	return false
}

/**
 * Calculates the differences between consecutive history entries.
 * For each entry, returns only the fields that changed from the previous state.
 * The oldest entry (last in chronological order) shows all fields as the baseline.
 */
export function calculateHistoryDiffs(
	snapshots: ReconstructedState[],
): HistoryChange[] {
	if (!snapshots || snapshots.length === 0) {
		return []
	}

	// The query is ordered 'desc', so snapshots[0] is the newest.
	const diffs: HistoryChange[] = []

	for (let i = 0; i < snapshots.length; i++) {
		const current = snapshots[i]
		// The "previous" state is the next item in the array (chronologically older)
		const previous = snapshots[i + 1]

		const changedFields: Record<string, FieldChange> = {}

		if (!previous) {
			// This is the oldest record. Flatten and treat all its fields as 'added'.
			const flattenedState = flattenObject(current.state)
			for (const key in flattenedState) {
				if (Object.prototype.hasOwnProperty.call(flattenedState, key)) {
					changedFields[key] = {
						status: 'added',
						to: flattenedState[key],
					}
				}
			}
		} else {
			// Flatten both states before comparing.
			const currentState = flattenObject(current.state)
			const previousState = flattenObject(previous.state)
			const allKeys = new Set([
				...Object.keys(currentState),
				...Object.keys(previousState),
			])

			for (const key of allKeys) {
				const valueCurrent = currentState[key]
				const valuePrevious = previousState[key]

				const inCurrent = key in currentState
				const inPrevious = key in previousState

				if (inCurrent && !inPrevious) {
					changedFields[key] = { status: 'added', to: valueCurrent }
				} else if (!inCurrent && inPrevious) {
					changedFields[key] = { status: 'removed', from: valuePrevious }
				} else if (!isEqual(valueCurrent, valuePrevious)) {
					changedFields[key] = {
						status: 'changed',
						from: valuePrevious,
						to: valueCurrent,
					}
				}
			}
		}

		// Only push entries that have changes
		if (Object.keys(changedFields).length > 0) {
			diffs.push({
				id: current.id,
				recordedAt: current.recordedAt,
				changedBy: current.changedBy,
				historyType: current.historyType,
				fields: changedFields,
			})
		}
	}

	return diffs
}
