# Check a RevenueDot entitlement from your Node.js server

## What this is
A small Node.js 22 module, `hasEntitlement(appUserId, entitlementId)`, that asks RevenueDot whether a customer has access right now, plus a `node:http` server with `GET /api/pro-content` that serves content only to customers with the `pro` entitlement. It calls REST v1 `GET /v1/subscribers/{app_user_id}` with a secret key. No dependencies; `src/entitlements.js` can be copied as is.

**Status: verified, including against a live server.** `node --test` (4 tests against a local fake that serves a `GET /v1/subscribers` response captured from a RevenueDot server: active, expired, lifetime, grace period, missing entitlement, 401 and 5xx) passes on Node.js 22.14. The response shape was checked by hand against a local RevenueDot (active, expired, lifetime and new users). On 2026-09-30 the 2 opt-in live tests also passed (`npm test` with `REVENUEDOT_URL`, `REVENUEDOT_SECRET_KEY` and `REVENUEDOT_PROJECT_ID` set) against a local RevenueDot seeded with `selfhost/docker-compose/seed.sh`: a Test Store purchase granted `pro`, an expired one did not, and a wrong key threw.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL. Its REST v1 `GET /v1/subscribers` answers with RevenueCat's JSON, so server code written for RevenueCat keeps working.

## Run it
```bash
cd backend/check-entitlement-node
npm test                                          # fake RevenueDot; the live tests are skipped
cp .env.example .env                              # set REVENUEDOT_URL and REVENUEDOT_SECRET_KEY
npm start                                         # http://localhost:3000/api/pro-content  (PORT to change)
curl -H 'X-User-Id: user_42' http://localhost:3000/api/pro-content
```

With a local RevenueDot from [`selfhost/docker-compose`](../../selfhost/docker-compose) (`docker compose up`, then `./seed.sh`, which prints a secret key and the project id), `REVENUEDOT_URL` is `http://localhost:8787`. Give a test user access with a Test Store purchase, then run the live tests:

```bash
curl -X POST "$REVENUEDOT_URL/v2/projects/$REVENUEDOT_PROJECT_ID/test_purchases" \
  -H "Authorization: Bearer $REVENUEDOT_SECRET_KEY" -H 'content-type: application/json' \
  -d '{"app_user_id":"user_42","product_id":"pro_monthly"}'
REVENUEDOT_URL=... REVENUEDOT_SECRET_KEY=sk_... REVENUEDOT_PROJECT_ID=proj... npm test
```

The live tests run only when `REVENUEDOT_URL` and `REVENUEDOT_SECRET_KEY` are set. With `REVENUEDOT_PROJECT_ID` too, they buy `pro_monthly` for a new user and check that it grants `pro` (override with `REVENUEDOT_TEST_PRODUCT_ID` and `REVENUEDOT_ENTITLEMENT_ID`).

## How it works
1. `hasEntitlement` sends `GET {REVENUEDOT_URL}/v1/subscribers/{encodeURIComponent(appUserId)}` with `Authorization: Bearer sk_...`. Use a **secret key**, only on your server; never ship it in an app. See [REST API v1](https://revenuedot.app/docs/api/rest-v1).
2. It reads `subscriber.entitlements[entitlementId]`. The customer has access when `expires_date` is `null` (a lifetime purchase) or in the future, or when `grace_period_expires_date` is in the future (a billing issue that the store is still retrying). A missing entitlement means no access.
3. Any answer other than 200 or 201 throws, so a wrong key (401) or an outage (5xx) is never read as "no access". The endpoint fails closed and answers 502.
4. `GET /api/pro-content` takes the user from the `X-User-Id` header to keep the demo short. **A real app takes the user id from its own session or auth token**, the same id it passes to the SDK's `logIn()`, and never trusts one sent by the client.
5. Like RevenueCat, `GET /v1/subscribers` creates a subscriber it has not seen and answers `201` with no entitlements. To react to purchases as they happen instead of asking, receive webhooks (see [`backend/node-express-webhook`](../node-express-webhook) and [Webhooks](https://revenuedot.app/docs/guides/webhooks)).

## Migrate from RevenueCat
The response of `GET /v1/subscribers/{app_user_id}` has the same shape as RevenueCat's: `request_date`, `request_date_ms` and a `subscriber` object with `entitlements` (`expires_date`, `grace_period_expires_date`, `product_identifier`, `purchase_date`), `subscriptions`, `non_subscriptions`, `first_seen`, `original_app_user_id` and `subscriber_attributes`. Existing server code keeps working after two changes:

- **Change the base URL** from `https://api.revenuecat.com` to your RevenueDot server.
- **Use a RevenueDot secret key** (`sk_...`, dashboard: API keys, or `POST /v2/projects/{project_id}/api_keys`) in place of the RevenueCat one.

## Docs
- [REST API v1](https://revenuedot.app/docs/api/rest-v1): `GET /v1/subscribers` and the other secret-key endpoints.
- [Authentication](https://revenuedot.app/docs/api/authentication): secret keys for server-side calls.
- [Migrate from RevenueCat](https://revenuedot.app/docs/migrate).

## Related examples
- [`backend/check-entitlement-python`](../check-entitlement-python): the same check in Python.
- [`backend/node-express-webhook`](../node-express-webhook): receive webhooks in Express.
- [`backend/aws-lambda-webhook`](../aws-lambda-webhook): receive webhooks in AWS Lambda.
- [`selfhost/docker-compose`](../../selfhost/docker-compose): a local RevenueDot to test against (`./seed.sh` prints a secret key).
