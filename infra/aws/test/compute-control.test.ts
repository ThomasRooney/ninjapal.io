import {
	EC2Client,
	StartInstancesCommand,
	StopInstancesCommand,
} from '@aws-sdk/client-ec2'
import {
	DescribeServicesCommand,
	DescribeTasksCommand,
	ECSClient,
	ListTasksCommand,
	UpdateServiceCommand,
} from '@aws-sdk/client-ecs'
import {
	InvokeCommand,
	type InvokeCommandOutput,
	LambdaClient,
} from '@aws-sdk/client-lambda'
import {
	ChangeResourceRecordSetsCommand,
	Route53Client,
} from '@aws-sdk/client-route-53'
import {
	GetParameterCommand,
	GetParametersByPathCommand,
	PutParameterCommand,
	SSMClient,
} from '@aws-sdk/client-ssm'
import { mockClient } from 'aws-sdk-client-mock'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	type ComputeClients,
	type ComputeConfig,
	GENERATION_PARAM_NAME,
	PLACEHOLDER_IP,
	createComputeControl,
	loadComputeConfig,
} from '../lambda/power/compute-control'
import type { PowerRow } from '../lambda/power/lib'

const ecsMock = mockClient(ECSClient)
const ec2Mock = mockClient(EC2Client)
const ssmMock = mockClient(SSMClient)
const route53Mock = mockClient(Route53Client)
const lambdaMock = mockClient(LambdaClient)

const NOW = 1_754_000_000_000

function makeRow(overrides: Partial<PowerRow> = {}): PowerRow {
	return {
		pk: 'POWER#prod',
		state: 'WAKING_SERVICES',
		desiredState: 'AWAKE',
		version: 5,
		generation: 2,
		componentReady: {},
		updatedAt: NOW,
		...overrides,
	}
}

function makeConfig(overrides: Partial<ComputeConfig> = {}): ComputeConfig {
	return {
		clusterArn: 'arn:aws:ecs:eu-west-2:836003244283:cluster/pitminder',
		zeroCacheService: 'pitminder-zero-cache',
		syncWorkerService: 'pitminder-sync-worker',
		natInstanceId: 'i-0123456789abcdef0',
		zeroProbePath: '/sync/v16/connect',
		dnsEnabled: false,
		drainPollMs: 0,
		...overrides,
	}
}

function makeClients(overrides: Partial<ComputeClients> = {}): ComputeClients {
	return {
		ecs: new ECSClient({}),
		ec2: new EC2Client({}),
		ssm: new SSMClient({}),
		route53: new Route53Client({}),
		lambda: new LambdaClient({}),
		readRow: async () => makeRow(),
		sleep: async () => {},
		probeSocket: async () => {},
		...overrides,
	}
}

beforeEach(() => {
	ecsMock.reset()
	ec2Mock.reset()
	ssmMock.reset()
	route53Mock.reset()
	lambdaMock.reset()
})

