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
 * STUB — used only while the pitminder-compute stack's SSM contract
 * (`/pitminder/prod/compute/*`) is absent; wake.ts switches to the real
 * ECS-backed control (compute-control.ts) as soon as it appears. Every
 * component is reported ready immediately, which makes the DB half of the
 * machine fully exercisable without any compute resources.
 */
export function createStubComputeControl(
	components: readonly string[],
): ComputeControl {
	return {
		async startNat() {},
		async stopNat() {},
		async scaleUp() {},
		async readyComponents() {
			return [...components]
		},
		async drainStep() {
			return 'drained' as const
		},
		async probeDb() {},
	}
}
