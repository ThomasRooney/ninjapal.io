# Project Status — PitMinder (repo: ninjapal.io)

> Last updated: 2026-06-12 (cook-sessions feature drop). Update this file when completing milestones — it exists so any future session can get context fast without re-auditing the codebase.

## What this is

**PitMinder** (pitminder.com) — a web app to **monitor, graph, and (eventually) control a Ninja Woodfire grill/smoker**. It authenticates against the real SharkNinja/Ayla cloud (`logineu.sharkninja.com` → `ads-eu.aylanetworks.com`), pulls device state, stores it in Postgres via Drizzle, and syncs it to the browser in real time with Zero Sync.

**Stack**: React + TanStack Start/Router · **Neon Postgres** (prod) / Docker Postgres (dev) · Drizzle ORM · **better-auth** · Zero Sync · Tailwind + shadcn/ui · Recharts · Bun · Playwright (e2e). Supabase was fully removed 2026-06-11.

## Production topology (live since 2026-06-11)

| Piece | Where | Notes |
|---|---|---|
| Marketing site | Vercel `pitminder-marketing` → **pitminder.com** + www | static `marketing/` dir (root-directory setting) |
| App | Vercel `pitminder-app` → **app.pitminder.com** | TanStack Start, nitro `target: 'vercel'`, build `bun run build` |
| zero-cache | Railway project `pitminder`, service `zero-cache` → https://zero-cache-production-41de.up.railway.app | image `rocicorp/zero:0.20.2025052100`, volume at /data, `ZERO_APP_ID=pitminder`, `PORT=4848` for edge routing. Custom domain `sync.pitminder.com` is **stuck**: DNS (Vercel CNAME → `myos6tk5.up.railway.app`) is propagated but Railway cert issuance sits in VALIDATING_OWNERSHIP across two attempts, and the CLI domain command returns Unauthorized — likely gated on the Railway plan. The app uses the railway.app URL (fully functional); flip `VITE_PUBLIC_SERVER` + rebuild once Railway issues the cert (domain id 6382397a-8e97-48cb-91eb-e116ec38db4e) |
| Postgres | Neon `ninjapal` (`falling-rice-33754638`), `aws-eu-west-2`, PG17 | logical replication ON; databases: `neondb` (app) + `zero_cvr` + `zero_change`; zero permissions deployed (app id `pitminder`) |
| Auth | better-auth, cookie sessions | Zero JWTs minted in `fetchUser` (jose HS256, `ZERO_AUTH_SECRET`); push endpoint verifies signature |
| Deploy protection | Vercel Authentication: previews + prod *deployment URLs* on both projects | gating the **custom prod domains** needs the $150/mo Advanced add-on — not bought; app is behind its own login, marketing is public |
| PR previews | Vercel Git integration on `ThomasRooney/ninjapal.io` | both projects deploy previews per PR (verified with PR #1) |
| sync-worker | Railway service `sync-worker` (same project), built from the repo with `Dockerfile.sync` (Playwright base + Bun pinned 1.2.17) | ⚠️ **Railway does NOT auto-deploy on git push for this service** — after pushing, trigger explicitly: `serviceInstanceDeploy(environmentId, serviceId, commitSha)` via the backboard GraphQL API (`serviceInstanceRedeploy` only restarts the OLD sha). Worker logs a `cycle N ok` heartbeat (first + every 10th cycle) — absence means it's stuck.  polls Ayla every 60s for each `ninja_connections` row, writes devices + history straight to Neon (replicates to clients via zero-cache); shares `buildDeviceData` with the push mutator |
| Legal | `/privacy-policy` + `/terms-of-service` on app.pitminder.com | operated by **Resilient Software Ltd** (UK, 71–75 Shelton Street, London WC2H 9JQ); SharkNinja credential disclosure, food-safety disclaimer |
| Email | inbound: SES receiving (eu-west-1) → S3 `email.pitminder.com` → Lambda `pitminder-email-forwarder` (code: `infra/email-forwarder/`) → Thomas's gmail; catch-all mapping in SSM `/ses-email-forwarding/pitminder-rule/mapping` (→ thomas@resilientsoftware.co.uk ✅ + thomas.c.rooney@gmail.com ✅ both verified and delivering; account remains in SES sandbox — fine while all destinations are verified); mirrors the reflow.io/resilientsoftware.co.uk pattern in the same AWS account (805615297525); outbound: Resend (templates in `src/emails`) | **outbound ✅ live** (2026-06-11): pitminder.com verified in Resend (eu-west-1, DKIM/SPF/DMARC in Vercel DNS), send-only key in Vercel + local .env, `EMAIL_FROM=PitMinder <no-reply@pitminder.com>` — magic links/verification mails to real user addresses work. **Inbound ✅ via SES** (replaced ForwardEmail, whose free tier blocks <90-day-old domains): MX → inbound-smtp.eu-west-1.amazonaws.com |
| Login methods | email+password, magic link, Google OAuth | magic-link + verification emails live; Google needs `https://app.pitminder.com/api/auth/callback/google` + `http://localhost:5173/api/auth/callback/google` added to the OAuth client's authorized redirect URIs in Google Cloud Console |
| Demo data | `demo@pitminder.com` / `demo-smoker-2026` | seed: `bun scripts/seed-demo.ts` (local) or `APP_URL=https://app.pitminder.com ZERO_UPSTREAM_DB=<neon> bun scripts/seed-demo.ts` (prod); the demo smoker is **simulated** (`is_simulated`) — the Railway worker steps its physics live, so the brisket cook actually progresses in prod |
| Private beta | whitelist gate on `/app/*` → `/waitlist` | `users.whitelisted`; admin auto-granted to `thomas@resilientsoftware.co.uk` (`src/server/user-provision.ts`) |
| Admin | `/app/admin` (users, last-login, activity counts, whitelist switches, impersonation via better-auth admin plugin, pit-director model select) | double-locked: admin email AND IP allowlist (`admin_ip_allowlist`, 24 h TTL). Run `bun scripts/admin-access.ts` to allowlist your current IP against prod Neon (reads the `# NEON_DATABASE_URL` line in `.env`; `--local` for dev) and open the dashboard |
| Pit director | agentic LLM loop in the sync worker (`src/server/control/pit-director.ts`) | every ~10 min per active cook (autopilot toggle = enable): 8 tools incl. telemetry/history/messages/pellets/photos + `set_pit_temp` (through the safety envelope) + `send_message`; model from `app_config.pit_director_model` (default Haiku 4.5), kill switch `app_config.pit_director_enabled=false`; budgets: 1 setpoint + 2 messages per check-in |
| Web push | VAPID web-push, `public/sw.js`, bell toggle on `/app/messages` | worker pushes every cook message to `push_subscriptions`; dead endpoints pruned (404/410 or 5 fails). Keys in Vercel + Railway env (`VAPID_*`, `VITE_VAPID_PUBLIC_KEY`) |
| Cook photos | Vercel Blob store `pitminder-photos` (`BLOB_READ_WRITE_TOKEN` in all Vercel envs + Railway) | authed upload (8 MB, images only, per-user namespace + random suffix), card on the device page, 60-day TTL reaped by the worker, director sees the 3 newest as image blocks |
| Pit chat (steering) | assistant-ui thread on `/app/messages` → `/api/chat` agentic loop (AI SDK streamText, 8-step cap) over the PitMinder **MCP server** (`src/server/mcp/pitminder-server.ts`) | 8 tools: telemetry, cook history, past sessions, messages+steers, pellet status, photos, set_pit_temp (safety envelope → queued device_command), respond_to_message. Same server is mounted at `/api/mcp` (streamable HTTP, session-cookie auth) for external agents. Model = `app_config.pit_director_model` |
| Director visibility | `director_runs` table + dashed check-in rows interleaved in the messages feed | every ~10-min director run (summary/"thoughts", tools consulted, setpoint/message counts, errors) is user-visible; Zero-synced |
| Prod validation | `bunx playwright test -c playwright.prod.config.ts` (needs `PROD_DATABASE_URL`) | 6 checks: marketing live, demo login + sim device, worker stepping sim (DB freshness), messages feed + push toggle, waitlist gate + admin redirect, demo not admin — all green 2026-06-12 |

Secrets: prod `ZERO_AUTH_SECRET`/`BETTER_AUTH_SECRET` are in the commented block at the bottom of local `.env`, mirrored to Railway + Vercel env. Vercel projects live in the **Pro team scope** (`team_JL8iNBq5rqeOkWjFfEnZxvG1`, slug `thomasrooney`), not the hobby personal account — pass `?teamId=` on API calls.

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
3. ~~Rip out Supabase → Neon + Vercel~~ ✅ **done 2026-06-11** — see "Production topology" above. Remaining loose ends rolled into the items below: Railway custom domain (`sync.pitminder.com`), moving device sync to a Railway worker (Playwright can't run on Vercel functions — it's lazy-loaded out of the serverless bundle, so the manual sync button will error in prod until then), README rewrite. Original plan kept for reference:
   **Rip out Supabase → Neon + Vercel** (decided 2026-06-11; owner dislikes Supabase). Supabase currently provides three things, each needs a replacement:
   - **Postgres → Neon.** ✅ Provisioned (2026-06-11): project `ninjapal` (`falling-rice-33754638`), region `aws-eu-west-2` (London), Postgres 17, branches `production` (default) + `development`, **logical replication enabled** (`wal_level=logical` verified). Connection strings (direct for zero-cache replication, pooled for app/drizzle) are in a commented block at the bottom of `.env`. Drizzle + Zero already speak plain Postgres (`ZERO_UPSTREAM_DB`), so cutover is mostly a connection-string swap; Zero will also need its CVR/change DBs — create `zero_cvr` and `zero_change` databases on the production branch when wiring up. Local dev: replace `supabase start` with a plain Postgres Docker container (`wal_level=logical`) in `.mise-tasks/dev/supabase.bash` (rename task to `dev:db`).
   - **Auth (GoTrue) → better-auth.** The client half already exists as currently-dead code (`src/lib/auth-client.ts`, `login-form.tsx`, `login-form-magic.tsx`, magic-link + Google plugins) — resurrect it instead of deleting (supersedes cleanup item below). Work: add better-auth server config with the Drizzle adapter (+ its auth tables via a migration), mount its handler under `src/routes/api/auth/$.ts`, replace `getSupabaseServerClient` session fetch in `__root.tsx` and the Supabase login/signup forms, and have better-auth (JWT plugin) issue the JWTs Zero validates (`ZERO_AUTH_SECRET`); keep `authData.sub` = user id so Zero permissions/mutators are untouched. Only local users exist — no user-data migration needed.
   - **Local stack extras.** Studio → `bun db:studio` (Drizzle Studio) covers it; Mailpit → react-email preview + Resend test mode.
   - **Hosting.** TanStack Start deploys to Vercel (vercel preset; Thomas's account, hobby tier, scope `thomasrooney`). **zero-cache cannot run on Vercel** — it's a long-running process with a SQLite replica file. Decided 2026-06-11: host it on **Railway** (~$5/mo hobby; one-click ZeroSync template at https://railway.com/deploy/Z-5ubo). Point `VITE_PUBLIC_SERVER` at the Railway service; `ZERO_PUSH_URL` points back at the Vercel deployment's `/api/push` (Zero custom mutators endpoint). The Railway box also runs the device-sync poller later (step 7) since Vercel hobby cron is daily-only. Put Railway + Neon in an **EU region** — the Ninja/Ayla API is EU (`ads-eu.aylanetworks.com`). Replica volume optional: it rebuilds from upstream on restart.
   - **Domain.** Decided 2026-06-11: **`pitminder.com`** (drops the SharkNinja-adjacent "ninja" branding; `ninjapal.io` was never registered). Thomas purchased it 2026-06-11, though registration hadn't propagated to RDAP/whois or appeared in his Vercel account at last check — **verify ownership before DNS work**. Wiring once visible: apex + `www` → Vercel project; `sync.pitminder.com` → Railway zero-cache (`VITE_PUBLIC_SERVER`). Follow-on rebrand task: repo is named `ninjapal.io`, the sidebar says "Ninja Pal", and the demo account is `demo@ninjapal.dev` — rename to PitMinder during or after the migration. Railway CLI authed but note it's under thomas@speakeasyapi.dev while Neon/Vercel are under thomas.c.rooney@gmail.com — confirm intended before creating the Railway project.
   - **Cleanup sweep:** delete `supabase/` dir, `@supabase/ssr` + `supabase-client.ts`/`supabase.ts`, `supabase:*` scripts in `package.json` and mise tasks, update `scripts/seed-demo.ts` (creates its auth user via Supabase's `/auth/v1/signup` — switch to better-auth's sign-up endpoint), update e2e auth specs, and rewrite the Supabase-centric sections of `CLAUDE.md` and README once the migration lands.
4. **The AI pitmaster** (vision set 2026-06-12, demoed on the marketing site as mocks) — the product north star: PitMinder *runs the pit*. Building blocks, roughly in order:
   - **Device control v1**: ✅ shipped 2026-06-12 behind `AUTOPILOT_DRY_RUN=true` — `device_commands` queue, Ayla write path in the worker, manual Set-pit UI, safety envelope (per-mode bounds, max +15°C raise step). ⚠️ **The `SET_Cook_Command` JSON shape is a guess** — must be verified by diffing `GET_Cook_Command` from Thomas's real grill after using the official app, then flip `AUTOPILOT_DRY_RUN=false` on the Railway worker.
   - **Auto hold-warm**: ✅ shipped 2026-06-12 (same DRY_RUN gate) — deterministic autopilot in the worker: drop to 65°C when all probe targets met, pull-messages for early finishers (multi-probe staggering), stall ≥40min → +3°C nudge with auto-revert. Proven in a closed-loop simulator (virtual grill + brisket vs the real policy, `tests/autopilot-sim.test.ts`). Toggle per device: "AI pitmaster" switch on the overview.
   - **Coaching alerts**: ✅ in-app v1 shipped 2026-06-12 — `cook_messages` phone-style feed (`/app/messages`) with required acks, decision buttons (wrap/ride, spritzed, refilled), free-text steer, sidebar badge; worker emits technical messages from telemetry (doneness reached, empty-pellet-hopper diagnosis, pit recovered, cook started). Remaining: deliver via push + email, and emit the AI-action messages once control exists (demo seed shows the target copy).
   - **Simulated grill**: ✅ shipped 2026-06-12 — `src/server/control/sim-grill.ts` physics (first-order pit lag, evaporative stall band) stepped live by the worker for any `is_simulated` device through the SAME pipeline as real hardware (telemetry, history, sessions, messages, autopilot, director); setpoint commands execute for real against `sim_state`. The prod demo smoker runs on it.
   - **Pellet model**: ✅ shipped 2026-06-12 — `src/lib/pellet-model.ts` (burn rate ∝ pit temp, anchored 0.45 kg/h @ 107 °C, gap-aware integral since `pellets_loaded_at`); worker emits an ack-required `pellet_low` forecast (~45 min ahead) and "Refilled ✅" resets the clock.
   - **Pit director (agentic loop)**: ✅ shipped 2026-06-12 — see topology row. Escalates-when-unsure, hard per-run budgets, every control passes `validateIntent`. Verified live with Haiku on the local + prod sims.
   - **Push delivery**: ✅ shipped 2026-06-12 (web push; email delivery still open).
   - **Photo uploads**: ✅ shipped 2026-06-12 (Vercel Blob, 60-day TTL, director-visible).
   - **Sentence-to-plan**: "eat at 19:00, 4kg brisket + 2 racks" → LLM-generated cook plan (timeline with ack/steer), continuously replanned against live telemetry. Next LLM milestone — the director loop + its tools are the foundation; add a plan schema + plan-execution state.
5. ~~Cook sessions~~ ✅ **done 2026-06-12** — `cook_sessions` table, lifecycle detection in the sync worker, `/app/cooks` list + `/app/cook/$id` detail (stat tiles, histogram, replay scrubber, rename). Shipped alongside: graph overhaul (ranges/brush/setpoint+target lines/lid+stall bands/ETA projection), live pit dashboard (radial gauges, sparklines, stall badge, ETA, editable doneness targets), `src/lib/cook-analysis.ts` (stall/ETA/stability/histogram, unit-tested), animated marketing hero from real telemetry.
6. **Alerts** — realize the `Alert` type: per-user alert config table, evaluate on sync (temp reached / cook complete / device offline), deliver via push (`/api/push.ts`) and email (Resend).
7. ~~Background sync~~ ✅ done 2026-06-11 — the Railway `sync-worker` polls Ayla every 60s for every connected account; the in-app manual sync button is now redundant (remove it in a future cleanup).
8. **Cleanup** — ✅ orphaned mock dashboard (`components/pages/`, `temperature-chart`, `cook-history-table`, `cook-controls`) deleted 2026-06-12; README + CLAUDE.md rewritten for the current stack. Remaining: decide fate of `grill_state_raw`/`probe_state_raw` raw-JSON columns (the overview still parses them — flattened columns are not yet the UI's source of truth), and remove the now-redundant manual sync button.

### Known small bugs
- **Cold-load hydration race (~20% of full page loads in prod)**: the SSR shell hydrates with React #418 (markup mismatch) on every load; recovery usually succeeds but intermittently dies with an opaque `__isServerError`-shaped throw, leaving a blank app until reload. Shell HTML is byte-identical between good/bad loads — purely a client-side race. Started/worsened around the react 19.2 + zod 4 upgrades (2026-06-12). SPA navigations are unaffected. Suspects: TanStack Start SPA-shell hydration vs react 19.2, or a boot race with Zero/initializeZero during hydration recovery. The prod smoke test reloads once as a workaround. **Likely fix: upgrade @tanstack/react-start (pinned 1.121, latest 1.168 — 47 minors of SPA-shell/hydration fixes behind, including the upstream fix for the fix-css-hash hack); sizeable migration, do it as its own task.**
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
mise run dev           # everything via overmind (frontend :5173, postgres :54332, zero-cache :4848, email :3883)
# or manually:
mise run dev:db & bun zero-cache & bun dev
```

Gotcha: `@rocicorp/zero-sqlite3` is a native module — if zero-cache dies with `ERR_DLOPEN_FAILED` / `NODE_MODULE_VERSION` mismatch after a Node upgrade, run `npm rebuild @rocicorp/zero-sqlite3`.

Schema changes follow expand–migrate–contract (see CLAUDE.md). Zero cache state lives in `ZERO_REPLICA_FILE`; regenerate the client schema with `bun db:zero:generate` after touching `drizzle-zero.config.ts`.
