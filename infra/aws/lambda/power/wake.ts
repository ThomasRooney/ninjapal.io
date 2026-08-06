/**
 * The wake orchestrator ("wake" in the brief). Sole driver of the power-state
 * machine: triggered by DynamoDB Streams on the power row, by the reconciler,
 * by direct invokes (ops tooling), and by itself when a long RDS transition
 * outlives one Lambda invocation.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { RDSClient } from '@aws-sdk/client-rds'
import { SSMClient } from '@aws-sdk/client-ssm'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { Context } from 'aws-lambda'
import {
	createExecutionControl,
	createRdsControl,
	createStubComputeControl,
} from './aws'
import { type DriveResult, createDdbPowerStore, drive } from './driver'
import { COMPONENTS, claimTransition, getRow, isTransitional } from './lib'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const rds = new RDSClient({})
const ssm = new SSMClient({})
const lambda = new LambdaClient({})

const TABLE = process.env.POWER_TABLE ?? ''
const DB_INSTANCE_ID = process.env.DB_INSTANCE_ID ?? ''
const EXECUTION_PARAM = process.env.EXECUTION_PARAM ?? ''
const SELF_FUNCTION_NAME = process.env.SELF_FUNCTION_NAME ?? ''

/** 6 chained invocations x ~13 min ≈ 78 min ceiling on any one transition. */
const MAX_REINVOKE_DEPTH = 6

interface WakePayload {
	depth?: number
	reason?: string
	allowErrorRecovery?: boolean
	checkDrift?: boolean
}

export async function handler(
	event: unknown,
	context: Context,
): Promise<DriveResult | { state: string; steps: string[] }> {
	const payload = (event ?? {}) as WakePayload
	const depth = typeof payload.depth === 'number' ? payload.depth : 0
	const owner = `wake:${context.awsRequestId}`

	if (depth > MAX_REINVOKE_DEPTH) {
		const row = await getRow(ddb, TABLE)
		if (row && isTransitional(row.state)) {
			await claimTransition(ddb, TABLE, {
				row,
				to: 'ERROR',
				owner,
				now: Date.now(),
				errorMessage: `transition stuck in ${row.state} after ${depth} chained invocations`,
			})
		}
		return { state: 'ERROR', steps: ['reinvoke depth exhausted'] }
	}

	const result = await drive({
		store: createDdbPowerStore(ddb, TABLE),
		rds: createRdsControl(rds, DB_INSTANCE_ID),
		compute: createStubComputeControl(COMPONENTS),
		execution: createExecutionControl(ssm, EXECUTION_PARAM),
		owner,
		allowErrorRecovery: payload.allowErrorRecovery === true,
		checkDrift: payload.checkDrift === true,
		remainingMs: () => context.getRemainingTimeInMillis(),
		reinvoke: async () => {
			await lambda.send(
				new InvokeCommand({
					FunctionName: SELF_FUNCTION_NAME,
					InvocationType: 'Event',
					Payload: JSON.stringify({
						...payload,
						depth: depth + 1,
						reason: 'reinvoke',
					} satisfies WakePayload),
				}),
			)
		},
		log: (message) =>
			console.log(JSON.stringify({ at: Date.now(), owner, message })),
	})
	console.log(JSON.stringify({ result }))
	return result
}
