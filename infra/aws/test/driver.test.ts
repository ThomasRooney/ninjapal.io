import { describe, expect, it } from 'vitest'
import {
	type ComputeControl,
	type DriverDeps,
	type PowerStore,
	type RdsControl,
	drive,
} from '../lambda/power/driver'
import {
	DEFAULT_LEASE_MS,
	MAINTENANCE_AFTER_MS,
	MAX_TRANSITION_ATTEMPTS,
	type PowerRow,
	TRANSITIONS,
	bumpsGeneration,
	isTransitional,
} from '../lambda/power/lib'

const NOW = 1_754_000_000_000

function makeRow(overrides: Partial<PowerRow> = {}): PowerRow {
	return {
		pk: 'POWER#prod',
		state: 'SLEEPING',
		desiredState: 'SLEEPING',
		version: 0,
		generation: 0,
		componentReady: {},
		stoppedAt: NOW - 60_000,
		updatedAt: NOW - 60_000,
		...overrides,
	}
}

/** In-memory PowerStore honouring the same fencing semantics as lib.ts. */
function fakeStore(initial: PowerRow) {
	const row: PowerRow = structuredClone(initial)
	const claims: string[] = []
	const counts = { writes: 0, heartbeats: 0, transfers: 0, takeovers: 0 }
	/** Heartbeats sent after the lease already lapsed (must stay 0). */
	let lateHeartbeats = 0
	const store: PowerStore = {
		async get() {
			return structuredClone(row)
		},
		async claim(input) {
			if (!TRANSITIONS[input.row.state].includes(input.to)) {
				return { applied: false, reason: 'illegal-transition' }
			}
			if (row.state !== input.row.state || row.version !== input.row.version) {
				return { applied: false, reason: 'conflict' }
			}
			if (
				row.lease &&
				row.lease.expiresAt >= input.now &&
				row.lease.owner !== input.owner
			) {
				return { applied: false, reason: 'conflict' }
			}
			const from = row.state
			row.state = input.to
			row.version++
			if (bumpsGeneration(from, input.to)) row.generation++
			if (isTransitional(input.to)) {
				row.lease = {
					owner: input.owner,
					expiresAt: input.now + DEFAULT_LEASE_MS,
				}
				row.attempts = 0
			} else {
				row.lease = undefined
				row.attempts = undefined
			}
			if (input.to === 'SLEEPING') {
				row.stoppedAt = input.now
				row.maintenanceProbedAt = undefined
			}
			if (input.to === 'AWAKE') row.lastError = undefined
			if (input.to === 'ERROR') row.lastError = input.errorMessage ?? 'unknown'
			claims.push(`${from}->${input.to}`)
			counts.writes++
			return { applied: true }
		},
		async takeover(r, owner, now) {
			if (row.state !== r.state || row.version !== r.version) {
				return { applied: false, reason: 'conflict' }
			}
			if (row.lease && row.lease.expiresAt >= now) {
				return { applied: false, reason: 'conflict' }
			}
			row.lease = { owner, expiresAt: now + DEFAULT_LEASE_MS }
			row.version++
			row.attempts = (row.attempts ?? 0) + 1
			counts.writes++
			counts.takeovers++
			return { applied: true }
		},
		async heartbeat(owner, generation, now) {
			if (
				!row.lease ||
				row.lease.owner !== owner ||
				row.generation !== generation
			) {
				return { applied: false, reason: 'stale' }
			}
			if (row.lease.expiresAt < now) lateHeartbeats++
			row.lease.expiresAt = now + DEFAULT_LEASE_MS
			counts.writes++
			counts.heartbeats++
			return { applied: true }
		},
		async markComponentReady(component, generation) {
			if (row.generation !== generation)
				return { applied: false, reason: 'stale' }
			row.componentReady[component] = generation
			counts.writes++
			return { applied: true }
		},
		async markMaintenanceProbed(r, owner, now) {
			if (
				row.state !== 'SLEEP_MAINTENANCE' ||
				row.version !== r.version ||
				row.lease?.owner !== owner
			) {
				return { applied: false, reason: 'conflict' }
			}
			row.maintenanceProbedAt = now
			row.version++
			counts.writes++
			return { applied: true }
		},
		async transfer(fromOwner, toOwner, now) {
			if (!row.lease || row.lease.owner !== fromOwner) {
				return { applied: false, reason: 'conflict' }
			}
			row.lease = { owner: toOwner, expiresAt: now + DEFAULT_LEASE_MS }
			row.attempts = (row.attempts ?? 0) + 1
			counts.writes++
			counts.transfers++
			return { applied: true }
		},
		async recordSoftError(message) {
			row.lastError = message
			counts.writes++
			return { applied: true }
		},
	}
	return {
		store,
		claims,
		counts,
		lateHeartbeats: () => lateHeartbeats,
		current: () => row,
		mutate: (fn: (r: PowerRow) => void) => fn(row),
	}
}

