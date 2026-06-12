#!/usr/bin/env bash

# Local Postgres for development (replaces Supabase).
# wal_level=logical is required by Zero's replication.
# Runs detached with a restart policy: OrbStack auto-quits when no containers
# run, so a foreground --rm container dies with the shell that started it.

set -e

CONTAINER_NAME="pitminder-db"
VOLUME_NAME="pitminder-pgdata"
PORT="54332"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "✅ Postgres already running on port ${PORT}"
else
    docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
    echo "🐘 Starting Postgres 17 on port ${PORT} (wal_level=logical)..."
    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -e POSTGRES_PASSWORD=postgres \
        -p "${PORT}:5432" \
        -v "${VOLUME_NAME}:/var/lib/postgresql/data" \
        postgres:17 \
        -c wal_level=logical >/dev/null
fi

# Wait for Postgres to accept connections
for _ in $(seq 1 30); do
    if docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then
        echo "✅ Postgres is ready on port ${PORT}"
        break
    fi
    sleep 1
done

# Under overmind this task must stay in the foreground; follow the logs.
if [ -t 1 ] || [ -n "$OVERMIND_PROCESS_NAME" ]; then
    exec docker logs -f "$CONTAINER_NAME"
fi
