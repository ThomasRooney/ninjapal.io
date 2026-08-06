/**
 * Hourly reconciler: detector + delegator. It never mutates state itself —
 * it re-invokes the wake orchestrator (the single driver) with error
 * recovery + drift checking enabled, covering:
 * - drift repair (RDS running while SLEEPING, RDS stopped while AWAKE),
 * - the 7-day maintenance window (stoppedAt + 6d18h),
 * - expired leases on stuck transitional states,
 * - ERROR recovery (hourly retry cadence, never a hot loop).
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { getRow, isTransitional, leaseActive, maintenanceDue } from './lib'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const lambda = new LambdaClient({})
const TABLE = process.env.POWER_TABLE ?? ''
const WAKE_FUNCTION_NAME = process.env.WAKE_FUNCTION_NAME ?? ''

export async function handler(): Promise<{ action: string }> {
	const now = Date.now()
	const row = await getRow(ddb, TABLE)
	if (!row) return { action: 'no-row' }

	const findings: string[] = []
	if (row.state === 'ERROR') findings.push('error-state')
	if (isTransitional(row.state) && !leaseActive(row, now))
		findings.push(`expired-lease:${row.state}`)
	if (maintenanceDue(row, now)) findings.push('maintenance-due')
	const desiredMismatch =
		(row.desiredState === 'AWAKE' && row.state !== 'AWAKE') ||
		(row.desiredState === 'SLEEPING' && row.state !== 'SLEEPING')
	if (desiredMismatch) findings.push('desired-mismatch')

	// Drift (RDS status vs row state) is checked inside the driver itself —
	// SLEEPING and AWAKE both verify RDS reality when driven with checkDrift.
	await lambda.send(
		new InvokeCommand({
			FunctionName: WAKE_FUNCTION_NAME,
			InvocationType: 'Event',
			Payload: JSON.stringify({
				reason: 'reconcile',
				allowErrorRecovery: true,
				checkDrift: true,
				depth: 0,
			}),
		}),
	)
	const action = `delegated:${findings.join(',') || 'routine'}`
	console.log(
		JSON.stringify({
			action,
			state: row.state,
			desiredState: row.desiredState,
		}),
	)
	return { action }
}