describe('loadComputeConfig', () => {
	it('returns null when the compute prefix is empty (stack not deployed)', async () => {
		ssmMock.on(GetParametersByPathCommand).resolves({ Parameters: [] })
		await expect(loadComputeConfig(new SSMClient({}))).resolves.toBeNull()
	})

	it('ignores a lone worker-generation leftover (still null)', async () => {
		ssmMock.on(GetParametersByPathCommand).resolves({
			Parameters: [{ Name: GENERATION_PARAM_NAME, Value: '3' }],
		})
		await expect(loadComputeConfig(new SSMClient({}))).resolves.toBeNull()
	})

	it('throws on a PARTIAL contract instead of stubbing over real services', async () => {
		ssmMock.on(GetParametersByPathCommand).resolves({
			Parameters: [
				{ Name: '/pitminder/prod/compute/cluster-arn', Value: 'arn:cluster' },
			],
		})
		await expect(loadComputeConfig(new SSMClient({}))).rejects.toThrow(
			/PARTIAL/,
		)
	})

	it('assembles the full contract across pages, parsing the dns flag', async () => {
		ssmMock
			.on(GetParametersByPathCommand)
			.resolvesOnce({
				Parameters: [
					{ Name: '/pitminder/prod/compute/cluster-arn', Value: 'arn:cluster' },
					{ Name: '/pitminder/prod/compute/zero-cache-service', Value: 'zc' },
					{ Name: '/pitminder/prod/compute/sync-worker-service', Value: 'sw' },
				],
				NextToken: 'page2',
			})
			.resolvesOnce({
				Parameters: [
					{ Name: '/pitminder/prod/compute/nat-instance-id', Value: 'i-1' },
					{
						Name: '/pitminder/prod/compute/zero-probe-path',
						Value: '/sync/v16/connect',
					},
					{ Name: '/pitminder/prod/compute/dns-enabled', Value: 'false' },
					{ Name: '/pitminder/prod/compute/db-probe-function', Value: 'probe' },
				],
			})
		const config = await loadComputeConfig(new SSMClient({}))
		expect(config).toMatchObject({
			clusterArn: 'arn:cluster',
			zeroCacheService: 'zc',
			syncWorkerService: 'sw',
			natInstanceId: 'i-1',
			zeroProbePath: '/sync/v16/connect',
			dnsEnabled: false,
			dbProbeFunctionName: 'probe',
		})
	})
})

describe('startNat / stopNat', () => {
	it('issues Start/StopInstances for the configured instance', async () => {
		ec2Mock.on(StartInstancesCommand).resolves({})
		ec2Mock.on(StopInstancesCommand).resolves({})
		const control = createComputeControl(makeConfig(), makeClients())
		await control.startNat()
		await control.stopNat()
		expect(
			ec2Mock.commandCalls(StartInstancesCommand)[0]?.args[0].input,
		).toEqual({ InstanceIds: ['i-0123456789abcdef0'] })
		expect(
			ec2Mock.commandCalls(StopInstancesCommand)[0]?.args[0].input,
		).toEqual({ InstanceIds: ['i-0123456789abcdef0'] })
	})

	it('tolerates IncorrectInstanceState (mid-transition) and rethrows the rest', async () => {
		const midTransition = Object.assign(new Error('busy'), {
			name: 'IncorrectInstanceState',
		})
		ec2Mock.on(StartInstancesCommand).rejects(midTransition)
		ec2Mock.on(StopInstancesCommand).rejects(new Error('AccessDenied'))
		const control = createComputeControl(makeConfig(), makeClients())
		await expect(control.startNat()).resolves.toBeUndefined()
		await expect(control.stopNat()).rejects.toThrow('AccessDenied')
	})
})

