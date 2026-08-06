/**
 * 30-minute idle evaluation. The ONLY thing this Lambda ever writes is
 * desiredState=SLEEPING, and only when the row is AWAKE with both activity
 * signals older than 8h — pinned to the exact timestamps it read, so any
 * concurrent activity stamp defeats the decision. The DynamoDB stream then
 * triggers the wake orchestrator to drive the drain.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { getRow, isIdle, requestSleep } from './lib'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE = process.env.POWER_TABLE ?? ''

export async function handler(): Promise<{ action: string }> {
	const now = Date.now()
	const row = await getRow(ddb, TABLE)
	if (!row) return { action: 'no-row' }
	if (row.state !== 'AWAKE') return { action: `noop:${row.state}` }
	if (!isIdle(row, now)) return { action: 'active' }
	const res = await requestSleep(ddb, TABLE, row, now)
	const action = res.applied ? 'sleep-requested' : `lost-race:${res.reason}`
	console.log(
		JSON.stringify({
			action,
			lastWebAt: row.lastWebAt,
			lastRealDeviceOnlineAt: row.lastRealDeviceOnlineAt,
		}),
	)
	return { action }
}
