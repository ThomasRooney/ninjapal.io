# PitMinder AWS infrastructure

CDK v2 app (bun-driven) implementing `ARCHITECTURE.md` — the decided record;
read it first. Account `prod-pitminder` (836003244283), region `eu-west-2`,
CDK bootstrapped in `eu-west-2` + `us-east-1`.

## Stacks

| Stack | Status | Contents |
|---|---|---|
| `pitminder-data` | **deployed** | VPC (2 AZ, **no NAT**, S3+DynamoDB gateway endpoints), RDS Postgres 17 `pitminder-prod` (Single-AZ db.t4g.micro, 20GB gp3, `rds.logical_replication=1`, `max_slot_wal_keep_size=1024`, deletion protection + RETAIN, master secret pinned RETAIN), DynamoDB `pitminder-power` (on-demand, PITR, stream), private photos bucket (60-day expiry on `photos/`), ECR `pitminder/zero-cache` + `pitminder/sync-worker` (scan-on-push, keep 20), Route53 zone `pitminder.com`, the power orchestration + budget guardrail. Termination protection ON. |
| `pitminder-compute` | **not yet built** | SSR Lambda + API Gateway (streaming), zero-cache + sync-worker Fargate services, CloudFront, static assets. Consumes `pitminder-data` exclusively via SSM. |

Everything cross-stack goes through SSM parameters `/pitminder/prod/<unit>/<key>`
— never CloudFormation exports (they deadlock on reshapes; reflow lesson).
See `/pitminder/prod/data/*` for the full contract (vpc/subnets/db/table/
bucket/repos/zone + `acm-cert-arn-{eu-west-2,us-east-1}`).

## Deploying

```bash
cd infra/aws
bun install

# Option A: assume-role profile (auto-refreshes hourly — preferred)
aws configure set profile.pitminder-deploy.role_arn arn:aws:iam::836003244283:role/OrganizationAccountAccessRole
aws configure set profile.pitminder-deploy.source_profile default
aws configure set profile.pitminder-deploy.region eu-west-2
export AWS_PROFILE=pitminder-deploy

# Option B: one-hour STS session (re-eval hourly)
eval "$(scripts/assume-role.sh)"

bunx cdk diff pitminder-data
bunx cdk deploy pitminder-data --require-approval never

bun run check   # biome + tsc
bun run test    # 119 vitest tests incl. exhaustive transition matrix + synth assertions
```

Two one-time seeds live OUTSIDE CloudFormation on purpose:

```bash
# Execution kill switch — deliberately not CFN-managed so a redeploy can
# never silently re-arm a tripped budget breaker. Orchestrator fails closed
# (refuses RDS start / ECS scale-up) while missing or != enabled.
aws ssm put-parameter --name /pitminder/prod/execution/enabled --value enabled --type String

# ACM certs for app.pitminder.com + sync.pitminder.com in eu-west-2 AND
# us-east-1 — imperative because a CFN DNS-validated cert blocks the deploy
# until validation, and validation needs the (owner-approved, later)
# nameserver cutover. They sit PENDING_VALIDATION until then; ARNs land in
# SSM, validation CNAMEs land in the zone. Idempotent.
bun scripts/request-certs.ts
```

Do NOT touch the registrar. The zone's `NameServers` stack output is applied
at the Vercel registrar only with explicit owner approval (migration step 6).

## The power-state machine

One DynamoDB row `POWER#prod` in `pitminder-power` owns the stack's power
state: `SLEEPING → WAKING_DB → WAKING_SERVICES → AWAKE → DRAINING →
STOPPING_DB → SLEEPING`, plus `SLEEP_MAINTENANCE` (7-day RDS restart
pre-emption at `stoppedAt + 6d18h`, which also serves drift repair) and
`ERROR`. Every mutation is a conditional write — version fencing on control
fields, a heartbeaten lease for the in-flight transition, a generation
counter fencing component readiness and stale heartbeats. Timestamps are
epoch milliseconds.

- `lambda/power/lib.ts` — the transition table + every conditional mutation
- `lambda/power/driver.ts` — re-entrant driver: one re-read + one step per
  iteration; interfaces `RdsControl` / `ComputeControl` / `ExecutionControl`
  / `PowerStore`
- `lambda/power/wake.ts` — `pitminder-power-wake`, the ONLY writer that moves
  states: DDB-stream triggered (desiredState changes), reconciler-delegated,
  self-chains (async re-invoke, depth-capped at 6) past its 13-min timeout
  while RDS transitions run
- `lambda/power/idle-cron.ts` — every 30 min; flips `desiredState=SLEEPING`
  only when AWAKE with BOTH `lastWebAt` and `lastRealDeviceOnlineAt` older
  than 8h, pinned to the exact values read so any concurrent stamp wins
- `lambda/power/reconciler.ts` — hourly; detects (error state, expired
  leases, maintenance due, desired mismatch) and delegates to wake with
  `allowErrorRecovery` + `checkDrift`
- `lambda/budget-shutoff.ts` — $40 budget SNS → writes
  `/pitminder/prod/execution/enabled=disabled` (the $20 tier only alerts on
  `pitminder-budget-alert`; subscribe an email there if wanted)

Writers elsewhere (the app / worker, once on AWS) use `lib.ts`:
`stampWebActivity` (self-throttled 1/5min), `requestWake`,
`stampRealDeviceOnline` — the WORKER must exclude `is_simulated` devices;
the library stores whatever it is sent.

IAM is least-privilege per Lambda: RDS start/stop/describe on the one
instance ARN, DynamoDB on the one table, SSM on the one parameter, no
wildcard resources (synth-asserted in `test/data-stack.test.ts`).

### Ops

```bash
export AWS_PROFILE=pitminder-deploy   # scripts default to table pitminder-power / db pitminder-prod
bun scripts/power-tool.ts status              # row + RDS status
bun scripts/power-tool.ts seed [STATE]        # create the row
bun scripts/power-tool.ts wake                # request a wake
bun scripts/power-tool.ts force-idle          # backdate signals >8h + run the idle cron
bun scripts/power-tool.ts invoke-reconciler
bun scripts/power-tool.ts watch               # 5s poll, logs every change with +elapsed
```

Measured on the live stack (2026-08-06, db.t4g.micro, eu-west-2):
RDS **start** (`stopped → available`) ≈ **8.5 min**; RDS **stop**
(`available → stopped`) ≈ **4.5 min**. The wake UX must communicate minutes,
not seconds — the Loading state gets progress from the row (state +
generation), later surfaced via `/api/ready` in the compute stack.

## Stubbed for pitminder-compute

`createStubComputeControl` (`lambda/power/aws.ts`) reports every component
ready immediately so the DB half runs end-to-end today. The compute stack
replaces it with an ECS-backed `ComputeControl`:

- `scaleUp(generation)` — zero-cache + sync-worker Fargate `desiredCount` 0→1
- `readyComponents(generation)` — websocket-upgrade probe (zero-cache),
  worker heartbeat, each fenced on the wake generation
- `drain()` — worker first (SIGTERM + side-effect leases), then zero-cache
  (placeholder DNS restored first), wait `runningCount` 0
- `probeDb()` — in-VPC TLS SQL probe + logical slot/publication check

plus `/api/ready` (202+Retry-After while warming, 200 when all components
ready at the current generation, 503 on ERROR) and the dashboard/worker
activity stamps. Components are named in `lib.ts` `COMPONENTS`
(`zero-cache`, `sync-worker`).
