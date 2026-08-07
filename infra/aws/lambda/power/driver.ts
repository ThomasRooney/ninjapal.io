import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
/**
 * The single re-entrant driver for the power-state machine. Every iteration
 * reads a fresh row (and, where relevant, the fresh RDS status) and takes at
 * most ONE step — so any number of concurrent or resumed invocations converge
 * without double-driving: all writes go through the conditional mutations in
 * lib.ts.
 */
import {
	COMPONENTS,
	type ClaimInput,
	DEFAULT_LEASE_MS,
	MAX_TRANSITION_ATTEMPTS,
	type MutationResult,
	type PowerRow,
	type PowerState,
	allComponentsReady,
	claimTransition,
	getRow,
	heartbeat,
	isTransitional,
	leaseActive,
	maintenanceDue,
	markComponentReady,
	markMaintenanceProbed,
	recordSoftError,
	takeoverLease,
	transferLease,
} from './lib'

/** RDS instance control. Implementations must tolerate InvalidDBInstanceState
 * on start/stop (the driver may re-issue while a transition is in flight). */
export interface RdsControl {
	status(): Promise<string>
	start(): Promise<void>
	stop(): Promise<void>
}

/**
 * ECS + NAT scaling interface. The pitminder-compute stack provides the real
 * implementation (compute-control.ts): Fargate services 0<->1, websocket
 * readiness probes, SIGTERM draining, NAT instance start/stop, and the
 * in-VPC SQL probe. createStubComputeControl remains for environments where
 * the compute stack does not exist yet.
 */
export interface ComputeControl {
	/** Start the NAT instance. Idempotent; re-issued every WAKING_DB poll so
	 * it rides up in parallel with the RDS start. */
	startNat(): Promise<void>
	/** Stop the NAT instance. Idempotent, unpaid (never gated) — issued in
	 * STOPPING_DB and while holding SLEEPING so a crashed wake can never
	 * leak a running instance. */
	stopNat(): Promise<void>
	/** Scale all components up for this generation. Must be idempotent. */
	scaleUp(generation: number): Promise<void>
	/** Component names verified ready (probe-passed) for this generation. */
	readyComponents(generation: number): Promise<string[]>
	/**
	 * Drain sync-worker first, then zero-cache; resolve at runningCount 0.
	 * `keepAlive` is invoked between waits so the driver can heartbeat its
	 * lease; when it returns false the drain aborts and resolves false
	 * (superseded — the caller re-reads and stands down).
	 */
	drain(keepAlive?: () => Promise<boolean>): Promise<boolean>
	/** SQL probe (TLS connect + slot/publication check) once RDS is up. */
	probeDb(): Promise<void>
}

/** Fail-closed budget kill switch, consulted before every PAID mutation
 * (StartDBInstance, ECS scale-up). Stop/drain are never gated — they only
 * reduce spend. */
export interface ExecutionControl {
	isEnabled(): Promise<boolean>
}

/**
 * Conditional-write persistence for the power row. The production
 * implementation (store.ts) delegates 1:1 to lib.ts against DynamoDB.
 */
export interface PowerStore {
	get(): Promise<PowerRow | null>
	claim(input: ClaimInput): Promise<MutationResult>
	takeover(row: PowerRow, owner: string, now: number): Promise<MutationResult>
	heartbeat(
		owner: string,
		generation: number,
		now: number,
	): Promise<MutationResult>
	markComponentReady(
		component: string,
		generation: number,
		now: number,
	): Promise<MutationResult>
	markMaintenanceProbed(
		row: PowerRow,
		owner: string,
		now: number,
	): Promise<MutationResult>
	transfer(
		fromOwner: string,
		toOwner: string,
		now: number,
	): Promise<MutationResult>
	recordSoftError(message: string, now: number): Promise<MutationResult>
}

export function createDdbPowerStore(
	ddb: DynamoDBDocumentClient,
	table: string,
): PowerStore {
	return {
		get: () => getRow(ddb, table),
		claim: (input) => claimTransition(ddb, table, input),
		takeover: (row, owner, now) => takeoverLease(ddb, table, row, owner, now),
		heartbeat: (owner, generation, now) =>
			heartbeat(ddb, table, { owner, generation, now }),
		markComponentReady: (component, generation, now) =>
			markComponentReady(ddb, table, { component, generation, now }),
		markMaintenanceProbed: (row, owner, now) =>
			markMaintenanceProbed(ddb, table, row, owner, now),
		transfer: (fromOwner, toOwner, now) =>
			transferLease(ddb, table, { fromOwner, toOwner, now }),
		recordSoftError: (message, now) =>
			recordSoftError(ddb, table, message, now),
	}
}

