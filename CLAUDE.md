## Context

 * Read `STATUS.md` first — it holds the current project state, production topology, inferred direction, and next steps. Keep it updated when completing milestones.
 * This is **PitMinder** (pitminder.com): real-time monitoring/graphing for Ninja Woodfire smokers. Operated by Resilient Software Ltd — public-facing text names the company, never Thomas personally.

## Rules

 * ALWAYS break things into individually testable units and ALWAYS verify them before moving to the next task.
 * ALWAYS consider error and loading states in the UI. ALWAYS verify error and loading states with React Testing Library.
 * Verify means write minimal playwright tests to test each flow. NEVER mock the DB, ALWAYS mock external services. ALWAYS introduce data-testid for stable selectors to power tests.
 * Once verified, ALWAYS commit before moving onto the next task
 * DO NOT add any ads such as "Generated with [Claude Code](https://claude.ai/code)"
 * ALWAYS follow conventional commit rules `<type>:<space><message title>\n\n * Bullet Points explaining what updated`

## Project Context

- **Frontend**: React with TanStack Router and TanStack Start (nitro `target: 'vercel'`)
- **Database**: Postgres — Neon in production, Docker locally (`wal_level=logical`)
- **ORM**: Drizzle (push-based; no migration files)
- **Real-time**: Zero Sync (zero-cache on Railway in prod)
- **Auth**: better-auth (email+password, magic link, Google) — Zero JWTs minted in `fetchUser` with `ZERO_AUTH_SECRET`
- **Email**: Resend outbound (verified domain), SES inbound forwarding (`infra/email-forwarder/`)
- **Styling**: Tailwind CSS + shadcn/ui; graphs with Recharts
- **Package Manager**: Bun

## Key Commands

```bash
mise run dev               # overmind: web :5173, postgres :54332, zero-cache :4848, email :3883
bun check                  # biome + tsc — keep green
bun test                   # vitest unit suite
bunx playwright test       # e2e (needs the dev stack running; reuses it)
bun db:seed                # drizzle push + demo account (demo@pitminder.com / demo-smoker-2026)
bun db:zero:generate       # regenerate Zero schema after config changes
bun build                  # production build (.vercel/output) + fix-css-hash step
```

## Schema Update Workflow (Expand–Migrate–Contract)

1. **Expand**: add the column/table in `src/server/db/schema/` (nullable/default), set it to `false` in `drizzle-zero.config.ts`, apply with `bunx drizzle-kit push`.
2. **Migrate**: update application code; test.
3. **Contract**: flip the config entry to `true`, `bun db:zero:generate`, restart zero-cache, verify real-time sync.

Gotchas:
- `drizzle-kit push` sometimes prompts interactively about the `devices_dsn_user_id_unique` constraint and aborts when non-interactive — applying the DDL directly with psql is the established workaround (see git history).
- New tables must be added to `drizzle-zero.config.ts` (set `false` to exclude — e.g. the better-auth tables) AND to `src/server/db/zero-permissions.ts`.
- Prod: apply DDL to Neon, run `zero-deploy-permissions` with `ZERO_UPSTREAM_DB` pointed at Neon, then redeploy the Railway zero-cache service.

## File Structure Guide

- `src/server/db/schema/` — Drizzle schemas (devices, device-history, cook-sessions, ninja, auth)
- `drizzle-zero.config.ts` / `src/server/db/zero-schema.gen.ts` — Zero sync config / generated schema
- `src/server/db/zero-{shared,server}-mutators.ts`, `zero-permissions.ts` — Zero mutators + permissions
- `src/server/db/build-device-data.ts` — Ayla property → device-row mapping (shared with worker)
- `src/lib/cook-analysis.ts` — stall/ETA/stability/histogram (pure, unit-tested)
- `src/ninjaAuth/` — SharkNinja OAuth → Ayla tokens (Playwright is lazy-loaded; it must never enter the Vercel bundle)
- `scripts/sync-worker.ts` + `Dockerfile.sync` — Railway polling worker (the only place device sync runs in prod)
- `scripts/seed-demo.ts` — demo data (3 cooks); `APP_URL`/`ZERO_UPSTREAM_DB` env to seed prod
- `marketing/` — static marketing site (own Vercel project)
- `infra/email-forwarder/` — SES inbound → forwarding Lambda source

## Troubleshooting

- **Zero sync stale after schema change**: regenerate (`bun db:zero:generate`), delete the replica (`/tmp/pitminder_zero_replica.db*`), restart zero-cache.
- **zero-cache crashes with `ERR_DLOPEN_FAILED`** after a Node upgrade: `npm rebuild @rocicorp/zero-sqlite3`.
- **Local Postgres vanished**: OrbStack auto-quits when no containers run; `mise run dev:db` restarts it (detached, restart policy).
- **Vercel CSS 404 / hydration break**: the SSR bundle can reference a stylesheet hash the client never emitted (TanStack/router#4959) — `scripts/fix-css-hash.ts` in the build handles it; don't remove it.
- **e2e flakes on signup**: test emails must be unique (`Date.now()` + random suffix) — parallel workers collide on bare timestamps.
