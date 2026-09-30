# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: standard-library HTTP server with GET /api/pro-content that serves content only to users with the "pro" entitlement.
# Docs: https://revenuedot.app/docs/api/rest-v1   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable
from urllib.parse import urlsplit

from entitlements import RevenueDotError, has_entitlement

ENTITLEMENT_ID = "pro"


def create_server(port: int, check: Callable[[str, str], bool] = has_entitlement) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def send(self, status: int, body: dict) -> None:
            data = json.dumps(body).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self) -> None:
            if urlsplit(self.path).path != "/api/pro-content":
                return self.send(404, {"error": "not found"})
            # Demo only: anyone can send any X-User-Id. A real app takes the user id from its own session or auth token,
            # the same id it passes to the SDK's logIn(), and never trusts one sent by the client.
            app_user_id = self.headers.get("X-User-Id")
            if not app_user_id:
                return self.send(401, {"error": "missing X-User-Id"})
            try:
                if not check(app_user_id, ENTITLEMENT_ID):
                    return self.send(403, {"error": f"the {ENTITLEMENT_ID} entitlement is required"})
            except RevenueDotError as err:
                # Fail closed: if RevenueDot cannot be asked, do not hand out paid content.
                print(err, file=sys.stderr)
                return self.send(502, {"error": "could not check the entitlement"})
            self.send(200, {"content": f"Pro content for {app_user_id}"})

    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3000"))
    print(f"Listening on http://localhost:{port}/api/pro-content")
    create_server(port).serve_forever()