function fakeRds(initialStatus: string, ticks = 2) {
	let current = initialStatus
	// An initial in-flight status resolves after `ticks` polls.
	let countdown =
		initialStatus === 'starting' || initialStatus === 'stopping' ? ticks : 0
	const calls = { start: 0, stop: 0 }
	const control: RdsControl = {
		async status() {
			if (countdown > 0 && --countdown === 0) {
				if (current === 'starting') current = 'available'
				else if (current === 'stopping') current = 'stopped'
			}
			return current
		},
		async start() {
			calls.start++
			if (current === 'stopped') {
				current = 'starting'
				countdown = ticks
			}
		},
		async stop() {
			calls.stop++
			if (current === 'available') {
				current = 'stopping'
				countdown = ticks
			}
		},
	}
	return { control, calls, get: () => current }
}

function fakeCompute(overrides: Partial<ComputeControl> = {}) {
	const calls = {
		scaleUp: 0,
		drainSteps: 0,
		probeDb: 0,
		natStart: 0,
		natStop: 0,
	}
	const control: ComputeControl = {
		async startNat() {
			calls.natStart++
		},
		async stopNat() {
			calls.natStop++
		},
		async scaleUp() {
			calls.scaleUp++
		},
		async readyComponents() {
			return ['zero-cache', 'sync-worker']
		},
		async drainStep() {
			calls.drainSteps++
			return 'drained' as const
		},
		async probeDb() {
			calls.probeDb++
		},
		...overrides,
	}
	return { control, calls }
}

function deps(
	store: PowerStore,
	rds: RdsControl,
	compute: ComputeControl,
	overrides: Partial<DriverDeps> = {},
): DriverDeps {
	return {
		store,
		rds,
		compute,
		execution: { isEnabled: async () => true },
		owner: 'wake:test',
		now: () => NOW,
		pollMs: 0,
		sleep: async () => {},
		remainingMs: () => 10 * 60_000,
		...overrides,
	}
}

describe('wake path', () => {
	it('SLEEPING -> WAKING_DB -> WAKING_SERVICES -> AWAKE, starting RDS once', async () => {
		const { store, claims, current } = fakeStore(
			makeRow({ desiredState: 'AWAKE' }),
		)
		const rds = fakeRds('stopped')
		const compute = fakeCompute()
		const result = await drive(deps(store, rds.control, compute.control))
		expect(result.state).toBe('AWAKE')
		expect(claims).toEqual([
			'SLEEPING->WAKING_DB',
			'WAKING_DB->WAKING_SERVICES',
			'WAKING_SERVICES->AWAKE',
		])
		expect(rds.calls.start).toBe(1)
		expect(rds.calls.stop).toBe(0)
		const row = current()
		expect(row.generation).toBe(1)
		expect(row.componentReady).toEqual({ 'zero-cache': 1, 'sync-worker': 1 })
		expect(row.lease).toBeUndefined()
	})

	it('refuses to start RDS when execution is disabled: ONE conditional ERROR claim', async () => {
		const { store, claims, current } = fakeStore(
			makeRow({ desiredState: 'AWAKE' }),
		)
		const rds = fakeRds('stopped')
		const compute = fakeCompute()
		const result = await drive(
			deps(store, rds.control, compute.control, {
				execution: { isEnabled: async () => false },
			}),
		)
		expect(result.state).toBe('SLEEPING') // the state it read when refusing
		expect(claims).toEqual(['SLEEPING->ERROR'])
		expect(rds.calls.start).toBe(0)
		expect(current().state).toBe('ERROR')
		expect(current().lastError).toContain('execution disabled')
	})

	it('handler->stream->handler on a disabled gate terminates: no write loop', async () => {
		// P0-B regression: an unconditional error write on every refusal would
		// stream-trigger the orchestrator forever. Simulate the stream loop:
		// re-drive after every drive that wrote; it must quiesce.
		const fake = fakeStore(makeRow({ desiredState: 'AWAKE' }))
		const rds = fakeRds('stopped')
		const compute = fakeCompute()
		const disabled = { isEnabled: async () => false }

		let drives = 0
		let before = -1
		while (fake.counts.writes !== before) {
			before = fake.counts.writes
			drives++
			expect(drives).toBeLessThanOrEqual(5)
			await drive(
				deps(fake.store, rds.control, compute.control, {
					execution: disabled,
					owner: `wake:stream-${drives}`,
				}),
			)
		}
		// Exactly one write in total (the ERROR claim), then silence — even
		// for a reconciler-style drive with error recovery enabled.
		expect(fake.counts.writes).toBe(1)
		expect(fake.current().state).toBe('ERROR')
		const writesBeforeReconcile = fake.counts.writes
		await drive(
			deps(fake.store, rds.control, compute.control, {
				execution: disabled,
				allowErrorRecovery: true,
				owner: 'wake:reconcile',
			}),
		)
		expect(fake.counts.writes).toBe(writesBeforeReconcile)
		expect(rds.calls.start).toBe(0)
	})
})

