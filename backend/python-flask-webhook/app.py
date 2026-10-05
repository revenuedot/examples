# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: Flask app with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import hmac
import json
import os
import time
from typing import Callable

from flask import Flask, jsonify, request

from verify import SIGNATURE_HEADER, verify_signature

GRANTING = {"INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE"}


def create_app(secret: str, authorization: str | None = None, clock: Callable[[], float] = time.time) -> Flask:
    app = Flask(__name__)
    # At-least-once delivery: the same event id can arrive twice. Use a unique index in production.
    seen: set[str] = set()

    @app.post("/webhooks/revenuedot")
    def revenuedot_webhook():
        # get_data() is the raw bytes; the signature covers them exactly, so parse JSON only after verifying.
        raw = request.get_data()
        if not verify_signature(raw, request.headers.get(SIGNATURE_HEADER), secret, now=clock()):
            return jsonify(error="invalid signature"), 401
        if authorization and not hmac.compare_digest(request.headers.get("Authorization", "").encode(), authorization.encode()):
            return jsonify(error="invalid authorization"), 401
        event = json.loads(raw)["event"]
        if event["id"] in seen:
            return jsonify(received=True, duplicate=True)
        seen.add(event["id"])

        # Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
        if event["type"] in GRANTING:
            print(f"grant {event.get('entitlement_ids')} to {event['app_user_id']} until {event.get('expiration_at_ms')}")
        elif event["type"] == "EXPIRATION":
            print(f"access ended for {event['app_user_id']} ({event.get('expiration_reason')})")
        else:
            print(f"{event['type']} for {event['app_user_id']}")
        return jsonify(received=True)

    return app


if __name__ == "__main__":
    secret = os.environ.get("REVENUEDOT_WEBHOOK_SECRET")
    if not secret:
        raise SystemExit("Set REVENUEDOT_WEBHOOK_SECRET (see .env.example)")
    # The development server is fine for trying it out; run gunicorn or similar in production.
    create_app(secret, os.environ.get("REVENUEDOT_WEBHOOK_AUTHORIZATION") or None).run(port=int(os.environ.get("PORT", "3000")))
