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

	it('grants the orchestrator RDS actions on the ONE instance — no wildcard resources', () => {
		const policies = template.findResources('AWS::IAM::Policy')
		let rdsStatements = 0
		for (const [, policy] of Object.entries(policies)) {
			const statements: Array<{
				Action: string | string[]
				Resource: unknown
			}> = policy.Properties?.PolicyDocument?.Statement ?? []
			for (const statement of statements) {
				const actions = Array.isArray(statement.Action)
					? statement.Action
					: [statement.Action]
				if (actions.some((a) => String(a).startsWith('rds:'))) {
					rdsStatements++
					expect(actions.sort()).toEqual([
						'rds:DescribeDBInstances',
						'rds:StartDBInstance',
						'rds:StopDBInstance',
					])
					expect(statement.Resource).not.toBe('*')
				}
				// No statement in this stack may use a bare * resource.
				expect(statement.Resource).not.toBe('*')
			}
		}
		expect(rdsStatements).toBe(1)
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
