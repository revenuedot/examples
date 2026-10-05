#!/usr/bin/env bash
# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: creates a Test Store app, a "pro" entitlement and a "default" offering on your RevenueDot, then writes .env.local.
# Docs: https://revenuedot.app/docs/getting-started/quickstart   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
#
# Usage: RD_EMAIL=you@example.com RD_PASSWORD='your password' npm run setup:test-store     (RevenueDot Cloud)
#        RD_URL=http://localhost:8787 npm run setup:test-store                              (a server you run yourself)
# Needs: curl and jq. Safe to run twice. Cloud needs a confirmed account: https://app.revenuedot.app/signup
set -euo pipefail
cd "$(dirname "$0")/.."

RD_URL="${RD_URL:-https://api.revenuedot.app}"
if [ "$RD_URL" = "https://api.revenuedot.app" ] && { [ -z "${RD_EMAIL:-}" ] || [ -z "${RD_PASSWORD:-}" ]; }; then
  echo "Create a free account at https://app.revenuedot.app/signup, confirm your email, then run:" >&2
  echo "  RD_EMAIL=you@example.com RD_PASSWORD='your password' npm run setup:test-store" >&2
  exit 1
fi

# The seed script is shared with the self-host example; use the copy in this repo when present.
SEED="../../selfhost/docker-compose/seed.sh"
if [ ! -f "$SEED" ]; then
  SEED="$(mktemp)"; trap 'rm -f "$SEED"' EXIT
  curl -fsSL https://raw.githubusercontent.com/revenuedot/examples/main/selfhost/docker-compose/seed.sh -o "$SEED"
fi

OUT="$(RD_URL="$RD_URL" bash "$SEED")"
KEY="$(printf '%s\n' "$OUT" | awk '/Test Store key/ { print $4; exit }')"
[ -n "$KEY" ] || { printf '%s\n' "$OUT" >&2; echo "Could not read the Test Store key from the seed output." >&2; exit 1; }

# Write .env.local from .env.example with the two values this setup knows.
sed -e "s|^EXPO_PUBLIC_REVENUEDOT_URL=.*|EXPO_PUBLIC_REVENUEDOT_URL=$RD_URL|" -e "s|^EXPO_PUBLIC_REVENUEDOT_API_KEY=.*|EXPO_PUBLIC_REVENUEDOT_API_KEY=$KEY|" .env.example > .env.local
echo "Wrote .env.local for $RD_URL. Run: npx expo start"