describe('scaleUp', () => {
	it('first scale for a generation: starts NAT, records it, desired 1 both — no force', async () => {
		ec2Mock.on(StartInstancesCommand).resolves({})
		ssmMock
			.on(GetParameterCommand)
			.rejects(
				Object.assign(new Error('missing'), { name: 'ParameterNotFound' }),
			)
		ssmMock.on(PutParameterCommand).resolves({})
		ecsMock.on(UpdateServiceCommand).resolves({})
		const control = createComputeControl(makeConfig(), makeClients())
		await control.scaleUp(2)

		expect(ec2Mock.commandCalls(StartInstancesCommand)).toHaveLength(1)
		expect(
			ssmMock.commandCalls(PutParameterCommand)[0]?.args[0].input,
		).toMatchObject({
			Name: GENERATION_PARAM_NAME,
			Value: '2',
			Overwrite: true,
		})
		const updates = ecsMock
			.commandCalls(UpdateServiceCommand)
			.map((c) => c.args[0].input)
		expect(updates).toEqual([
			expect.objectContaining({
				service: 'pitminder-zero-cache',
				desiredCount: 1,
			}),
			expect.objectContaining({
				service: 'pitminder-sync-worker',
				desiredCount: 1,
			}),
		])
		expect(updates[1]?.forceNewDeployment).toBeUndefined()
		// No stale-task probe needed on a fresh scale.
		expect(ecsMock.commandCalls(DescribeServicesCommand)).toHaveLength(0)
	})

	it('same generation re-issue: no parameter write, no force', async () => {
		ec2Mock.on(StartInstancesCommand).resolves({})
		ssmMock.on(GetParameterCommand).resolves({ Parameter: { Value: '2' } })
		ecsMock.on(UpdateServiceCommand).resolves({})
		const control = createComputeControl(makeConfig(), makeClients())
		await control.scaleUp(2)
		expect(ssmMock.commandCalls(PutParameterCommand)).toHaveLength(0)
		const updates = ecsMock
			.commandCalls(UpdateServiceCommand)
			.map((c) => c.args[0].input)
		expect(updates.every((u) => !u.forceNewDeployment)).toBe(true)
	})

	it('superseding generation with a still-running worker: force-redeploys the worker only', async () => {
		ec2Mock.on(StartInstancesCommand).resolves({})
		ssmMock.on(GetParameterCommand).resolves({ Parameter: { Value: '1' } })
		ssmMock.on(PutParameterCommand).resolves({})
		ecsMock
			.on(DescribeServicesCommand)
			.resolves({ services: [{ runningCount: 1, desiredCount: 1 }] })
		ecsMock.on(UpdateServiceCommand).resolves({})
		const control = createComputeControl(makeConfig(), makeClients())
		await control.scaleUp(2)
		const updates = ecsMock
			.commandCalls(UpdateServiceCommand)
			.map((c) => c.args[0].input)
		const zero = updates.find((u) => u.service === 'pitminder-zero-cache')
		const worker = updates.find((u) => u.service === 'pitminder-sync-worker')
		expect(zero?.forceNewDeployment).toBeUndefined()
		expect(worker?.forceNewDeployment).toBe(true)
		expect(
			ssmMock.commandCalls(PutParameterCommand)[0]?.args[0].input.Value,
		).toBe('2')
	})

	it('superseding generation with everything at zero: records it without forcing', async () => {
		ec2Mock.on(StartInstancesCommand).resolves({})
		ssmMock.on(GetParameterCommand).resolves({ Parameter: { Value: '1' } })
		ssmMock.on(PutParameterCommand).resolves({})
		ecsMock
			.on(DescribeServicesCommand)
			.resolves({ services: [{ runningCount: 0, desiredCount: 0 }] })
		ecsMock.on(UpdateServiceCommand).resolves({})
		const control = createComputeControl(makeConfig(), makeClients())
		await control.scaleUp(2)
		const worker = ecsMock
			.commandCalls(UpdateServiceCommand)
			.map((c) => c.args[0].input)
			.find((u) => u.service === 'pitminder-sync-worker')
		expect(worker?.forceNewDeployment).toBeUndefined()
	})
})

function mockZeroTask(ip: string | null, lastStatus = 'RUNNING') {
	ecsMock
		.on(ListTasksCommand)
		.resolves({ taskArns: ['arn:aws:ecs:task/pitminder/abc'] })
	ecsMock.on(DescribeTasksCommand).resolves({
		tasks: [
			{
				lastStatus,
				attachments: [
					{
						details: [{ name: 'networkInterfaceId', value: 'eni-123' }],
					},
				],
			},
		],
	})
	ec2Mock.onAnyCommand().callsFake(async () => ({
		NetworkInterfaces: ip ? [{ Association: { PublicIp: ip } }] : [{}],
	}))
}

