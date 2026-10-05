# Receive RevenueDot webhooks with NestJS

## What this is
A NestJS 12 app with a controller for `POST /webhooks/revenuedot` that verifies the HMAC signature of each RevenueDot webhook, ignores duplicate deliveries and acts on the event type. `src/verify.ts` has no Nest imports and works in any Node.js server.

**Status: verified.** `npm test` (TypeScript build plus Node's built-in test runner against the Nest app, with a real signed delivery captured from a RevenueDot server) passes on Node 22.14 with TypeScript 5.9. Also tested live: a local RevenueDot delivered an `INITIAL_PURCHASE` to the built app (`node dist/src/main.js`) and recorded `delivered`, HTTP 200.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat. It speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL. Its webhooks use RevenueCat's payload shape, so a handler written for RevenueCat keeps working.

## Run it
```bash
cd backend/nestjs-webhook
npm install
cp .env.example .env              # set REVENUEDOT_WEBHOOK_SECRET (whsec_...)
npm test                          # builds to dist/, then runs the tests
npm start                         # http://localhost:3000/webhooks/revenuedot  (PORT to change)
```

Then create the webhook on your RevenueDot server with `url` set to `http://host.docker.internal:3000/webhooks/revenuedot` (see [Webhooks](https://revenuedot.app/docs/guides/webhooks)) and put the returned `signing_secret` in `.env`. With the local RevenueDot from [`selfhost/docker-compose`](../../selfhost/docker-compose), `WEBHOOK_URL=http://host.docker.internal:3000/webhooks/revenuedot ./seed.sh` creates the webhook and prints the signing secret.

## How it works
1. RevenueDot sends `POST` with `Content-Type: application/json`, your `Authorization` header (if you set one) and `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex>`. See [Webhooks](https://revenuedot.app/docs/guides/webhooks).
2. `NestFactory.create(..., { rawBody: true })` keeps the **raw body** on `req.rawBody`, and the controller checks `v1 == HMAC-SHA256(signing_secret, "<t>.<raw body>")` in constant time, and that `t` is within 5 minutes. `@Body()` is already parsed JSON; re-serialising it changes the bytes and fails the check.
3. It remembers `event.id`, so a retried delivery is answered `200` without being processed twice. The example keeps ids in memory; use a table with a unique index in production.
4. It answers **HTTP 200** (`@HttpCode(200)`, because Nest answers `POST` with 201 by default). RevenueDot counts only 200 as delivered; any other status or a timeout (60 seconds) is retried after 5, 10, 20, 40 and 80 minutes, then marked failed. Failed deliveries can be retried from the dashboard or with `POST /v2/projects/{project_id}/webhooks/{webhook_id}/deliveries/{delivery_id}/retry`.
5. Event types and payloads: [Webhook events](https://revenuedot.app/docs/api/webhook-events). For the current state of a customer, call `GET /v1/subscribers/{app_user_id}` with a secret key rather than rebuilding it from events.

## Migrate from RevenueCat
RevenueDot sends the same JSON body (`{"api_version": "1.0", "event": {...}}`) and the same `Authorization` header you configure, so an existing RevenueCat handler keeps working. Three things to add or check:

- **Verify `X-RevenueCat-Webhook-Signature`.** RevenueDot signs every delivery with HMAC-SHA256 over `"<t>.<raw body>"`. If your RevenueCat handler only checked the `Authorization` header, add the signature check from this example; the `Authorization` check can stay.
- **Point the webhook at this handler in RevenueDot** (dashboard: Integrations > Webhooks, or `POST /v2/projects/{project_id}/integrations/webhooks`) and copy the `signing_secret` from the response: it is shown only once.
- **Dedupe on `event.id`.** Delivery is at least once, like RevenueCat's.

## Docs
- [Webhooks guide](https://revenuedot.app/docs/guides/webhooks): setup, signature verification in Node, Python, Go, Ruby, PHP and C#, retries.
- [Webhook events](https://revenuedot.app/docs/api/webhook-events): every event type with a real payload.
- [Authentication](https://revenuedot.app/docs/api/authentication): secret keys for server-side calls.

## Related examples
- [`backend/fastify-webhook`](../fastify-webhook): Fastify.
- [`backend/node-express-webhook`](../node-express-webhook): Express.
- [`backend/nextjs-webhook`](../nextjs-webhook): Next.js route handler.
- [`selfhost/docker-compose`](../../selfhost/docker-compose): a local RevenueDot to send the webhooks (`WEBHOOK_URL=... ./seed.sh`).
