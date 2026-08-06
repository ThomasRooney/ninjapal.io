/**
 * Budget hard-cap shutoff. Subscribed to the $40 budget SNS topic; flips the
 * fail-closed execution flag so the orchestrator refuses every further paid
 * mutation (RDS start, ECS scale-up). Re-enabling is a deliberate human act:
 *   aws ssm put-parameter --name /pitminder/prod/execution/enabled \
 *     --value enabled --overwrite
 */
import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm'
import type { SNSEvent } from 'aws-lambda'

const ssm = new SSMClient({})
const EXECUTION_PARAM = process.env.EXECUTION_PARAM ?? ''

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
	console.log(
		JSON.stringify({ action: 'execution-disabled', param: EXECUTION_PARAM }),
	)
	return { action: 'execution-disabled' }
}
