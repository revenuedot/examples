# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
# This file: has_entitlement(app_user_id, entitlement_id) via REST v1 GET /v1/subscribers/{app_user_id} with a secret key.
# Docs: https://revenuedot.app/docs/api/rest-v1   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone


class RevenueDotError(Exception):
    """RevenueDot could not answer, so the caller must not treat it as "no access" or "access"."""


def get_subscriber(app_user_id: str, base_url: str | None = None, secret_key: str | None = None, timeout: float = 10) -> dict:
    """Fetches the subscriber object, the same JSON as RevenueCat's GET /v1/subscribers/{app_user_id}.

    Raises RevenueDotError on any answer other than 200 or 201, so a bad key or an outage never reads as "no access" by accident.
    """
    base_url = base_url if base_url is not None else os.environ.get("REVENUEDOT_URL", "")
    secret_key = secret_key if secret_key is not None else os.environ.get("REVENUEDOT_SECRET_KEY", "")
    if not base_url or not secret_key:
        raise RevenueDotError("Set REVENUEDOT_URL and REVENUEDOT_SECRET_KEY (see .env.example)")
    # App user ids can hold ":" or "/" (anonymous ids look like $RCAnonymousID:...), so encode every character.
    url = f"{base_url.rstrip('/')}/v1/subscribers/{urllib.parse.quote(app_user_id, safe='')}"
    # Secret key (sk_...): server-side only. A public app key cannot read other users' data this way.
    # Send a real User-Agent: Cloudflare's Browser Integrity Check rejects urllib's default one with error 1010.
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {secret_key}", "Accept": "application/json", "User-Agent": "revenuedot-example-python/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            # 201 means this call created the subscriber (an id RevenueDot had not seen), exactly as RevenueCat does.
            if response.status not in (200, 201):
                raise RevenueDotError(f"RevenueDot GET /v1/subscribers answered {response.status}")
            return json.load(response)["subscriber"]
    except urllib.error.HTTPError as err:
        raise RevenueDotError(f"RevenueDot GET /v1/subscribers answered {err.code}: {err.read()[:200].decode(errors='replace')}") from err
    except urllib.error.URLError as err:
        raise RevenueDotError(f"RevenueDot is unreachable: {err.reason}") from err


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def is_entitlement_active(entitlement: dict | None, now: datetime | None = None) -> bool:
    """Active while expires_date is in the future, forever when it is null (a lifetime purchase),
    and until grace_period_expires_date while a billing issue is being retried."""
    if not entitlement:
        return False
    if entitlement.get("expires_date") is None:
        return True
    now = now or datetime.now(timezone.utc)
    until = [_parse(entitlement["expires_date"])]
    if entitlement.get("grace_period_expires_date"):
        until.append(_parse(entitlement["grace_period_expires_date"]))
    return max(until) > now


def has_entitlement(app_user_id: str, entitlement_id: str, now: datetime | None = None, **options) -> bool:
    subscriber = get_subscriber(app_user_id, **options)
    return is_entitlement_active((subscriber.get("entitlements") or {}).get(entitlement_id), now)