describe('sleep path', () => {
	it('AWAKE -> DRAINING -> STOPPING_DB -> SLEEPING, stopping RDS once', async () => {
		const { store, claims, current } = fakeStore(
			makeRow({
				state: 'AWAKE',
				desiredState: 'SLEEPING',
				stoppedAt: undefined,
			}),
		)
		const rds = fakeRds('available')
		const compute = fakeCompute()
		const result = await drive(deps(store, rds.control, compute.control))
		expect(result.state).toBe('SLEEPING')
		expect(claims).toEqual([
			'AWAKE->DRAINING',
			'DRAINING->STOPPING_DB',
			'STOPPING_DB->SLEEPING',
		])
		expect(compute.calls.drainSteps).toBe(1)
		expect(rds.calls.stop).toBe(1)
		expect(current().stoppedAt).toBe(NOW)
		expect(rds.get()).toBe('stopped')
	})
})

describe('wake cancels draining', () => {
	it('a wake arriving during the drain flips DRAINING -> WAKING_SERVICES; DB never stops', async () => {
		const fake = fakeStore(
			makeRow({ state: 'AWAKE', desiredState: 'SLEEPING' }),
		)
		const rds = fakeRds('available')
		const compute = fakeCompute({
			// The wake request lands while a drain step is in flight; the next
			// loop iteration sees desiredState=AWAKE and cancels.
			drainStep: async () => {
				fake.mutate((r) => {
					r.desiredState = 'AWAKE'
					r.version++
				})
				return 'draining' as const
			},
		})
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('AWAKE')
		expect(fake.claims).toContain('DRAINING->WAKING_SERVICES')
		expect(fake.claims).not.toContain('DRAINING->STOPPING_DB')
		expect(rds.calls.stop).toBe(0)
		expect(fake.current().generation).toBe(1) // new wake cycle
	})

	it('a wake already recorded before the drain starts cancels immediately', async () => {
		const fake = fakeStore(
			makeRow({
				state: 'DRAINING',
				desiredState: 'AWAKE',
				lease: { owner: 'gone', expiresAt: NOW - 1 },
			}),
		)
		const rds = fakeRds('available')
		const compute = fakeCompute()
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('AWAKE')
		expect(compute.calls.drainSteps).toBe(0)
		expect(rds.calls.stop).toBe(0)
	})
})

describe('lease handling', () => {
	it('stands down while another owner holds an unexpired lease', async () => {
		const fake = fakeStore(
			makeRow({
				state: 'WAKING_DB',
				desiredState: 'AWAKE',
				lease: { owner: 'other-invocation', expiresAt: NOW + 60_000 },
			}),
		)
		const rds = fakeRds('starting')
		const compute = fakeCompute()
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('WAKING_DB')
		expect(fake.claims).toEqual([])
		expect(rds.calls.start).toBe(0)
	})

	it('takes over an expired lease and completes the wake', async () => {
		const fake = fakeStore(
			makeRow({
				state: 'WAKING_DB',
				desiredState: 'AWAKE',
				generation: 1,
				lease: { owner: 'dead-invocation', expiresAt: NOW - 1 },
			}),
		)
		const rds = fakeRds('starting', 2)
		const compute = fakeCompute()
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('AWAKE')
		expect(fake.claims).toEqual([
			'WAKING_DB->WAKING_SERVICES',
			'WAKING_SERVICES->AWAKE',
		])
	})
})

