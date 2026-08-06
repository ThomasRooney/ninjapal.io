/**
 * Power-state orchestration: the wake orchestrator (DDB-stream triggered +
 * self-chaining), the 30-minute idle cron, the hourly reconciler, and the
 * two-tier budget guardrail. Lives in pitminder-data for now; the ECS half
 * of the machine stays stubbed until pitminder-compute exists.
 *
 * None of these Lambdas are in the VPC — waking must not depend on NAT (none
 * exists) and must work while everything inside the VPC is asleep.
 */
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cdk from 'aws-cdk-lib'
import * as budgets from 'aws-cdk-lib/aws-budgets'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as cwactions from 'aws-cdk-lib/aws-cloudwatch-actions'
import type * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import {
	NodejsFunction,
	type NodejsFunctionProps,
} from 'aws-cdk-lib/aws-lambda-nodejs'
import * as logs from 'aws-cdk-lib/aws-logs'
import type * as rds from 'aws-cdk-lib/aws-rds'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'

const lambdaDir = fileURLToPath(new URL('../lambda', import.meta.url))

/**
 * The budget kill switch. Seeded OUT OF BAND (see README) so a stack deploy
 * can never silently re-arm a tripped breaker:
 *   aws ssm put-parameter --name /pitminder/prod/execution/enabled \
 *     --value enabled --type String
 * The orchestrator fails closed while it is missing or not 'enabled'.
 */
export const EXECUTION_PARAM_NAME = '/pitminder/prod/execution/enabled'

export const WAKE_FUNCTION_NAME = 'pitminder-power-wake'

export interface PowerProps {
	table: dynamodb.Table
	db: rds.DatabaseInstance
}

export class Power extends Construct {
	readonly wake: NodejsFunction

