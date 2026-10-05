# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: FastAPI app with POST /webhooks/revenuedot that verifies, dedupes and handles RevenueDot events.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import hmac
import json
import os
import time
from typing import Callable

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from verify import SIGNATURE_HEADER, verify_signature

GRANTING = {"INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "PRODUCT_CHANGE"}


def create_app(secret: str, authorization: str | None = None, clock: Callable[[], float] = time.time) -> FastAPI:
    app = FastAPI()
    # At-least-once delivery: the same event id can arrive twice. Use a unique index in production.
    seen: set[str] = set()

    @app.post("/webhooks/revenuedot")
    async def revenuedot_webhook(request: Request):
        # request.body() is the raw bytes; the signature covers them exactly, so parse JSON only after verifying.
        raw = await request.body()
        if not verify_signature(raw, request.headers.get(SIGNATURE_HEADER), secret, now=clock()):
            return JSONResponse({"error": "invalid signature"}, status_code=401)
        if authorization and not hmac.compare_digest(request.headers.get("authorization", ""), authorization):
            return JSONResponse({"error": "invalid authorization"}, status_code=401)
        event = json.loads(raw)["event"]
        if event["id"] in seen:
            return {"received": True, "duplicate": True}
        seen.add(event["id"])

        # Keep this fast: only HTTP 200 counts as delivered; slow answers time out and are retried.
        if event["type"] in GRANTING:
            print(f"grant {event.get('entitlement_ids')} to {event['app_user_id']} until {event.get('expiration_at_ms')}")
        elif event["type"] == "EXPIRATION":
            print(f"access ended for {event['app_user_id']} ({event.get('expiration_reason')})")
        else:
            print(f"{event['type']} for {event['app_user_id']}")
        return {"received": True}

    return app


# `uvicorn main:app --port 3000` reads the secret from the environment.
app = create_app(os.environ.get("REVENUEDOT_WEBHOOK_SECRET", ""), os.environ.get("REVENUEDOT_WEBHOOK_AUTHORIZATION") or None)
