# PitMinder AWS infrastructure

CDK v2 app (bun-driven) implementing `ARCHITECTURE.md` — the decided record;
read it first. Account `prod-pitminder` (836003244283), region `eu-west-2`,
CDK bootstrapped in `eu-west-2` + `us-east-1`.

## Stacks

| Stack | Status | Contents |
|---|---|---|
| `pitminder-data` | **deployed** | VPC (2 AZ, **no NAT**, S3+DynamoDB gateway endpoints), RDS Postgres 17 `pitminder-prod` (Single-AZ db.t4g.micro, 20GB gp3, `rds.logical_replication=1`, `max_slot_wal_keep_size=1024`, deletion protection + RETAIN, master secret pinned RETAIN), DynamoDB `pitminder-power` (on-demand, PITR, stream), private photos bucket (60-day expiry on `photos/`), ECR `pitminder/zero-cache` + `pitminder/sync-worker` (scan-on-push, keep 20), Route53 zone `pitminder.com`, the power orchestration + budget guardrail. Termination protection ON. |
| `pitminder-compute` | **deployed** (rehearsal mode: CloudFront default cert, custom domains behind `-c postCutover=true`) | SSR Lambda `pitminder-ssr` (nodejs22, 2048MB, in-VPC) behind Regional REST API `ResponseTransferMode=STREAM` behind CloudFront `d3o340osmhofue.cloudfront.net`; Fargate cluster `pitminder` with `pitminder-zero-cache` (512/1024) + `pitminder-sync-worker` (1024/2048, Playwright) at desiredCount 0 (ARM64, stopTimeout 60); fck-nat t4g.nano `pitminder-nat` routing the private subnets; in-VPC `pitminder-db-probe`; zero-origin placeholder record. Publishes `/pitminder/prod/compute/*`. Consumes `pitminder-data` exclusively via SSM. |

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
bun run test    # 192 vitest tests incl. exhaustive transition matrix + synth assertions
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

## Images → ECR (manual until CI exists)

Both service images are tagged `sha-<full git sha>` of the commit they were
built from. The zero-cache image is the upstream `rocicorp/zero` image at the
version `package.json` pins for `@rocicorp/zero` (currently
`0.20.2025052100`, the same tag prod Railway ran) — retagged, never rebuilt.
Fargate runs ARM64 (`runtimePlatform`), so pull/build `linux/arm64`.

```bash
SHA=$(git rev-parse HEAD)
ECR=836003244283.dkr.ecr.eu-west-2.amazonaws.com
aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin "$ECR"

# zero-cache: retag the pinned upstream image (keep a version tag too)
docker pull --platform linux/arm64 rocicorp/zero:0.20.2025052100
docker tag rocicorp/zero:0.20.2025052100 "$ECR/pitminder/zero-cache:sha-$SHA"
docker tag rocicorp/zero:0.20.2025052100 "$ECR/pitminder/zero-cache:0.20.2025052100"
docker push "$ECR/pitminder/zero-cache:sha-$SHA"
docker push "$ECR/pitminder/zero-cache:0.20.2025052100"

# sync-worker: built from the repo (Dockerfile.sync; .dockerignore keeps
# .env and local state out of the context — do not remove it)
docker build -f Dockerfile.sync --platform linux/arm64 -t "$ECR/pitminder/sync-worker:sha-$SHA" .
docker push "$ECR/pitminder/sync-worker:sha-$SHA"
```

When bumping `@rocicorp/zero`, also bump `ZERO_PROBE_PATH` in
`lib/compute-stack.ts` (`/sync/v<PROTOCOL_VERSION>/connect` — read
`PROTOCOL_VERSION` from `node_modules/@rocicorp/zero/out/zero-protocol/src/protocol-version.js`).

## Deploying pitminder-compute

One out-of-band secret feeds the whole app:

