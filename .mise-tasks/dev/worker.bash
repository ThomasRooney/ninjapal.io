#!/usr/bin/env bash

# Ayla device-sync worker — the same code path the Railway worker runs in
# prod, so local device data refreshes automatically instead of requiring a
# manual "Refresh Status" click.

set -e

# The worker hard-exits without ZERO_UPSTREAM_DB; load the dev env first.
if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

export SYNC_INTERVAL_MS="${SYNC_INTERVAL_MS:-60000}"

echo "🚀 Starting Ayla sync worker (interval ${SYNC_INTERVAL_MS}ms)..."
exec bun scripts/sync-worker.ts
