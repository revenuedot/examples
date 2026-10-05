# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: tests the Django webhook with a real signed delivery captured from a RevenueDot server.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import json
import pathlib
import re
from unittest import mock

from django.test import SimpleTestCase, override_settings

from webhooks import views
from webhooks.verify import verify_signature

FIXTURE = json.loads((pathlib.Path(__file__).parent / "fixtures" / "initial-purchase.json").read_text())
BODY = FIXTURE["body"].encode()
SIGNED_AT = int(re.search(r"t=(\d+)", FIXTURE["signature_header"]).group(1))


class VerifySignatureTests(SimpleTestCase):
    def test_accepts_the_real_delivery_and_rejects_tampering_wrong_secrets_and_old_deliveries(self):
        self.assertTrue(verify_signature(BODY, FIXTURE["signature_header"], FIXTURE["secret"], now=SIGNED_AT))
        self.assertFalse(verify_signature(BODY.replace(b"9.99", b"0.99"), FIXTURE["signature_header"], FIXTURE["secret"], now=SIGNED_AT))
        self.assertFalse(verify_signature(BODY, FIXTURE["signature_header"], "whsec_wrong", now=SIGNED_AT))
        self.assertFalse(verify_signature(BODY, FIXTURE["signature_header"], FIXTURE["secret"], now=SIGNED_AT + 301))
        self.assertFalse(verify_signature(BODY, None, FIXTURE["secret"], now=SIGNED_AT))


@override_settings(REVENUEDOT_WEBHOOK_SECRET=FIXTURE["secret"], REVENUEDOT_WEBHOOK_AUTHORIZATION=FIXTURE["authorization_header"])
@mock.patch.object(views, "clock", lambda: SIGNED_AT)
class EndpointTests(SimpleTestCase):
    def setUp(self):
        views.seen.clear()

    def post(self, **headers):
        good = {"x-revenuecat-webhook-signature": FIXTURE["signature_header"], "authorization": FIXTURE["authorization_header"]}
        return self.client.post("/webhooks/revenuedot", data=BODY, content_type="application/json", headers={**good, **headers})

    def test_accepts_dedupes_and_rejects(self):
        res = self.post()
        self.assertEqual((res.status_code, res.json()), (200, {"received": True}))
        self.assertEqual(self.post().json(), {"received": True, "duplicate": True})
        res = self.post(**{"x-revenuecat-webhook-signature": "t=1,v1=00"})
        self.assertEqual((res.status_code, res.json()), (401, {"error": "invalid signature"}))
        res = self.post(authorization="Bearer nope")
        self.assertEqual((res.status_code, res.json()), (401, {"error": "invalid authorization"}))