describe('readyComponents', () => {
	it('zero-cache ready on a passing websocket probe; worker from the row heartbeat', async () => {
		mockZeroTask('3.9.1.2')
		const probe = vi.fn(async () => {})
		const control = createComputeControl(
			makeConfig(),
			makeClients({
				probeSocket: probe,
				readRow: async () =>
					makeRow({ generation: 2, componentReady: { 'sync-worker': 2 } }),
			}),
		)
		await expect(control.readyComponents(2)).resolves.toEqual([
			'zero-cache',
			'sync-worker',
		])
		expect(probe).toHaveBeenCalledWith('3.9.1.2', '/sync/v16/connect', 2500)
	})

	it('a failing probe reports nothing for zero-cache (retry next poll)', async () => {
		mockZeroTask('3.9.1.2')
		const control = createComputeControl(
			makeConfig(),
			makeClients({
				probeSocket: async () => {
					throw new Error('ECONNREFUSED')
				},
				readRow: async () => makeRow({ componentReady: {} }),
			}),
		)
		await expect(control.readyComponents(2)).resolves.toEqual([])
	})

	it('no RUNNING task or missing public IP → not ready', async () => {
		ecsMock.on(ListTasksCommand).resolves({ taskArns: [] })
		const control = createComputeControl(
			makeConfig(),
			makeClients({ readRow: async () => makeRow({ componentReady: {} }) }),
		)
		await expect(control.readyComponents(2)).resolves.toEqual([])

		mockZeroTask(null)
		await expect(control.readyComponents(2)).resolves.toEqual([])
	})

	it('a stale worker heartbeat generation does not count', async () => {
		ecsMock.on(ListTasksCommand).resolves({ taskArns: [] })
		const control = createComputeControl(
			makeConfig(),
			makeClients({
				readRow: async () =>
					makeRow({ generation: 2, componentReady: { 'sync-worker': 1 } }),
			}),
		)
		await expect(control.readyComponents(2)).resolves.toEqual([])
	})

	it('dns mode: publishes the origin record only when the generation still matches', async () => {
		mockZeroTask('3.9.1.2')
		route53Mock.on(ChangeResourceRecordSetsCommand).resolves({})
		const config = makeConfig({
			dnsEnabled: true,
			hostedZoneId: 'Z123',
			zeroOriginHost: 'zero-origin.pitminder.com',
		})
		const control = createComputeControl(
			config,
			makeClients({
				readRow: async () =>
					makeRow({ generation: 2, componentReady: { 'sync-worker': 2 } }),
			}),
		)
		await expect(control.readyComponents(2)).resolves.toEqual([
			'zero-cache',
			'sync-worker',
		])
		const change = route53Mock.commandCalls(ChangeResourceRecordSetsCommand)[0]
			?.args[0].input
		expect(change?.HostedZoneId).toBe('Z123')
		expect(change?.ChangeBatch?.Changes?.[0]?.ResourceRecordSet).toMatchObject({
			Name: 'zero-origin.pitminder.com.',
			Type: 'A',
			TTL: 30,
			ResourceRecords: [{ Value: '3.9.1.2' }],
		})
	})

	it('dns mode: a superseded generation NEVER publishes (fence)', async () => {
		mockZeroTask('3.9.1.2')
		route53Mock.on(ChangeResourceRecordSetsCommand).resolves({})
		const config = makeConfig({
			dnsEnabled: true,
			hostedZoneId: 'Z123',
			zeroOriginHost: 'zero-origin.pitminder.com',
		})
		const control = createComputeControl(
			config,
			makeClients({
				// The row moved on to generation 3 while we probed for 2.
				readRow: async () => makeRow({ generation: 3 }),
			}),
		)
		await expect(control.readyComponents(2)).resolves.toEqual([])
		expect(
			route53Mock.commandCalls(ChangeResourceRecordSetsCommand),
		).toHaveLength(0)
	})
})