describe('sleep maintenance (7-day RDS restart pre-emption)', () => {
	it('due window: start -> probe -> restop -> SLEEPING with stoppedAt reset', async () => {
		const fake = fakeStore(
			makeRow({ stoppedAt: NOW - MAINTENANCE_AFTER_MS - 1 }),
		)
		const rds = fakeRds('stopped')
		const compute = fakeCompute()
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('SLEEPING')
		expect(fake.claims).toEqual([
			'SLEEPING->SLEEP_MAINTENANCE',
			'SLEEP_MAINTENANCE->SLEEPING',
		])
		expect(rds.calls.start).toBe(1)
		expect(rds.calls.stop).toBe(1)
		expect(compute.calls.probeDb).toBe(1)
		expect(fake.current().stoppedAt).toBe(NOW)
		expect(fake.current().maintenanceProbedAt).toBeUndefined()
		expect(rds.get()).toBe('stopped')
	})

	it('a real wake during maintenance skips the restop', async () => {
		const fake = fakeStore(
			makeRow({ stoppedAt: NOW - MAINTENANCE_AFTER_MS - 1 }),
		)
		const rds = fakeRds('stopped')
		const compute = fakeCompute({
			probeDb: async () => {
				// Wake request lands mid-maintenance, DB already available.
				fake.mutate((r) => {
					r.desiredState = 'AWAKE'
					r.version++
				})
			},
		})
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('AWAKE')
		expect(fake.claims).toContain('SLEEP_MAINTENANCE->WAKING_SERVICES')
		expect(rds.calls.stop).toBe(0)
	})

	it('drift repair: RDS found running while SLEEPING is probed and restopped', async () => {
		const fake = fakeStore(makeRow({ stoppedAt: NOW - 60_000 }))
		const rds = fakeRds('available')
		const compute = fakeCompute()
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('SLEEPING')
		expect(fake.claims).toEqual([
			'SLEEPING->SLEEP_MAINTENANCE',
			'SLEEP_MAINTENANCE->SLEEPING',
		])
		expect(rds.calls.start).toBe(0)
		expect(rds.calls.stop).toBe(1)
	})
})

describe('drift + error recovery while AWAKE', () => {
	it('checkDrift claims ERROR when RDS is not available, then recovery re-wakes', async () => {
		const fake = fakeStore(makeRow({ state: 'AWAKE', desiredState: 'AWAKE' }))
		const rds = fakeRds('stopped')
		const compute = fakeCompute()
		const result = await drive(
			deps(fake.store, rds.control, compute.control, {
				checkDrift: true,
				allowErrorRecovery: true,
			}),
		)
		expect(result.state).toBe('AWAKE')
		expect(fake.claims).toEqual([
			'AWAKE->ERROR',
			'ERROR->WAKING_DB',
			'WAKING_DB->WAKING_SERVICES',
			'WAKING_SERVICES->AWAKE',
		])
		expect(rds.calls.start).toBe(1)
	})

	it('ERROR is inert without allowErrorRecovery (no hot retry loops)', async () => {
		const fake = fakeStore(
			makeRow({ state: 'ERROR', desiredState: 'AWAKE', lastError: 'boom' }),
		)
		const rds = fakeRds('stopped')
		const compute = fakeCompute()
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('ERROR')
		expect(fake.claims).toEqual([])
	})
})

