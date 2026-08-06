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
			} else {
				row.lease = undefined
			}
			if (input.to === 'SLEEPING') {
				row.stoppedAt = input.now
				row.maintenanceProbedAt = undefined
			}
			if (input.to === 'AWAKE') row.lastError = undefined
			if (input.to === 'ERROR') row.lastError = input.errorMessage ?? 'unknown'
			claims.push(`${from}->${input.to}`)
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
			row.lease.expiresAt = now + DEFAULT_LEASE_MS
			return { applied: true }
		},
		async markComponentReady(component, generation) {
			if (row.generation !== generation)
				return { applied: false, reason: 'stale' }
			row.componentReady[component] = generation
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
			return { applied: true }
		},
		async recordSoftError(message) {
			row.lastError = message
			return { applied: true }
		},
	}
	return {
		store,
		claims,
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
	const calls = { scaleUp: 0, drain: 0, probeDb: 0 }
	const control: ComputeControl = {
		async scaleUp() {
			calls.scaleUp++
		},
		async readyComponents() {
			return ['zero-cache', 'sync-worker']
		},
		async drain() {
			calls.drain++
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

	it('refuses to start RDS when execution is disabled (fail closed)', async () => {
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
		expect(result.state).toBe('SLEEPING')
		expect(claims).toEqual([])
		expect(rds.calls.start).toBe(0)
		expect(current().lastError).toContain('execution disabled')
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
		expect(compute.calls.drain).toBe(1)
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
			// The wake request lands while services are draining.
			drain: async () => {
				fake.mutate((r) => {
					r.desiredState = 'AWAKE'
					r.version++
				})
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
		expect(compute.calls.drain).toBe(0)
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
})
