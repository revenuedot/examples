# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: tests has_entitlement and GET /api/pro-content against a local fake of GET /v1/subscribers.
# Docs: https://revenuedot.app/docs/api/rest-v1   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import copy
import json
import pathlib
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from entitlements import RevenueDotError, has_entitlement  # noqa: E402
from server import create_server  # noqa: E402

# A real GET /v1/subscribers response captured from a RevenueDot server (active monthly "pro").
ACTIVE = json.loads((pathlib.Path(__file__).parent / "fixtures" / "subscriber-active.json").read_text())
NOW = datetime(2026, 10, 1, tzinfo=timezone.utc)
SECRET_KEY = "sk_test_fake"


def with_pro(**changes):
    body = copy.deepcopy(ACTIVE)
    if changes.pop("missing", False):
        body["subscriber"]["entitlements"] = {}
    else:
        body["subscriber"]["entitlements"]["pro"].update(changes)
    return body


ANSWERS = {
    "active": (200, ACTIVE),
    "expired": (200, with_pro(expires_date="2026-09-30T20:43:42Z")),
    "lifetime": (200, with_pro(expires_date=None, product_identifier="pro_lifetime")),
    "grace": (200, with_pro(expires_date="2026-09-30T20:43:42Z", grace_period_expires_date="2026-10-07T20:43:42Z")),
    "grace-over": (200, with_pro(expires_date="2026-09-20T00:00:00Z", grace_period_expires_date="2026-09-27T00:00:00Z")),
    # RevenueDot, like RevenueCat, creates an unknown subscriber on GET and answers 201 with no entitlements.
    "new-user": (201, with_pro(missing=True)),
    "server-error": (500, {"code": 7110, "message": "Internal server error."}),
}
REQUESTS: list[tuple[str, str | None]] = []


class FakeRevenueDot(BaseHTTPRequestHandler):
    def do_GET(self):
        REQUESTS.append((self.path, self.headers.get("Authorization")))
        user_id = urllib.parse.unquote(self.path.removeprefix("/v1/subscribers/"))
        if self.headers.get("Authorization") != f"Bearer {SECRET_KEY}":
            status, body = 401, {"code": 7225, "message": "Invalid API Key."}
        else:
            status, body = ANSWERS.get(user_id) or (ANSWERS["active"] if user_id.startswith("$RCAnonymousID:") else (404, {}))
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


@pytest.fixture(scope="module")
def base_url():
    server = ThreadingHTTPServer(("127.0.0.1", 0), FakeRevenueDot)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}/"
    server.shutdown()


def test_reads_entitlements_active_expired_lifetime_grace_missing(base_url):
    def check(user_id, entitlement_id="pro"):
        return has_entitlement(user_id, entitlement_id, now=NOW, base_url=base_url, secret_key=SECRET_KEY)

    assert check("active") is True
    assert check("expired") is False
    assert check("lifetime") is True
    assert check("grace") is True
    assert check("grace-over") is False
    assert check("new-user") is False
    assert check("active", "gold") is False


def test_sends_the_secret_key_and_url_encodes_the_app_user_id(base_url):
    REQUESTS.clear()
    assert has_entitlement("$RCAnonymousID:a b/c", "pro", now=NOW, base_url=base_url, secret_key=SECRET_KEY)
    assert REQUESTS == [("/v1/subscribers/%24RCAnonymousID%3Aa%20b%2Fc", f"Bearer {SECRET_KEY}")]


def test_raises_on_401_and_5xx_instead_of_answering_false(base_url):
    with pytest.raises(RevenueDotError, match="answered 401"):
        has_entitlement("active", "pro", base_url=base_url, secret_key="sk_wrong")
    with pytest.raises(RevenueDotError, match="answered 500"):
        has_entitlement("server-error", "pro", base_url=base_url, secret_key=SECRET_KEY)
    with pytest.raises(RevenueDotError, match="REVENUEDOT_URL"):
        has_entitlement("active", "pro", base_url="", secret_key="")


def test_pro_content_endpoint_gates_on_the_entitlement(base_url):
    server = create_server(0, check=lambda user_id, ent: has_entitlement(user_id, ent, now=NOW, base_url=base_url, secret_key=SECRET_KEY))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_address[1]}/api/pro-content"

    def get(user_id=None):
        headers = {"X-User-Id": user_id} if user_id else {}
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers)) as res:
                return res.status, json.load(res)
        except urllib.error.HTTPError as err:
            return err.code, json.load(err)

    try:
        assert get("active") == (200, {"content": "Pro content for active"})
        assert get("expired")[0] == 403
        assert get()[0] == 401
        assert get("server-error")[0] == 502
    finally:
        server.shutdown()
        server.server_close()