describe('re-invocation on Lambda timeout', () => {
	it('re-invokes itself and exits when time runs low mid-transition', async () => {
		const fake = fakeStore(
			makeRow({
				state: 'WAKING_DB',
				desiredState: 'AWAKE',
				generation: 1,
				lease: { owner: 'wake:test', expiresAt: NOW + 60_000 },
			}),
		)
		const rds = fakeRds('starting', 1000)
		const compute = fakeCompute()
		let budget = 3
		let reinvoked = 0
		const result = await drive(
			deps(fake.store, rds.control, compute.control, {
				// Enough budget for a few polls, then force the handoff.
				remainingMs: () => (budget-- > 0 ? 10 * 60_000 : 30_000),
				reinvoke: async () => {
					reinvoked++
				},
			}),
		)
		expect(reinvoked).toBe(1)
		expect(result.state).toBe('WAKING_DB')
		expect(result.steps).toContain('out of time: re-invoked self')
	})

	it('hands the live lease to the successor, which completes the wake (chained invocations)', async () => {
		const fake = fakeStore(makeRow({ desiredState: 'AWAKE' }))
		const rds = fakeRds('stopped', 3)
		const compute = fakeCompute()

		// Invocation 1: claims WAKING_DB + starts RDS, then runs out of time.
		let checks = 0
		let reinvoked = 0
		const first = await drive(
			deps(fake.store, rds.control, compute.control, {
				owner: 'wake:first',
				successorOwner: 'wake:successor',
				remainingMs: () => (++checks <= 3 ? 10 * 60_000 : 30_000),
				reinvoke: async () => {
					reinvoked++
				},
			}),
		)
		expect(first.state).toBe('WAKING_DB')
		expect(reinvoked).toBe(1)
		expect(rds.calls.start).toBe(1)
		// The live lease was CAS-transferred, not abandoned to expiry.
		expect(fake.current().lease?.owner).toBe('wake:successor')
		expect(fake.counts.transfers).toBe(1)
		expect(fake.current().attempts).toBe(1)

		// Invocation 2 (the successor): continues IMMEDIATELY under the
		// transferred lease — no takeover, no stand-down — and finishes.
		const second = await drive(
			deps(fake.store, rds.control, compute.control, {
				owner: 'wake:successor',
			}),
		)
		expect(second.state).toBe('AWAKE')
		expect(fake.counts.takeovers).toBe(0)
		expect(fake.claims).toEqual([
			'SLEEPING->WAKING_DB',
			'WAKING_DB->WAKING_SERVICES',
			'WAKING_SERVICES->AWAKE',
		])
	})
})

describe('lease renewal across long RDS waits', () => {
	it('renews before expiry throughout a simulated 10-minute wait, about once a minute', async () => {
		const fake = fakeStore(makeRow({ desiredState: 'AWAKE' }))
		// 20 polls x 30s = 10 simulated minutes of `starting`.
		const rds = fakeRds('stopped', 20)
		const compute = fakeCompute()
		let t = NOW
		const result = await drive(
			deps(fake.store, rds.control, compute.control, {
				now: () => t,
				pollMs: 30_000,
				sleep: async (ms) => {
					t += ms
				},
			}),
		)
		expect(result.state).toBe('AWAKE')
		// Never heartbeated a lease that had already lapsed...
		expect(fake.lateHeartbeats()).toBe(0)
		// ...and renewed conditionally (~1/min), not on every 30s poll.
		expect(fake.counts.heartbeats).toBeGreaterThanOrEqual(5)
		expect(fake.counts.heartbeats).toBeLessThanOrEqual(12)
	})

	it('stands down mid-wait when another owner supersedes the lease', async () => {
		const fake = fakeStore(
			makeRow({
				state: 'WAKING_DB',
				desiredState: 'AWAKE',
				generation: 1,
				lease: { owner: 'wake:me', expiresAt: NOW + DEFAULT_LEASE_MS },
			}),
		)
		const rds = fakeRds('starting', 1000)
		const compute = fakeCompute()
		let t = NOW
		let polls = 0
		const result = await drive(
			deps(fake.store, rds.control, compute.control, {
				owner: 'wake:me',
				now: () => t,
				pollMs: 30_000,
				sleep: async (ms) => {
					t += ms
					// Another invocation steals the lease mid-wait.
					if (++polls === 2) {
						fake.mutate((r) => {
							r.lease = { owner: 'wake:thief', expiresAt: t + DEFAULT_LEASE_MS }
						})
					}
				},
			}),
		)
		expect(result.state).toBe('WAKING_DB')
		expect(result.steps.at(-1)).toContain('standing down')
		expect(fake.claims).toEqual([])
	})
})

describe('bounded transition attempts', () => {
	it('parks a transition that keeps needing continuations in ERROR', async () => {
		const fake = fakeStore(
			makeRow({
				state: 'WAKING_DB',
				desiredState: 'AWAKE',
				generation: 1,
				attempts: MAX_TRANSITION_ATTEMPTS, // the takeover makes it 11
				lease: { owner: 'wake:dead', expiresAt: NOW - 1 },
			}),
		)
		const rds = fakeRds('starting', 1000)
		const compute = fakeCompute()
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('WAKING_DB')
		expect(fake.current().state).toBe('ERROR')
		expect(fake.claims).toEqual(['WAKING_DB->ERROR'])
		expect(fake.current().lastError).toContain('continuations')
	})
})

