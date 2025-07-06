#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Check for forbidden import of useZero from @rocicorp/zero/react
# We want to ensure all code uses our typed wrapper instead

echo "Checking for forbidden imports..."

# Find files that actually import useZero from @rocicorp/zero/react
# This regex looks for import statements containing useZero from that specific package
# We need to be careful to match useZero but not useZeroQuery
# Exclude our own typed hook file
FORBIDDEN_FILES=$(grep -rlE "import.*(\{|,)[[:space:]]*useZero[[:space:]]*(,|\}).*from '@rocicorp/zero/react'" src --include="*.ts" --include="*.tsx" 2>/dev/null | \
  grep -v "src/hooks/use-typed-zero.ts" || true)

if [ -z "$FORBIDDEN_FILES" ]; then
  echo "✅ No forbidden imports of 'useZero' from '@rocicorp/zero/react' found."
  exit 0
else
  echo "❌ ERROR: Found forbidden import of 'useZero' from '@rocicorp/zero/react'."
  echo ""
  echo "Files with errors:"
  echo "$FORBIDDEN_FILES" | while IFS= read -r file; do
    echo "  - $file"
    # Show the actual import line for clarity
    grep -E "import.*(\{|,)[[:space:]]*useZero[[:space:]]*(,|\}).*from '@rocicorp/zero/react'" "$file" | sed 's/^/    /'
  done
  echo ""
  echo "Please import the typed hook from '@/hooks/use-typed-zero' instead."
  echo "Example: import { useZero } from '@/hooks/use-typed-zero'"
  exit 1
fi