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
 *  - scaleUp(generation): zero-cache + sync-worker Fargate services 0→1,
 *    idempotent, marker-free. The worker fences its power writes on the
 *    generation it booted with (scripts/sync-worker-entry.ts reads the row)
 *    and PROVES it before every cycle — a superseded task drains itself and
 *    ECS restarts a fresh one, so no force-redeploy bookkeeping exists here.
 *  - readyComponents(generation): zero-cache = raw-socket websocket-upgrade
 *    probe against the task's public IP (reflow's production probe shape);
 *    sync-worker = its own generation-fenced heartbeat read back from the
 *    power row. When DNS mode is enabled (post-nameserver-cutover), a
 *    passing zero-cache probe also UPSERTs the zero-origin A record —
 *    generation-fenced: the row is re-read and a superseded generation
 *    never publishes.
 *  - drainStep(): ONE idempotent step — placeholder restore (DNS mode),
 *    worker to 0 first (SIGTERM + side-effect leases, stopTimeout 60),
 *    zero-cache only once the worker is FULLY down (pending counts as
 *    active). No internal wait loop: the driver calls it once per poll, so
 *    lease renewal/reinvoke and wake-cancels-drain interpose between steps.
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
import { GetParametersByPathCommand } from '@aws-sdk/client-ssm'
import type { ComputeControl } from './driver'
import type { PowerRow } from './lib'

/** SSM prefix the compute stack publishes its contract under. */
export const COMPUTE_PARAM_PREFIX = '/pitminder/prod/compute/'
/** LEGACY name only (ignored by loadComputeConfig): the generation marker
 * was dropped — stale workers self-terminate via their per-cycle proof
 * (src/server/power/worker.ts), so scaleUp never force-redeploys. */
export const GENERATION_PARAM_NAME = `${COMPUTE_PARAM_PREFIX}worker-generation`
/** Permanent placeholder (TEST-NET-1) defeating NXDOMAIN negative caching. */
export const PLACEHOLDER_IP = '192.0.2.1'

const ZERO_PORT = 4848
const DEFAULT_PROBE_TIMEOUT_MS = 2_500
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
	probeTimeoutMs?: number
}

export interface ComputeClients {
	ecs: ECSClient
	ec2: EC2Client
	ssm: SSMClient
	route53?: Route53Client
	lambda?: LambdaClient
	/** ConsistentRead of the power row (worker heartbeat + generation fence). */
	readRow: () => Promise<PowerRow | null>
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
	const probeSocket = clients.probeSocket ?? probeZeroWebsocket
	const log = clients.log ?? (() => {})
	const probeTimeoutMs = config.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS

	const describeService = async (serviceName: string) => {
		const res = await clients.ecs.send(
			new DescribeServicesCommand({
				cluster: config.clusterArn,
				services: [serviceName],
			}),
		)
		return res.services?.[0] ?? null
	}

	const setDesired = async (serviceName: string, desiredCount: number) => {
		await clients.ecs.send(
			new UpdateServiceCommand({
				cluster: config.clusterArn,
				service: serviceName,
				desiredCount,
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

	/** RequestResponse invoke of the in-VPC db-probe; parsed payload, or
	 * null when no probe function is configured. */
	const invokeDbProbe = async (): Promise<{
		ok?: boolean
		logicalReplication?: boolean
		slots?: string[]
		publications?: string[]
	} | null> => {
		if (!config.dbProbeFunctionName || !clients.lambda) return null
		const res = await clients.lambda.send(
			new InvokeCommand({
				FunctionName: config.dbProbeFunctionName,
				InvocationType: 'RequestResponse',
			}),
		)
		if (res.FunctionError) {
			throw new Error(`db probe failed: ${res.FunctionError}`)
		}
		return res.Payload
			? JSON.parse(Buffer.from(res.Payload).toString('utf8'))
			: null
	}

	/**
	 * After the zero-cache websocket probe passes, verify the replication
	 * artifacts it should have created exist upstream (P1-b): a
	 * pitminder-prefixed logical slot AND a pitminder publication. Skipped
	 * when no probe function is configured.
	 */
	const verifyReplicationArtifacts = async (): Promise<void> => {
		const payload = await invokeDbProbe()
		if (payload === null) return
		if (payload.ok !== true) {
			throw new Error('replication check: db probe not ok')
		}
		const slots = payload.slots ?? []
		const publications = payload.publications ?? []
		if (
			!slots.some((slot) => slot.startsWith('pitminder')) ||
			!publications.some((publication) => publication.includes('pitminder'))
		) {
			throw new Error(
				`zero replication artifacts missing (slots=${slots.join(',')} publications=${publications.join(',')})`,
			)
		}
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
			// No generation marker, no force-redeploys: a still-running worker
			// from a superseded generation FAILS its per-cycle generation
			// proof (src/server/power/worker.ts, fail-closed) and exits; ECS
			// restarts a fresh task whose entry reads the CURRENT row
			// generation at boot. Simpler, and the worker can never run
			// unfenced even if this method is skipped entirely.
			await setDesired(config.zeroCacheService, 1)
			await setDesired(config.syncWorkerService, 1)
			log(`scaleUp: desired 1 for generation ${generation}`)
		},

		async readyComponents(generation) {
			const ready: string[] = []
			try {
				const ip = await zeroCacheTaskIp()
				if (ip) {
					await probeSocket(ip, config.zeroProbePath, probeTimeoutMs)
					// The socket answering is necessary but not sufficient:
					// zero-cache must also have created its logical slot +
					// publication upstream (P1-b) — otherwise "ready" could
					// mean an idle port in front of a broken replication setup.
					await verifyReplicationArtifacts()
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

		async drainStep() {
			if (config.dnsEnabled) {
				// Restore the placeholder BEFORE the tasks die so the 30s-TTL
				// record never points a resolver at a draining IP. Idempotent
				// UPSERT, re-issued each step.
				await upsertZeroOrigin(PLACEHOLDER_IP)
			}
			// Worker first (SIGTERM + side-effect leases, stopTimeout 60), and
			// zero-cache is not touched until the worker is FULLY down —
			// pending tasks count as active (a provisioning task would
			// otherwise slip through the drain).
			for (const serviceName of [
				config.syncWorkerService,
				config.zeroCacheService,
			]) {
				const service = await describeService(serviceName)
				const desired = service?.desiredCount ?? 0
				const active =
					(service?.runningCount ?? 0) + (service?.pendingCount ?? 0)
				if (desired > 0) await setDesired(serviceName, 0)
				if (desired > 0 || active > 0) {
					log(
						`drainStep: ${serviceName} desired=${desired} active=${active} — draining`,
					)
					return 'draining'
				}
			}
			return 'drained'
		},

		async probeDb() {
			if (!config.dbProbeFunctionName || !clients.lambda) {
				log('probeDb: no db-probe function configured — skipping')
				return
			}
			const payload = await invokeDbProbe()
			if (payload?.ok !== true) {
				throw new Error(`db probe not ok: ${JSON.stringify(payload)}`)
			}
			// RDS 'available' alone is not DB-ready for Zero: logical
			// replication must be on before ECS money is spent (P1-b).
			if (payload.logicalReplication !== true) {
				throw new Error(
					'db probe: wal_level is not logical — zero-cache cannot replicate',
				)
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