describe('NAT instance lifecycle', () => {
	it('starts the NAT while WAKING_DB (parallel with the RDS start)', async () => {
		const fake = fakeStore(makeRow({ desiredState: 'AWAKE' }))
		const rds = fakeRds('stopped', 3)
		const compute = fakeCompute()
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('AWAKE')
		expect(compute.calls.natStart).toBeGreaterThanOrEqual(1)
		expect(compute.calls.natStop).toBe(0)
	})

	it('stops the NAT while STOPPING_DB — only after the services drained', async () => {
		const events: string[] = []
		const fake = fakeStore(
			makeRow({ state: 'AWAKE', desiredState: 'SLEEPING' }),
		)
		const rds = fakeRds('available')
		const compute = fakeCompute({
			drainStep: async () => {
				events.push('drain')
				return 'drained' as const
			},
			stopNat: async () => {
				events.push('stopNat')
			},
		})
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('SLEEPING')
		expect(events[0]).toBe('drain')
		expect(events).toContain('stopNat')
	})

	it('re-issues stopNat while holding SLEEPING (leaked-NAT repair)', async () => {
		const fake = fakeStore(makeRow())
		const rds = fakeRds('stopped')
		const compute = fakeCompute()
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('SLEEPING')
		expect(compute.calls.natStop).toBe(1)
	})

	it('a tripped breaker mid-WAKING_DB refuses NAT + RDS and parks in ERROR', async () => {
		const fake = fakeStore(
			makeRow({
				state: 'WAKING_DB',
				desiredState: 'AWAKE',
				generation: 1,
				lease: { owner: 'wake:test', expiresAt: NOW + 60_000 },
			}),
		)
		const rds = fakeRds('starting', 1000)
		const compute = fakeCompute()
		const result = await drive(
			deps(fake.store, rds.control, compute.control, {
				execution: { isEnabled: async () => false },
			}),
		)
		expect(result.state).toBe('WAKING_DB')
		expect(fake.current().state).toBe('ERROR')
		expect(compute.calls.natStart).toBe(0)
		expect(rds.calls.start).toBe(0)
	})
})

describe('sleep cancels waking (P0: budget trip mid-wake must not strand NAT/RDS)', () => {
	it('WAKING_DB + desired SLEEPING + tripped breaker: ungated cleanup to SLEEPING', async () => {
		// The budget shutoff forced desiredState=SLEEPING while RDS was
		// starting AND disabled execution. Cleanup must proceed anyway:
		// stops are never gated.
		const fake = fakeStore(
			makeRow({
				state: 'WAKING_DB',
				desiredState: 'SLEEPING',
				generation: 1,
				lease: { owner: 'wake:test', expiresAt: NOW + 60_000 },
			}),
		)
		const rds = fakeRds('starting', 2)
		const compute = fakeCompute()
		const result = await drive(
			deps(fake.store, rds.control, compute.control, {
				execution: { isEnabled: async () => false },
			}),
		)
		expect(result.state).toBe('SLEEPING')
		expect(fake.claims).toEqual([
			'WAKING_DB->STOPPING_DB',
			'STOPPING_DB->SLEEPING',
		])
		expect(rds.calls.stop).toBe(1)
		expect(compute.calls.natStop).toBeGreaterThanOrEqual(1)
		expect(compute.calls.natStart).toBe(0) // never re-fed the wake
		expect(compute.calls.scaleUp).toBe(0)
		expect(fake.current().state).toBe('SLEEPING') // NOT parked in ERROR
	})

	it('WAKING_SERVICES + desired SLEEPING + tripped breaker: drain first, then stop, never scale up', async () => {
		const fake = fakeStore(
			makeRow({
				state: 'WAKING_SERVICES',
				desiredState: 'SLEEPING',
				generation: 2,
				lease: { owner: 'wake:test', expiresAt: NOW + 60_000 },
			}),
		)
		const rds = fakeRds('available')
		const compute = fakeCompute()
		const result = await drive(
			deps(fake.store, rds.control, compute.control, {
				execution: { isEnabled: async () => false },
			}),
		)
		expect(result.state).toBe('SLEEPING')
		expect(fake.claims).toEqual([
			'WAKING_SERVICES->DRAINING',
			'DRAINING->STOPPING_DB',
			'STOPPING_DB->SLEEPING',
		])
		expect(compute.calls.scaleUp).toBe(0)
		expect(compute.calls.drainSteps).toBe(1)
		expect(rds.calls.stop).toBe(1)
	})

	it('a wake request during the emergency drain still cancels back to WAKING_SERVICES', async () => {
		const fake = fakeStore(
			makeRow({
				state: 'WAKING_SERVICES',
				desiredState: 'SLEEPING',
				generation: 2,
				lease: { owner: 'wake:test', expiresAt: NOW + 60_000 },
			}),
		)
		const rds = fakeRds('available')
		const compute = fakeCompute({
			drainStep: async () => {
				fake.mutate((r) => {
					r.desiredState = 'AWAKE'
					r.version++
				})
				return 'draining' as const
			},
		})
		const result = await drive(deps(fake.store, rds.control, compute.control))
		expect(result.state).toBe('AWAKE')
		expect(fake.claims).toContain('DRAINING->WAKING_SERVICES')
		expect(rds.calls.stop).toBe(0)
	})
})

