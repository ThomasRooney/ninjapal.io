/**
 * pitminder-data: everything with weight — VPC, RDS, the power table, photos
 * bucket, ECR repos, the Route53 zone. RETAIN policies + stack termination
 * protection; the (future) pitminder-compute stack consumes it exclusively
 * through SSM parameters under /pitminder/prod/ — never CFN exports.
 *
 * Deliberately absent (cost sensitivities, see ARCHITECTURE.md): NAT
 * gateways, ALBs, VPC interface endpoints.
 */
import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as rds from 'aws-cdk-lib/aws-rds'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'
import { EXECUTION_PARAM_NAME, Power, WAKE_FUNCTION_NAME } from './power'

export class DataStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: cdk.StackProps) {
		super(scope, id, { ...props, terminationProtection: true })

		// --- network: 2 AZ, zero NAT, gateway endpoints only ----------------
		const vpc = new ec2.Vpc(this, 'Vpc', {
			vpcName: 'pitminder',
			maxAzs: 2,
			natGateways: 0,
			subnetConfiguration: [
				{ name: 'public', subnetType: ec2.SubnetType.PUBLIC },
				{ name: 'db', subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
			],
		})
		vpc.addGatewayEndpoint('S3Endpoint', {
			service: ec2.GatewayVpcEndpointAwsService.S3,
		})
		vpc.addGatewayEndpoint('DynamoEndpoint', {
			service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
		})

		// --- RDS Postgres 17: the stop/start scale-to-zero core -------------
		const engine = rds.DatabaseInstanceEngine.postgres({
			version: rds.PostgresEngineVersion.VER_17,
		})
		const parameterGroup = new rds.ParameterGroup(this, 'DbParams', {
			engine,
			parameters: {
				// Zero Sync needs logical replication; slots persist across
				// stop/start (the whole reason this is RDS, not Aurora Sv2).
				'rds.logical_replication': '1',
				// Bound WAL retained by an abandoned slot; a sleeping
				// zero-cache resyncs from Postgres rather than pinning WAL.
				max_slot_wal_keep_size: '1024',
			},
		})
		const db = new rds.DatabaseInstance(this, 'Db', {
			engine,
			instanceIdentifier: 'pitminder-prod',
			instanceType: ec2.InstanceType.of(
				ec2.InstanceClass.T4G,
				ec2.InstanceSize.MICRO,
			),
			vpc,
			vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
			allocatedStorage: 20,
			storageType: rds.StorageType.GP3,
			multiAz: false,
			parameterGroup,
			credentials: rds.Credentials.fromGeneratedSecret('pitminder'),
			databaseName: 'pitminder',
			storageEncrypted: true,
			backupRetention: cdk.Duration.days(7),
			deletionProtection: true,
			removalPolicy: cdk.RemovalPolicy.RETAIN,
			autoMinorVersionUpgrade: true,
			allowMajorVersionUpgrade: false,
		})
		// The L2 owns the generated secret and can rewrite policies applied
		// through the ISecret interface (reflow's core stack hit this). Pin
		// the underlying CfnSecret so replacing the stack can never discard
		// the master credentials.
		db.secret?.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)
		const cfnSecret = db.node.tryFindChild('Secret')?.node.defaultChild as
			| cdk.CfnResource
			| undefined
		if (cfnSecret) {
			cfnSecret.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.RETAIN
			cfnSecret.cfnOptions.updateReplacePolicy = cdk.CfnDeletionPolicy.RETAIN
		}

		// --- power-state row + orchestration --------------------------------
		const power = new dynamodb.Table(this, 'PowerTable', {
			tableName: 'pitminder-power',
			partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
			billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
			pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
			stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		})
		const powerOrchestration = new Power(this, 'Power', { table: power, db })

		// --- photos (Vercel Blob replacement) -------------------------------
		const photos = new s3.Bucket(this, 'Photos', {
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			enforceSSL: true,
			encryption: s3.BucketEncryption.S3_MANAGED,
			lifecycleRules: [
				{
					id: 'expire-photos',
					prefix: 'photos/',
					expiration: cdk.Duration.days(60),
				},
				{
					id: 'abort-incomplete-multipart',
					abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
				},
			],
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		})

		// --- ECR ------------------------------------------------------------
		const repo = (name: string) => {
			const r = new ecr.Repository(this, `Repo-${name}`, {
				repositoryName: `pitminder/${name}`,
				imageScanOnPush: true,
				lifecycleRules: [{ maxImageCount: 20 }],
				removalPolicy: cdk.RemovalPolicy.RETAIN,
			})
			return r
		}
		const zeroCacheRepo = repo('zero-cache')
		const syncWorkerRepo = repo('sync-worker')

		// --- DNS: zone only; the registrar cutover is a human decision ------
		const zone = new route53.PublicHostedZone(this, 'Zone', {
			zoneName: 'pitminder.com',
		})
		zone.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN)

		// --- the SSM contract ----------------------------------------------
		// ACM cert ARNs are also published under data/ by
		// scripts/request-certs.ts (imperative: a CFN-managed DNS-validated
		// cert would block the deploy until the nameserver cutover).
		const params: Record<string, string> = {
			'vpc-id': vpc.vpcId,
			'vpc-cidr': vpc.vpcCidrBlock,
			'public-subnet-ids': vpc.publicSubnets.map((s) => s.subnetId).join(','),
			'private-subnet-ids': vpc.isolatedSubnets
				.map((s) => s.subnetId)
				.join(','),
			// The compute stack routes private-subnet egress through its NAT
			// instance; publish the route tables so it never needs a VPC lookup.
			'private-route-table-ids': vpc.isolatedSubnets
				.map((s) => s.routeTable.routeTableId)
				.join(','),
			// The compute stack attaches ECS/EC2/Route53 grants to the wake
			// orchestrator's role (it drives the compute half of the machine).
			'power-wake-role-name': powerOrchestration.wake.role?.roleName ?? '',
			'db-instance-id': db.instanceIdentifier,
			'db-instance-arn': db.instanceArn,
			'db-endpoint': db.dbInstanceEndpointAddress,
			'db-port': db.dbInstanceEndpointPort,
			'db-secret-arn': db.secret?.secretArn ?? '',
			'db-security-group-id':
				db.connections.securityGroups[0]?.securityGroupId ?? '',
			'power-table-name': power.tableName,
			'power-table-arn': power.tableArn,
			'power-wake-function-name': WAKE_FUNCTION_NAME,
			'execution-param-name': EXECUTION_PARAM_NAME,
			'photos-bucket-name': photos.bucketName,
			'ecr-zero-cache-uri': zeroCacheRepo.repositoryUri,
			'ecr-sync-worker-uri': syncWorkerRepo.repositoryUri,
			'hosted-zone-id': zone.hostedZoneId,
			'hosted-zone-name': zone.zoneName,
		}
		for (const [name, value] of Object.entries(params)) {
			new ssm.StringParameter(this, `Param-${name}`, {
				parameterName: `/pitminder/prod/data/${name}`,
				stringValue: value,
			})
		}

		new cdk.CfnOutput(this, 'NameServers', {
			value: cdk.Fn.join(',', zone.hostedZoneNameServers ?? []),
			description:
				'Set these at the registrar ONLY with explicit owner approval',
		})
		new cdk.CfnOutput(this, 'DbInstanceId', { value: db.instanceIdentifier })
		new cdk.CfnOutput(this, 'PowerTableName', { value: power.tableName })
	}
}
