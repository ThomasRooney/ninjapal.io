# Project Status — ninjapal.io

> Last audited: 2026-06-11. Update this file when completing milestones — it exists so any future session can get context fast without re-auditing the codebase.

## What this is

A web app to **monitor, graph, and (eventually) control a Ninja Woodfire grill/smoker**. It authenticates against the real SharkNinja/Ayla cloud (`logineu.sharkninja.com` → `ads-eu.aylanetworks.com`), pulls device state, stores it in Supabase Postgres via Drizzle, and syncs it to the browser in real time with Zero Sync.

**Stack**: React + TanStack Start/Router · Supabase Postgres · Drizzle ORM · Zero Sync · Tailwind + shadcn/ui · Recharts · Bun · Playwright (e2e).

> ⚠️ **Stack change decided 2026-06-11**: Supabase is being removed — target is **Neon Postgres + Vercel hosting + better-auth** (zero-cache on a separate long-running host). See next-steps item 3. Until that lands, local dev still runs on Supabase.

## Where we are (audit summary)

### Done — monitoring/read path (~95%)
- **Auth**: Supabase email/password auth (signup → auto-confirm locally). `src/routes/auth/{login,signup}.tsx` use `SupabaseLoginForm`/`SupabaseSignupForm`. Route guard at `src/routes/_authed.tsx`; user fetched server-side in `__root.tsx`.
- **Ninja cloud integration** (real, no mocks): `src/ninjaAuth/ninja-auth-manager.ts` does OAuth → Ayla token exchange with caching/refresh. Credentials entered at `/app/ninja-connection`, stored in `ninja_connections`.
- **Device sync**: manual "sync" button triggers `syncRealDevices` server mutator (`src/server/db/zero-server-mutators.ts`) — fetches Ayla devices + properties, maps ~60 properties to columns via `src/server/db/device-property-mappings.ts`, flattens `grill_state_raw` JSON into discrete columns (`temp_grill`, `gs_state`, …).
- **History**: `device_history` table with hourly-snapshot + patch pattern (unique snapshot/hour index). Reconstruction in `src/lib/historyUtils.ts`. History UI with field-level diffs at `/app/device/:id/history`.
- **Graphing**: `src/components/temperature-graph.tsx` (Recharts) — queries history via Zero, reconstructs state over a time window (default 6h), plots series with min/max/avg/current stats. Used on device detail page with `temp_grill` + `temp_air`.
- **Device pages**: `/app/devices` (list), `/app/device/:id` (dashboard + graph), plus `/status`, `/history`, `/raw`, `/technical` subpages.
- **Prefs**: °C/°F preference synced through Zero (`users.prefers_celsius`).
- **E2E tests**: auth, ninja-connection, device sync (with Ayla API mocked via Playwright route interception), devices list.

### Landed 2026-06-11 (was in flight at audit time)
- ✅ **Dual-channel probe migration** complete: probe fields enabled in Zero config, Probe 1/2 series added to the temperature graph, verified end-to-end with seeded demo telemetry.
- ✅ **Dev-env overhaul** committed: `mise.toml` + `.mise-tasks/dev/*` + `./zero` onboarding script (README quick-start still describes the old commands).
- ✅ `check` script fixed (dropped deleted forbidden-imports reference; note the useZero-typed-wrapper convention is no longer machine-enforced) and the `zeroAtom as any` biome error removed.

### Not started — the gap that implies direction
- **Device CONTROL (0%)**: the schema is fully ready (`cook_command`, `exec_command`, `grill_power_setpoint`, `SET_Cook_Command`/`SET_GrillPower` property mappings exist), and a `cook-controls.tsx` UI component exists but is **local-state only, not routed, no mutations**. This is clearly the next major phase: send cook commands (mode, target temp, smoke level, start/stop) to the Ayla API.
- **Cook sessions**: `src/lib/mock-data.ts` defines `CookSession`, `Alert`, and mode types (smoker/grill/air fry/…) that have **no DB tables or UI yet** — strong artifact implying planned features: named cook sessions ("Brisket, 12h"), session history, and alerts (cook complete, temp reached, probe alert, device offline).
- **Alerts/notifications**: `/api/push.ts` and email infra (Resend, react-email) exist but nothing fires them from device state.
- Dead code signalling abandoned direction: better-auth client (`src/lib/auth-client.ts`, magic-link/Google forms) superseded by Supabase auth — candidate for deletion.

