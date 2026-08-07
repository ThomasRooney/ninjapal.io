/**
 * pitminder-compute: the disposable half — SSR Lambda behind a streaming
 * Regional REST API + CloudFront, zero-cache + sync-worker Fargate services
 * (desiredCount 0, driven by the orchestrator), the NAT instance, and the
 * in-VPC db-probe. Consumes pitminder-data EXCLUSIVELY via the
 * /pitminder/prod/data/* SSM contract (deploy-time CFN parameters — no VPC
 * lookups, no CFN exports) and publishes its own contract under
 * /pitminder/prod/compute/* for the wake orchestrator's ComputeControl.
 *
 * Deliberately absent (cost sensitivities, ARCHITECTURE.md): NAT gateways,
 * ALBs, VPC interface endpoints.
 *
 * Secrets: one Secrets Manager secret (/pitminder/prod/app/env, JSON) is
 * created OUT OF BAND (see README) from the app's .env. Lambda env receives
 * values via CloudFormation dynamic references (resolved at deploy — no
 * runtime Secrets Manager calls, which matters because the private subnets
 * have no egress while the NAT is stopped); ECS receives them as native
 * task-definition secrets (tasks run in public subnets and can reach the
 * endpoint at start).
 *
 * Post-cutover (context -c postCutover=true), flipped only after the
 * owner-approved nameserver switch: custom domains + ACM certs on
 * CloudFront, the sync.pitminder.com distribution over the
 * zero-origin.pitminder.com origin, Route53 aliases, and dns-enabled=true
 * so ComputeControl starts publishing the zero-origin record.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cdk from 'aws-cdk-lib'
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets53 from 'aws-cdk-lib/aws-route53-targets'
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import type { Construct } from 'constructs'

/** fck-nat AL2023 arm64 for eu-west-2 (owner 568608671756). Refresh with:
 * aws ec2 describe-images --owners 568608671756 \
 *   --filters 'Name=name,Values=fck-nat-al2023-*-arm64-ebs' \
 *   --query 'sort_by(Images,&CreationDate)[-1].[ImageId,Name]'
 * Override per-deploy with -c natAmiId=ami-... */
export const DEFAULT_NAT_AMI_EU_WEST_2 = 'ami-08d3e614ddf784643'

/** JSON secret created out of band from the app .env (see README). */
export const APP_ENV_SECRET_NAME = '/pitminder/prod/app/env'

export const CLUSTER_NAME = 'pitminder'
export const ZERO_CACHE_SERVICE = 'pitminder-zero-cache'
export const SYNC_WORKER_SERVICE = 'pitminder-sync-worker'
export const DB_PROBE_FUNCTION = 'pitminder-db-probe'
export const ZERO_ORIGIN_HOST = 'zero-origin.pitminder.com'
/** Pinned NEXT TO the zero image tag: a zero upgrade updates both together.
 * PROTOCOL_VERSION=16 in @rocicorp/zero 0.20.2025052100. */
export const ZERO_PROBE_PATH = '/sync/v16/connect'
/** TEST-NET-1 placeholder defeating NXDOMAIN negative caching. */
export const ZERO_ORIGIN_PLACEHOLDER_IP = '192.0.2.1'

export interface ComputeStackProps extends cdk.StackProps {
	/** ECR image tag for both services (sha-<git sha>). */
	imageTag: string
	/** Canonical public origin baked into the app env (PUBLIC_ORIGIN,
	 * BETTER_AUTH_URL, MCP resource). First deploy uses the placeholder,
	 * second pass pins the CloudFront domain (see README two-pass note). */
	publicOrigin: string
	/** Nameserver cutover happened: custom domains, certs, zero-origin DNS. */
	postCutover: boolean
	natAmiId: string
	/**
	 * REHEARSAL ONLY (pre-cutover): hostname CloudFront can resolve to the
	 * CURRENT zero-cache task public IP (e.g. `18-168-220-173.sslip.io` —
	 * the zone isn't delegated yet, so zero-origin.pitminder.com does not
	 * resolve publicly). Adds a `/sync/*` behavior on the app distribution
	 * so the client can speak wss:// to the same domain (browsers hard-block
	 * insecure websockets from https pages — no flag bypasses it). Task IP
	 * changes on every wake: re-set + redeploy, or leave unset outside
	 * rehearsals. Post-cutover the sync.pitminder.com distribution replaces
	 * this entirely.
	 */
	rehearsalZeroOrigin?: string
}

