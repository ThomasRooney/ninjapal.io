#!/usr/bin/env bash
# Assume the prod-pitminder deploy role and print export lines.
# Usage:  eval "$(infra/aws/scripts/assume-role.sh)"
# Sessions last 1h — re-run (re-eval) hourly during long operations.
set -euo pipefail

ACCOUNT="${PITMINDER_ACCOUNT:-836003244283}"
ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/OrganizationAccountAccessRole"

CREDS=$(aws sts assume-role \
  --role-arn "$ROLE_ARN" \
  --role-session-name pitminder-deploy \
  --duration-seconds 3600 \
  --output json)

echo "export AWS_ACCESS_KEY_ID=$(echo "$CREDS" | jq -r .Credentials.AccessKeyId)"
echo "export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS" | jq -r .Credentials.SecretAccessKey)"
echo "export AWS_SESSION_TOKEN=$(echo "$CREDS" | jq -r .Credentials.SessionToken)"
echo "export CDK_DEFAULT_ACCOUNT=${ACCOUNT}"
echo "export CDK_DEFAULT_REGION=eu-west-2"
echo "export AWS_REGION=eu-west-2"
