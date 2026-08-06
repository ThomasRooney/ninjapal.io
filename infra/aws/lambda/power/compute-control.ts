/**
 * ECS-backed ComputeControl — the pitminder-compute half of the power-state
 * machine. Replaces createStubComputeControl once the compute stack's SSM
 * contract (/pitminder/prod/compute/*) is present.
 *
 * Responsibilities (see driver.ts for when each is called):
 *  - startNat/stopNat: the t4g.nano NAT instance rides up during WAKING_DB
 *    (parallel with the RDS start) and down during STOPPING_DB. Both are
 *    idempotent and re-issued every poll; transitional EC2 states
 *    (IncorrectInstanceState) are tolerated and converge on the next poll.
 *  - scaleUp(generation): zero-cache + sync-worker Fargate services 0→1.
 *    The worker fences its power writes on the generation it booted with
 *    (scripts/sync-worker-entry.ts reads the row), so when a NEW generation
 *    supersedes a still-running worker task (wake-cancels-draining), the
 *    worker service is force-redeployed. The last-scaled generation is
 *    tracked in an SSM parameter so repeated idempotent scaleUp calls for
 *    the same generation never restart-loop the service.
 *  - readyComponents(generation): zero-cache = raw-socket websocket-upgrade
 *    probe against the task's public IP (reflow's production probe shape);
 *    sync-worker = its own generation-fenced heartbeat read back from the
 *    power row. When DNS mode is enabled (post-nameserver-cutover), a
 *    passing zero-cache probe also UPSERTs the zero-origin A record —
 *    generation-fenced: the row is re-read and a superseded generation
 *    never publishes.
 *  - drain(keepAlive): worker first (SIGTERM + side-effect leases, task defs
 *    carry stopTimeout 60), then zero-cache; each waits for runningCount 0.
 *    keepAlive runs between polls so the caller can heartbeat its lease; a
 *    false return aborts the drain (superseded — the fenced claims protect
 *    the row). In DNS mode the placeholder record is restored FIRST so no
 *    resolver is left pointing at a dying task.
 *  - probeDb: invokes the in-VPC db-probe Lambda (TLS SQL + logical
 *    slot/publication check) — the orchestrator itself lives outside the VPC.
 */
import { connect } from 'node:net'
import type { EC2Client } from '@aws-sdk/client-ec2'
import {
	StartInstancesCommand,
	StopInstancesCommand,
} from '@aws-sdk/client-ec2'
import type { ECSClient } from '@aws-sdk/client-ecs'
import {
	DescribeServicesCommand,
	DescribeTasksCommand,
	ListTasksCommand,
	UpdateServiceCommand,
} from '@aws-sdk/client-ecs'
import type { LambdaClient } from '@aws-sdk/client-lambda'
import { InvokeCommand } from '@aws-sdk/client-lambda'
import type { Route53Client } from '@aws-sdk/client-route-53'
import { ChangeResourceRecordSetsCommand } from '@aws-sdk/client-route-53'
import type { SSMClient } from '@aws-sdk/client-ssm'
import {
	GetParameterCommand,
	GetParametersByPathCommand,
	PutParameterCommand,
} from '@aws-sdk/client-ssm'
import type { ComputeControl } from './driver'
import type { PowerRow } from './lib'

/** SSM prefix the compute stack publishes its contract under. */
export const COMPUTE_PARAM_PREFIX = '/pitminder/prod/compute/'
/** Last generation scaleUp acted on (owned by the orchestrator, not CFN). */
export const GENERATION_PARAM_NAME = `${COMPUTE_PARAM_PREFIX}worker-generation`
/** Permanent placeholder (TEST-NET-1) defeating NXDOMAIN negative caching. */
export const PLACEHOLDER_IP = '192.0.2.1'

const ZERO_PORT = 4848
const DEFAULT_PROBE_TIMEOUT_MS = 2_500
const DEFAULT_DRAIN_POLL_MS = 5_000
/** stopTimeout is 60s in the task defs; 10 min covers slow deregistration. */
const DEFAULT_DRAIN_MAX_WAIT_MS = 10 * 60_000
const ZERO_SYNC_PROBE_KEY = 'dGhlIHNhbXBsZSBub25jZQ=='

