#!/usr/bin/env bash
# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: seeds a fresh RevenueDot with a Test Store app, a "pro" entitlement and a "default" offering.
# Docs: https://revenuedot.app/docs/getting-started/quickstart   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
#
# Usage: ./seed.sh                      (server at http://localhost:8787)
#        RD_URL=http://localhost:8797 RD_EMAIL=you@example.com RD_PASSWORD=... ./seed.sh
#        WEBHOOK_URL=http://host.docker.internal:3000/api/webhooks/revenuedot ./seed.sh   (also adds a webhook)
# Needs: curl and jq. Safe to run twice: existing objects are reused.
set -euo pipefail

RD_URL="${RD_URL:-http://localhost:8787}"
RD_EMAIL="${RD_EMAIL:-dev@example.com}"
RD_PASSWORD="${RD_PASSWORD:-change-me-please}"
COOKIES="$(mktemp)"
trap 'rm -f "$COOKIES"' EXIT

command -v jq >/dev/null || { echo "seed.sh needs jq (brew install jq / apt install jq)" >&2; exit 1; }

# One helper for every call: fails loudly with the server's error message.
call() { # method path [json]
  local out status
  out="$(curl -sS -b "$COOKIES" -c "$COOKIES" -X "$1" -H 'content-type: application/json' ${3:+-d "$3"} -w '\n%{http_code}' "$RD_URL$2")"
  status="${out##*$'\n'}"; out="${out%$'\n'*}"
  if [ "$status" -ge 400 ]; then echo "$1 $2 -> HTTP $status: $out" >&2; return 1; fi
  printf '%s' "$out"
}

# 1. A dashboard account. Sign-up creates the first project; on a second run we sign in instead.
if ! call POST /auth/signup "{\"email\":\"$RD_EMAIL\",\"password\":\"$RD_PASSWORD\",\"project_name\":\"My app\"}" >/dev/null 2>&1; then
  call POST /auth/login "{\"email\":\"$RD_EMAIL\",\"password\":\"$RD_PASSWORD\"}" >/dev/null
fi
PROJECT="$(call GET /auth/me | jq -r '.projects[0].id')"
P="/v2/projects/$PROJECT"

# 2. A Test Store app: purchases with its test_ key need no App Store or Google Play account.
APP="$(call GET "$P/apps?limit=100" | jq -r '[.items[] | select(.type=="test_store")][0].id // empty')"
[ -n "$APP" ] || APP="$(call POST "$P/apps" '{"name":"Test Store","type":"test_store"}' | jq -r .id)"
TEST_KEY="$(call GET "$P/apps/$APP/public_api_keys" | jq -r '.items[0].key')"

# 3. Products. The duration is what the Test Store uses as the subscription period.
product() { # store_identifier type display_name price_usd [duration]
  local id; id="$(call GET "$P/products?app_id=$APP&limit=100" | jq -r --arg s "$1" '[.items[] | select(.store_identifier==$s)][0].id // empty')"
  if [ -z "$id" ]; then
    local sub=""; [ -n "${5:-}" ] && sub=",\"subscription\":{\"duration\":\"$5\"}"
    id="$(call POST "$P/products" "{\"store_identifier\":\"$1\",\"app_id\":\"$APP\",\"type\":\"$2\",\"display_name\":\"$3\"$sub}" | jq -r .id)"
  fi
  # The Test Store charges this price (set on every run, so older seeds get prices too); paywalls show it.
  local micros; micros="$(awk -v p="$4" 'BEGIN { printf "%.0f", p * 1000000 }')"
  call POST "$P/products/$id" "{\"test_store_price\":{\"amount_micros\":$micros,\"currency\":\"USD\"}}" >/dev/null || return 1
  printf '%s' "$id"
}
MONTHLY="$(product pro_monthly subscription 'Pro monthly' 9.99 P1M)"
ANNUAL="$(product pro_annual subscription 'Pro yearly' 59.99 P1Y)"
LIFETIME="$(product pro_lifetime non_consumable 'Pro lifetime' 149.99)"

# 4. The "pro" entitlement, unlocked by all three products. Apps check customerInfo.entitlements["pro"].
ENT="$(call GET "$P/entitlements?limit=100" | jq -r '[.items[] | select(.lookup_key=="pro")][0].id // empty')"
[ -n "$ENT" ] || ENT="$(call POST "$P/entitlements" '{"lookup_key":"pro","display_name":"Pro access"}' | jq -r .id)"
call POST "$P/entitlements/$ENT/actions/attach_products" "{\"product_ids\":[\"$MONTHLY\",\"$ANNUAL\",\"$LIFETIME\"]}" >/dev/null

# 5. The "default" offering with three packages. The project's first offering becomes current.
OFFERING="$(call GET "$P/offerings?limit=100" | jq -r '[.items[] | select(.lookup_key=="default")][0].id // empty')"
if [ -z "$OFFERING" ]; then
  OFFERING="$(call POST "$P/offerings" '{"lookup_key":"default","display_name":"Standard plans"}' | jq -r .id)"
  call POST "$P/offerings/$OFFERING" '{"is_current":true}' >/dev/null
  pos=0
  for pair in "\$rc_monthly:Monthly:$MONTHLY" "\$rc_annual:Yearly:$ANNUAL" "\$rc_lifetime:Lifetime:$LIFETIME"; do
    IFS=: read -r lk name prod <<<"$pair"
    pkg="$(call POST "$P/offerings/$OFFERING/packages" "{\"lookup_key\":\"$lk\",\"display_name\":\"$name\",\"position\":$pos}" | jq -r .id)"
    call POST "$P/packages/$pkg/actions/attach_products" "{\"products\":[{\"product_id\":\"$prod\",\"eligibility_criteria\":\"all\"}]}" >/dev/null
    pos=$((pos + 1))
  done
fi

# 6. A secret key for your backend and the REST API (shown once, so a new one is made on every run).
SECRET_KEY="$(call POST "$P/api_keys" '{"name":"seed script"}' | jq -r .key)"

# 7. Optional webhook. The signing secret is only returned when the webhook is created.
WEBHOOK_SECRET=""
if [ -n "${WEBHOOK_URL:-}" ]; then
  WEBHOOK_SECRET="$(call POST "$P/integrations/webhooks" "{\"name\":\"Local backend\",\"url\":\"$WEBHOOK_URL\"}" | jq -r .signing_secret)"
fi

cat <<OUT
RevenueDot is seeded.
  Dashboard        $RD_URL  (sign in as $RD_EMAIL)
  Project id       $PROJECT
  Test Store key   $TEST_KEY      <- the SDK's API key; the SDK's proxy URL is $RD_URL
  Secret key       $SECRET_KEY    <- server-side only (REST API, backend checks)
OUT
[ -z "$WEBHOOK_SECRET" ] || echo "  Webhook secret   $WEBHOOK_SECRET    <- REVENUEDOT_WEBHOOK_SECRET in your backend"
echo "Try it:"
echo "  curl -s -H \"Authorization: Bearer $TEST_KEY\" $RD_URL/v1/subscribers/user_1/offerings"
