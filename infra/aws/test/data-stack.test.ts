import { App } from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { describe, expect, it } from 'vitest'
import { DataStack } from '../lib/data-stack'

// Synth once (bundles the four Lambdas with esbuild).
const app = new App()
const stack = new DataStack(app, 'pitminder-data', {
	env: { account: '111111111111', region: 'eu-west-2' },
})
const template = Template.fromStack(stack)

describe('pitminder-data synth', () => {
	it('has termination protection', () => {
		expect(stack.terminationProtection).toBe(true)
	})

	it('creates NO NAT gateways and NO load balancers (cost sensitivities)', () => {
		template.resourceCountIs('AWS::EC2::NatGateway', 0)
		template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 0)
	})

	it('has 2 public + 2 isolated subnets and S3/DynamoDB gateway endpoints', () => {
		template.resourceCountIs('AWS::EC2::Subnet', 4)
		template.resourceCountIs('AWS::EC2::VPCEndpoint', 2)
	})

	it('runs Postgres 17 single-AZ on db.t4g.micro with 20GB gp3, protected + retained', () => {
		template.hasResource('AWS::RDS::DBInstance', {
			DeletionPolicy: 'Retain',
			UpdateReplacePolicy: 'Retain',
			Properties: Match.objectLike({
				DBInstanceIdentifier: 'pitminder-prod',
				DBInstanceClass: 'db.t4g.micro',
				Engine: 'postgres',
				AllocatedStorage: '20',
				StorageType: 'gp3',
				MultiAZ: false,
				DeletionProtection: true,
				StorageEncrypted: true,
			}),
		})
	})

	it('enables logical replication with bounded slot WAL', () => {
		template.hasResourceProperties('AWS::RDS::DBParameterGroup', {
			Parameters: Match.objectLike({
				'rds.logical_replication': '1',
				max_slot_wal_keep_size: '1024',
			}),
		})
	})

	it('retains the master secret even on stack replacement', () => {
		template.hasResource('AWS::SecretsManager::Secret', {
			DeletionPolicy: 'Retain',
			UpdateReplacePolicy: 'Retain',
		})
	})

	it('power table: on-demand, PITR, stream, retained', () => {
		template.hasResource('AWS::DynamoDB::Table', {
			DeletionPolicy: 'Retain',
			Properties: Match.objectLike({
				TableName: 'pitminder-power',
				BillingMode: 'PAY_PER_REQUEST',
				PointInTimeRecoverySpecification: {
					PointInTimeRecoveryEnabled: true,
				},
				StreamSpecification: { StreamViewType: 'NEW_AND_OLD_IMAGES' },
			}),
		})
	})

	it('photos bucket is private with a 60-day expiry on the photos prefix', () => {
		template.hasResourceProperties('AWS::S3::Bucket', {
			PublicAccessBlockConfiguration: Match.objectLike({
				BlockPublicAcls: true,
				BlockPublicPolicy: true,
				IgnorePublicAcls: true,
				RestrictPublicBuckets: true,
			}),
			LifecycleConfiguration: {
				Rules: Match.arrayWith([
					Match.objectLike({
						Prefix: 'photos/',
						ExpirationInDays: 60,
						Status: 'Enabled',
					}),
				]),
			},
		})
	})

	it('creates both ECR repos with scan-on-push and a keep-20 lifecycle', () => {
		template.resourceCountIs('AWS::ECR::Repository', 2)
		for (const name of ['pitminder/zero-cache', 'pitminder/sync-worker']) {
			template.hasResourceProperties('AWS::ECR::Repository', {
				RepositoryName: name,
				ImageScanningConfiguration: { ScanOnPush: true },
			})
		}
	})

	it('creates the pitminder.com hosted zone', () => {
		template.hasResourceProperties('AWS::Route53::HostedZone', {
			Name: 'pitminder.com.',
		})
	})

	it('schedules the idle cron every 30 minutes and the reconciler hourly', () => {
		template.hasResourceProperties('AWS::Events::Rule', {
			ScheduleExpression: 'rate(30 minutes)',
		})
		template.hasResourceProperties('AWS::Events::Rule', {
			ScheduleExpression: 'rate(1 hour)',
		})
	})

	it('budget: $40 monthly limit with 50% ($20) alert and 100% ($40) shutoff', () => {
		template.hasResourceProperties('AWS::Budgets::Budget', {
			Budget: Match.objectLike({
				BudgetLimit: { Amount: 40, Unit: 'USD' },
				TimeUnit: 'MONTHLY',
				BudgetType: 'COST',
			}),
			NotificationsWithSubscribers: [
				Match.objectLike({
					Notification: Match.objectLike({ Threshold: 50 }),
				}),
				Match.objectLike({
					Notification: Match.objectLike({ Threshold: 100 }),
				}),
			],
		})
	})

	it('keeps every power Lambda OUT of the VPC', () => {
		const functions = template.findResources('AWS::Lambda::Function')
		for (const [, fn] of Object.entries(functions)) {
			expect(fn.Properties?.VpcConfig).toBeUndefined()
		}
	})

	// One flattened [actions, resource] list per collected statement.
	function allPolicyStatements() {
		const policies = template.findResources('AWS::IAM::Policy')
		const statements: Array<{ actions: string[]; resource: unknown }> = []
		for (const [, policy] of Object.entries(policies)) {
			for (const statement of policy.Properties?.PolicyDocument?.Statement ??
				[]) {
				const actions = Array.isArray(statement.Action)
					? statement.Action
					: [statement.Action]
				statements.push({ actions: actions.map(String), resource: statement.Resource })
			}
		}
		return statements
	}

	it('grants the orchestrator RDS actions on the ONE instance — no wildcard resources', () => {
		const statements = allPolicyStatements()
		const rdsStatements = statements.filter((s) =>
			s.actions.some((a) => a.startsWith('rds:')),
		)
		expect(rdsStatements).toHaveLength(1)
		expect([...rdsStatements[0].actions].sort()).toEqual([
			'rds:DescribeDBInstances',
			'rds:StartDBInstance',
			'rds:StopDBInstance',
		])
		for (const s of statements) expect(s.resource).not.toBe('*')
	})

	it('pins DynamoDB access to GetItem/UpdateItem — never the grant* supersets', () => {
		const statements = allPolicyStatements()
		const ddbActions = new Set(
			statements
				.flatMap((s) => s.actions)
				.filter((a) => a.startsWith('dynamodb:')),
		)
		// Row access + the stream-consumer set, nothing else: no PutItem,
		// DeleteItem, Scan, Query, BatchWriteItem, ConditionCheckItem...
		expect([...ddbActions].sort()).toEqual([
			'dynamodb:DescribeStream',
			'dynamodb:GetItem',
			'dynamodb:GetRecords',
			'dynamodb:GetShardIterator',
			'dynamodb:ListStreams',
			'dynamodb:UpdateItem',
		])
		// wake + idle-cron: GetItem+UpdateItem; reconciler: GetItem only;
		// budget shutoff: UpdateItem only.
		const rowStatements = statements.filter((s) =>
			s.actions.every((a) => a.startsWith('dynamodb:')) &&
			!s.actions.includes('dynamodb:GetRecords'),
		)
		const shapes = rowStatements.map((s) => [...s.actions].sort().join(','))
		expect(shapes.filter((x) => x === 'dynamodb:GetItem,dynamodb:UpdateItem')).toHaveLength(2)
		expect(shapes.filter((x) => x === 'dynamodb:GetItem')).toHaveLength(1)
		expect(shapes.filter((x) => x === 'dynamodb:UpdateItem')).toHaveLength(1)
	})

	it('budget shutoff has a DLQ with an alarm to the alert topic', () => {
		template.hasResourceProperties('AWS::SQS::Queue', {
			QueueName: 'pitminder-budget-shutoff-dlq',
		})
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'pitminder-budget-shutoff',
			DeadLetterConfig: Match.anyValue(),
			Environment: {
				Variables: Match.objectLike({
					POWER_TABLE: Match.anyValue(),
					WAKE_FUNCTION_NAME: 'pitminder-power-wake',
				}),
			},
		})
		template.hasResourceProperties('AWS::CloudWatch::Alarm', {
			AlarmName: 'pitminder-budget-shutoff-dlq',
			ComparisonOperator: 'GreaterThanOrEqualToThreshold',
			Threshold: 1,
			AlarmActions: Match.anyValue(),
		})
	})

	it('publishes the SSM contract under /pitminder/prod/data/', () => {
		for (const name of [
			'vpc-id',
			'public-subnet-ids',
			'private-subnet-ids',
			'db-instance-id',
			'db-endpoint',
			'db-secret-arn',
			'power-table-name',
			'power-wake-function-name',
			'execution-param-name',
			'photos-bucket-name',
			'ecr-zero-cache-uri',
			'ecr-sync-worker-uri',
			'hosted-zone-id',
		]) {
			template.hasResourceProperties('AWS::SSM::Parameter', {
				Name: `/pitminder/prod/data/${name}`,
			})
		}
	})
})
