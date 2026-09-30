# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: tests the FastAPI webhook with a real signed delivery captured from a RevenueDot server.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import json
import pathlib
import re
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from main import create_app  # noqa: E402
from verify import verify_signature  # noqa: E402

FIXTURE = json.loads((pathlib.Path(__file__).parent / "fixtures" / "initial-purchase.json").read_text())
BODY = FIXTURE["body"].encode()
SIGNED_AT = int(re.search(r"t=(\d+)", FIXTURE["signature_header"]).group(1))


def test_verify_signature():
    assert verify_signature(BODY, FIXTURE["signature_header"], FIXTURE["secret"], now=SIGNED_AT)
    assert not verify_signature(BODY.replace(b"9.99", b"0.99"), FIXTURE["signature_header"], FIXTURE["secret"], now=SIGNED_AT)
    assert not verify_signature(BODY, FIXTURE["signature_header"], "whsec_wrong", now=SIGNED_AT)
    assert not verify_signature(BODY, FIXTURE["signature_header"], FIXTURE["secret"], now=SIGNED_AT + 301)
    assert not verify_signature(BODY, None, FIXTURE["secret"], now=SIGNED_AT)


def test_endpoint_accepts_dedupes_and_rejects():
    client = TestClient(create_app(FIXTURE["secret"], FIXTURE["authorization_header"], clock=lambda: SIGNED_AT))
    good = {"content-type": "application/json", "x-revenuecat-webhook-signature": FIXTURE["signature_header"], "authorization": FIXTURE["authorization_header"]}
    res = client.post("/webhooks/revenuedot", content=BODY, headers=good)
    assert res.status_code == 200 and res.json() == {"received": True}
    assert client.post("/webhooks/revenuedot", content=BODY, headers=good).json() == {"received": True, "duplicate": True}
    assert client.post("/webhooks/revenuedot", content=BODY, headers={**good, "x-revenuecat-webhook-signature": "t=1,v1=00"}).status_code == 401
    assert client.post("/webhooks/revenuedot", content=BODY, headers={**good, "authorization": "Bearer nope"}).status_code == 401
