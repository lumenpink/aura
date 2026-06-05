#!/bin/bash

# Exit on error
set -e

# Default variables
WIPE=false

# Parse command line options
for arg in "$@"; do
  if [ "$arg" = "--wipe" ]; then
    WIPE=true
  fi
done

if [ "$WIPE" = true ]; then
  echo "⚠️ Wiping local D1 databases..."
  rm -rf apps/fluxo-backend/.wrangler/state/v3/d1
  echo "✅ Local D1 database state wiped."
fi

echo "🔄 Applying D1 migrations to D1_MAIN (aura-db-main)..."
echo "y" | bun --cwd apps/fluxo-backend wrangler d1 migrations apply aura-db-main --local

echo "🔄 Applying D1 migrations to D1_ANALYTICS (aura-db-analytics)..."
echo "y" | bun --cwd apps/fluxo-backend wrangler d1 migrations apply aura-db-analytics --local

echo "✨ Migrations successfully applied to both D1 databases!"