export class ComputeStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: ComputeStackProps) {
		super(scope, id, props)

		const data = (name: string) =>
			ssm.StringParameter.valueForStringParameter(
				this,
				`/pitminder/prod/data/${name}`,
			)

		// --- network (from the data contract; no lookups) -------------------
		const azs = ['eu-west-2a', 'eu-west-2b']
		const pick = (param: string, i: number) =>
			cdk.Fn.select(i, cdk.Fn.split(',', param))
		const publicSubnetIds = [0, 1].map((i) =>
			pick(data('public-subnet-ids'), i),
		)
		const privateSubnetIds = [0, 1].map((i) =>
			pick(data('private-subnet-ids'), i),
		)
		const privateRouteTableIds = [0, 1].map((i) =>
			pick(data('private-route-table-ids'), i),
		)
		const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
			vpcId: data('vpc-id'),
			vpcCidrBlock: data('vpc-cidr'),
			availabilityZones: azs,
			publicSubnetIds,
			isolatedSubnetIds: privateSubnetIds,
			isolatedSubnetRouteTableIds: privateRouteTableIds,
		})

		const ssrSg = new ec2.SecurityGroup(this, 'SsrSg', {
			vpc,
			description: 'pitminder SSR Lambda (no ingress)',
			allowAllOutbound: true,
		})
		const probeSg = new ec2.SecurityGroup(this, 'ProbeSg', {
			vpc,
			description: 'pitminder db-probe Lambda (no ingress)',
			allowAllOutbound: true,
		})
		// RESIDUAL RISK (accepted in ARCHITECTURE.md): zero-cache cannot check
		// an origin-secret header itself, so 4848 stays IP-open; CloudFront
		// fronts it post-cutover and the task exists only while AWAKE. The
		// only credential it will honour is a valid ZERO_AUTH_SECRET JWT.
		const zeroSg = new ec2.SecurityGroup(this, 'ZeroSg', {
			vpc,
			description: 'pitminder zero-cache public sync endpoint',
			allowAllOutbound: true,
		})
		zeroSg.addIngressRule(
			ec2.Peer.anyIpv4(),
			ec2.Port.tcp(4848),
			'zero-cache sync (origin secret not enforceable in-process)',
		)
		zeroSg.addIngressRule(
			ec2.Peer.anyIpv6(),
			ec2.Port.tcp(4848),
			'zero-cache sync v6',
		)
		const workerSg = new ec2.SecurityGroup(this, 'WorkerSg', {
			vpc,
			description: 'pitminder sync-worker (egress only)',
			allowAllOutbound: true,
		})
		const natSg = new ec2.SecurityGroup(this, 'NatSg', {
			vpc,
			description: 'pitminder NAT instance',
			allowAllOutbound: true,
		})
		natSg.addIngressRule(
			ec2.Peer.ipv4(data('vpc-cidr')),
			ec2.Port.allTraffic(),
			'private subnets route 0.0.0.0/0 through this instance',
		)

		// RDS ingress: the four consumers, plus the NAT instance (SSM
		// port-forward path for schema management — see README).
		const dbSg = ec2.SecurityGroup.fromSecurityGroupId(
			this,
			'DbSg',
			data('db-security-group-id'),
			{ mutable: true },
		)
		for (const [consumer, label] of [
			[zeroSg, 'zero-cache'],
			[workerSg, 'sync-worker'],
			[ssrSg, 'ssr lambda'],
			[probeSg, 'db-probe lambda'],
			[natSg, 'nat instance (ssm port-forward for schema ops)'],
		] as const) {
			dbSg.addIngressRule(consumer, ec2.Port.tcp(5432), label)
		}

		// --- NAT instance (fck-nat t4g.nano; orchestrator starts/stops) -----
		const nat = new ec2.Instance(this, 'Nat', {
			vpc,
			vpcSubnets: { subnets: [vpc.publicSubnets[0] as ec2.ISubnet] },
			instanceType: ec2.InstanceType.of(
				ec2.InstanceClass.T4G,
				ec2.InstanceSize.NANO,
			),
			machineImage: ec2.MachineImage.genericLinux({
				'eu-west-2': props.natAmiId,
			}),
			securityGroup: natSg,
			sourceDestCheck: false,
			requireImdsv2: true,
			instanceName: 'pitminder-nat',
		})
		// SSM Session Manager: the sanctioned path to RDS from a laptop
		// (port-forward through this instance) — no SSH keys, no bastion.
		nat.role.addManagedPolicy(
			iam.ManagedPolicy.fromAwsManagedPolicyName(
				'AmazonSSMManagedInstanceCore',
			),
		)
		privateRouteTableIds.forEach((routeTableId, i) => {
			new ec2.CfnRoute(this, `PrivateDefaultRoute${i}`, {
				routeTableId,
				destinationCidrBlock: '0.0.0.0/0',
				instanceId: nat.instanceId,
			})
		})

		// --- app env secret (out-of-band; consumed two ways) ----------------
		const appSecret = secretsmanager.Secret.fromSecretNameV2(
			this,
			'AppEnv',
			APP_ENV_SECRET_NAME,
		)
		/** CFN dynamic reference — resolved at DEPLOY time into Lambda env. */
		const secretRef = (key: string) =>
			`{{resolve:secretsmanager:${APP_ENV_SECRET_NAME}:SecretString:${key}}}`

		// --- SSR Lambda (spike-proven artifact shape) -----------------------
		const distDir = fileURLToPath(new URL('../dist/ssr', import.meta.url))
		const placeholderDir = fileURLToPath(
			new URL('../assets/ssr-placeholder', import.meta.url),
		)
		const haveRealBuild = existsSync(join(distDir, 'server'))
		if (!haveRealBuild) {
			cdk.Annotations.of(this).addWarning(
				'infra/aws/dist/ssr missing — deploying the 503 placeholder. Run infra/aws/scripts/build-ssr.sh first.',
			)
		}
		const publicOrigin = props.publicOrigin.replace(/\/+$/, '')
		const ssrLogs = new logs.LogGroup(this, 'SsrLogs', {
			logGroupName: '/pitminder/ssr',
			retention: logs.RetentionDays.TWO_WEEKS,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
		})
		const ssr = new lambda.Function(this, 'Ssr', {
			functionName: 'pitminder-ssr',
			runtime: lambda.Runtime.NODEJS_22_X,
			handler: 'server/index.handler',
			code: lambda.Code.fromAsset(haveRealBuild ? distDir : placeholderDir),
			// 2048MB: first-request route-graph eval is CPU-bound — cold start
			// 4.3s vs 7.6s at 1024 (spike FINDINGS.md). Worth it.
			memorySize: 2048,
			timeout: cdk.Duration.seconds(29),
			vpc,
			vpcSubnets: { subnets: vpc.isolatedSubnets },
			securityGroups: [ssrSg],
			logGroup: ssrLogs,
			environment: {
				NODE_ENV: 'production',
				PUBLIC_ORIGIN: publicOrigin,
				BETTER_AUTH_URL: publicOrigin,
				PITMINDER_MCP_RESOURCE: `${publicOrigin}/api/mcp`,
				EMAIL_FROM: 'PitMinder <no-reply@pitminder.com>',
				VAPID_SUBJECT: 'mailto:thomas@resilientsoftware.co.uk',
				POWER_TABLE: data('power-table-name'),
				PHOTOS_BUCKET: data('photos-bucket-name'),
				ZERO_UPSTREAM_DB: secretRef('DATABASE_URL'),
				BETTER_AUTH_SECRET: secretRef('BETTER_AUTH_SECRET'),
				ZERO_AUTH_SECRET: secretRef('ZERO_AUTH_SECRET'),
				RESEND_API_KEY: secretRef('RESEND_API_KEY'),
				GOOGLE_CLIENT_ID: secretRef('GOOGLE_CLIENT_ID'),
				GOOGLE_CLIENT_SECRET: secretRef('GOOGLE_CLIENT_SECRET'),
				ANTHROPIC_API_KEY: secretRef('ANTHROPIC_API_KEY'),
				VAPID_PUBLIC_KEY: secretRef('VAPID_PUBLIC_KEY'),
				VAPID_PRIVATE_KEY: secretRef('VAPID_PRIVATE_KEY'),
				AYLA_APP_SECRET: secretRef('AYLA_APP_SECRET'),
			},
		})
		ssr.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
				resources: [data('power-table-arn')],
			}),
		)
		ssr.addToRolePolicy(
			new iam.PolicyStatement({
				actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
				resources: [`arn:aws:s3:::${data('photos-bucket-name')}/*`],
			}),
		)

		// --- Regional REST API, streaming proxy (spike stack.yaml shape) ----
		const api = new apigateway.RestApi(this, 'Api', {
			restApiName: 'pitminder',
			endpointConfiguration: { types: [apigateway.EndpointType.REGIONAL] },
			deployOptions: { stageName: 'prod' },
			cloudWatchRole: false,
		})
		// The 2021-11-15 path + /response-streaming-invocations makes API GW
		// call InvokeWithResponseStream (spike FINDINGS.md, verified).
		const streamingIntegration = new apigateway.Integration({
			type: apigateway.IntegrationType.AWS_PROXY,
			integrationHttpMethod: 'POST',
			uri: `arn:aws:apigateway:${this.region}:lambda:path/2021-11-15/functions/${ssr.functionArn}/response-streaming-invocations`,
		})
		const rootMethod = api.root.addMethod('ANY', streamingIntegration)
		const proxy = api.root.addProxy({
			defaultIntegration: streamingIntegration,
			anyMethod: true,
		})
		for (const method of [rootMethod, proxy.anyMethod]) {
			const cfn = method?.node.defaultChild as apigateway.CfnMethod | undefined
			cfn?.addPropertyOverride('Integration.ResponseTransferMode', 'STREAM')
		}
		// GOTCHA (spike, verified by bisection): streaming integrations
		// authorize against lambda:InvokeFunction, NOT InvokeWithResponseStream.
		ssr.addPermission('ApiGatewayInvoke', {
			principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
			action: 'lambda:InvokeFunction',
			sourceArn: api.arnForExecuteApi(),
		})

		// --- in-VPC db probe -------------------------------------------------
		const dbProbe = new NodejsFunction(this, 'DbProbe', {
			functionName: DB_PROBE_FUNCTION,
			entry: fileURLToPath(new URL('../lambda/db-probe.ts', import.meta.url)),
			runtime: lambda.Runtime.NODEJS_22_X,
			memorySize: 256,
			timeout: cdk.Duration.seconds(30),
			vpc,
			vpcSubnets: { subnets: vpc.isolatedSubnets },
			securityGroups: [probeSg],
			depsLockFilePath: fileURLToPath(new URL('../bun.lock', import.meta.url)),
			bundling: { minify: true, sourceMap: false, target: 'node22' },
			logGroup: new logs.LogGroup(this, 'DbProbeLogs', {
				logGroupName: '/pitminder/db-probe',
				retention: logs.RetentionDays.ONE_MONTH,
				removalPolicy: cdk.RemovalPolicy.DESTROY,
			}),
			environment: {
				// Dynamic reference: NO runtime AWS calls — the probe must work
				// during SLEEP_MAINTENANCE with the NAT stopped.
				DB_URL: secretRef('DATABASE_URL'),
			},
		})

		// --- Fargate: cluster + two desiredCount-0 services ------------------
		const cluster = new ecs.Cluster(this, 'Cluster', {
			vpc,
			clusterName: CLUSTER_NAME,
		})
		const executionRole = new iam.Role(this, 'TaskExecutionRole', {
			roleName: 'pitminder-task-execution',
			assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
			managedPolicies: [
				iam.ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AmazonECSTaskExecutionRolePolicy',
				),
			],
		})
		appSecret.grantRead(executionRole)

		const serviceLogs = (name: string) =>
			new logs.LogGroup(this, `${name}Logs`, {
				logGroupName: `/pitminder/${name}`,
				retention: logs.RetentionDays.TWO_WEEKS,
				removalPolicy: cdk.RemovalPolicy.DESTROY,
			})

		// zero-cache -------------------------------------------------------
		const zeroTaskRole = new iam.Role(this, 'ZeroTaskRole', {
			roleName: 'pitminder-zero-cache-task',
			assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
		})
		const zeroTask = new ecs.FargateTaskDefinition(this, 'ZeroTask', {
			family: ZERO_CACHE_SERVICE,
			cpu: 512,
			memoryLimitMiB: 1024,
			runtimePlatform: {
				cpuArchitecture: ecs.CpuArchitecture.ARM64,
				operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
			},
			taskRole: zeroTaskRole,
			executionRole,
		})
		zeroTask.addContainer('zero-cache', {
			containerName: 'zero-cache',
			image: ecs.ContainerImage.fromRegistry(
				`${data('ecr-zero-cache-uri')}:${props.imageTag}`,
			),
			essential: true,
			stopTimeout: cdk.Duration.seconds(60),
			portMappings: [{ containerPort: 4848, protocol: ecs.Protocol.TCP }],
			healthCheck: {
				command: [
					'CMD-SHELL',
					'node -e "fetch(\'http://127.0.0.1:4848/keepalive\').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"',
				],
				interval: cdk.Duration.seconds(10),
				timeout: cdk.Duration.seconds(5),
				retries: 3,
				// Replica rebuild from a cold start (ephemeral storage —
				// accepted: it re-syncs from Postgres on every start).
				startPeriod: cdk.Duration.minutes(5),
			},
			environment: {
				NODE_ENV: 'production',
				DO_NOT_TRACK: '1',
				ZERO_PORT: '4848',
				ZERO_APP_ID: 'pitminder',
				ZERO_REPLICA_FILE: '/tmp/zero-replica.db',
				ZERO_PUSH_URL: `${api.url}api/push`,
				ZERO_LOG_FORMAT: 'json',
				ZERO_LOG_LEVEL: 'info',
			},
			secrets: {
				ZERO_UPSTREAM_DB: ecs.Secret.fromSecretsManager(
					appSecret,
					'DATABASE_URL',
				),
				ZERO_CVR_DB: ecs.Secret.fromSecretsManager(appSecret, 'ZERO_CVR_DB'),
				ZERO_CHANGE_DB: ecs.Secret.fromSecretsManager(
					appSecret,
					'ZERO_CHANGE_DB',
				),
				ZERO_AUTH_SECRET: ecs.Secret.fromSecretsManager(
					appSecret,
					'ZERO_AUTH_SECRET',
				),
			},
			logging: ecs.LogDrivers.awsLogs({
				streamPrefix: 'zero-cache',
				logGroup: serviceLogs('zero-cache'),
			}),
		})

		// sync-worker ------------------------------------------------------
		const workerTaskRole = new iam.Role(this, 'WorkerTaskRole', {
			roleName: 'pitminder-sync-worker-task',
			assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
		})
		workerTaskRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
				resources: [data('power-table-arn')],
			}),
		)
		workerTaskRole.addToPolicy(
			new iam.PolicyStatement({
				actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
				resources: [`arn:aws:s3:::${data('photos-bucket-name')}/*`],
			}),
		)
		const workerTask = new ecs.FargateTaskDefinition(this, 'WorkerTask', {
			family: SYNC_WORKER_SERVICE,
			cpu: 1024,
			memoryLimitMiB: 2048, // Playwright (SharkNinja OAuth) needs headroom
			runtimePlatform: {
				cpuArchitecture: ecs.CpuArchitecture.ARM64,
				operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
			},
			taskRole: workerTaskRole,
			executionRole,
		})
		workerTask.addContainer('sync-worker', {
			containerName: 'sync-worker',
			image: ecs.ContainerImage.fromRegistry(
				`${data('ecr-sync-worker-uri')}:${props.imageTag}`,
			),
			essential: true,
			// SIGTERM draining: the worker finishes in-flight side effects
			// under its leases inside this window (sync-worker drain controller).
			stopTimeout: cdk.Duration.seconds(60),
			environment: {
				NODE_ENV: 'production',
				POWER_TABLE: data('power-table-name'),
				PHOTOS_BUCKET: data('photos-bucket-name'),
				PITMINDER_ALLOW_REMOTE_DB: 'true',
				EMAIL_FROM: 'PitMinder <no-reply@pitminder.com>',
				VAPID_SUBJECT: 'mailto:thomas@resilientsoftware.co.uk',
				COOK_TZ: 'Europe/London',
			},
			secrets: {
				ZERO_UPSTREAM_DB: ecs.Secret.fromSecretsManager(
					appSecret,
					'DATABASE_URL',
				),
				ANTHROPIC_API_KEY: ecs.Secret.fromSecretsManager(
					appSecret,
					'ANTHROPIC_API_KEY',
				),
				VAPID_PUBLIC_KEY: ecs.Secret.fromSecretsManager(
					appSecret,
					'VAPID_PUBLIC_KEY',
				),
				VAPID_PRIVATE_KEY: ecs.Secret.fromSecretsManager(
					appSecret,
					'VAPID_PRIVATE_KEY',
				),
				AYLA_APP_SECRET: ecs.Secret.fromSecretsManager(
					appSecret,
					'AYLA_APP_SECRET',
				),
				// Bun mirrors process.env into import.meta.env — the ninjaAuth
				// flow reads these at runtime exactly as it did on Railway.
				VITE_OAUTH_CLIENT_ID: ecs.Secret.fromSecretsManager(
					appSecret,
					'VITE_OAUTH_CLIENT_ID',
				),
				VITE_OAUTH_REDIRECT_URI: ecs.Secret.fromSecretsManager(
					appSecret,
					'VITE_OAUTH_REDIRECT_URI',
				),
				VITE_OAUTH_SCOPE: ecs.Secret.fromSecretsManager(
					appSecret,
					'VITE_OAUTH_SCOPE',
				),
				VITE_OAUTH_AUTH_BASE_URL: ecs.Secret.fromSecretsManager(
					appSecret,
					'VITE_OAUTH_AUTH_BASE_URL',
				),
				VITE_AYLA_BASE_URL: ecs.Secret.fromSecretsManager(
					appSecret,
					'VITE_AYLA_BASE_URL',
				),
				VITE_AYLA_APP_ID: ecs.Secret.fromSecretsManager(
					appSecret,
					'VITE_AYLA_APP_ID',
				),
				VITE_AYLA_TOKEN_SIGN_IN_ENDPOINT: ecs.Secret.fromSecretsManager(
					appSecret,
					'VITE_AYLA_TOKEN_SIGN_IN_ENDPOINT',
				),
			},
			logging: ecs.LogDrivers.awsLogs({
				streamPrefix: 'sync-worker',
				logGroup: serviceLogs('sync-worker'),
			}),
		})

		// CfnService (not the L2): desiredCount is owned by the ORCHESTRATOR
		// at runtime; the L2 would fight it on every deploy. min 0 / max 100
		// means stop-then-start — two zero-caches would fight over the
		// replication slot, two workers would double side effects.
		const service = (
			name: string,
			taskDef: ecs.FargateTaskDefinition,
			securityGroup: ec2.SecurityGroup,
		) => {
			const svc = new ecs.CfnService(this, `Svc-${name}`, {
				cluster: cluster.clusterArn,
				serviceName: name,
				desiredCount: 0,
				launchType: 'FARGATE',
				taskDefinition: taskDef.taskDefinitionArn,
				deploymentConfiguration: {
					minimumHealthyPercent: 0,
					maximumPercent: 100,
				},
				networkConfiguration: {
					awsvpcConfiguration: {
						assignPublicIp: 'ENABLED',
						subnets: publicSubnetIds,
						securityGroups: [securityGroup.securityGroupId],
					},
				},
			})
			svc.node.addDependency(taskDef)
			return svc
		}
		service(ZERO_CACHE_SERVICE, zeroTask, zeroSg)
		service(SYNC_WORKER_SERVICE, workerTask, workerSg)

		// --- CloudFront ------------------------------------------------------
		const apiOrigin = new origins.HttpOrigin(
			`${api.restApiId}.execute-api.${this.region}.${this.urlSuffix}`,
			{
				originPath: '/prod',
				protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
			},
		)
		const assetsCache = new cloudfront.CachePolicy(this, 'AssetsCache', {
			cachePolicyName: 'pitminder-assets',
			comment: 'hashed /assets from the SSR Lambda — modest TTLs',
			defaultTtl: cdk.Duration.hours(1),
			maxTtl: cdk.Duration.days(1),
			minTtl: cdk.Duration.seconds(0),
			enableAcceptEncodingGzip: true,
			enableAcceptEncodingBrotli: true,
		})
		const certificate = props.postCutover
			? acm.Certificate.fromCertificateArn(
					this,
					'EdgeCert',
					data('acm-cert-arn-us-east-1'),
				)
			: undefined
		const distribution = new cloudfront.Distribution(this, 'Cdn', {
			comment: 'pitminder app',
			httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
			priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
			defaultBehavior: {
				origin: apiOrigin,
				viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
				allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
				// Streaming-safe: no caching/buffering surprises on /api/*.
				cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
				originRequestPolicy:
					cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
			},
			additionalBehaviors: {
				'/assets/*': {
					origin: apiOrigin,
					viewerProtocolPolicy:
						cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
					allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
					cachePolicy: assetsCache,
				},
				...(props.rehearsalZeroOrigin
					? {
							'/sync/*': {
								origin: new origins.HttpOrigin(props.rehearsalZeroOrigin, {
									httpPort: 4848,
									protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
								}),
								viewerProtocolPolicy:
									cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
								allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
								cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
								originRequestPolicy:
									cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
							},
						}
					: {}),
			},
			...(props.postCutover && certificate
				? { domainNames: ['app.pitminder.com'], certificate }
				: {}),
		})

		// Permanent zero-origin placeholder (TEST-NET-1, TTL 30): defeats
		// NXDOMAIN negative caching; ComputeControl UPSERTs the live task IP
		// over it post-cutover and restores it before every drain.
		new route53.CfnRecordSet(this, 'ZeroOriginPlaceholder', {
			hostedZoneId: data('hosted-zone-id'),
			name: `${ZERO_ORIGIN_HOST}.`,
			type: 'A',
			ttl: '30',
			resourceRecords: [ZERO_ORIGIN_PLACEHOLDER_IP],
		})

		let syncDistribution: cloudfront.Distribution | undefined
		if (props.postCutover && certificate) {
			// Post-cutover only: TLS + wss for the zero client at
			// sync.pitminder.com, origin = the generation-fenced A record.
			syncDistribution = new cloudfront.Distribution(this, 'SyncCdn', {
				comment: 'pitminder zero-cache sync',
				httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
				priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
				defaultBehavior: {
					origin: new origins.HttpOrigin(ZERO_ORIGIN_HOST, {
						httpPort: 4848,
						protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
					}),
					viewerProtocolPolicy:
						cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
					allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
					cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
					originRequestPolicy:
						cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
				},
				domainNames: ['sync.pitminder.com'],
				certificate,
			})
			const zone = route53.PublicHostedZone.fromHostedZoneAttributes(
				this,
				'Zone',
				{ hostedZoneId: data('hosted-zone-id'), zoneName: 'pitminder.com' },
			)
			new route53.ARecord(this, 'AppAlias', {
				zone,
				recordName: 'app.pitminder.com',
				target: route53.RecordTarget.fromAlias(
					new targets53.CloudFrontTarget(distribution),
				),
			})
			new route53.AaaaRecord(this, 'AppAliasV6', {
				zone,
				recordName: 'app.pitminder.com',
				target: route53.RecordTarget.fromAlias(
					new targets53.CloudFrontTarget(distribution),
				),
			})
			new route53.ARecord(this, 'SyncAlias', {
				zone,
				recordName: 'sync.pitminder.com',
				target: route53.RecordTarget.fromAlias(
					new targets53.CloudFrontTarget(syncDistribution),
				),
			})
		}

		// --- grants for the wake orchestrator's ComputeControl --------------
		const wakeRole = iam.Role.fromRoleName(
			this,
			'WakeRole',
			data('power-wake-role-name'),
		)
		new iam.Policy(this, 'WakeComputePolicy', {
			policyName: 'pitminder-wake-compute',
			roles: [wakeRole],
			statements: [
				new iam.PolicyStatement({
					actions: ['ecs:UpdateService', 'ecs:DescribeServices'],
					resources: [
						`arn:aws:ecs:${this.region}:${this.account}:service/${CLUSTER_NAME}/${ZERO_CACHE_SERVICE}`,
						`arn:aws:ecs:${this.region}:${this.account}:service/${CLUSTER_NAME}/${SYNC_WORKER_SERVICE}`,
					],
				}),
				new iam.PolicyStatement({
					// Verified live: ListTasks authorizes against
					// container-instance/<cluster>/*, DescribeTasks against
					// task/<cluster>/* — grant all three shapes.
					actions: ['ecs:ListTasks', 'ecs:DescribeTasks'],
					resources: [
						cluster.clusterArn,
						`arn:aws:ecs:${this.region}:${this.account}:task/${CLUSTER_NAME}/*`,
						`arn:aws:ecs:${this.region}:${this.account}:container-instance/${CLUSTER_NAME}/*`,
					],
				}),
				new iam.PolicyStatement({
					actions: ['ec2:StartInstances', 'ec2:StopInstances'],
					resources: [
						`arn:aws:ec2:${this.region}:${this.account}:instance/${nat.instanceId}`,
					],
				}),
				new iam.PolicyStatement({
					// Describe* has no resource-level scoping (read-only).
					actions: ['ec2:DescribeNetworkInterfaces', 'ec2:DescribeInstances'],
					resources: ['*'],
				}),
				new iam.PolicyStatement({
					// GetParametersByPath evaluates against the path WITH its
					// trailing slash (parameter/pitminder/prod/compute/) — the
					// /* form covers it ('*' matches empty); keep the slashless
					// form too for the bare-path variant. Verified live: the
					// slashless-only grant AccessDenied'd the wake Lambda.
					// Read-only: the generation marker (the one PutParameter
					// consumer) was dropped with the worker's per-cycle proof.
					actions: ['ssm:GetParameter', 'ssm:GetParametersByPath'],
					resources: [
						`arn:aws:ssm:${this.region}:${this.account}:parameter/pitminder/prod/compute`,
						`arn:aws:ssm:${this.region}:${this.account}:parameter/pitminder/prod/compute/*`,
					],
				}),
				new iam.PolicyStatement({
					actions: ['lambda:InvokeFunction'],
					resources: [dbProbe.functionArn],
				}),
				new iam.PolicyStatement({
					actions: ['route53:ChangeResourceRecordSets'],
					resources: [`arn:aws:route53:::hostedzone/${data('hosted-zone-id')}`],
				}),
			],
		})

		// --- the compute SSM contract ----------------------------------------
		const params: Record<string, string> = {
			'cluster-arn': cluster.clusterArn,
			'zero-cache-service': ZERO_CACHE_SERVICE,
			'sync-worker-service': SYNC_WORKER_SERVICE,
			'nat-instance-id': nat.instanceId,
			'zero-probe-path': ZERO_PROBE_PATH,
			'db-probe-function': DB_PROBE_FUNCTION,
			'dns-enabled': props.postCutover ? 'true' : 'false',
			'hosted-zone-id': data('hosted-zone-id'),
			'zero-origin-host': ZERO_ORIGIN_HOST,
			'api-url': api.url,
			'cloudfront-domain': distribution.distributionDomainName,
			'public-origin': publicOrigin,
			'image-tag': props.imageTag,
		}
		for (const [name, value] of Object.entries(params)) {
			new ssm.StringParameter(this, `Param-${name}`, {
				parameterName: `/pitminder/prod/compute/${name}`,
				stringValue: value,
			})
		}

		new cdk.CfnOutput(this, 'ApiUrl', { value: api.url })
		new cdk.CfnOutput(this, 'CloudFrontDomain', {
			value: distribution.distributionDomainName,
		})
		new cdk.CfnOutput(this, 'NatInstanceId', { value: nat.instanceId })
		new cdk.CfnOutput(this, 'SsrArtifact', {
			value: haveRealBuild ? 'dist/ssr' : 'PLACEHOLDER',
		})
	}
}
