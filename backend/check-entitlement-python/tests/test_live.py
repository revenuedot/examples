# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: opt-in test against a running RevenueDot; runs only when REVENUEDOT_URL and REVENUEDOT_SECRET_KEY are set.
# Docs: https://revenuedot.app/docs/api/rest-v1   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import json
import os
import pathlib
import sys
import urllib.request
import uuid

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from entitlements import RevenueDotError, has_entitlement  # noqa: E402

BASE_URL = os.environ.get("REVENUEDOT_URL", "")
SECRET_KEY = os.environ.get("REVENUEDOT_SECRET_KEY", "")
PROJECT_ID = os.environ.get("REVENUEDOT_PROJECT_ID", "")
ENTITLEMENT_ID = os.environ.get("REVENUEDOT_ENTITLEMENT_ID", "pro")
PRODUCT_ID = os.environ.get("REVENUEDOT_TEST_PRODUCT_ID", "pro_monthly")

live = pytest.mark.skipif(not (BASE_URL and SECRET_KEY), reason="set REVENUEDOT_URL and REVENUEDOT_SECRET_KEY")


def buy(app_user_id: str, scenario: str) -> None:
    """Buys a product for a user through the Test Store (the dashboard's test purchase endpoint)."""
    body = json.dumps({"app_user_id": app_user_id, "product_id": PRODUCT_ID, "scenario": scenario}).encode()
    request = urllib.request.Request(
        f"{BASE_URL.rstrip('/')}/v2/projects/{PROJECT_ID}/test_purchases", data=body, method="POST",
        headers={"Authorization": f"Bearer {SECRET_KEY}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request) as response:
        assert response.status == 201


@live
def test_new_user_has_no_entitlement_and_wrong_key_raises():
    assert has_entitlement(f"example_{uuid.uuid4()}", ENTITLEMENT_ID, base_url=BASE_URL, secret_key=SECRET_KEY) is False
    with pytest.raises(RevenueDotError, match="answered 401"):
        has_entitlement("anyone", ENTITLEMENT_ID, base_url=BASE_URL, secret_key="sk_wrong")


@live
@pytest.mark.skipif(not PROJECT_ID, reason="also set REVENUEDOT_PROJECT_ID")
def test_purchase_grants_the_entitlement_and_an_expired_one_does_not():
    buyer = f"example_{uuid.uuid4()}"
    buy(buyer, "purchase")
    assert has_entitlement(buyer, ENTITLEMENT_ID, base_url=BASE_URL, secret_key=SECRET_KEY) is True
    lapsed = f"example_{uuid.uuid4()}"
    buy(lapsed, "expire")
    assert has_entitlement(lapsed, ENTITLEMENT_ID, base_url=BASE_URL, secret_key=SECRET_KEY) is False