describe('stepwise drain (P1: no blocking loop inside the orchestrator)', () => {
	it('renews the lease between drain steps of a long drain — never lets it lapse', async () => {
		const fake = fakeStore(
			makeRow({ state: 'AWAKE', desiredState: 'SLEEPING' }),
		)
		const rds = fakeRds('available')
		let t = NOW
		let steps = 0
		const compute = fakeCompute({
			// 8 x 30s of simulated wind-down, one step per driver iteration.
			drainStep: async () => {
				if (++steps < 8) return 'draining'
				return 'drained'
			},
		})
		const result = await drive(
			deps(fake.store, rds.control, compute.control, {
				now: () => t,
				pollMs: 30_000,
				sleep: async (ms) => {
					t += ms
				},
			}),
		)
		expect(result.state).toBe('SLEEPING')
		expect(steps).toBe(8)
		// The lease was renewed BETWEEN steps by the outer loop.
		expect(fake.lateHeartbeats()).toBe(0)
		expect(fake.counts.heartbeats).toBeGreaterThanOrEqual(1)
	})

	it('stands down between steps when another owner steals the lease', async () => {
		const fake = fakeStore(
			makeRow({
				state: 'DRAINING',
				desiredState: 'SLEEPING',
				generation: 1,
				lease: { owner: 'wake:me', expiresAt: NOW + DEFAULT_LEASE_MS },
			}),
		)
		const rds = fakeRds('available')
		let steps = 0
		const compute = fakeCompute({
			drainStep: async () => {
				steps++
				// The thief takes over while this step is in flight.
				fake.mutate((r) => {
					r.lease = { owner: 'wake:thief', expiresAt: NOW + DEFAULT_LEASE_MS }
				})
				return 'draining'
			},
		})
		const result = await drive(
			deps(fake.store, rds.control, compute.control, { owner: 'wake:me' }),
		)
		expect(steps).toBe(1) // exactly one step before standing down
		expect(result.state).toBe('DRAINING')
		expect(result.steps.at(-1)).toContain('standing down')
		expect(fake.claims).toEqual([]) // no STOPPING_DB claim
		expect(rds.calls.stop).toBe(0)
	})

	it('a Lambda running out of time mid-drain hands off instead of blocking', async () => {
		const fake = fakeStore(
			makeRow({
				state: 'DRAINING',
				desiredState: 'SLEEPING',
				generation: 1,
				lease: { owner: 'wake:me', expiresAt: NOW + 60_000 },
			}),
		)
		const rds = fakeRds('available')
		const compute = fakeCompute({
			drainStep: async () => 'draining' as const,
		})
		let budget = 2
		let reinvoked = 0
		const result = await drive(
			deps(fake.store, rds.control, compute.control, {
				owner: 'wake:me',
				successorOwner: 'wake:successor',
				remainingMs: () => (budget-- > 0 ? 10 * 60_000 : 30_000),
				reinvoke: async () => {
					reinvoked++
				},
			}),
		)
		expect(reinvoked).toBe(1)
		expect(result.state).toBe('DRAINING')
		expect(fake.current().lease?.owner).toBe('wake:successor')
	})
})