```bash
# /pitminder/prod/app/env (Secrets Manager, JSON): app secrets copied from
# the local .env + DATABASE_URL/ZERO_CVR_DB/ZERO_CHANGE_DB composed from the
# RDS master secret. Idempotent; never prints values.
bun scripts/create-app-secret.ts /path/to/.env
```

Then build + deploy (two-pass on first deploy):

```bash
# 1. SSR artifact (custom streaming entry; serveStatic keeps /assets in-Lambda)
scripts/build-ssr.sh            # optionally: scripts/build-ssr.sh rehearsal.env

# 2. First pass — CloudFront domain not yet known
bunx cdk deploy pitminder-compute -c imageTag=sha-$SHA --require-approval never

# 3. Second pass — pin PUBLIC_ORIGIN/BETTER_AUTH_URL/MCP resource to the
#    CloudFrontDomain output (Lambda env only; SSR HTML uses relative URLs
#    so no client rebuild is needed for this)
bunx cdk deploy pitminder-compute -c imageTag=sha-$SHA \
  -c publicOrigin=https://<CloudFrontDomain> --require-approval never

# 4. Hashed assets -> the S3 assets origin (see below). Run after EVERY
#    deploy that changed the client bundle.
scripts/sync-assets.sh
```

### /assets/* comes from S3, not the Lambda

Incident (post-cutover, 2026-08-09): a cold-pop first load fans out 20+
parallel `/assets/*` fetches — over the account's 10-concurrency Lambda
quota — so uncached chunks 500'd through APIGW and dynamic imports failed
until the edge warmed. The `/assets/*` behavior now serves a private S3
bucket via OAC (`CACHING_OPTIMIZED`, GET/HEAD) wrapped in an ORIGIN GROUP
whose fallback is the Lambda origin (serveStatic stays on): chunks missing
from S3 — the deploy-before-sync window, or an open tab lazy-loading a
build that predates the bucket — fall back instead of 404ing. Root-level
public files (`sw.js` for web push, favicons, `manifest.json`) still come
from the Lambda default behavior. `scripts/sync-assets.sh` uploads
`dist/ssr/public/assets` with `public,max-age=31536000,immutable` (no
`--delete`: hashed names are immutable and old sessions may still fetch
them) and invalidates `/assets/*`.

Post-deploy, stop the NAT instance unless a wake is imminent (CloudFormation
launches it running; the orchestrator owns it from then on):
`aws ec2 stop-instances --instance-ids <NatInstanceId output>`.

### Rotating /pitminder/prod/app/env

Lambda env values are CFN dynamic references (deploy-time) and ECS secrets
resolve at task START — rotating the secret alone changes NOTHING running.
The stack stamps a non-secret `APP_SECRET_VERSION` token into the Lambda env
and both task definitions; bumping it forces the resolved values to replace.
Order matters:

1. `bun scripts/power-tool.ts force-idle` (or wait for idle) — SLEEPING.
2. Rotate: update the secret (`bun scripts/create-app-secret.ts` re-runs it).
3. Deploy with `-c appSecretVersion=v<next>` (plus the usual context).
4. `bun scripts/power-tool.ts wake` — services boot with the new values.

Skipping step 1 leaves live tasks on the OLD credentials until their next
natural restart — fine for additive rotations, wrong for revocations.

## Schema onto RDS (rehearsed 2026-08-07)

RDS is private; the least-machinery path is an SSM port-forward through the
NAT instance (it runs the SSM agent + has 5432 ingress to the DB SG for
exactly this). Requires `session-manager-plugin` locally.

