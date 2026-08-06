/** Production implementations of the driver's control interfaces. */
import {
	DescribeDBInstancesCommand,
	type RDSClient,
	StartDBInstanceCommand,
	StopDBInstanceCommand,
} from '@aws-sdk/client-rds'
import { GetParameterCommand, type SSMClient } from '@aws-sdk/client-ssm'
import type { ComputeControl, ExecutionControl, RdsControl } from './driver'

function tolerateInvalidState(error: unknown): void {
	// Start/stop while a transition is already in flight (or already in the
	// target state) throws InvalidDBInstanceState — the driver's status poll
	// is the source of truth, so swallow it and keep polling.
	if (error instanceof Error && error.name === 'InvalidDBInstanceStateFault') {
		return
	}
	if (error instanceof Error && error.name === 'InvalidDBInstanceState') return
	throw error
}

export function createRdsControl(
	client: RDSClient,
	instanceId: string,
): RdsControl {
	return {
		async status() {
			const res = await client.send(
				new DescribeDBInstancesCommand({ DBInstanceIdentifier: instanceId }),
			)
			return res.DBInstances?.[0]?.DBInstanceStatus ?? 'unknown'
		},
		async start() {
			try {
				await client.send(
					new StartDBInstanceCommand({ DBInstanceIdentifier: instanceId }),
				)
			} catch (error) {
				tolerateInvalidState(error)
			}
		},
		async stop() {
			try {
				await client.send(
					new StopDBInstanceCommand({ DBInstanceIdentifier: instanceId }),
				)
			} catch (error) {
				tolerateInvalidState(error)
			}
		},
	}
}

/**
 * Budget kill switch. FAIL CLOSED: a missing parameter, a throttle, or any
 * error at all reads as disabled — paid mutations are refused.
 */
export function createExecutionControl(
	client: SSMClient,
	parameterName: string,
): ExecutionControl {
	return {
		async isEnabled() {
			try {
				const res = await client.send(
					new GetParameterCommand({ Name: parameterName }),
				)
				return res.Parameter?.Value === 'enabled'
			} catch {
				return false
			}
		},
	}
}

/**
 * STUB — the pitminder-compute stack does not exist yet.
 *
 * When it lands, replace this with an ECS-backed implementation discovered
 * via `/pitminder/prod/compute/*` SSM parameters:
 * - scaleUp: UpdateService desiredCount 1 for zero-cache + sync-worker
 * - readyComponents: websocket-upgrade probe (zero-cache) and heartbeat row
 *   (sync-worker), each fenced on the wake generation
 * - drain: worker first (SIGTERM + side-effect leases), then zero-cache
 *   (placeholder DNS restored before drain), wait runningCount 0
 * - probeDb: TLS SQL probe + logical slot/publication check from in-VPC
 *
 * Until then every component is reported ready immediately, which makes the
 * DB half of the machine fully exercisable end to end.
 */
export function createStubComputeControl(
	components: readonly string[],
): ComputeControl {
	return {
		async scaleUp() {},
		async readyComponents() {
			return [...components]
		},
		async drain() {},
		async probeDb() {},
	}
}
