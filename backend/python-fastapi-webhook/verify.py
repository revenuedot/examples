# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: verifies the HMAC signature on a RevenueDot webhook delivery.
# Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import hashlib
import hmac
import re
import time

# The header RevenueDot signs every delivery with. Its X-RevenueCat- prefix matches RevenueDot's other compatibility headers.
SIGNATURE_HEADER = "X-RevenueCat-Webhook-Signature"
_PATTERN = re.compile(r"(?:^|,)\s*t=(\d+)\s*,\s*v1=([0-9a-f]{64})\s*(?:,|$)")


def verify_signature(raw_body: bytes, header: str | None, secret: str, now: float | None = None, tolerance_seconds: int = 300) -> bool:
    """Checks `t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>`.

    raw_body must be the exact bytes received; json.dumps of a parsed body produces different bytes.
    """
    match = _PATTERN.search(header or "")
    if not match:
        return False
    timestamp = int(match.group(1))
    # Refuse old deliveries so a captured request cannot be replayed.
    if abs(int(now if now is not None else time.time()) - timestamp) > tolerance_seconds:
        return False
    expected = hmac.new(secret.encode(), f"{timestamp}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, match.group(2))
