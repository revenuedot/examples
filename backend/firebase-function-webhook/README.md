# Receive RevenueDot webhooks in Firebase Cloud Functions

## What this is
A Firebase Functions v2 HTTPS function, `revenuedotWebhook`, that verifies the HMAC signature of each RevenueDot webhook, ignores duplicate deliveries and acts on the event type. The handler lives in `src/webhook.js` with no Firebase imports, so it is easy to test and to move; `src/index.js` wires it to `onRequest` and the signing secret from `defineSecret`. `src/verify.js` can be copied as is.

**Status: verified.** `node --test` (2 tests with a real signed delivery captured from a RevenueDot server and a fake req/res) passes on Node.js 22.14, and `src/index.js` loads and answers through `onRequest` with firebase-functions 6.6.0 and firebase-admin 13.10.0. Not deployed to Firebase from here.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL. Its webhooks use RevenueCat's payload shape, so a handler written for RevenueCat keeps working.

## Run it
```bash
cd backend/firebase-function-webhook
npm install
npm test
```

Deploy it (needs the [Firebase CLI](https://firebase.google.com/docs/cli) and a project on the Blaze plan, which Secret Manager requires):

```bash
firebase use --add                                         # pick your Firebase project
firebase functions:secrets:set REVENUEDOT_WEBHOOK_SECRET   # paste the whsec_... signing secret
cp .env.example .env                                       # optional: set REVENUEDOT_WEBHOOK_AUTHORIZATION
firebase deploy --only functions
```

The deploy prints the function URL, for example `https://revenuedotwebhook-<hash>-uc.a.run.app` or `https://us-central1-<project>.cloudfunctions.net/revenuedotWebhook`. Firebase fixes the path from the function name, so this example has no `/webhooks/revenuedot` route: create the webhook on your RevenueDot server with `url` set to the function URL itself.

To try it locally, put `REVENUEDOT_WEBHOOK_SECRET=whsec_...` in `.secret.local` and run `npm run serve`. The emulator serves `http://localhost:5001/<project>/us-central1/revenuedotWebhook`; a RevenueDot running in `docker compose up` from [`selfhost/docker-compose`](../../selfhost/docker-compose) reaches it as `http://host.docker.internal:5001/<project>/us-central1/revenuedotWebhook`. `WEBHOOK_URL=<that url> ./seed.sh` there creates the webhook and prints its signing secret (see [Webhooks](https://revenuedot.app/docs/guides/webhooks)).

## How it works
1. RevenueDot sends `POST` with `Content-Type: application/json`, your `Authorization` header (if you set one) and `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex>`. See [Webhooks](https://revenuedot.app/docs/guides/webhooks).
2. The handler reads the **raw body** from `req.rawBody` and checks `v1 == HMAC-SHA256(signing_secret, "<t>.<raw body>")` in constant time, and that `t` is within 5 minutes. Cloud Functions has already parsed `req.body`; re-serialising it would change the bytes and fail the check.
3. It remembers `event.id`, so a retried delivery is answered `200` without being processed twice. The example keeps ids in memory, which lasts only as long as one function instance; use a unique index in production (for example a Firestore document keyed by `event.id`, written with `create()`).
4. It answers **HTTP 200**. RevenueDot counts only 200 as delivered; any other status or a timeout (60 seconds) is retried after 5, 10, 20, 40 and 80 minutes, then marked failed. Failed deliveries can be retried from the dashboard or with `POST /v2/projects/{project_id}/webhooks/{webhook_id}/deliveries/{delivery_id}/retry`.
5. Event types and payloads: [Webhook events](https://revenuedot.app/docs/api/webhook-events). For the current state of a customer, call `GET /v1/subscribers/{app_user_id}` with a secret key rather than rebuilding it from events (see [`backend/check-entitlement-node`](../check-entitlement-node)).

## Migrate from RevenueCat
RevenueDot sends the same JSON body (`{"api_version": "1.0", "event": {...}}`) and the same `Authorization` header you configure, so an existing RevenueCat handler keeps working. Things to add or check:

- **Verify `X-RevenueCat-Webhook-Signature`.** RevenueDot signs every delivery with HMAC-SHA256 over `"<t>.<raw body>"`. If your RevenueCat handler only checked the `Authorization` header, add the signature check from this example; the `Authorization` check can stay.
- **Point the webhook at this function in RevenueDot** (dashboard: Integrations > Webhooks, or `POST /v2/projects/{project_id}/integrations/webhooks`) and copy the `signing_secret` from the response: it is shown only once.
- **Dedupe on `event.id`.** Delivery is at least once, like RevenueCat's.

## Docs
- [Webhooks guide](https://revenuedot.app/docs/guides/webhooks): setup, signature verification in Node, Python, Go, Ruby, PHP and C#, retries.
- [Webhook events](https://revenuedot.app/docs/api/webhook-events): every event type with a real payload.
- [Authentication](https://revenuedot.app/docs/api/authentication): secret keys for server-side calls.

## Related examples
- [`backend/aws-lambda-webhook`](../aws-lambda-webhook): AWS Lambda.
- [`backend/node-express-webhook`](../node-express-webhook): Express.
- [`backend/nextjs-webhook`](../nextjs-webhook): Next.js route handler.
- [`selfhost/docker-compose`](../../selfhost/docker-compose): a local RevenueDot to send the webhooks (`WEBHOOK_URL=... ./seed.sh`).
