#!/usr/bin/env bash
# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: live end-to-end check for a webhook backend: a real RevenueDot signs and delivers INITIAL_PURCHASE to it.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
#
# Usage: scripts/e2e-webhook.sh <backend port> <webhook path> -- <command that starts the backend>
#   e.g. scripts/e2e-webhook.sh 3100 /webhooks/revenuedot -- npm start        (run inside the example folder)
# The backend command gets REVENUEDOT_WEBHOOK_SECRET and PORT in its environment.
# By default it starts a throwaway RevenueDot from a revenuedot/revenuedot checkout (RD_SERVER_DIR, default
# ../revenuedot next to this repo) on RD_PORT (default: a random port) with a PGlite database in a temp folder.
# Set RD_URL to use a server that is already running instead. Needs curl, jq and node.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
[ $# -ge 4 ] && [ "$3" = "--" ] || { echo "usage: $0 <port> <path> -- <start command...>" >&2; exit 2; }
BPORT="$1"; BPATH="$2"; shift 3
RD_PORT="${RD_PORT:-$((20000 + RANDOM % 20000))}"
RD_SERVER_DIR="${RD_SERVER_DIR:-$HERE/../revenuedot}"
TMP="$(mktemp -d)"; pids=()
cleanup() { for p in "${pids[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null; done; wait 2>/dev/null; rm -rf "$TMP"; }
trap cleanup EXIT

if [ -z "${RD_URL:-}" ]; then
  RD_URL="http://localhost:$RD_PORT"
  (cd "$RD_SERVER_DIR/apps/server" && DATABASE_URL="pglite://$TMP/db" PORT="$RD_PORT" DASHBOARD_DIST="$TMP/none" \
    exec "$RD_SERVER_DIR/node_modules/.bin/tsx" src/entry.node.ts) >"$TMP/server.log" 2>&1 &
  pids+=($!)
  for _ in $(seq 1 60); do curl -s -o /dev/null "$RD_URL/v1/health" && break
    kill -0 "${pids[0]}" 2>/dev/null || { cat "$TMP/server.log" >&2; exit 1; }; sleep 1; done
fi

WEBHOOK_URL="http://localhost:$BPORT$BPATH"
SEED="$(RD_URL="$RD_URL" RD_EMAIL="e2e-$RANDOM@example.com" WEBHOOK_URL="$WEBHOOK_URL" "$HERE/selfhost/docker-compose/seed.sh")"
field() { printf '%s\n' "$SEED" | awk -v k="$1" 'index($0, k) { print $3; exit }'; }
PROJECT="$(field "Project id")"; SK="$(field "Secret key")"; WHSEC="$(field "Webhook secret")"
[ -n "$PROJECT" ] && [ -n "$SK" ] && [ -n "$WHSEC" ] || { echo "seed output not understood:" >&2; echo "$SEED" >&2; exit 1; }
api() { curl -sS -H "authorization: Bearer $SK" -H 'content-type: application/json' "$@"; }
P="$RD_URL/v2/projects/$PROJECT"
HOOK="$(api "$P/integrations/webhooks" | jq -r '.items[0].id')"

REVENUEDOT_WEBHOOK_SECRET="$WHSEC" PORT="$BPORT" "$@" >"$TMP/backend.log" 2>&1 &
pids+=($!)
# Any HTTP answer (even 404 or 405 for a GET) means the backend is listening.
for _ in $(seq 1 120); do [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$BPORT$BPATH" || true)" != 000 ] && break; sleep 1; done

USER_ID="e2e_user_$RANDOM"
api -X POST "$P/test_purchases" -d "{\"app_user_id\":\"$USER_ID\",\"product_id\":\"pro_monthly\"}" | jq -c '{event_types}'

status=""
for _ in $(seq 1 30); do
  row="$(api "$P/webhooks/$HOOK/deliveries?limit=20" | jq -c '[.items[] | select(.event_type=="INITIAL_PURCHASE")][0] // empty')"
  status="$(printf '%s' "$row" | jq -r '.status // empty' 2>/dev/null || true)"
  [ -n "$status" ] && [ "$status" != pending ] && break
  sleep 1
done
echo "delivery: $row"
echo "--- backend log"; tail -n 20 "$TMP/backend.log"
if [ "$status" = delivered ] && [ "$(printf '%s' "$row" | jq -r .response_status)" = 200 ]; then
  echo "PASS: RevenueDot delivered INITIAL_PURCHASE for $USER_ID to $WEBHOOK_URL and recorded HTTP 200"
else
  echo "FAIL: delivery status '${status:-none}'" >&2; exit 1
fi
