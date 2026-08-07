#!/usr/bin/env bash
# Build the SSR Lambda artifact into infra/aws/dist/ssr (consumed by
# lib/compute-stack.ts via Code.fromAsset). The spike-proven shape:
# NITRO_PRESET=aws-lambda selects the custom streaming entry
# (infra/aws/spike/lambda-entry.mjs) that parses BOTH API GW REST v1.0 and
# Function-URL v2.0 events; serveStatic keeps /assets in the same artifact.
#
# Client build-time env (VITE_PUBLIC_SERVER, VITE_VAPID_PUBLIC_KEY, ...)
# comes from the caller's environment, optionally sourced from an
# UNCOMMITTED env file passed as $1 — never commit rehearsal values.
#
#   infra/aws/scripts/build-ssr.sh [/path/to/rehearsal.env]
set -euo pipefail

cd "$(dirname "$0")/../../.."   # repo root

if [[ "${1:-}" != "" ]]; then
  echo "sourcing build env from $1"
  set -a
  # shellcheck disable=SC1090
  source "$1"
  set +a
fi

NITRO_PRESET=aws-lambda bun run build

rm -rf infra/aws/dist/ssr
mkdir -p infra/aws/dist/ssr
cp -R .output/server infra/aws/dist/ssr/server
cp -R .output/public infra/aws/dist/ssr/public
find infra/aws/dist/ssr -name '*.map' -delete

echo "SSR artifact ready:"
du -sh infra/aws/dist/ssr