```bash
# stack must be awake (or WAKING_SERVICES) so RDS is up
bun scripts/power-tool.ts wake && bun scripts/power-tool.ts watch

aws ssm start-session --target <nat-instance-id> \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["<rds-endpoint>"],"portNumber":["5432"],"localPortNumber":["15432"]}'

# psql via the tunnel (password from the RDS master secret; sslmode=require
# — rds.force_ssl is on). Apply, in order:
#  1. CREATE DATABASE zero_cvr; CREATE DATABASE zero_change;
#  2. the app schema: pg_dump --schema-only --no-owner --no-privileges
#     --schema=public <local-dev-url> | psql <tunnel-url>
#     (PUBLIC SCHEMA ONLY — zero-cache owns/recreates its own schemas
#      (pitminder, pitminder_0, cdc/cvr) and its publication on first start)
#  3. zero permissions: ZERO_UPSTREAM_DB=<tunnel-url> ZERO_APP_ID=pitminder \
#       bunx zero-deploy-permissions -p src/server/db/zero-permissions.ts
#  4. demo seed: APP_URL=https://<cloudfront> ZERO_UPSTREAM_DB=<tunnel-url-sslmode=no-verify> \
#       PITMINDER_ALLOW_REMOTE_DB=true bun scripts/seed-demo.ts
```

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
  `/pitminder/prod/execution/enabled=disabled`, forces
  `desiredState=SLEEPING`, and invokes the orchestrator so anything RUNNING
  winds down (drain → StopDBInstance); failures land in
  `pitminder-budget-shutoff-dlq`, which alarms to `pitminder-budget-alert`
  (subscribe an email there if wanted). **Honesty note: AWS Budgets
  actual-spend data refreshes roughly every 8–12 hours — this is a delayed
  guardrail against runaway drift, NOT an invoice cap.** The $20 tier only
  alerts.

