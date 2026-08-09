#!/usr/bin/env bash
# Sync the built hashed assets to the S3 assets origin + invalidate /assets/*.
# Part of every deploy that changes the client bundle:
#   scripts/build-ssr.sh [env]   -> dist/ssr (Lambda artifact incl. public/)
#   cdk deploy pitminder-compute -> Lambda + distribution update
#   scripts/sync-assets.sh       -> S3 assets + invalidation
#
# Ordering is forgiving: the /assets/* behavior is an ORIGIN GROUP with the
# Lambda (serveStatic) as fallback, so chunks missing from S3 — the window
# between deploy and sync, or open tabs lazy-loading a previous build — fall
# back to the Lambda instead of 404ing.
#
# Never --delete: hashed filenames are immutable and old chunks may still be
# referenced by sessions that loaded HTML before the deploy.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:-dist/ssr/public/assets}"
if [ ! -d "$SRC" ]; then
  echo "missing $SRC — run scripts/build-ssr.sh first" >&2
  exit 1
fi

BUCKET=$(aws ssm get-parameter --name /pitminder/prod/compute/assets-bucket-name --query Parameter.Value --output text)
DIST_ID=$(aws ssm get-parameter --name /pitminder/prod/compute/cloudfront-distribution-id --query Parameter.Value --output text)

echo "syncing $SRC -> s3://$BUCKET/assets"
aws s3 sync "$SRC" "s3://$BUCKET/assets" \
  --cache-control 'public,max-age=31536000,immutable'

echo "invalidating /assets/* on $DIST_ID"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" \
  --paths '/assets/*' --query 'Invalidation.[Id,Status]' --output text