export interface ComputeConfig {
	clusterArn: string
	zeroCacheService: string
	syncWorkerService: string
	natInstanceId: string
	/** '/sync/v16/connect' — pinned by the compute stack NEXT TO the image
	 * tag so a zero upgrade updates both together. */
	zeroProbePath: string
	dbProbeFunctionName?: string
	/** Post-nameserver-cutover flag: publish/restore the zero-origin record. */
	dnsEnabled: boolean
	hostedZoneId?: string
	zeroOriginHost?: string
	generationParamName?: string
	probeTimeoutMs?: number
	drainPollMs?: number
	drainMaxWaitMs?: number
}

export interface ComputeClients {
	ecs: ECSClient
	ec2: EC2Client
	ssm: SSMClient
	route53?: Route53Client
	lambda?: LambdaClient
	/** ConsistentRead of the power row (worker heartbeat + generation fence). */
	readRow: () => Promise<PowerRow | null>
	sleep?: (ms: number) => Promise<void>
	/** Injectable raw-socket probe (tests). Resolves on websocket 101. */
	probeSocket?: (host: string, path: string, timeoutMs: number) => Promise<void>
	log?: (message: string) => void
}

/**
 * Read the compute contract from SSM. Returns null when the prefix is EMPTY
 * (compute stack not deployed — callers fall back to the stub). A PARTIAL
 * contract throws: silently stubbing while real services exist would mark
 * components ready that were never started.
 */
export async function loadComputeConfig(
	ssm: SSMClient,
): Promise<ComputeConfig | null> {
	const byName: Record<string, string> = {}
	let nextToken: string | undefined
	do {
		const page = await ssm.send(
			new GetParametersByPathCommand({
				Path: COMPUTE_PARAM_PREFIX,
				Recursive: false,
				NextToken: nextToken,
			}),
		)
		for (const parameter of page.Parameters ?? []) {
			if (parameter.Name && parameter.Value !== undefined) {
				byName[parameter.Name.slice(COMPUTE_PARAM_PREFIX.length)] =
					parameter.Value
			}
		}
		nextToken = page.NextToken
	} while (nextToken)

	// worker-generation is orchestrator-owned state, not contract.
	const contract = Object.keys(byName).filter((k) => k !== 'worker-generation')
	if (contract.length === 0) return null

	const required = [
		'cluster-arn',
		'zero-cache-service',
		'sync-worker-service',
		'nat-instance-id',
		'zero-probe-path',
	] as const
	const missing = required.filter((key) => !byName[key])
	if (missing.length > 0) {
		throw new Error(
			`compute SSM contract is PARTIAL — refusing to drive (missing: ${missing.join(', ')}). A stub fallback here would fake component readiness over real services.`,
		)
	}
	return {
		clusterArn: byName['cluster-arn'] as string,
		zeroCacheService: byName['zero-cache-service'] as string,
		syncWorkerService: byName['sync-worker-service'] as string,
		natInstanceId: byName['nat-instance-id'] as string,
		zeroProbePath: byName['zero-probe-path'] as string,
		dbProbeFunctionName: byName['db-probe-function'] || undefined,
		dnsEnabled: byName['dns-enabled'] === 'true',
		hostedZoneId: byName['hosted-zone-id'] || undefined,
		zeroOriginHost: byName['zero-origin-host'] || undefined,
	}
}

/** EC2 throws IncorrectInstanceState for start/stop during a transition —
 * the driver re-issues every poll, so tolerate and converge. */
function tolerateInstanceState(error: unknown): void {
	if (error instanceof Error && error.name === 'IncorrectInstanceState') return
	throw error
}

