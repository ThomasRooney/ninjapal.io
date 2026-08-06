/**
 * Pure helpers for the persisted "Steer this cook" chat.
 *
 * A steer_messages row stores one half of a turn: the completed AI-SDK
 * UIMessage.parts array, verbatim. These helpers convert rows back to
 * UIMessages (client hydration + server model-context rebuilds) and
 * select the most recent turns that fit a character budget (server-side
 * context window). Shared by the browser and /api/chat — keep it pure.
 */
import type { UIMessage } from 'ai'

export type SteerRole = 'user' | 'assistant'

/** Minimal row shape shared by Zero rows (ms timestamps) and SQL rows. */
export interface SteerMessageRowLike {
	id: string
	turnId: string
	role: string
	parts: unknown
	/** Milliseconds since epoch. */
	createdAt: number
}

/** Hard cap on a single message's serialized parts payload. */
export const STEER_PARTS_MAX_BYTES = 256 * 1024

/**
 * ~24k tokens of context at the classic ~4 chars/token heuristic.
 * Applied to the serialized parts of whole turns, newest backwards.
 */
export const STEER_CONTEXT_CHAR_BUDGET = 96_000

/** UTF-8 byte length of the serialized parts array. */
export function partsByteLength(parts: unknown): number {
	return new TextEncoder().encode(JSON.stringify(parts)).length
}

/** True when the serialized parts fit under the 256 KiB cap. */
export function partsWithinCap(parts: unknown): boolean {
	return partsByteLength(parts) <= STEER_PARTS_MAX_BYTES
}

/**
 * Chronological sort: createdAt ascending; within the same turn the user
 * half always precedes the assistant half (they can share a timestamp
 * when the model answers within the clock's resolution).
 */
function compareRows(a: SteerMessageRowLike, b: SteerMessageRowLike): number {
	if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
	if (a.turnId === b.turnId && a.role !== b.role) {
		return a.role === 'user' ? -1 : 1
	}
	return 0
}

/**
 * Convert persisted rows back into AI-SDK UIMessages, oldest first.
 * Rows are stored verbatim, so this is the exact inverse of persistence.
 */
export function steerRowsToUIMessages(
	rows: readonly SteerMessageRowLike[],
): UIMessage[] {
	return [...rows].sort(compareRows).map((row) => ({
		id: row.id,
		role: row.role === 'user' ? ('user' as const) : ('assistant' as const),
		parts: (Array.isArray(row.parts) ? row.parts : []) as UIMessage['parts'],
	}))
}

/**
 * Select the most recent whole turns that fit the character budget.
 *
 * Walks turns newest → oldest accumulating serialized-parts length; a
 * turn that does not fully fit is dropped along with everything older —
 * turns are never split. The newest turn is always kept (it carries the
 * user message the model must answer), even if it alone busts the
 * budget. Returns rows oldest-first, ready for the model.
 */
export function selectRecentTurns(
	rows: readonly SteerMessageRowLike[],
	budgetChars: number = STEER_CONTEXT_CHAR_BUDGET,
): SteerMessageRowLike[] {
	const sorted = [...rows].sort(compareRows)

	// Group into turns in chronological order of first appearance.
	const turnOrder: string[] = []
	const turns = new Map<string, SteerMessageRowLike[]>()
	for (const row of sorted) {
		const existing = turns.get(row.turnId)
		if (existing) {
			existing.push(row)
		} else {
			turns.set(row.turnId, [row])
			turnOrder.push(row.turnId)
		}
	}

	const kept: SteerMessageRowLike[][] = []
	let used = 0
	for (let i = turnOrder.length - 1; i >= 0; i--) {
		const turnId = turnOrder[i]
		const turnRows = turns.get(turnId)
		if (!turnRows) continue
		const cost = turnRows.reduce(
			(sum, row) => sum + JSON.stringify(row.parts).length,
			0,
		)
		if (kept.length > 0 && used + cost > budgetChars) break
		kept.push(turnRows)
		used += cost
	}

	kept.reverse()
	return kept.flat()
}
