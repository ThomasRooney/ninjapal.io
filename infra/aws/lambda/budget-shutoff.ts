/**
 * Budget hard-cap shutoff. Subscribed to the $40 budget SNS topic. Three
 * moves, in order:
 *  1. flip the fail-closed execution flag — no further paid mutations;
 *  2. force desiredState=SLEEPING (conditional; no-op when already sleeping);
 *  3. invoke the wake orchestrator so whatever is RUNNING winds down now
 *     (drain -> StopDBInstance -> SLEEPING) — stops are never gated.
 *
 * Honest caveat: AWS Budgets actual-spend data refreshes roughly every
 * 8-12 hours, so this is a delayed guardrail, not an invoice cap. Failures
 * land in the DLQ, which alarms to the alert topic.
 *
 * Re-enabling is a deliberate human act:
 *   aws ssm put-parameter --name /pitminder/prod/execution/enabled \
 *     --value enabled --overwrite
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { SNSEvent } from 'aws-lambda'
import { forceSleep } from './power/lib'

const ssm = new SSMClient({})
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const lambda = new LambdaClient({})

const EXECUTION_PARAM = process.env.EXECUTION_PARAM ?? ''
const POWER_TABLE = process.env.POWER_TABLE ?? ''
const WAKE_FUNCTION_NAME = process.env.WAKE_FUNCTION_NAME ?? ''

export async function handler(event: SNSEvent): Promise<{ action: string }> {
	const messages = event.Records.map((r) => r.Sns.Message)
	console.log(JSON.stringify({ budgetMessages: messages }))

	await ssm.send(
		new PutParameterCommand({
			Name: EXECUTION_PARAM,
			Value: 'disabled',
			Type: 'String',
			Overwrite: true,
		}),
	)

	const sleep = await forceSleep(ddb, POWER_TABLE, Date.now())
	await lambda.send(
		new InvokeCommand({
			FunctionName: WAKE_FUNCTION_NAME,
			InvocationType: 'Event',
			Payload: JSON.stringify({ reason: 'budget-shutoff', depth: 0 }),
		}),
	)

	const action = `execution-disabled;wind-down=${
		sleep.applied ? 'requested' : `noop(${sleep.reason})`
	}`
	console.log(JSON.stringify({ action, param: EXECUTION_PARAM }))
	return { action }
}
