# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: Django view for POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import hmac
import json
import time

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .verify import SIGNATURE_HEADER, verify_signature

GRANTING = {"INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE"}

# Tests replace this to freeze "now" at the fixture's signing time.
clock = time.time
# At-least-once delivery: the same event id can arrive twice. Use a unique index in production.
seen: set[str] = set()


# RevenueDot has no CSRF token; the signature check below is what authenticates the request.
@csrf_exempt
@require_POST
def revenuedot_webhook(request):
    # request.body is the raw bytes; the signature covers them exactly, so parse JSON only after verifying.
    raw = request.body
    if not verify_signature(raw, request.headers.get(SIGNATURE_HEADER), settings.REVENUEDOT_WEBHOOK_SECRET, now=clock()):
        return JsonResponse({"error": "invalid signature"}, status=401)
    authorization = settings.REVENUEDOT_WEBHOOK_AUTHORIZATION
    if authorization and not hmac.compare_digest(request.headers.get("Authorization", "").encode(), authorization.encode()):
        return JsonResponse({"error": "invalid authorization"}, status=401)
    event = json.loads(raw)["event"]
    if event["id"] in seen:
        return JsonResponse({"received": True, "duplicate": True})
    seen.add(event["id"])

    # Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
    if event["type"] in GRANTING:
        print(f"grant {event.get('entitlement_ids')} to {event['app_user_id']} until {event.get('expiration_at_ms')}")
    elif event["type"] == "EXPIRATION":
        print(f"access ended for {event['app_user_id']} ({event.get('expiration_reason')})")
    else:
        print(f"{event['type']} for {event['app_user_id']}")
    return JsonResponse({"received": True})