**`lambda/power/CONTRACT.md` is the canonical row contract** — attribute
names/types (epoch-ms numbers), the exact ConditionExpressions external
writers must use (web stamp, requestWake, the worker's single
generation-fenced heartbeat+activity write, keep-warm hold), and what is
orchestrator-only. The app's `src/server/power/power-row.ts` is written
against it. The WORKER must exclude `is_simulated` devices; the row stores
whatever it is sent. An operator keep-warm hold (`keepWarmUntil`, capped
24h) defers the idle rule without affecting wakes.

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
bun scripts/power-tool.ts hold 4              # keep-warm hold (defers idle; capped 24h)
bun scripts/power-tool.ts release             # release the hold
bun scripts/power-tool.ts invoke-reconciler
bun scripts/power-tool.ts watch               # 5s poll, logs every change with +elapsed
```

Measured on the live stack (2026-08-06, db.t4g.micro, eu-west-2):

| Path | Measured |
|---|---|
| wake request → row AWAKE (end to end) | **6m58s** |
| `StartDBInstance` → RDS `available` | 6m56s |
| requestWake stream event → orchestrator claim | ~1.2s |
| idle decision → row SLEEPING (end to end) | 8m28s (twice) |
| `StopDBInstance` → RDS `stopped` | ~8m20s |
| stub component readiness + AWAKE advance | ~150ms |

The wake UX must communicate **minutes, not seconds** — budget ~7 min from a
cold wake before the DB is even up (ECS adds more later). The Loading state
gets progress from the row (state + generation), surfaced via `/api/ready`
in the compute stack. Both transitions completed inside a single 13-min
orchestrator invocation; the self-reinvoke chain is headroom.

## ComputeControl (the compute half of the machine)

`lambda/power/compute-control.ts` is the ECS/NAT-backed `ComputeControl` the
wake orchestrator uses whenever the `/pitminder/prod/compute/*` SSM contract
exists (a PARTIAL contract fails the invocation loudly; only a fully absent
one falls back to `createStubComputeControl`):

- `startNat`/`stopNat` — the NAT instance rides up during `WAKING_DB`
  (parallel with the RDS start, budget-gated every poll) and down during
  `STOPPING_DB` + while holding `SLEEPING` (leak repair). Idempotent;
  `IncorrectInstanceState` tolerated.
- `scaleUp(generation)` — both services to desiredCount 1. The worker fences
  power writes on the generation it BOOTED with (the container entry reads
  the row — `scripts/sync-worker-entry.ts`), so when a new generation
  supersedes a still-running worker (wake-cancels-draining) the service is
  force-redeployed; the last-scaled generation is tracked in
  `/pitminder/prod/compute/worker-generation` (orchestrator-owned, not CFN).
- `readyComponents(generation)` — zero-cache: raw-socket websocket-upgrade
  probe (`/sync/v16/connect`) against the task public IP; sync-worker: its
  own generation-fenced heartbeat read back from the row. In DNS mode the
  passing probe also UPSERTs `zero-origin.pitminder.com` → task IP,
  generation-fenced (a superseded wake never publishes).
- `drain(keepAlive)` — placeholder record restored first (DNS mode), worker
  drained before zero-cache (SIGTERM + stopTimeout 60), waits runningCount 0
  heartbeating the orchestrator lease between polls; aborts cleanly when
  superseded.
- `probeDb()` — invokes `pitminder-db-probe` (in-VPC, `DB_URL` via CFN
  dynamic reference so it works with the NAT stopped during maintenance).

`/api/ready` (202+Retry-After while warming, 200 when all components ready
at the current generation, 503 on ERROR) and the dashboard/worker activity
stamps live in the app. Components are named in `lib.ts` `COMPONENTS`
(`zero-cache`, `sync-worker`).

## Rehearsal runbook (executed 2026-08-07; repeat before cutover)

The full wake/sleep cycle against real resources, everything left SLEEPING:

1. `bun scripts/power-tool.ts wake` + `watch` — SLEEPING→WAKING_DB (NAT
   starts in parallel with `StartDBInstance`) →WAKING_SERVICES (both
   services to 1; worker boots with the row generation) →AWAKE once the
   zero-cache websocket probe passes and the worker heartbeats.
2. App checks through the edge (see `rehearse-app*.sh` shapes in the branch
   history): `/api/ready` 200, demo login, `/app` + device SSR, steer-chat
   SSE (POST `/api/chat` with `{deviceId,threadId,turnId,messages[parts]}`),
   MCP 401 contract, OAuth discovery routes.
3. Browser zero-sync check: the client must speak **wss to its own domain**
   (browsers hard-block `ws://` from https pages — no flag bypasses it).
   Pre-cutover that means: get the task IP, redeploy with
   `-c rehearsalZeroOrigin=<ip-dashes>.sslip.io` (adds a `/sync/*`
   CloudFront behavior) and build the client with
   `VITE_PUBLIC_SERVER=https://<cloudfront-domain>`. The task IP changes
   every wake — this knob is per-rehearsal scaffolding; post-cutover the
   sync.pitminder.com distribution replaces it.
4. `bun scripts/power-tool.ts force-idle` — AWAKE→DRAINING (worker
   SIGTERM-drains first, then zero-cache) →STOPPING_DB (NAT stops
   immediately; RDS stop ~8min) →SLEEPING. Verify: desired counts 0,
   `aws ecs list-tasks` empty, NAT `stopped`, RDS `stopped`, no stray
   wake invocations from activity stamps (the stream filter + `shouldDrive`
   skip them).

Measured (2026-08-07; bring-up wake + one clean timed wake + two timed
sleeps — RDS transition times vary A LOT between runs, budget the top end):

| Phase | Measured |
|---|---|
| wake request → WAKING_DB claim (stream trigger) | 0.9s |
| NAT instance start → running (parallel with RDS) | ~9s |
| StartDBInstance → RDS `available` | **7m01s and 13m12s** across two cycles (prior stub cycle: 6m56s) |
| WAKING_SERVICES → AWAKE (clean cycle: zero-cache pull+boot+replica+probe 68s; worker 2GB pull+boot+first-cycle heartbeat ~1m42s, the tail) | 1m42s |
| wake request → AWAKE end to end (clean cycle) | **14m56s** (with the fast-RDS cycle it would be ~8m50s) |
| 13-min Lambda budget lease handoff → self-reinvoked successor | exercised in prod during the clean wake (10:36:50Z) |
| force-idle → services drained (worker SIGTERM-drains ~7s first, then zero-cache) | 14–21s |
| force-idle → NAT stopped | ~30–49s |
| force-idle → SLEEPING end to end (RDS stop dominates) | **6m55s and 8m49s** across two cycles |
| warm TTFB through CloudFront (ready/app/device SSR) | 0.07–0.6s |
| steer-chat SSE TTFB through the edge (mid-generation stream) | 0.17–0.45s (short answer total 1.3–2.2s) |
| cold Lambda TTFB (2048MB, 5 live samples: 4.24/4.27/4.37/4.50/4.53) | **p50 4.37s** |
| stream-filter suppression | 46 wake invocations in a 70-min awake window, 1 actual drive — 45 no-op stream events (heartbeats/stamps) skipped in ~2ms |
| post-review abbreviated cycle (stepwise drain + probe-gated scale-up live) | wake 9m01s (db-probe invoked pre-scale-up — log group's FIRST stream; worker booted gen 4), sleep 6m50s, end state clean |

## Post-cutover flips (after the owner-approved nameserver switch)

In order, once ACM validation completes:

1. `bun scripts/request-certs.ts` — confirm both cert ARNs are ISSUED.
2. Redeploy compute with `-c postCutover=true -c publicOrigin=https://app.pitminder.com`
   (plus the current `imageTag`): adds `app.pitminder.com` +
   `sync.pitminder.com` domains/certs/aliases, the sync CloudFront
   distribution over `zero-origin.pitminder.com:4848`, and flips
   `/pitminder/prod/compute/dns-enabled` to `true` so ComputeControl starts
   publishing/restoring the zero-origin record (generation-fenced).
3. Rebuild the client with `VITE_PUBLIC_SERVER=https://sync.pitminder.com`
   (`scripts/build-ssr.sh` + redeploy) — the rehearsal build pointed it at
   the task IP directly.
4. Re-run `create-app-secret.ts` only if any secret changed; PUBLIC_ORIGIN
   flows from the context flag, not the secret.
5. Google OAuth console: add `https://app.pitminder.com` redirect URIs.

## Residual risks (accepted, per ARCHITECTURE.md)

- **zero-cache port 4848 is IP-open** while a task runs: zero-cache cannot
  verify a CloudFront origin-secret header in-process, so the SG cannot be
  restricted to CloudFront without an ALB (+$25–32/mo, rejected). Exposure
  window = awake time only; the endpoint honours nothing without a valid
  `ZERO_AUTH_SECRET` JWT. Revisit: nginx sidecar checking the header.
- **CloudFront → zero-origin is plain HTTP** (post-cutover) until the
  certbot-Lambda origin-TLS pattern is ported from reflow: viewer→edge is
  TLS, edge→origin is not. Tracked as a post-cutover hardening task.
- **The zero-origin Route53 record is CFN-managed AND runtime-UPSERTed**
  (drift by design, reflow-proven): CloudFormation owns the placeholder,
  the orchestrator owns the live value; a compute redeploy may briefly
  restore the placeholder while awake — the 30s TTL + next readiness pass
  reconverges it.
- **Lambda env carries secrets resolved at deploy time** (CFN dynamic
  references): visible to anyone with `lambda:GetFunctionConfiguration` in
  this single-admin account; rotation requires a redeploy. Chosen because
  the private subnets have no Secrets Manager path while the NAT sleeps.
- **`{proxy+}` integration overrides**: the REST API's L2 deployment hash
  does not account for raw `ResponseTransferMode` property overrides — if
  you ever change ONLY that override, force a new deployment (touch the
  stage description or method config).
- **Lambda account concurrency quota is 10** (new-account default,
  verified live): it currently caps the SSR Lambda harder than the
  intended per-function reservation, and makes any reservation invalid
  (must leave >=10 unreserved). After a Service Quotas raise, apply
  `-c ssrReservedConcurrency=10`.
