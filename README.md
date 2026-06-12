# PitMinder

**Your smoker, minded.** Live monitoring, beautiful cook graphs, and a full
history of every brisket — for Ninja Woodfire grills and smokers.

🌐 **pitminder.com** (marketing) · **app.pitminder.com** (app)

## What it does

PitMinder connects to your SharkNinja account, polls your grill through the
Ayla cloud, and syncs everything to your browser in real time:

- **Live pit dashboard** — radial gauges for grill/chamber/exhaust with
  setpoint ticks and trend sparklines
- **Cook sessions** — every cook auto-logged with peak temps, lid-open
  count, pit stability score (0–100), and time spent in the stall
- **Graphs** — zoomable time-series with setpoint/target lines, lid-open
  and stall shading, and a dotted ETA projection to your doneness target
- **The stall detector** — live badge when your brisket flatlines 😤
- **Cook replay** — scrub through any past cook and watch the gauges
  relive it
- **Doneness targets** — per-probe targets with progress rings and
  "when do we eat?" ETAs

## Stack

React + TanStack Start/Router · Postgres (Neon in prod) · Drizzle ORM ·
[Zero Sync](https://zero.rocicorp.dev) · better-auth · Tailwind + shadcn/ui ·
Recharts · Bun · Playwright + Vitest

Production topology and operational details live in [STATUS.md](./STATUS.md).

## Development

```bash
./zero            # one-time onboarding checks (mise, Docker, bun)
mise install      # toolchain (bun, node, overmind, railway, neonctl)
bun install

mise run dev      # everything via overmind:
                  #   web    → http://localhost:5173
                  #   db     → Postgres 17 on :54332 (wal_level=logical)
                  #   cache  → zero-cache on :4848
                  #   email  → react-email preview on :3883

bun db:seed       # schema + demo account with 3 cooks of telemetry
                  #   login: demo@pitminder.com / demo-smoker-2026
```

### Tests

```bash
bun check         # biome + tsc — keep this green
bun test          # vitest unit suite (cook analysis, mappings, utils)
bunx playwright test   # e2e against the local stack
```

### Schema changes

Follow expand–migrate–contract (see CLAUDE.md). After touching
`src/server/db/schema*` or `drizzle-zero.config.ts`:

```bash
bunx drizzle-kit push    # may prompt interactively; see CLAUDE.md note
bun db:zero:generate
# restart zero-cache to pick up new tables
```

## Deployment

| Piece | Where |
|---|---|
| App | Vercel `pitminder-app` → app.pitminder.com |
| Marketing | Vercel `pitminder-marketing` → pitminder.com (static `marketing/`) |
| zero-cache | Railway `pitminder/zero-cache` (rocicorp/zero image) |
| sync-worker | Railway `pitminder/sync-worker` (`Dockerfile.sync`, polls Ayla every 60s) |
| Postgres | Neon `ninjapal`, eu-west-2, logical replication |

Pushing `main` deploys both Vercel projects and the Railway sync-worker;
PRs get preview deployments.

---

Operated by Resilient Software Ltd. Not affiliated with SharkNinja —
"Ninja" and "Woodfire" are trademarks of their respective owners.
