import { App } from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { describe, expect, it } from 'vitest'
import {
	ComputeStack,
	DEFAULT_NAT_AMI_EU_WEST_2,
	ZERO_ORIGIN_PLACEHOLDER_IP,
	ZERO_PROBE_PATH,
} from '../lib/compute-stack'

// Hermetic synth: everything cross-stack is a deploy-time SSM parameter —
// no VPC/AMI context lookups (the whole point of the data contract).
function synth(postCutover = false) {
	const app = new App()
	const stack = new ComputeStack(app, 'pitminder-compute', {
		env: { account: '111111111111', region: 'eu-west-2' },
		imageTag: 'sha-test',
		publicOrigin: 'https://pending.invalid',
		postCutover,
		natAmiId: DEFAULT_NAT_AMI_EU_WEST_2,
		appSecretVersion: 'v1',
	})
	return { stack, template: Template.fromStack(stack) }
}

const { template } = synth()

describe('pitminder-compute synth (rehearsal mode)', () => {
	it('creates NO NAT gateways and NO load balancers (cost sensitivities)', () => {
		template.resourceCountIs('AWS::EC2::NatGateway', 0)
		template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 0)
	})

	it('SSR Lambda: nodejs22, 2048MB, 29s, in-VPC, streaming-entry handler', () => {
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'pitminder-ssr',
			Runtime: 'nodejs22.x',
			Handler: 'server/index.handler',
			MemorySize: 2048,
			Timeout: 29,
			VpcConfig: Match.objectLike({
				SubnetIds: Match.anyValue(),
			}),
		})
	})

	it('stamps the secret-version rotation token into the Lambda AND both task defs (P2)', () => {
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'pitminder-ssr',
			Environment: {
				Variables: Match.objectLike({ APP_SECRET_VERSION: 'v1' }),
			},
		})
		const taskDefs = template.findResources('AWS::ECS::TaskDefinition')
		for (const taskDef of Object.values(taskDefs)) {
			const env = taskDef.Properties?.ContainerDefinitions?.[0]?.Environment
			expect(env).toContainEqual({ Name: 'APP_SECRET_VERSION', Value: 'v1' })
		}
	})

	it('cost guards: reserved concurrency on the SSR Lambda + stage throttling (P1-c)', () => {
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'pitminder-ssr',
			ReservedConcurrentExecutions: 10,
		})
		template.hasResourceProperties('AWS::ApiGateway::Stage', {
			StageName: 'prod',
			MethodSettings: Match.arrayWith([
				Match.objectLike({
					ThrottlingRateLimit: 25,
					ThrottlingBurstLimit: 50,
				}),
			]),
		})
	})

	it('SSR env carries secret dynamic references + power/photos config', () => {
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'pitminder-ssr',
			Environment: {
				Variables: Match.objectLike({
					PUBLIC_ORIGIN: 'https://pending.invalid',
					BETTER_AUTH_URL: 'https://pending.invalid',
					PITMINDER_MCP_RESOURCE: 'https://pending.invalid/api/mcp',
					ZERO_UPSTREAM_DB:
						'{{resolve:secretsmanager:/pitminder/prod/app/env:SecretString:DATABASE_URL}}',
					BETTER_AUTH_SECRET:
						'{{resolve:secretsmanager:/pitminder/prod/app/env:SecretString:BETTER_AUTH_SECRET}}',
				}),
			},
		})
	})

	it('REST API methods use ResponseTransferMode STREAM with the 2021-11-15 streaming URI', () => {
		const methods = template.findResources('AWS::ApiGateway::Method')
		const entries = Object.values(methods)
		expect(entries).toHaveLength(2) // root ANY + {proxy+} ANY
		for (const method of entries) {
			const integration = method.Properties?.Integration
			expect(integration?.ResponseTransferMode).toBe('STREAM')
			expect(integration?.Type).toBe('AWS_PROXY')
			expect(JSON.stringify(integration?.Uri)).toContain(
				'lambda:path/2021-11-15/functions/',
			)
			expect(JSON.stringify(integration?.Uri)).toContain(
				'/response-streaming-invocations',
			)
		}
	})

	it('grants lambda:InvokeFunction (NOT InvokeWithResponseStream) to API Gateway', () => {
		template.hasResourceProperties('AWS::Lambda::Permission', {
			Action: 'lambda:InvokeFunction',
			Principal: 'apigateway.amazonaws.com',
		})
	})

	it('two ARM64 Fargate task definitions with the pinned image tag + stopTimeout 60', () => {
		const taskDefs = template.findResources('AWS::ECS::TaskDefinition')
		const families = Object.values(taskDefs).map((t) => t.Properties?.Family)
		expect(families.sort()).toEqual([
			'pitminder-sync-worker',
			'pitminder-zero-cache',
		])
		for (const taskDef of Object.values(taskDefs)) {
			expect(taskDef.Properties?.RuntimePlatform?.CpuArchitecture).toBe('ARM64')
			const container = taskDef.Properties?.ContainerDefinitions?.[0]
			expect(container?.StopTimeout).toBe(60)
			expect(JSON.stringify(container?.Image)).toContain('sha-test')
		}
	})

	it('zero-cache 512/1024, worker 1024/2048', () => {
		template.hasResourceProperties('AWS::ECS::TaskDefinition', {
			Family: 'pitminder-zero-cache',
			Cpu: '512',
			Memory: '1024',
		})
		template.hasResourceProperties('AWS::ECS::TaskDefinition', {
			Family: 'pitminder-sync-worker',
			Cpu: '1024',
			Memory: '2048',
		})
	})

	it('both services start at desiredCount 0, public IPs, stop-then-start deploys', () => {
		const services = template.findResources('AWS::ECS::Service')
		expect(Object.keys(services)).toHaveLength(2)
		for (const service of Object.values(services)) {
			expect(service.Properties?.DesiredCount).toBe(0)
			expect(service.Properties?.LaunchType).toBe('FARGATE')
			expect(
				service.Properties?.NetworkConfiguration?.AwsvpcConfiguration
					?.AssignPublicIp,
			).toBe('ENABLED')
			expect(
				service.Properties?.DeploymentConfiguration?.MinimumHealthyPercent,
			).toBe(0)
			expect(service.Properties?.DeploymentConfiguration?.MaximumPercent).toBe(
				100,
			)
		}
	})

	it('zero-cache SG is IP-open on 4848 (documented residual risk), worker has no ingress', () => {
		template.hasResourceProperties('AWS::EC2::SecurityGroup', {
			GroupDescription: Match.stringLikeRegexp('zero-cache public sync'),
			SecurityGroupIngress: Match.arrayWith([
				Match.objectLike({ CidrIp: '0.0.0.0/0', FromPort: 4848, ToPort: 4848 }),
			]),
		})
		const groups = template.findResources('AWS::EC2::SecurityGroup')
		const worker = Object.values(groups).find((g) =>
			String(g.Properties?.GroupDescription).includes('sync-worker'),
		)
		expect(worker?.Properties?.SecurityGroupIngress).toBeUndefined()
	})

	it('RDS SG gains 5432 ingress from zero-cache, worker, SSR, probe AND the NAT (schema ops)', () => {
		template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 5)
		const rules = template.findResources('AWS::EC2::SecurityGroupIngress')
		for (const rule of Object.values(rules)) {
			expect(rule.Properties?.FromPort).toBe(5432)
			expect(rule.Properties?.ToPort).toBe(5432)
		}
	})

	it('NAT: t4g.nano fck-nat AMI, source/dest check off, IMDSv2, SSM core policy', () => {
		template.hasResourceProperties('AWS::EC2::Instance', {
			InstanceType: 't4g.nano',
			ImageId: DEFAULT_NAT_AMI_EU_WEST_2,
			SourceDestCheck: false,
		})
		template.hasResourceProperties('AWS::EC2::LaunchTemplate', {
			LaunchTemplateData: Match.objectLike({
				MetadataOptions: Match.objectLike({ HttpTokens: 'required' }),
			}),
		})
	})

	it('routes both private route tables 0.0.0.0/0 through the NAT instance', () => {
		const routes = template.findResources('AWS::EC2::Route')
		const defaults = Object.values(routes).filter(
			(r) => r.Properties?.DestinationCidrBlock === '0.0.0.0/0',
		)
		expect(defaults).toHaveLength(2)
		for (const route of defaults) {
			expect(route.Properties?.InstanceId).toBeDefined()
		}
	})

	it('CloudFront: default cert (no aliases pre-cutover), caching disabled by default, /assets cached', () => {
		const distributions = template.findResources(
			'AWS::CloudFront::Distribution',
		)
		expect(Object.keys(distributions)).toHaveLength(1)
		const config =
			Object.values(distributions)[0]?.Properties?.DistributionConfig
		expect(config?.Aliases).toBeUndefined()
		// CACHING_DISABLED managed policy id
		expect(config?.DefaultCacheBehavior?.CachePolicyId).toBe(
			'4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
		)
		expect(config?.CacheBehaviors?.[0]?.PathPattern).toBe('/assets/*')
	})

	it('publishes the permanent zero-origin placeholder record (TEST-NET-1)', () => {
		template.hasResourceProperties('AWS::Route53::RecordSet', {
			Name: 'zero-origin.pitminder.com.',
			Type: 'A',
			TTL: '30',
			ResourceRecords: [ZERO_ORIGIN_PLACEHOLDER_IP],
		})
	})

	it('publishes the compute SSM contract incl. probe path + dns-enabled=false', () => {
		template.hasResourceProperties('AWS::SSM::Parameter', {
			Name: '/pitminder/prod/compute/zero-probe-path',
			Value: ZERO_PROBE_PATH,
		})
		template.hasResourceProperties('AWS::SSM::Parameter', {
			Name: '/pitminder/prod/compute/dns-enabled',
			Value: 'false',
		})
		template.hasResourceProperties('AWS::SSM::Parameter', {
			Name: '/pitminder/prod/compute/zero-cache-service',
			Value: 'pitminder-zero-cache',
		})
	})

	it('attaches the ComputeControl grants to the wake orchestrator role', () => {
		template.hasResourceProperties('AWS::IAM::Policy', {
			PolicyName: 'pitminder-wake-compute',
			PolicyDocument: Match.objectLike({
				Statement: Match.arrayWith([
					Match.objectLike({
						Action: ['ecs:UpdateService', 'ecs:DescribeServices'],
					}),
					Match.objectLike({
						Action: ['ec2:StartInstances', 'ec2:StopInstances'],
					}),
					Match.objectLike({ Action: 'lambda:InvokeFunction' }),
					Match.objectLike({ Action: 'route53:ChangeResourceRecordSets' }),
				]),
			}),
		})
	})

	it('db-probe: in-VPC, DB_URL via dynamic reference (no runtime AWS calls)', () => {
		template.hasResourceProperties('AWS::Lambda::Function', {
			FunctionName: 'pitminder-db-probe',
			Environment: {
				Variables: Match.objectLike({
					DB_URL:
						'{{resolve:secretsmanager:/pitminder/prod/app/env:SecretString:DATABASE_URL}}',
				}),
			},
			VpcConfig: Match.anyValue(),
		})
	})
})

describe('pitminder-compute synth (post-cutover mode)', () => {
	const cutover = synth(true).template

	it('adds custom domains + the sync distribution + aliases', () => {
		const distributions = cutover.findResources('AWS::CloudFront::Distribution')
		expect(Object.keys(distributions)).toHaveLength(2)
		const aliases = Object.values(distributions).flatMap(
			(d) => d.Properties?.DistributionConfig?.Aliases ?? [],
		)
		expect(aliases.sort()).toEqual(['app.pitminder.com', 'sync.pitminder.com'])
	})

	it('flips dns-enabled to true so ComputeControl publishes the origin record', () => {
		cutover.hasResourceProperties('AWS::SSM::Parameter', {
			Name: '/pitminder/prod/compute/dns-enabled',
			Value: 'true',
		})
	})

	it('creates the app + sync Route53 aliases', () => {
		const records = cutover.findResources('AWS::Route53::RecordSet')
		const names = Object.values(records).map((r) => r.Properties?.Name)
		expect(names).toContain('app.pitminder.com.')
		expect(names).toContain('sync.pitminder.com.')
		expect(names).toContain('zero-origin.pitminder.com.')
	})
})
