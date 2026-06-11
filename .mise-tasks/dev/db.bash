#!/usr/bin/env bash

# Local Postgres for development (replaces Supabase).
# wal_level=logical is required by Zero's replication.

set -e

CONTAINER_NAME="pitminder-db"
VOLUME_NAME="pitminder-pgdata"
PORT="54332"

cleanup() {
    echo
    echo "🛑 Stopping Postgres..."
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    echo "✅ Postgres stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Remove any stopped leftover container with the same name
docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "🐘 Starting Postgres 17 on port ${PORT} (wal_level=logical)..."
docker run --rm \
    --name "$CONTAINER_NAME" \
    -e POSTGRES_PASSWORD=postgres \
    -p "${PORT}:5432" \
    -v "${VOLUME_NAME}:/var/lib/postgresql/data" \
    postgres:17 \
    -c wal_level=logical &

DOCKER_PID=$!

# Wait for Postgres to accept connections
for _ in $(seq 1 30); do
    if docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then
        echo "✅ Postgres is ready on port ${PORT}"
        break
    fi
    sleep 1
done

wait "$DOCKER_PID"
