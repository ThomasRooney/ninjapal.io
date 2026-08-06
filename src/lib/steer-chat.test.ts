import { describe, expect, it } from 'vitest'
import {
	STEER_PARTS_MAX_BYTES,
	type SteerMessageRowLike,
	partsByteLength,
	partsWithinCap,
	selectRecentTurns,
	steerRowsToUIMessages,
} from './steer-chat'

let uuidCounter = 0
function fakeId(): string {
	uuidCounter += 1
	return `00000000-0000-0000-0000-${String(uuidCounter).padStart(12, '0')}`
}

function turn(
	at: number,
	userText: string,
	assistantText?: string,
): SteerMessageRowLike[] {
	const turnId = fakeId()
	const rows: SteerMessageRowLike[] = [
		{
			id: fakeId(),
			turnId,
			role: 'user',
			parts: [{ type: 'text', text: userText }],
			createdAt: at,
		},
	]
	if (assistantText !== undefined) {
		rows.push({
			id: fakeId(),
			turnId,
			role: 'assistant',
			parts: [{ type: 'text', text: assistantText }],
			createdAt: at + 1_000,
		})
	}
	return rows
}

describe('steerRowsToUIMessages', () => {
	it('round-trips rows to UIMessages preserving id, role and parts verbatim', () => {
		const parts = [
			{ type: 'text', text: 'wrap it' },
			{
				type: 'tool-get_telemetry',
				toolCallId: 'call_1',
				state: 'output-available',
				input: {},
				output: '{"pitC":121}',
			},
		]
		const rows: SteerMessageRowLike[] = [
			{
				id: 'row-1',
				turnId: 'turn-1',
				role: 'assistant',
				parts,
				createdAt: 10,
			},
		]
		const messages = steerRowsToUIMessages(rows)
		expect(messages).toHaveLength(1)
		expect(messages[0].id).toBe('row-1')
		expect(messages[0].role).toBe('assistant')
		expect(messages[0].parts).toEqual(parts)
	})

	it('orders oldest-first with the user half before the assistant half', () => {
		const [u1, a1] = turn(1_000, 'first?', 'first!')
		const [u2, a2] = turn(2_000, 'second?', 'second!')
		// Shuffle: assistant halves first, turns reversed
		const messages = steerRowsToUIMessages([a2, a1, u2, u1])
		expect(messages.map((m) => m.id)).toEqual([u1.id, a1.id, u2.id, a2.id])
		expect(messages.map((m) => m.role)).toEqual([
			'user',
			'assistant',
			'user',
			'assistant',
		])
	})

	it('puts the user half first even when both halves share a timestamp', () => {
		const turnId = fakeId()
		const user: SteerMessageRowLike = {
			id: 'u',
			turnId,
			role: 'user',
			parts: [{ type: 'text', text: 'q' }],
			createdAt: 5_000,
		}
		const assistant: SteerMessageRowLike = {
			id: 'a',
			turnId,
			role: 'assistant',
			parts: [{ type: 'text', text: 'r' }],
			createdAt: 5_000,
		}
		expect(steerRowsToUIMessages([assistant, user]).map((m) => m.id)).toEqual([
			'u',
			'a',
		])
	})

	it('normalizes non-array parts to an empty array instead of crashing', () => {
		const messages = steerRowsToUIMessages([
			{
				id: 'bad',
				turnId: 't',
				role: 'user',
				parts: null,
				createdAt: 1,
			},
		])
		expect(messages[0].parts).toEqual([])
	})
})

describe('selectRecentTurns', () => {
	it('keeps everything when the budget is large enough', () => {
		const rows = [...turn(1_000, 'one', 'one!'), ...turn(2_000, 'two', 'two!')]
		const kept = selectRecentTurns(rows, 10_000)
		expect(kept).toHaveLength(4)
		expect(kept.map((r) => r.id)).toEqual(rows.map((r) => r.id))
	})

	it('drops the oldest turns first when over budget', () => {
		const t1 = turn(1_000, 'x'.repeat(100), 'y'.repeat(100))
		const t2 = turn(2_000, 'x'.repeat(100), 'y'.repeat(100))
		const t3 = turn(3_000, 'short', 'reply')
		// t3 ≈ 90 chars, t2 ≈ 260 chars — budget fits t3 + t2 but not t1
		const kept = selectRecentTurns([...t1, ...t2, ...t3], 400)
		expect(kept.map((r) => r.id)).toEqual([...t2, ...t3].map((r) => r.id))
	})

	it('never splits a turn: a partially-fitting turn is dropped whole', () => {
		const big = turn(1_000, 'x'.repeat(300), 'y'.repeat(300))
		const small = turn(2_000, 'hi', 'yo')
		// Budget fits `small` plus ONE half of `big` — big must go entirely
		const kept = selectRecentTurns([...big, ...small], 450)
		expect(kept.map((r) => r.id)).toEqual(small.map((r) => r.id))
	})

	it('always keeps the newest turn even when it alone busts the budget', () => {
		const huge = turn(1_000, 'x'.repeat(5_000))
		const kept = selectRecentTurns(huge, 10)
		expect(kept.map((r) => r.id)).toEqual(huge.map((r) => r.id))
	})

	it('returns rows oldest-first regardless of input order', () => {
		const t1 = turn(1_000, 'a', 'b')
		const t2 = turn(2_000, 'c', 'd')
		const kept = selectRecentTurns([...t2, ...t1].reverse(), 10_000)
		expect(kept.map((r) => r.createdAt)).toEqual([1_000, 2_000, 2_000, 3_000])
	})
})

describe('parts size cap', () => {
	it('accepts parts under 256 KiB', () => {
		const parts = [{ type: 'text', text: 'x'.repeat(1_000) }]
		expect(partsWithinCap(parts)).toBe(true)
	})

	it('rejects parts serializing over 256 KiB', () => {
		const parts = [{ type: 'text', text: 'x'.repeat(STEER_PARTS_MAX_BYTES) }]
		expect(partsWithinCap(parts)).toBe(false)
	})

	it('measures UTF-8 bytes, not JS string length', () => {
		// '🔥' is 1 JSON char pair but 4 UTF-8 bytes
		const ascii = partsByteLength([{ type: 'text', text: 'aa' }])
		const emoji = partsByteLength([{ type: 'text', text: '🔥' }])
		expect(emoji).toBeGreaterThan(ascii)
	})
})