## Next steps (priority order)

1. ~~Finish probe migration~~ ✅ done 2026-06-11
2. ~~Land the dev-env change~~ ✅ done 2026-06-11 (README quick-start update still pending — fold into step 3's doc rewrite)
3. **Rip out Supabase → Neon + Vercel** (decided 2026-06-11; owner dislikes Supabase). Supabase currently provides three things, each needs a replacement:
   - **Postgres → Neon.** ✅ Provisioned (2026-06-11): project `ninjapal` (`falling-rice-33754638`), region `aws-eu-west-2` (London), Postgres 17, branches `production` (default) + `development`, **logical replication enabled** (`wal_level=logical` verified). Connection strings (direct for zero-cache replication, pooled for app/drizzle) are in a commented block at the bottom of `.env`. Drizzle + Zero already speak plain Postgres (`ZERO_UPSTREAM_DB`), so cutover is mostly a connection-string swap; Zero will also need its CVR/change DBs — create `zero_cvr` and `zero_change` databases on the production branch when wiring up. Local dev: replace `supabase start` with a plain Postgres Docker container (`wal_level=logical`) in `.mise-tasks/dev/supabase.bash` (rename task to `dev:db`).
   - **Auth (GoTrue) → better-auth.** The client half already exists as currently-dead code (`src/lib/auth-client.ts`, `login-form.tsx`, `login-form-magic.tsx`, magic-link + Google plugins) — resurrect it instead of deleting (supersedes cleanup item below). Work: add better-auth server config with the Drizzle adapter (+ its auth tables via a migration), mount its handler under `src/routes/api/auth/$.ts`, replace `getSupabaseServerClient` session fetch in `__root.tsx` and the Supabase login/signup forms, and have better-auth (JWT plugin) issue the JWTs Zero validates (`ZERO_AUTH_SECRET`); keep `authData.sub` = user id so Zero permissions/mutators are untouched. Only local users exist — no user-data migration needed.
   - **Local stack extras.** Studio → `bun db:studio` (Drizzle Studio) covers it; Mailpit → react-email preview + Resend test mode.
   - **Hosting.** TanStack Start deploys to Vercel (vercel preset; Thomas's account, hobby tier, scope `thomasrooney`). **zero-cache cannot run on Vercel** — it's a long-running process with a SQLite replica file. Decided 2026-06-11: host it on **Railway** (~$5/mo hobby; one-click ZeroSync template at https://railway.com/deploy/Z-5ubo). Point `VITE_PUBLIC_SERVER` at the Railway service; `ZERO_PUSH_URL` points back at the Vercel deployment's `/api/push` (Zero custom mutators endpoint). The Railway box also runs the device-sync poller later (step 7) since Vercel hobby cron is daily-only. Put Railway + Neon in an **EU region** — the Ninja/Ayla API is EU (`ads-eu.aylanetworks.com`). Replica volume optional: it rebuilds from upstream on restart.
   - **Domain.** As of 2026-06-11 `ninjapal.io` is **not registered** (registry whois: "Domain not found") — Thomas to purchase (recommended: via Vercel, at-cost). Wiring once owned: apex + `www` → Vercel project; `sync.ninjapal.io` → Railway zero-cache (`VITE_PUBLIC_SERVER`). Railway CLI authed but note it's under thomas@speakeasyapi.dev while Neon/Vercel are under thomas.c.rooney@gmail.com — confirm intended before creating the Railway project.
   - **Cleanup sweep:** delete `supabase/` dir, `@supabase/ssr` + `supabase-client.ts`/`supabase.ts`, `supabase:*` scripts in `package.json` and mise tasks, update `scripts/seed-demo.ts` (creates its auth user via Supabase's `/auth/v1/signup` — switch to better-auth's sign-up endpoint), update e2e auth specs, and rewrite the Supabase-centric sections of `CLAUDE.md` and README once the migration lands.
4. **Device control v1** — wire `cook-controls.tsx` into the device page; add a `sendCookCommand` server mutator that POSTs datapoints to Ayla (`SET_Cook_Command`); optimistic UI via Zero; e2e test with mocked Ayla.
5. **Cook sessions** — table + detection (cook start/stop from `cook_state` transitions), session list/detail re-using the temperature graph with session time bounds; realizes the `CookSession` types in `mock-data.ts`.
6. **Alerts** — realize the `Alert` type: per-user alert config table, evaluate on sync (temp reached / cook complete / device offline), deliver via push (`/api/push.ts`) and email (Resend).
7. **Background sync** — replace the manual sync button with scheduled polling (the old `DeviceSyncPoller` was converted to manual in c6d4b44 — likely needs a server-side cron instead of client polling; on Vercel this is a Vercel Cron hitting an API route).
8. **Cleanup** — delete the unused `temperature-chart.tsx` (mock demo chart), and decide fate of `grill_state_raw`/`probe_state_raw` raw-JSON columns (commented "to be deprecated" but the device overview page still parses them — see `useGrillViewModel`; flattened columns are not yet the source of truth for the UI). (Better-auth code is no longer cleanup — it gets resurrected by the Supabase removal, step 3.)

### Known small bugs
- ~~temperature-graph Y-axis tick conversion~~ ✅ fixed 2026-06-11
- ~~broken `check` script~~ ✅ fixed 2026-06-11
- **`bun check` tsc step fails with 30 pre-existing type errors** (biome passes). Previously masked because biome failed first so tsc never ran. Worst offenders: `device.$deviceId.technical.tsx` (12), `zero-server-mutators.ts` (5), `device.$deviceId.tsx` (4, `parseJsonSafely`/`DeviceOverviewPage` prop typing). Burn these down — ideally before the Supabase rip-out so type regressions are visible during it.
- React console error on authed pages: nested `<button>` inside sidebar menu button (`DeviceSyncPoller` button rendered inside a menu button).

## Demo / mock data

A demo account with two mock devices and ~8h of realistic brisket-cook telemetry (snapshot/patch history powering the temperature graph) can be seeded with:

```bash
bun scripts/seed-demo.ts
```

- Login: `demo@ninjapal.dev` / `demo-smoker-2026`
- URLs (dev): app `http://localhost:5173/app/devices` (vite default port — note `mise.toml` says 3000 but nothing configures vite to use it); device dashboard with live graph at `/app/device/<id>` (listed on the devices page); Supabase Studio `http://127.0.0.1:54333`; Mailpit `http://127.0.0.1:54334`.
- The mock device is DB-only (DSN `DEMO-…`); "Sync devices" will not touch it unless real Ninja credentials are configured. `refreshFakeData` mutator (devices page) creates faker devices but **no history**, so graphs stay empty with it — use the seed script instead.

## Dev environment

```bash
./zero                 # one-time onboarding checks (mise, docker, bun)
mise run dev           # everything via overmind (frontend, supabase, zero-cache, email :3883)
# or manually:
bun supabase:start && bun zero-cache & bun dev   # frontend on :5173, zero-cache on :4848
```

Gotcha: `@rocicorp/zero-sqlite3` is a native module — if zero-cache dies with `ERR_DLOPEN_FAILED` / `NODE_MODULE_VERSION` mismatch after a Node upgrade, run `npm rebuild @rocicorp/zero-sqlite3`.

Schema changes follow expand–migrate–contract (see CLAUDE.md). Zero cache state lives in `ZERO_REPLICA_FILE`; regenerate the client schema with `bun db:zero:generate` after touching `drizzle-zero.config.ts`.
