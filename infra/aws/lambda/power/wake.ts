/**
 * The wake orchestrator ("wake" in the brief). Sole driver of the power-state
 * machine: triggered by DynamoDB Streams on the power row, by the reconciler,
 * by the budget shutoff, by direct invokes (ops tooling), and by itself when
 * a long RDS transition outlives one Lambda invocation.
 */
import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { EC2Client } from '@aws-sdk/client-ec2'
import { ECSClient } from '@aws-sdk/client-ecs'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { RDSClient } from '@aws-sdk/client-rds'
import { Route53Client } from '@aws-sdk/client-route-53'
import { SSMClient } from '@aws-sdk/client-ssm'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { Context } from 'aws-lambda'
import {
	createExecutionControl,
	createRdsControl,
	createStubComputeControl,
} from './aws'
import { createComputeControl, loadComputeConfig } from './compute-control'
import {
	type ComputeControl,
	type DriveResult,
	createDdbPowerStore,
	drive,
} from './driver'
import { COMPONENTS, claimTransition, getRow, isTransitional } from './lib'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const rds = new RDSClient({})
const ssm = new SSMClient({})
const lambda = new LambdaClient({})
const ecs = new ECSClient({})
const ec2 = new EC2Client({})
const route53 = new Route53Client({})

/**
 * The real ECS/NAT compute control when the compute stack's SSM contract
 * exists, the stub otherwise. Resolved fresh per invocation: a config error
 * must fail the invocation loudly (retry) — NEVER silently fall back to the
 * stub, which fakes readiness over real services.
 */
async function resolveComputeControl(): Promise<ComputeControl> {
	const config = await loadComputeConfig(ssm)
	if (!config) return createStubComputeControl(COMPONENTS)
	return createComputeControl(config, {
		ecs,
		ec2,
		ssm,
		route53,
		lambda,
		readRow: () => getRow(ddb, TABLE),
		log: (message) => console.log(JSON.stringify({ compute: message })),
	})
}

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
	/** Successor owner identity handed over by the previous invocation. */
	owner?: string
}

interface StreamRecordShape {
	eventName?: string
	dynamodb?: {
		OldImage?: Record<string, { S?: string }>
		NewImage?: Record<string, { S?: string }>
	}
}

/**
 * Stream no-op filter: the machine only needs driving when the row appears
 * (INSERT) or `desiredState` changes. Every other MODIFY on the streamed row
 * — activity stamps, lease heartbeats, the driver's own state claims (its
 * in-process loop continues past them) — would otherwise re-invoke this
 * handler just to stand down on the live lease. Direct invokes (no Records)
 * always drive.
 */
export function shouldDrive(event: unknown): boolean {
	const records = (event as { Records?: unknown[] } | null)?.Records
	if (!Array.isArray(records)) return true
	return records.some((record) => {
		const r = record as StreamRecordShape
		if (r.eventName === 'INSERT') return true
		if (r.eventName !== 'MODIFY') return false
		return (
			r.dynamodb?.OldImage?.desiredState?.S !==
			r.dynamodb?.NewImage?.desiredState?.S
		)
	})
}

export async function handler(
	event: unknown,
	context: Context,
): Promise<DriveResult | { state: string; steps: string[] }> {
	const payload = (event ?? {}) as WakePayload
	const depth = typeof payload.depth === 'number' ? payload.depth : 0
	const owner = payload.owner ?? `wake:${context.awsRequestId}`

	if (!shouldDrive(event)) {
		return {
			state: 'skipped',
			steps: ['stream event without desiredState change'],
		}
	}

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

	const successorOwner = `wake:${randomUUID()}`
	const result = await drive({
		store: createDdbPowerStore(ddb, TABLE),
		rds: createRdsControl(rds, DB_INSTANCE_ID),
		compute: await resolveComputeControl(),
		execution: createExecutionControl(ssm, EXECUTION_PARAM),
		owner,
		allowErrorRecovery: payload.allowErrorRecovery === true,
		checkDrift: payload.checkDrift === true,
		remainingMs: () => context.getRemainingTimeInMillis(),
		successorOwner,
		reinvoke: async () => {
			await lambda.send(
				new InvokeCommand({
					FunctionName: SELF_FUNCTION_NAME,
					InvocationType: 'Event',
					// Control fields only — a stream-event payload would otherwise
					// re-send the entire Records batch through the chain. The
					// successor inherits the lease transferred to successorOwner.
					Payload: JSON.stringify({
						depth: depth + 1,
						reason: 'reinvoke',
						allowErrorRecovery: payload.allowErrorRecovery === true,
						checkDrift: payload.checkDrift === true,
						owner: successorOwner,
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