export function createComputeControl(
	config: ComputeConfig,
	clients: ComputeClients,
): ComputeControl {
	const sleep =
		clients.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))
	const probeSocket = clients.probeSocket ?? probeZeroWebsocket
	const log = clients.log ?? (() => {})
	const generationParam = config.generationParamName ?? GENERATION_PARAM_NAME
	const probeTimeoutMs = config.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS
	const drainPollMs = config.drainPollMs ?? DEFAULT_DRAIN_POLL_MS
	const drainMaxWaitMs = config.drainMaxWaitMs ?? DEFAULT_DRAIN_MAX_WAIT_MS

	const describeService = async (serviceName: string) => {
		const res = await clients.ecs.send(
			new DescribeServicesCommand({
				cluster: config.clusterArn,
				services: [serviceName],
			}),
		)
		return res.services?.[0] ?? null
	}

	const setDesired = async (
		serviceName: string,
		desiredCount: number,
		forceNewDeployment = false,
	) => {
		await clients.ecs.send(
			new UpdateServiceCommand({
				cluster: config.clusterArn,
				service: serviceName,
				desiredCount,
				...(forceNewDeployment && { forceNewDeployment: true }),
			}),
		)
	}

	const zeroCacheTaskIp = async (): Promise<string | null> => {
		const tasks = await clients.ecs.send(
			new ListTasksCommand({
				cluster: config.clusterArn,
				serviceName: config.zeroCacheService,
				desiredStatus: 'RUNNING',
				maxResults: 1,
			}),
		)
		const taskArn = tasks.taskArns?.[0]
		if (!taskArn) return null
		const described = await clients.ecs.send(
			new DescribeTasksCommand({
				cluster: config.clusterArn,
				tasks: [taskArn],
			}),
		)
		const task = described.tasks?.[0]
		if (!task || task.lastStatus !== 'RUNNING') return null
		// awsvpc tasks expose their public IP directly on the ENI attachment
		// details? No — only the ENI id; but Fargate ALSO reports the public
		// IP in containers[].networkInterfaces? It does not. The attachment
		// carries the private IP; the public IP requires EC2. To keep this
		// Lambda's IAM surface small we use the EC2 DescribeNetworkInterfaces
		// read (resource-level * is unavoidable for Describe*).
		const eni = task.attachments
			?.flatMap((a) => a.details ?? [])
			.find((d) => d.name === 'networkInterfaceId')?.value
		if (!eni) return null
		const { DescribeNetworkInterfacesCommand } = await import(
			'@aws-sdk/client-ec2'
		)
		const network = await clients.ec2.send(
			new DescribeNetworkInterfacesCommand({ NetworkInterfaceIds: [eni] }),
		)
		return network.NetworkInterfaces?.[0]?.Association?.PublicIp ?? null
	}

	const upsertZeroOrigin = async (value: string): Promise<void> => {
		if (!clients.route53 || !config.hostedZoneId || !config.zeroOriginHost) {
			throw new Error('dns mode enabled but route53/zone/host unconfigured')
		}
		await clients.route53.send(
			new ChangeResourceRecordSetsCommand({
				HostedZoneId: config.hostedZoneId,
				ChangeBatch: {
					Changes: [
						{
							Action: 'UPSERT',
							ResourceRecordSet: {
								Name: `${config.zeroOriginHost}.`,
								Type: 'A',
								TTL: 30,
								ResourceRecords: [{ Value: value }],
							},
						},
					],
				},
			}),
		)
	}

	return {
		async startNat() {
			try {
				await clients.ec2.send(
					new StartInstancesCommand({ InstanceIds: [config.natInstanceId] }),
				)
			} catch (error) {
				tolerateInstanceState(error)
			}
		},

		async stopNat() {
			try {
				await clients.ec2.send(
					new StopInstancesCommand({ InstanceIds: [config.natInstanceId] }),
				)
			} catch (error) {
				tolerateInstanceState(error)
			}
		},

		async scaleUp(generation) {
			// The NAT rides up with the services — including the
			// DRAINING/SLEEP_MAINTENANCE→WAKING_SERVICES paths that skip
			// WAKING_DB entirely.
			await this.startNat()

			let lastScaled: string | null = null
			try {
				const res = await clients.ssm.send(
					new GetParameterCommand({ Name: generationParam }),
				)
				lastScaled = res.Parameter?.Value ?? null
			} catch (error) {
				if (!(error instanceof Error && error.name === 'ParameterNotFound')) {
					throw error
				}
			}

			let forceWorker = false
			if (lastScaled !== String(generation)) {
				// A still-running worker from a superseded generation booted with
				// a stale POWER_GENERATION (drain-cancelled wake) — its fenced
				// heartbeats can never satisfy this generation. Restart it.
				if (lastScaled !== null) {
					const worker = await describeService(config.syncWorkerService)
					forceWorker =
						(worker?.runningCount ?? 0) > 0 || (worker?.desiredCount ?? 0) > 0
				}
				await clients.ssm.send(
					new PutParameterCommand({
						Name: generationParam,
						Value: String(generation),
						Type: 'String',
						Overwrite: true,
					}),
				)
			}

			await setDesired(config.zeroCacheService, 1)
			await setDesired(config.syncWorkerService, 1, forceWorker)
			if (forceWorker) {
				log(`scaleUp: forced worker redeploy for generation ${generation}`)
			}
		},

		async readyComponents(generation) {
			const ready: string[] = []
			try {
				const ip = await zeroCacheTaskIp()
				if (ip) {
					await probeSocket(ip, config.zeroProbePath, probeTimeoutMs)
					if (config.dnsEnabled) {
						// Generation fence: never publish a DNS record for a
						// superseded wake cycle.
						const row = await clients.readRow()
						if (row?.generation !== generation) {
							log(
								`readyComponents: zero-cache probe passed but generation moved (${row?.generation}) — skipping`,
							)
							return ready
						}
						await upsertZeroOrigin(ip)
					}
					ready.push('zero-cache')
				}
			} catch (error) {
				log(
					`readyComponents: zero-cache not ready yet: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
			// The worker reports its own readiness via the generation-fenced
			// heartbeat (CONTRACT.md writer 3) — read it back from the row.
			const row = await clients.readRow()
			if (row?.componentReady?.['sync-worker'] === generation) {
				ready.push('sync-worker')
			}
			return ready
		},

		async drain(keepAlive) {
			if (config.dnsEnabled) {
				// Restore the placeholder BEFORE the task dies so the 30s-TTL
				// record never points a resolver at a draining IP.
				await upsertZeroOrigin(PLACEHOLDER_IP)
			}
			// Worker first: SIGTERM + side-effect leases (stopTimeout 60 in the
			// task def), then zero-cache.
			for (const serviceName of [
				config.syncWorkerService,
				config.zeroCacheService,
			]) {
				await setDesired(serviceName, 0)
				const startedAt = Date.now()
				for (;;) {
					if (keepAlive && !(await keepAlive())) return false
					const service = await describeService(serviceName)
					if ((service?.runningCount ?? 0) === 0) break
					if (Date.now() - startedAt > drainMaxWaitMs) {
						throw new Error(
							`drain: ${serviceName} still has ${service?.runningCount} running task(s) after ${drainMaxWaitMs}ms`,
						)
					}
					await sleep(drainPollMs)
				}
				log(`drain: ${serviceName} at runningCount 0`)
			}
			return true
		},

		async probeDb() {
			if (!config.dbProbeFunctionName || !clients.lambda) {
				log('probeDb: no db-probe function configured — skipping')
				return
			}
			const res = await clients.lambda.send(
				new InvokeCommand({
					FunctionName: config.dbProbeFunctionName,
					InvocationType: 'RequestResponse',
				}),
			)
			if (res.FunctionError) {
				throw new Error(`db probe failed: ${res.FunctionError}`)
			}
			const payload = res.Payload
				? JSON.parse(Buffer.from(res.Payload).toString('utf8'))
				: null
			if (payload?.ok !== true) {
				throw new Error(`db probe not ok: ${JSON.stringify(payload)}`)
			}
		},
	}
}

/**
 * Raw-socket websocket-upgrade probe against zero-cache (reflow's production
 * probe shape): write an HTTP/1.1 Upgrade request, resolve on a 101 status
 * line, reject on anything else or on timeout. A TCP connect alone is not
 * readiness — the port answers before the replica is served.
 */
export async function probeZeroWebsocket(
	host: string,
	path: string,
	timeoutMs: number,
): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const socket = connect({ host, port: ZERO_PORT })
		let settled = false
		let buffer = ''
		const timer = setTimeout(
			() => finish(new Error('zero-cache websocket probe timed out')),
			Math.max(1, timeoutMs),
		)

		const finish = (error?: Error) => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			socket.destroy()
			if (error) reject(error)
			else resolve()
		}

		socket.setNoDelay(true)
		socket.once('error', (error) => finish(error))
		socket.once('end', () =>
			finish(new Error('zero-cache probe: socket ended before upgrade')),
		)
		socket.once('connect', () => {
			const probePath = `${path}?clientID=readiness&clientGroupID=readiness&userID=readiness&baseCookie=&ts=${Date.now()}&lmid=0&wsid=readiness&profileID=readiness`
			socket.write(
				[
					`GET ${probePath} HTTP/1.1`,
					`Host: ${host}:${ZERO_PORT}`,
					'Connection: Upgrade',
					'Upgrade: websocket',
					'Sec-WebSocket-Version: 13',
					`Sec-WebSocket-Key: ${ZERO_SYNC_PROBE_KEY}`,
					'\r\n',
				].join('\r\n'),
			)
		})
		socket.on('data', (chunk) => {
			buffer += chunk.toString('utf8')
			const firstLine = buffer.split('\r\n')[0] ?? ''
			if (firstLine.includes(' 101 ')) {
				finish()
			} else if (buffer.includes('\r\n\r\n')) {
				finish(
					new Error(
						`zero-cache probe refused upgrade: ${firstLine || 'empty response'}`,
					),
				)
			}
		})
	})
}
