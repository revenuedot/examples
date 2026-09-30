# Receive RevenueDot webhooks in a Supabase Edge Function

## What this is
A Supabase Edge Function, `revenuedot-webhook`, served at `/functions/v1/revenuedot-webhook`, that verifies the HMAC signature of each RevenueDot webhook, ignores duplicate deliveries and acts on the event type. `supabase/functions/revenuedot-webhook/verify.ts` uses only Web Crypto and can be copied as is.

**Status: verified.** `deno test` (with a real signed delivery captured from a RevenueDot server) and `deno check` pass on Deno 2.2.6. Also tested live: a local RevenueDot delivered an `INITIAL_PURCHASE` to the function run with `deno run --allow-net --allow-env supabase/functions/revenuedot-webhook/index.ts` and recorded `delivered`, HTTP 200. It has not been run with `supabase functions serve` (which needs Docker) or deployed to Supabase.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL. Its webhooks use RevenueCat's payload shape, so a handler written for RevenueCat keeps working.

## Run it
```bash
cd backend/supabase-edge-function-webhook
deno test

# Locally without Docker: http://localhost:3000/functions/v1/revenuedot-webhook
REVENUEDOT_WEBHOOK_SECRET=whsec_... PORT=3000 deno task start

# Or with the Supabase CLI (needs Docker): http://localhost:54321/functions/v1/revenuedot-webhook
cp .env.example supabase/functions/.env   # set REVENUEDOT_WEBHOOK_SECRET (whsec_...)
supabase start && supabase functions serve --no-verify-jwt --env-file supabase/functions/.env
```

Then create the webhook on your RevenueDot server with `url` set to `http://host.docker.internal:3000/functions/v1/revenuedot-webhook` (see [Webhooks](https://revenuedot.app/docs/guides/webhooks)). With the local RevenueDot from [`selfhost/docker-compose`](../../selfhost/docker-compose), `WEBHOOK_URL=http://host.docker.internal:3000/functions/v1/revenuedot-webhook ./seed.sh` creates the webhook and prints the signing secret.

To deploy, store the secret in Supabase and point the webhook at `https://<project-ref>.supabase.co/functions/v1/revenuedot-webhook`:
```bash
supabase secrets set REVENUEDOT_WEBHOOK_SECRET=whsec_...
supabase functions deploy revenuedot-webhook --no-verify-jwt
```
`--no-verify-jwt` (and `verify_jwt = false` in `supabase/config.toml`) is required: RevenueDot proves itself with the HMAC signature, not a Supabase JWT, so the gateway would otherwise reject every delivery with 401.

## How it works
1. RevenueDot sends `POST` with `Content-Type: application/json`, your `Authorization` header (if you set one) and `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex>`. See [Webhooks](https://revenuedot.app/docs/guides/webhooks).
2. The function reads the **raw body** with `request.arrayBuffer()` and checks `v1 == HMAC-SHA256(signing_secret, "<t>.<raw body>")` in constant time (`crypto.subtle.verify`), and that `t` is within 5 minutes. Calling `request.json()` first and re-serialising would change the bytes and fail the check.
3. It remembers `event.id`, so a retried delivery is answered `200` without being processed twice. The example keeps ids in memory, which lasts only as long as one function instance; insert `event.id` into a table with a unique index in production.
4. It answers **HTTP 200**. RevenueDot counts only 200 as delivered; any other status or a timeout (60 seconds) is retried after 5, 10, 20, 40 and 80 minutes, then marked failed. Failed deliveries can be retried from the dashboard or with `POST /v2/projects/{project_id}/webhooks/{webhook_id}/deliveries/{delivery_id}/retry`.
5. Event types and payloads: [Webhook events](https://revenuedot.app/docs/api/webhook-events). For the current state of a customer, call `GET /v1/subscribers/{app_user_id}` with a secret key rather than rebuilding it from events.

## Migrate from RevenueCat
RevenueDot sends the same JSON body (`{"api_version": "1.0", "event": {...}}`) and the same `Authorization` header you configure, so an existing RevenueCat handler keeps working. Three things to add or check:

- **Verify `X-RevenueCat-Webhook-Signature`.** RevenueDot signs every delivery with HMAC-SHA256 over `"<t>.<raw body>"`. If your RevenueCat handler only checked the `Authorization` header, add the signature check from this example; the `Authorization` check can stay.
- **Point the webhook at this function in RevenueDot** (dashboard: Integrations > Webhooks, or `POST /v2/projects/{project_id}/integrations/webhooks`) and copy the `signing_secret` from the response: it is shown only once.
- **Dedupe on `event.id`.** Delivery is at least once, like RevenueCat's.

## Docs
- [Webhooks guide](https://revenuedot.app/docs/guides/webhooks): setup, signature verification in Node, Python, Go, Ruby, PHP and C#, retries.
- [Webhook events](https://revenuedot.app/docs/api/webhook-events): every event type with a real payload.
- [Authentication](https://revenuedot.app/docs/api/authentication): secret keys for server-side calls.

## Related examples
- [`backend/deno-webhook`](../deno-webhook): the same handler on plain Deno.
- [`backend/firebase-function-webhook`](../firebase-function-webhook): Firebase Cloud Function.
- [`backend/cloudflare-worker-webhook`](../cloudflare-worker-webhook): Cloudflare Worker.
- [`selfhost/docker-compose`](../../selfhost/docker-compose): a local RevenueDot to send the webhooks (`WEBHOOK_URL=... ./seed.sh`).
