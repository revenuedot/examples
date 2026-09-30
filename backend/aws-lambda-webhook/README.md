# Receive RevenueDot webhooks in AWS Lambda

## What this is
A Node.js 22 AWS Lambda function that verifies the HMAC signature of each RevenueDot webhook, ignores duplicate deliveries and acts on the event type. It runs behind a Lambda Function URL or an API Gateway HTTP API (payload format 2.0). No dependencies; `src/verify.js` can be copied as is.

**Status: verified.** `node --test` (3 tests with a real signed delivery captured from a RevenueDot server, sent as synthetic payload v2 events, plain and base64-encoded) passes on Node.js 22.14. Not deployed to AWS from here.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL. Its webhooks use RevenueCat's payload shape, so a handler written for RevenueCat keeps working.

## Run it
```bash
cd backend/aws-lambda-webhook
npm test
```

Deploy it (AWS console or CLI):

1. Create a function with runtime **Node.js 22.x** and handler **`src/handler.handler`**. Upload the code with `npm run zip` (makes `function.zip` from `package.json` and `src/`).
2. Under Configuration > Environment variables, set `REVENUEDOT_WEBHOOK_SECRET` and, if you set one on the webhook, `REVENUEDOT_WEBHOOK_AUTHORIZATION`. For production, keep the secret in Secrets Manager or SSM and load it at start.
3. Under Configuration > Function URL, create one with auth type **NONE**. The signature check is what authenticates RevenueDot, so IAM auth is not needed (RevenueDot cannot sign AWS requests).
4. Create the webhook on your RevenueDot server with `url` set to `https://<url-id>.lambda-url.<region>.on.aws/webhooks/revenuedot`. A Function URL sends every path to the function, and the handler answers any path; the `/webhooks/revenuedot` suffix only keeps URLs the same across examples. Behind an HTTP API, add the route `POST /webhooks/revenuedot` instead.

The Lambda must be reachable from your RevenueDot server. To try it with a local RevenueDot (`docker compose up` in [`selfhost/docker-compose`](../../selfhost/docker-compose)), run `WEBHOOK_URL=https://<url-id>.lambda-url.<region>.on.aws/webhooks/revenuedot ./seed.sh` there: it creates the webhook and prints its signing secret. For a local receiver at `http://host.docker.internal:3000/webhooks/revenuedot`, use one of the server examples below instead.

## How it works
1. RevenueDot sends `POST` with `Content-Type: application/json`, your `Authorization` header (if you set one) and `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex>`. See [Webhooks](https://revenuedot.app/docs/guides/webhooks).
2. The handler rebuilds the **raw body** bytes from `event.body` (decoding base64 when `event.isBase64Encoded` is true) and checks `v1 == HMAC-SHA256(signing_secret, "<t>.<raw body>")` in constant time, and that `t` is within 5 minutes. Parsing and re-serialising the JSON first would change the bytes and fail the check. Payload v2 lower-cases header names, so it reads `event.headers["x-revenuecat-webhook-signature"]`.
3. It remembers `event.id`, so a retried delivery is answered `200` without being processed twice. The example keeps ids in memory, which lasts only as long as one warm Lambda instance; use a table with a unique index in production (for example a DynamoDB conditional put).
4. It answers **HTTP 200** as `{statusCode, headers, body}`. RevenueDot counts only 200 as delivered; any other status or a timeout (60 seconds) is retried after 5, 10, 20, 40 and 80 minutes, then marked failed. Keep the function timeout under 60 seconds. Failed deliveries can be retried from the dashboard or with `POST /v2/projects/{project_id}/webhooks/{webhook_id}/deliveries/{delivery_id}/retry`.
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
- [`backend/firebase-function-webhook`](../firebase-function-webhook): Firebase Cloud Functions.
- [`backend/node-express-webhook`](../node-express-webhook): Express.
- [`backend/nextjs-webhook`](../nextjs-webhook): Next.js route handler.
- [`selfhost/docker-compose`](../../selfhost/docker-compose): a local RevenueDot to send the webhooks (`WEBHOOK_URL=... ./seed.sh`).