describe('drain', () => {
	it('drains worker first, then zero-cache, waiting for runningCount 0', async () => {
		const events: string[] = []
		ecsMock.on(UpdateServiceCommand).callsFake(async (input) => {
			events.push(`update:${input.service}:${input.desiredCount}`)
			return {}
		})
		let describes = 0
		ecsMock.on(DescribeServicesCommand).callsFake(async (input) => {
			events.push(`describe:${input.services?.[0]}`)
			// Each service needs two polls before reaching 0.
			return { services: [{ runningCount: ++describes % 2 === 0 ? 0 : 1 }] }
		})
		const control = createComputeControl(makeConfig(), makeClients())
		await expect(control.drain()).resolves.toBe(true)
		expect(events).toEqual([
			'update:pitminder-sync-worker:0',
			'describe:pitminder-sync-worker',
			'describe:pitminder-sync-worker',
			'update:pitminder-zero-cache:0',
			'describe:pitminder-zero-cache',
			'describe:pitminder-zero-cache',
		])
	})

	it('keepAlive false aborts before touching zero-cache and returns false', async () => {
		ecsMock.on(UpdateServiceCommand).resolves({})
		ecsMock.on(DescribeServicesCommand).resolves({
			services: [{ runningCount: 1 }],
		})
		let calls = 0
		const control = createComputeControl(makeConfig(), makeClients())
		await expect(control.drain(async () => ++calls < 3)).resolves.toBe(false)
		const updates = ecsMock
			.commandCalls(UpdateServiceCommand)
			.map((c) => c.args[0].input)
		expect(updates).toHaveLength(1)
		expect(updates[0]?.service).toBe('pitminder-sync-worker')
	})

	it('dns mode restores the placeholder BEFORE scaling anything down', async () => {
		const events: string[] = []
		route53Mock.on(ChangeResourceRecordSetsCommand).callsFake(async (input) => {
			events.push(
				`dns:${input.ChangeBatch?.Changes?.[0]?.ResourceRecordSet?.ResourceRecords?.[0]?.Value}`,
			)
			return {}
		})
		ecsMock.on(UpdateServiceCommand).callsFake(async (input) => {
			events.push(`update:${input.service}`)
			return {}
		})
		ecsMock.on(DescribeServicesCommand).resolves({
			services: [{ runningCount: 0 }],
		})
		const control = createComputeControl(
			makeConfig({
				dnsEnabled: true,
				hostedZoneId: 'Z123',
				zeroOriginHost: 'zero-origin.pitminder.com',
			}),
			makeClients(),
		)
		await expect(control.drain()).resolves.toBe(true)
		expect(events[0]).toBe(`dns:${PLACEHOLDER_IP}`)
		expect(events.slice(1)).toEqual([
			'update:pitminder-sync-worker',
			'update:pitminder-zero-cache',
		])
	})

	it('throws when a service never reaches runningCount 0 inside the budget', async () => {
		ecsMock.on(UpdateServiceCommand).resolves({})
		ecsMock.on(DescribeServicesCommand).resolves({
			services: [{ runningCount: 1 }],
		})
		const control = createComputeControl(
			makeConfig({ drainMaxWaitMs: -1 }),
			makeClients(),
		)
		await expect(control.drain()).rejects.toThrow(/still has 1 running/)
	})
})

/** The SDK types Payload as a blob adapter; the mock only needs the bytes. */
function lambdaPayload(value: unknown) {
	return new TextEncoder().encode(
		JSON.stringify(value),
	) as unknown as InvokeCommandOutput['Payload']
}

describe('probeDb', () => {
	it('passes on {ok:true} from the in-VPC probe function', async () => {
		lambdaMock.on(InvokeCommand).resolves({
			Payload: lambdaPayload({ ok: true }),
		})
		const control = createComputeControl(
			makeConfig({ dbProbeFunctionName: 'pitminder-db-probe' }),
			makeClients(),
		)
		await expect(control.probeDb()).resolves.toBeUndefined()
		expect(
			lambdaMock.commandCalls(InvokeCommand)[0]?.args[0].input,
		).toMatchObject({ FunctionName: 'pitminder-db-probe' })
	})

	it('throws on FunctionError or a not-ok payload', async () => {
		lambdaMock.on(InvokeCommand).resolves({ FunctionError: 'Unhandled' })
		const control = createComputeControl(
			makeConfig({ dbProbeFunctionName: 'pitminder-db-probe' }),
			makeClients(),
		)
		await expect(control.probeDb()).rejects.toThrow(/db probe failed/)

		lambdaMock.on(InvokeCommand).resolves({
			Payload: lambdaPayload({ ok: false, error: 'no slot' }),
		})
		await expect(control.probeDb()).rejects.toThrow(/db probe not ok/)
	})

	it('is a logged no-op without a configured probe function', async () => {
		const control = createComputeControl(makeConfig(), makeClients())
		await expect(control.probeDb()).resolves.toBeUndefined()
		expect(lambdaMock.commandCalls(InvokeCommand)).toHaveLength(0)
	})
})
