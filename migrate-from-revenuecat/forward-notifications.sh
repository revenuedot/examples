#!/usr/bin/env bash
# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: turns on notification forwarding for one app and prints the URL to paste into App Store Connect or Pub/Sub.
# Docs: https://revenuedot.app/docs/migrate   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
#
# During a side-by-side run, the stores send notifications to RevenueDot, and RevenueDot copies each one, byte for byte,
# to FORWARD_URL (your RevenueCat notification URL), so both systems stay up to date.
#
#   RD_URL=https://revenuedot.example.com RD_KEY=sk_... PROJECT=proj... APP=app... \
#   FORWARD_URL='https://api.revenuecat.com/v1/incoming-webhooks/...' ./forward-notifications.sh
#   FORWARD_URL= ./forward-notifications.sh      # turn forwarding off
set -euo pipefail
: "${RD_URL:?}" "${RD_KEY:?}" "${PROJECT:?}" "${APP:?}"
FORWARD_URL="${FORWARD_URL-}"
api() { curl -sS -f -H "Authorization: Bearer $RD_KEY" -H 'content-type: application/json' "$@"; }

TYPE="$(api "$RD_URL/v2/projects/$PROJECT/apps/$APP" | jq -r .type)"
case "$TYPE" in app_store|mac_app_store|play_store) ;; *) echo "App $APP is a $TYPE app; only App Store and Google Play apps receive store notifications." >&2; exit 1;; esac

# notification_forward_url sits in the store details object; an empty string turns forwarding off.
api -X POST "$RD_URL/v2/projects/$PROJECT/apps/$APP" -d "{\"$TYPE\":{\"notification_forward_url\":\"$FORWARD_URL\"}}" >/dev/null
api "$RD_URL/v2/projects/$PROJECT/apps/$APP/store_settings" | jq '{notification_url, notification_forward_url, last_notification_at, last_forward}'
