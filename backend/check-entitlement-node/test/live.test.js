// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: opt-in test against a running RevenueDot; runs only when REVENUEDOT_URL and REVENUEDOT_SECRET_KEY are set.
// Docs: https://revenuedot.app/docs/api/rest-v1   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hasEntitlement } from "../src/entitlements.js";

const { REVENUEDOT_URL: baseUrl, REVENUEDOT_SECRET_KEY: secretKey, REVENUEDOT_PROJECT_ID: projectId } = process.env;
const live = Boolean(baseUrl && secretKey);
const entitlementId = process.env.REVENUEDOT_ENTITLEMENT_ID ?? "pro";
const productId = process.env.REVENUEDOT_TEST_PRODUCT_ID ?? "pro_monthly";

// Buys a product for a user through the Test Store (the dashboard's test purchase endpoint).
async function testPurchase(appUserId, scenario) {
  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/v2/projects/${projectId}/test_purchases`, {
    method: "POST",
    headers: { authorization: `Bearer ${secretKey}`, "content-type": "application/json" },
    body: JSON.stringify({ app_user_id: appUserId, product_id: productId, scenario }),
  });
  assert.equal(res.status, 201, await res.clone().text());
}

test("a new user has no entitlement and a wrong key throws", { skip: !live && "set REVENUEDOT_URL and REVENUEDOT_SECRET_KEY" }, async () => {
  assert.equal(await hasEntitlement(`example_${randomUUID()}`, entitlementId, { baseUrl, secretKey }), false);
  await assert.rejects(hasEntitlement("anyone", entitlementId, { baseUrl, secretKey: "sk_wrong" }), /answered 401/);
});

test("a Test Store purchase grants the entitlement and an expired one does not", { skip: !(live && projectId) && "also set REVENUEDOT_PROJECT_ID" }, async () => {
  const buyer = `example_${randomUUID()}`;
  await testPurchase(buyer, "purchase");
  assert.equal(await hasEntitlement(buyer, entitlementId, { baseUrl, secretKey }), true);
  const lapsed = `example_${randomUUID()}`;
  await testPurchase(lapsed, "expire");
  assert.equal(await hasEntitlement(lapsed, entitlementId, { baseUrl, secretKey }), false);
});