export interface DriverDeps {
	store: PowerStore
	rds: RdsControl
	compute: ComputeControl
	execution: ExecutionControl
	/** Unique per invocation, e.g. `wake:<awsRequestId>`. */
	owner: string
	components?: readonly string[]
	/** ERROR recovery is reconciler-gated to avoid hot retry loops. */
	allowErrorRecovery?: boolean
	/** Reconciler sets this; adds an RDS reality check while AWAKE. */
	checkDrift?: boolean
	now?: () => number
	pollMs?: number
	sleep?: (ms: number) => Promise<void>
	/** Lambda budget; when low the driver re-invokes itself and exits. */
	remainingMs?: () => number
	reinvoke?: () => Promise<void>
	/**
	 * Owner identity the reinvoked successor will run under. When set and we
	 * hold the lease, the out-of-time path CAS-transfers the lease to it so
	 * the successor continues immediately instead of waiting out the expiry.
	 */
	successorOwner?: string
	log?: (message: string) => void
}

export interface DriveResult {
	state: PowerState | 'missing'
	steps: string[]
}

const REINVOKE_THRESHOLD_MS = 60_000
const MAX_ITERATIONS = 5_000

export async function drive(deps: DriverDeps): Promise<DriveResult> {
	const {
		store,
		rds,
		compute,
		execution,
		owner,
		components = COMPONENTS,
		allowErrorRecovery = false,
		checkDrift = false,
	} = deps
	const now = deps.now ?? (() => Date.now())
	const pollMs = deps.pollMs ?? 10_000
	const sleep =
		deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))
	const remainingMs = deps.remainingMs ?? (() => 14 * 60_000)

	const steps: string[] = []
	const step = (message: string) => {
		steps.push(message)
		deps.log?.(message)
	}
	const done = (state: PowerState | 'missing'): DriveResult => ({
		state,
		steps,
	})

	/**
	 * Gate before paid mutations. Fail closed: any doubt refuses the spend.
	 * On refusal the machine transitions ONCE into ERROR via a conditional
	 * claim; when the row is already ERROR nothing is written at all. (An
	 * unconditional error write here would stream-trigger the orchestrator,
	 * which would refuse and write again — an infinite loop.)
	 */
	const gate = async (row: PowerRow, what: string): Promise<boolean> => {
		if (await execution.isEnabled()) return true
		step(`refused ${what}: execution disabled`)
		if (row.state !== 'ERROR') {
			await store.claim({
				row,
				to: 'ERROR',
				owner,
				now: now(),
				errorMessage: `execution disabled: refused ${what}`,
			})
			// A rejection means someone else already moved the row — fine.
		}
		return false
	}

	/**
	 * Hold (or take over) the lease on a transitional state. A takeover bumps
	 * the version, so the caller must re-read ('taken') before claiming.
	 */
	const ensureLease = async (
		row: PowerRow,
	): Promise<'held' | 'taken' | 'lost'> => {
		const t = now()
		if (row.lease?.owner === owner) {
			// Renew only once the lease has burned through half its TTL —
			// with a 2-min lease that is one conditional write per ~minute of
			// waiting, not one per poll tick (each write is a stream event).
			if (row.lease.expiresAt - t > DEFAULT_LEASE_MS / 2) return 'held'
			const hb = await store.heartbeat(owner, row.generation, t)
			if (!hb.applied) {
				step('heartbeat rejected: superseded')
				return 'lost'
			}
			return 'held'
		}
		if (!leaseActive(row, t)) {
			const takeover = await store.takeover(row, owner, t)
			step(
				takeover.applied
					? `took over expired lease in ${row.state}`
					: 'lease takeover lost',
			)
			return takeover.applied ? 'taken' : 'lost'
		}
		step(`lease held by ${row.lease?.owner ?? 'nobody'}; standing down`)
		return 'lost'
	}

	for (let i = 0; i < MAX_ITERATIONS; i++) {
		const row = await store.get()
		if (!row) return done('missing')

		if (remainingMs() < REINVOKE_THRESHOLD_MS) {
			if (isTransitional(row.state) && deps.reinvoke) {
				if (deps.successorOwner && row.lease?.owner === owner) {
					// Hand the live lease to the successor so it continues
					// immediately instead of standing down until expiry.
					const transfer = await store.transfer(
						owner,
						deps.successorOwner,
						now(),
					)
					step(
						transfer.applied
							? `lease handed to ${deps.successorOwner}`
							: 'lease handoff lost',
					)
				}
				await deps.reinvoke()
				step('out of time: re-invoked self')
			}
			return done(row.state)
		}

		// Transitional states are driven under the lease. A takeover bumps the
		// version, so re-read before acting on the row.
		if (isTransitional(row.state)) {
			const leaseState = await ensureLease(row)
			if (leaseState === 'lost') return done(row.state)
			if (leaseState === 'taken') continue
			// Continuation budget: a transition that keeps needing takeovers
			// or handoffs is stuck — park it in ERROR for the reconciler.
			if ((row.attempts ?? 0) > MAX_TRANSITION_ATTEMPTS) {
				await claimStep(
					row,
					'ERROR',
					`transition ${row.state} exceeded ${MAX_TRANSITION_ATTEMPTS} continuations`,
				)
				return done(row.state)
			}
		}

		switch (row.state) {
			case 'SLEEPING': {
				if (row.desiredState === 'AWAKE') {
					if (!(await gate(row, 'StartDBInstance (wake)')))
						return done(row.state)
					const res = await claimStep(row, 'WAKING_DB')
					if (!res) return done(row.state)
					continue
				}
				// Drift repair + 7-day maintenance both run through
				// SLEEP_MAINTENANCE: "DB up while logically sleeping".
				const status = await rds.status()
				const drifting = status !== 'stopped' && status !== 'stopping'
				if (drifting || maintenanceDue(row, now())) {
					step(
						drifting
							? `drift: rds ${status} while SLEEPING`
							: 'maintenance window due',
					)
					const res = await claimStep(row, 'SLEEP_MAINTENANCE')
					if (!res) return done(row.state)
					continue
				}
				// Holding SLEEPING: belt-and-braces NAT-down (unpaid,
				// idempotent) so a crashed wake never leaks a running NAT.
				await compute.stopNat()
				return done(row.state)
			}

			case 'WAKING_DB': {
				// Sleep cancels waking (budget shutoff / operator abort): route
				// into the UNGATED cleanup half BEFORE consulting the gate —
				// stops only reduce spend, and a tripped breaker must never
				// strand a started NAT/RDS behind a refused paid mutation.
				if (row.desiredState === 'SLEEPING') {
					if (!(await claimStep(row, 'STOPPING_DB'))) return done(row.state)
					step('wake aborted: emergency cleanup')
					continue
				}
				const status = await rds.status()
				if (status === 'available') {
					if (!(await claimStep(row, 'WAKING_SERVICES'))) return done(row.state)
					continue
				}
				// Paid mutations below (NAT + RDS start) — re-check the budget
				// breaker every poll, not just at the claim into WAKING_DB.
				if (!(await gate(row, 'NAT/RDS start'))) return done(row.state)
				// The NAT rides up in parallel with the RDS start; idempotent,
				// re-issued every poll so a resumed invocation converges.
				await compute.startNat()
				if (status === 'stopped') {
					await rds.start()
					step('rds start requested')
				}
				await sleep(pollMs)
				continue
			}

			case 'WAKING_SERVICES': {
				// Sleep cancels waking: services may already be up — drain them
				// (ungated), then STOPPING_DB handles NAT + RDS.
				if (row.desiredState === 'SLEEPING') {
					if (!(await claimStep(row, 'DRAINING'))) return done(row.state)
					step('wake aborted: draining services')
					continue
				}
				if (!(await gate(row, 'ECS scale-up'))) return done(row.state)
				await compute.scaleUp(row.generation)
				const ready = await compute.readyComponents(row.generation)
				for (const component of ready) {
					if (row.componentReady?.[component] !== row.generation) {
						await store.markComponentReady(component, row.generation, now())
						step(`component ready: ${component}@${row.generation}`)
					}
				}
				const fresh = await store.get()
				if (fresh && allComponentsReady(fresh, components)) {
					if (!(await claimStep(fresh, 'AWAKE'))) return done(fresh.state)
					continue
				}
				await sleep(pollMs)
				continue
			}

			case 'AWAKE': {
				if (row.desiredState === 'SLEEPING') {
					if (!(await claimStep(row, 'DRAINING'))) return done(row.state)
					continue
				}
				if (checkDrift) {
					const status = await rds.status()
					if (status !== 'available') {
						step(`drift: rds ${status} while AWAKE`)
						if (!(await claimStep(row, 'ERROR', `rds ${status} while AWAKE`)))
							return done(row.state)
						continue
					}
				}
				return done(row.state)
			}

			case 'DRAINING': {
				if (row.desiredState === 'AWAKE') {
					// Wake cancels draining: DB never stopped, new generation.
					if (!(await claimStep(row, 'WAKING_SERVICES'))) return done(row.state)
					step('drain cancelled by wake')
					continue
				}
				// The drain blocks for minutes; keepAlive heartbeats the lease
				// between waits and aborts the drain when superseded (the fenced
				// claims protect the row either way).
				const drained = await compute.drain(async () => {
					const fresh = await store.get()
					if (!fresh || fresh.state !== 'DRAINING') return false
					return (await ensureLease(fresh)) !== 'lost'
				})
				if (!drained) {
					step('drain aborted: superseded')
					return done(row.state)
				}
				step('services drained')
				const fresh = await store.get()
				if (!fresh || fresh.state !== 'DRAINING') continue
				const to: PowerState =
					fresh.desiredState === 'AWAKE' ? 'WAKING_SERVICES' : 'STOPPING_DB'
				if (!(await claimStep(fresh, to))) return done(fresh.state)
				continue
			}

			case 'STOPPING_DB': {
				// Services are already drained — the NAT is idle. Stopping it is
				// unpaid and idempotent; re-issued every poll.
				await compute.stopNat()
				const status = await rds.status()
				if (status === 'stopped') {
					if (!(await claimStep(row, 'SLEEPING'))) return done(row.state)
					continue
				}
				if (status === 'available') {
					await rds.stop()
					step('rds stop requested')
				}
				await sleep(pollMs)
				continue
			}

			case 'SLEEP_MAINTENANCE': {
				const status = await rds.status()
				if (row.desiredState === 'AWAKE' && status === 'available') {
					// Real wake during maintenance: skip the restop entirely.
					if (!(await claimStep(row, 'WAKING_SERVICES'))) return done(row.state)
					step('maintenance became wake; restop skipped')
					continue
				}
				const probed = (row.maintenanceProbedAt ?? 0) > (row.stoppedAt ?? 0)
				if (status === 'stopped') {
					if (probed) {
						// Restop complete; stoppedAt resets, window restarts.
						if (!(await claimStep(row, 'SLEEPING'))) return done(row.state)
						continue
					}
					if (!(await gate(row, 'StartDBInstance (maintenance)')))
						return done(row.state)
					await rds.start()
					step('maintenance rds start requested')
					await sleep(pollMs)
					continue
				}
				if (status === 'available') {
					if (!probed) {
						await compute.probeDb()
						await store.markMaintenanceProbed(row, owner, now())
						step('maintenance probe complete')
						continue
					}
					if (row.desiredState === 'SLEEPING') {
						await rds.stop()
						step('maintenance restop requested')
					}
				}
				await sleep(pollMs)
				continue
			}

			case 'ERROR': {
				if (!allowErrorRecovery) return done(row.state)
				const to: PowerState =
					row.desiredState === 'AWAKE' ? 'WAKING_DB' : 'SLEEPING'
				if (
					to === 'WAKING_DB' &&
					!(await gate(row, 'StartDBInstance (recovery)'))
				)
					return done(row.state)
				if (!(await claimStep(row, to))) return done(row.state)
				step(`recovered ERROR -> ${to}`)
				continue
			}
		}
	}
	throw new Error(`driver exceeded ${MAX_ITERATIONS} iterations`)

	async function claimStep(
		row: PowerRow,
		to: PowerState,
		errorMessage?: string,
	): Promise<boolean> {
		const res = await store.claim({ row, to, owner, now: now(), errorMessage })
		step(
			res.applied
				? `${row.state} -> ${to}`
				: `claim ${row.state} -> ${to} rejected: ${res.reason}`,
		)
		return res.applied
	}
}