	constructor(scope: Construct, id: string, props: PowerProps) {
		super(scope, id)
		const stack = cdk.Stack.of(this)
		const executionParamArn = stack.formatArn({
			service: 'ssm',
			resource: `parameter${EXECUTION_PARAM_NAME}`,
		})

		const fn = (
			name: string,
			entry: string,
			overrides: Partial<NodejsFunctionProps> = {},
		) =>
			new NodejsFunction(this, name, {
				entry: join(lambdaDir, entry),
				runtime: lambda.Runtime.NODEJS_22_X,
				memorySize: 256,
				timeout: cdk.Duration.minutes(1),
				depsLockFilePath: fileURLToPath(
					new URL('../bun.lock', import.meta.url),
				),
				logGroup: new logs.LogGroup(this, `${name}Logs`, {
					retention: logs.RetentionDays.ONE_MONTH,
					removalPolicy: cdk.RemovalPolicy.DESTROY,
				}),
				bundling: { minify: true, sourceMap: false, target: 'node22' },
				...overrides,
			})

		// The row is only ever touched with GetItem + conditional UpdateItem
		// (seeding is an ops action under human credentials) — grant exactly
		// that, not the grantReadWriteData superset (Put/Delete/Scan/Query).
		const rowReadWrite = new iam.PolicyStatement({
			actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
			resources: [props.table.tableArn],
		})
		const rowRead = new iam.PolicyStatement({
			actions: ['dynamodb:GetItem'],
			resources: [props.table.tableArn],
		})
		const rowWrite = new iam.PolicyStatement({
			actions: ['dynamodb:UpdateItem'],
			resources: [props.table.tableArn],
		})

		// --- wake orchestrator: the single driver of every transition -------
		this.wake = fn('Wake', 'power/wake.ts', {
			functionName: WAKE_FUNCTION_NAME,
			timeout: cdk.Duration.minutes(13),
			environment: {
				POWER_TABLE: props.table.tableName,
				DB_INSTANCE_ID: props.db.instanceIdentifier,
				EXECUTION_PARAM: EXECUTION_PARAM_NAME,
				SELF_FUNCTION_NAME: WAKE_FUNCTION_NAME,
			},
		})
		this.wake.addToRolePolicy(rowReadWrite)
		this.wake.addToRolePolicy(
			new iam.PolicyStatement({
				actions: [
					'rds:StartDBInstance',
					'rds:StopDBInstance',
					'rds:DescribeDBInstances',
				],
				resources: [props.db.instanceArn],
			}),
		)
		this.wake.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['ssm:GetParameter'],
				resources: [executionParamArn],
			}),
		)
		// Self re-invoke for RDS transitions that outlive one invocation. The
		// literal name (not the token) avoids a circular reference.
		this.wake.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['lambda:InvokeFunction'],
				resources: [
					stack.formatArn({
						service: 'lambda',
						resource: 'function',
						resourceName: WAKE_FUNCTION_NAME,
						arnFormat: cdk.ArnFormat.COLON_RESOURCE_NAME,
					}),
				],
			}),
		)
		// desiredState changes reach the orchestrator through the row's stream.
		// Wired via the L2 mapping + an explicit stream-scoped grant: the
		// DynamoEventSource helper grants dynamodb:ListStreams on '*', which
		// violates the no-wildcard-resources rule.
		new lambda.EventSourceMapping(this, 'PowerStream', {
			target: this.wake,
			eventSourceArn: props.table.tableStreamArn ?? '',
			startingPosition: lambda.StartingPosition.LATEST,
			batchSize: 10,
			retryAttempts: 3,
			filters: [
				lambda.FilterCriteria.filter({
					dynamodb: { Keys: { pk: { S: ['POWER#prod'] } } },
				}),
			],
		})
		this.wake.addToRolePolicy(
			new iam.PolicyStatement({
				actions: [
					'dynamodb:DescribeStream',
					'dynamodb:GetRecords',
					'dynamodb:GetShardIterator',
					'dynamodb:ListStreams',
				],
				resources: [`${props.table.tableArn}/stream/*`],
			}),
		)

		// --- 30-minute idle cron -------------------------------------------
		const idleCron = fn('IdleCron', 'power/idle-cron.ts', {
			functionName: 'pitminder-power-idle-cron',
			environment: { POWER_TABLE: props.table.tableName },
		})
		idleCron.addToRolePolicy(rowReadWrite)
		new events.Rule(this, 'IdleSchedule', {
			ruleName: 'pitminder-power-idle',
			schedule: events.Schedule.rate(cdk.Duration.minutes(30)),
			targets: [new targets.LambdaFunction(idleCron)],
		})

		// --- hourly reconciler ---------------------------------------------
		const reconciler = fn('Reconciler', 'power/reconciler.ts', {
			functionName: 'pitminder-power-reconciler',
			environment: {
				POWER_TABLE: props.table.tableName,
				WAKE_FUNCTION_NAME,
			},
		})
		// The reconciler only detects and delegates: read the row, invoke wake.
		reconciler.addToRolePolicy(rowRead)
		this.wake.grantInvoke(reconciler)
		new events.Rule(this, 'ReconcileSchedule', {
			ruleName: 'pitminder-power-reconcile',
			schedule: events.Schedule.rate(cdk.Duration.hours(1)),
			targets: [new targets.LambdaFunction(reconciler)],
		})

		// --- budget guardrail: $20 alert, $40 hard shutoff ------------------
		const alertTopic = new sns.Topic(this, 'BudgetAlertTopic', {
			topicName: 'pitminder-budget-alert',
		})
		const shutoffTopic = new sns.Topic(this, 'BudgetShutoffTopic', {
			topicName: 'pitminder-budget-shutoff',
		})
		for (const topic of [alertTopic, shutoffTopic]) {
			topic.addToResourcePolicy(
				new iam.PolicyStatement({
					principals: [new iam.ServicePrincipal('budgets.amazonaws.com')],
					actions: ['SNS:Publish'],
					resources: [topic.topicArn],
					conditions: {
						StringEquals: { 'aws:SourceAccount': stack.account },
					},
				}),
			)
		}

		// Shutoff must not fail silently: async invocation failures land in a
		// DLQ, and any message there raises an alarm to the alert topic.
		const shutoffDlq = new sqs.Queue(this, 'BudgetShutoffDlq', {
			queueName: 'pitminder-budget-shutoff-dlq',
			retentionPeriod: cdk.Duration.days(14),
			enforceSSL: true,
		})
		const shutoff = fn('BudgetShutoff', 'budget-shutoff.ts', {
			functionName: 'pitminder-budget-shutoff',
			environment: {
				EXECUTION_PARAM: EXECUTION_PARAM_NAME,
				POWER_TABLE: props.table.tableName,
				WAKE_FUNCTION_NAME,
			},
			deadLetterQueue: shutoffDlq,
			retryAttempts: 2,
		})
		shutoff.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['ssm:PutParameter'],
				resources: [executionParamArn],
			}),
		)
		// The wind-down: force desiredState=SLEEPING + kick the orchestrator.
		shutoff.addToRolePolicy(rowWrite)
		this.wake.grantInvoke(shutoff)
		shutoffTopic.addSubscription(new subscriptions.LambdaSubscription(shutoff))

		new cloudwatch.Alarm(this, 'BudgetShutoffDlqAlarm', {
			alarmName: 'pitminder-budget-shutoff-dlq',
			alarmDescription:
				'The budget shutoff Lambda failed after retries — the kill switch may NOT have been thrown. Investigate immediately.',
			metric: shutoffDlq.metricApproximateNumberOfMessagesVisible({
				period: cdk.Duration.minutes(5),
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator:
				cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
		}).addAlarmAction(new cwactions.SnsAction(alertTopic))

		new budgets.CfnBudget(this, 'Budget', {
			budget: {
				budgetName: 'pitminder-monthly',
				budgetType: 'COST',
				timeUnit: 'MONTHLY',
				budgetLimit: { amount: 40, unit: 'USD' },
			},
			notificationsWithSubscribers: [
				{
					// $20 = 50% of the $40 limit: alert only.
					notification: {
						notificationType: 'ACTUAL',
						comparisonOperator: 'GREATER_THAN',
						threshold: 50,
						thresholdType: 'PERCENTAGE',
					},
					subscribers: [
						{ subscriptionType: 'SNS', address: alertTopic.topicArn },
					],
				},
				{
					// $40 = 100%: hard shutoff via the execution flag.
					notification: {
						notificationType: 'ACTUAL',
						comparisonOperator: 'GREATER_THAN',
						threshold: 100,
						thresholdType: 'PERCENTAGE',
					},
					subscribers: [
						{ subscriptionType: 'SNS', address: shutoffTopic.topicArn },
					],
				},
			],
		})
	}
}
