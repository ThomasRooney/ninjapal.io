# PitMinder on AWS — architecture record

> Decided 2026-08-06 after two adversarial codex reviews + recon of reflow's production
> scale-to-zero stack. Account: prod-pitminder (836003244283, org member of 805615297525,
> access via OrganizationAccountAccessRole). Region eu-west-2. Replaces Vercel + Railway + Neon.

## Hard requirement

Scale to zero when idle. Idle = no webapp activity AND no real-device-online signal for 8h,
evaluated every 30 min. Wake = authenticated dashboard hit (or authenticated MCP request);
UI shows a warming state ("Loading…"). Owner validates this behavior personally.

Accepted product limitation (owner's idle spec): a smoker coming online while the stack
sleeps is invisible — no telemetry, alerts, push, or pit-director — until a human (or MCP
agent) wakes the stack. Revisit = always-on Ayla probe Lambda w/ tokens cached outside RDS.

## Shape

| Piece | Choice | Why |
|---|---|---|
| IaC | One CDK app, TWO stacks: `data` (VPC, RDS, DynamoDB, S3 photos, Route53 zone, secrets, ECR — RETAIN + termination protection) and `compute` (Lambda, API Gateway, ECS services, CloudFront, schedules, orchestration) | blast-radius split; stacks communicate via SSM parameters, never CFN exports (reflow: exports deadlock on reshapes) |
| DB | **Private Single-AZ RDS Postgres 17, db.t4g.micro, 20GB gp3, `rds.logical_replication=1`**, explicit StopDBInstance/StartDBInstance from the orchestrator | Aurora Sv2 cannot auto-pause with a logical slot (verified in AWS docs AND measured in reflow prod: ~0.5 ACU ≈ $45/mo floor). RDS stop = storage-only cost; slots persist across stop |
| 7-day auto-restart | `SLEEP_MAINTENANCE` state at stoppedAt+6d18h: start → wait AVAILABLE + SQL probe → restop → reset stoppedAt. Hourly reconciler restops drift. A real wake during maintenance sets desiredState=AWAKE and skips the restop | RDS restarts stopped instances after 7 days; starts can take minutes |
| SSR app | Nitro `aws-lambda` preset (`awsLambda.streaming: true`), Lambda **in VPC** (private subnets), fronted by **Regional API Gateway REST with `responseTransferMode=STREAM`** behind CloudFront; static assets S3 + CloudFront | VPC Function URLs cannot stream (AWS-documented); /api/chat requires streaming. **SPIKE IS A DEPLOYMENT GATE** — fallback: streaming-only micro-Fargate or approved buffered chat |
| Egress | **No NAT Gateway.** t4g.nano fck-nat instance started/stopped with the stack (awake-only); S3 + DynamoDB gateway endpoints; orchestrator Lambda lives OUTSIDE the VPC (DDB Streams-triggered) so waking needs no NAT | NAT GW $33-40/mo kills the economics; reflow runs no-NAT in prod |
| zero-cache | Fargate service 0↔1 via `CfnService`, public subnet + public IP, **no ALB**: permanent placeholder Route53 record (TEST-NET-1, TTL 30) defeats NXDOMAIN negative caching; task IP UPSERTed only after a websocket-upgrade readiness probe; placeholder restored before drain; generation-fenced DNS writes; CloudFront in front (caching disabled, WS forwarding); origin TLS via persisted public-CA cert (reflow certbot-Lambda pattern) + origin secret header | reflow runs this exact shape in prod; codex conceded ALB (~$25-32/mo) unjustified for one disposable task |
| sync-worker | Fargate service 0↔1, public subnet. SIGTERM draining + side-effect leases + generation fencing (director runs, device commands, push). Cadence persisted (max(director_runs.created_at)), not in-memory | shutdown must not interrupt side effects; wake must not double-fire director |
| Activity/power state | **DynamoDB versioned power-state row** `POWER#prod`: states SLEEPING → WAKING_DB → WAKING_SERVICES → AWAKE → DRAINING → STOPPING_DB → SLEEPING, plus SLEEP_MAINTENANCE and ERROR; fields incl. desiredState, version, generation, lease, lastWebAt, lastRealDeviceOnlineAt, stoppedAt, per-component ready generations. Every write condition-checked. Writers: dashboard (session-validated, stamps ≤1/5min), visible-tab beacon, worker (non-simulated devices only), 30-min idle cron, orchestrator, reconciler | reflow D1/D2 postmortems: single owner per transition, conditional writes everywhere |
| Wake path | App Lambda catches DB-down → orchestrator claims SLEEPING→WAKING_DB (generation++) → start NAT + RDS concurrently → AVAILABLE + TLS SQL probe + slot/publication check → zero-cache to 1, wait upstream-ready → worker to 1, generation heartbeat → AWAKE. `/api/ready`: 202+Retry-After while warming (state, generation, progress), 200 when all components ready at current generation, 503 on ERROR. Client polls 2s, gates inputs on ready, budget >120s (DNS negative-cache horizon) | reflow measured cold wake 33-44s; PitMinder adds RDS start (minutes) — Loading UX must communicate progress |
| Sleep path | Idle cron re-checks both timestamps → AWAKE→DRAINING (cancellable by new wake until DB stop) → drain worker, then zero-cache → runningCount 0 → StopDBInstance → STOPPED → SLEEPING | drain order protects in-flight side effects |
| Idle signals | `lastWebAt`: authenticated, throttled; readiness polls never refresh it. `lastRealDeviceOnlineAt`: **excludes `is_simulated`** (sim always reports Online — would defeat idle forever). Valid MCP bearer = web activity (wakes + stamps) | codex-found trap; sim pauses while asleep (bounded 10-min catch-up on wake, documented) |
| Photos | S3 private bucket, store object keys (not presigned URLs), signed reads on demand, lifecycle rule replaces worker reaping | Vercel Blob replacement |
| MCP OAuth | `PUBLIC_ORIGIN=https://app.pitminder.com` env — never derive issuer/resource from request.url behind CloudFront; OAuth/MCP routes cache-disabled, full header forwarding | issuer stability |
| DNS/email | Route53 zone in prod-pitminder; replicate ALL records (SES MX, DKIM, Resend, DMARC) before the user-approved nameserver cutover at the Vercel registrar. SES inbound stays in 805615297525; Resend outbound unchanged | |
| CI/CD | GitHub Actions OIDC role (least-privilege — NOT reflow's AdministratorAccess shortcut), ECR images tagged `sha-<commit>`, images pushed before consuming stacks deploy, static assets via `aws s3 sync` + invalidation (not BucketDeployment) | |
| Cost guardrails | Two-tier AWS Budget ($20 alert / $40 hard cap → SNS → Lambda flips a fail-closed execution SSM flag checked before every paid mutation); CloudWatch canary probes the STATUS route, never the sleeping services; dashboard widget "RDS should be stopped" | reflow pattern; budgets are shutoff triggers, not invoice caps |

## Cost target (codex-estimated, no credits)

Zero-traffic month: **$4–10** (Route53, RDS storage, S3/ECR/logs). Light use (80–100 awake
hours): **$14–25**. Sensitivities avoided: ALB +$25–32, NAT GW +$33–40.

## Migration order

1. Deploy both stacks under staging hostnames; rehearse wake/sleep/streaming/Zero-rebuild/worker-drain/7-day-maintenance.
2. Schema + zero-permissions onto RDS; rehearsal Neon dump/restore; validate users/sessions/OAuth rows/queries.
3. Vercel Blob → S3; rewrite photo rows to object keys.
4. Secrets copied unchanged (BETTER_AUTH_SECRET, ZERO_AUTH_SECRET, VAPID, Google OAuth, Anthropic, Resend).
5. Cutover: maintenance mode → stop Railway worker → final dump/restore → start AWS zero-cache (fresh CVR/replica, one slot) → start AWS worker.
6. Replicate DNS records → **owner-approved nameserver switch**.
7. Rollback window with old providers read-only; teardown only after owner-validated scale-to-zero.
