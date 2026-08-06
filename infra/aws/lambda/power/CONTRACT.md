# Power-row contract — `pitminder-power` / `POWER#prod`

CANONICAL. The deployed table and live row use exactly this shape; every
writer in every repo/branch (app, worker, orchestrator, ops tooling)
conforms to it. `lib.ts` in this directory is the reference implementation —
the app's `src/server/power/power-row.ts` must produce byte-identical
expressions for the writer operations listed under "External writers".

- **Table**: `pitminder-power` (name also at SSM `/pitminder/prod/data/power-table-name`)
- **Key**: partition key `pk` (S); the power row is `pk = "POWER#prod"`. No sort key.
- **All timestamps are epoch milliseconds stored as DynamoDB Number (N).**
- Reads use `ConsistentRead: true`.
- **Every mutation is a ConditionExpression write.** A
  `ConditionalCheckFailedException` is an expected outcome (a lost race),
  never an error to retry blindly.

## Attributes

| Attribute | DDB type | Meaning |
|---|---|---|
| `pk` | S | `POWER#prod` |
| `state` | S | `SLEEPING \| WAKING_DB \| WAKING_SERVICES \| AWAKE \| DRAINING \| STOPPING_DB \| SLEEP_MAINTENANCE \| ERROR` |
| `desiredState` | S | `AWAKE \| SLEEPING` |
| `version` | N | Control-mutation counter. Bumped by every control write (claims, takeover, desired-state changes, probe marker). **NOT** bumped by activity stamps, worker heartbeats, or lease heartbeats/transfers. Claims are fenced `version = :readValue`. |
| `generation` | N | Wake-cycle counter. Bumped when a wake cycle starts (`* -> WAKING_DB`, `DRAINING -> WAKING_SERVICES`, `SLEEP_MAINTENANCE -> WAKING_SERVICES`). Fences component readiness + orchestrator heartbeats. |
| `lease` | M `{owner: S, expiresAt: N}` | Held by the orchestrator invocation driving a transitional state (`WAKING_DB`, `WAKING_SERVICES`, `DRAINING`, `STOPPING_DB`, `SLEEP_MAINTENANCE`). Absent in `SLEEPING`/`AWAKE`/`ERROR`. Expired leases may be taken over; live ones only CAS-transferred by their owner. |
| `attempts` | N (optional) | Continuations (takeovers + reinvoke handoffs) of the CURRENT transition. Reset to 0 by every claim into a transitional state; removed on terminal claims; orchestrator parks the row in ERROR past 10. |
| `lastWebAt` | N (optional) | Last authenticated web/MCP activity. Self-throttled to one write per 5 min via its condition. |
| `lastRealDeviceOnlineAt` | N (optional) | Last time a **non-simulated** device reported online. **Excluding `is_simulated` devices is the WORKER's job** — the row stores whatever it is sent. |
| `stoppedAt` | N (optional) | Set (to now) by every claim into `SLEEPING`. Drives the 6d18h maintenance window. |
| `maintenanceProbedAt` | N (optional) | Set after the maintenance SQL probe; `> stoppedAt` means the restop half is pending. Removed on claims into `SLEEPING`. |
| `componentReady` | M component→N | component name (`zero-cache`, `sync-worker`) → generation it reported ready at. Seeded `{}`. |
| `keepWarmUntil` | N (optional) | Operator hold: idle evaluation is skipped while `keepWarmUntil > now`. Writers cap it at `now + 24h`. Never consulted by `requestWake`. |
| `lastError` | S (optional) | Last operational error; set by claims into `ERROR`, removed by claims into `AWAKE`. |
| `updatedAt` | N | Touched by every write. Informational only — never fence on it. |

## Idle rule (evaluated by the 30-min cron; app never evaluates it)

`state == AWAKE` AND no unexpired `keepWarmUntil` AND `now - lastWebAt > 8h`
AND `now - lastRealDeviceOnlineAt > 8h` (a missing signal counts as idle).
The cron's write pins the exact `lastWebAt`/`lastRealDeviceOnlineAt` it read,
so any concurrent stamp defeats the decision.

## External writers (what the app/worker are allowed to do)

These four operations — and NOTHING else — are open to non-orchestrator
writers. Names below are `ExpressionAttributeNames`; supply them exactly
(`#pk="pk"`, `#web="lastWebAt"`, `#device="lastRealDeviceOnlineAt"`,
`#desired="desiredState"`, `#version="version"`, `#generation="generation"`,
`#ready="componentReady"`, `#hold="keepWarmUntil"`, `#updatedAt="updatedAt"`,
`#c=<component name>`).

### 1. Web activity stamp (dashboard request / valid MCP bearer) — ≤1 write/5min, self-throttling
```
UpdateExpression:    SET #web = :now, #updatedAt = :now
ConditionExpression: attribute_exists(#pk) AND (attribute_not_exists(#web) OR #web <= :cutoff)
:now    = Date.now()          (N)
:cutoff = :now - 300000       (N)
```
Condition failure = throttled; ignore it. Never bump `version` here.

### 2. Wake request (authenticated dashboard hit / MCP bearer)
```
UpdateExpression:    SET #desired = :awake, #web = :now, #version = #version + :one, #updatedAt = :now
ConditionExpression: attribute_exists(#pk) AND #desired <> :awake
:awake = "AWAKE"  :now = Date.now()  :one = 1
```
The `version` bump is REQUIRED — it fences off an in-flight
`DRAINING -> STOPPING_DB` claim so wake-cancels-draining works. Condition
failure = already desired awake; fall back to the activity stamp (1).
The DynamoDB stream then triggers the orchestrator; the app never drives
transitions itself.

### 3. Worker heartbeat (sync-worker, once per poll cycle) — ONE write
```
UpdateExpression:    SET #ready.#c = :gen, #updatedAt = :now            -- always
                     SET ..., #device = :now                            -- ONLY when a non-simulated device is online
ConditionExpression: attribute_exists(#pk) AND #generation = :gen
:gen = the generation the worker was started for  :now = Date.now()
```
Generation-fenced as one atomic write: a worker from a superseded wake cycle
can neither mark itself ready nor resurrect device activity. Condition
failure = stale generation → the worker should drain itself. The worker MUST
NOT set `#device` for `is_simulated` devices (sim always reports online and
would defeat idle forever).

### 4. Keep-warm hold (operator/admin surface)
```
hold:    SET #hold = :until, #updatedAt = :now
         ConditionExpression: attribute_exists(#pk) AND (attribute_not_exists(#hold) OR #hold < :until)
         :until = min(now + hours*3600000, now + 86400000)   -- 24h hard cap
release: REMOVE #hold SET #updatedAt = :now
         ConditionExpression: attribute_exists(#pk) AND attribute_exists(#hold)
```
Hold-condition failure = an existing hold reaches further; keep it.

## Orchestrator-only mutations (never call these from the app/worker)

Claims (state transitions, fenced on `state` + `version` + lease), lease
takeover/transfer/heartbeat, `markMaintenanceProbed`, `forceSleep` (budget
shutoff), `seedRow` (ops). See `lib.ts` for the exact expressions. The legal
transition graph lives in `TRANSITIONS` there and is enforced before any
write.

## Reading for UX

The Loading state derives progress from `state` + `generation` +
`componentReady` (all components at the current generation = ready). Poll
reads are cheap; they must NOT stamp activity (readiness polling never keeps
the stack awake).
