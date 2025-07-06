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
		if (!record.changes || typeof record.changes !== 'object') {
			continue
		}

		const changes = record.changes as Record<string, unknown>

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
