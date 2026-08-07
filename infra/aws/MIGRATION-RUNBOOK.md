# Cutover runbook — Vercel/Railway/Neon → prod-pitminder AWS

> One repeatable sequence, manual tooling (single-user scale — no migration service).
> Prereqs: `feat/aws-compute` merged with review fixes; rehearsal green; owner available
> for step 8 (NS switch) and the go/no-go at step 3. Roll back at any checkpoint before
> step 8 by simply not switching NS — old prod stays authoritative + untouched.

## 0. Preflight (any time before)
- [x] Mail records replicated into Route53 zone Z03465572HM9FQRB9AMRQ (2026-08-07):
      apex MX → SES inbound, `_dmarc` TXT, `resend._domainkey` TXT, `send` TXT (SPF) + MX.
- [ ] Compare full answer sets old-vs-new for every mail name via public resolvers
      (`dig @ns1.vercel-dns.com` vs `dig @<zone NS>`); byte-identical values required.
- [ ] ACM certs still PENDING_VALIDATION (expected until step 8; validation CNAMEs already in zone).
- [ ] Fresh rehearsal cycle within the last 7 days ends SLEEPING clean.
- [ ] Secrets in `/pitminder/prod/app/env` diffed against current Vercel env (same
      BETTER_AUTH_SECRET / ZERO_AUTH_SECRET / VAPID pair — subscriptions + sessions must survive).

## 1. Wake AWS stack + final schema sync
- `power-tool.ts hold 6` (keep-warm during the whole cutover), wake, wait AWAKE.
- Re-apply any Neon DDL that landed since the last schema sync (diff `pg_dump --schema-only`
  Neon vs RDS); zero permissions hash must match Neon's (`5aba566` at time of writing).

## 2. Blob → S3 (idempotent, re-runnable)
- List Vercel Blob objects; copy to `photos/` in the photos bucket preserving the
  per-user key convention; rewrite `cook_photos.url` rows to `s3://<bucket>/<key>`
  markers + `pathname` to the object key ON NEON (the app resolves markers on both
  providers — env-gated) so the final dump carries migrated rows.
- Verify: object count == row count, spot-check 3 signed GETs render.

## 3. GO/NO-GO (owner) — announce start; everything below is the outage window (~15 min)
## 4. Freeze writes
- Vercel: set maintenance env (app returns 503 shell) OR pause deployments + block /api/push
  via a Vercel env flag — pick the one-step option available on the day.
- Railway: scale sync-worker AND zero-cache to 0 (dashboard; deploys are billing-blocked but
  scaling down is not). No writers remain against Neon.

## 5. Final dump/restore
- `pg_dump "$NEON_URL" --no-owner --no-acl -Fc` → `pg_restore` into RDS via the SSM
  port-forward path (README §schema-ops), `--clean --if-exists` on the public schema.
- Drop + recreate `zero_cvr`/`zero_change` DBs (fresh CVR/replica state, one slot).
- Checksums: `select count(*), md5(string_agg(id::text, ',' order by id))` per critical
  table (users, session, devices, device_history, cook_*, steer_*, ninja_connections,
  oauth_*) — must match Neon exactly.
- Neon stopgap trigger `trg_device_history_stamp_user` does NOT come across pg_restore
  cleanly by design — recreate is unnecessary (AWS worker stamps user_id).

## 6. Start AWS services against migrated data
- Restart zero-cache task (fresh replica off the restored DB), wait ready probe.
- Worker up; verify one cycle writes device_history w/ user_id + heartbeat.
- Smoke via CloudFront default domain: demo login, device page, steer chat send+refresh,
  /api/ready 200, MCP discovery.
- Auth check: an EXISTING session cookie (owner's browser) still validates (same secrets).

## 7. DNS record finalization (zone still dormant — safe)
- postCutover flip per README: redeploy `-c postCutover=true -c publicOrigin=https://app.pitminder.com`;
  this creates apex/www/app/sync alias records to the CloudFront distributions in the zone.
- Re-run the full old-vs-new zone comparison; every name answers (values differ only where intended:
  apex/www/app/sync now → CloudFront).

## 8. NAMESERVER SWITCH (OWNER ACTION — Vercel registrar → the 4 zone NS hosts)
- TTLs: registrar-level NS caching means propagation 5min–48h; both stacks stay up meanwhile
  (old Vercel keeps serving stale resolvers; same DB? NO — Neon is frozen. Old resolvers get
  the maintenance shell. Acceptable: propagation for a single-user app is effectively immediate
  on the owner's resolver after cache flush).
- Immediately after: ACM validates (minutes) → certs ISSUED → confirm CloudFront serves
  app.pitminder.com with the real cert; unfreeze is implicit (AWS is live).
- Google OAuth redirect URIs: already `https://app.pitminder.com/...` — unchanged. localhost stays.

## 9. Post-cutover validation (owner + Claude)
- Full pass: login (password + magic link + Google), live device telemetry over wss
  (sync.pitminder.com), steer chat streaming + persistence-after-refresh, photos upload/view,
  push notification delivery, MCP OAuth flow from Claude Code (`claude mcp add ...`).
- Release the keep-warm hold → verify idle → SLEEPING within ~40 min; then a cold
  dashboard hit → warming UX → AWAKE. **This is the owner's scale-to-zero validation.**

## 10. Rollback (any point before step 8)
- Unfreeze Vercel env, scale Railway services back to 1, done — Neon never changed after
  the freeze; discard RDS restore. After step 8: switch NS back (same propagation caveats).

## 11. Decommission (owner-confirmed, after ≥1 week green incl. a real cook)
- Vercel projects (app + marketing), Railway project, Neon project, mise: drop Railway CLI;
  STATUS.md topology rewrite; delete Neon stopgap trigger note; remove `prod-deploy-blockers` memory.
