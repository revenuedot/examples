# Receive RevenueDot webhooks in Elixir (Plug and Bandit)

## What this is
A Plug router served by Bandit with `POST /webhooks/revenuedot` that verifies the HMAC signature of each RevenueDot webhook, ignores duplicate deliveries and acts on the event type. `lib/revenuedot_webhook/signature.ex` uses only `:crypto` and `Plug.Crypto` and can be copied as is.

**Status: not verified locally: the Mac that wrote it has no Elixir, so `mix test` has not run and there is no `mix.lock` yet.** The code follows the Plug 1.18, Bandit 1.x and ExUnit docs. Expect small fixes, and commit the `mix.lock` that `mix deps.get` creates.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL. Its webhooks use RevenueCat's payload shape, so a handler written for RevenueCat keeps working.

## Run it
```bash
cd backend/elixir-plug-webhook
mix deps.get
mix test
REVENUEDOT_WEBHOOK_SECRET=whsec_... mix run --no-halt     # http://localhost:3000/webhooks/revenuedot  (PORT to change)
```

Then create the webhook on your RevenueDot server with `url` set to `http://host.docker.internal:3000/webhooks/revenuedot`. With the local RevenueDot from [`selfhost/docker-compose`](../../selfhost/docker-compose) (`docker compose up`), `WEBHOOK_URL=http://host.docker.internal:3000/webhooks/revenuedot ./seed.sh` creates it and prints the signing secret. See [Webhooks](https://revenuedot.app/docs/guides/webhooks).

## How it works
1. RevenueDot sends `POST` with `Content-Type: application/json`, your `Authorization` header (if you set one) and `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex>`. See [Webhooks](https://revenuedot.app/docs/guides/webhooks).
2. The handler reads the **raw body** (`Plug.Conn.read_body`; the router has no `Plug.Parsers`, because a parser reads the body and leaves nothing to verify) and checks `v1 == HMAC-SHA256(signing_secret, "<t>.<raw body>")` in constant time, and that `t` is within 5 minutes. Parsing and re-serialising the JSON first would change the bytes and fail the check.
3. It remembers `event.id`, so a retried delivery is answered `200` without being processed twice. The example keeps ids in memory; use a table with a unique index in production.
4. It answers **HTTP 200**. RevenueDot counts only 200 as delivered; any other status or a timeout (60 seconds) is retried after 5, 10, 20, 40 and 80 minutes, then marked failed. Failed deliveries can be retried from the dashboard or with `POST /v2/projects/{project_id}/webhooks/{webhook_id}/deliveries/{delivery_id}/retry`.
5. Event types and payloads: [Webhook events](https://revenuedot.app/docs/api/webhook-events). For the current state of a customer, call `GET /v1/subscribers/{app_user_id}` with a secret key rather than rebuilding it from events.

## Migrate from RevenueCat
RevenueDot sends the same JSON body (`{"api_version": "1.0", "event": {...}}`) and the same `Authorization` header you configure, so an existing RevenueCat handler keeps working. Two things to add or check:

- **Verify `X-RevenueCat-Webhook-Signature`.** RevenueDot signs every delivery with HMAC-SHA256 over `"<t>.<raw body>"`. If your RevenueCat handler only checked the `Authorization` header, add the signature check from this example (`lib/revenuedot_webhook/signature.ex`); the `Authorization` check can stay.
- **Point the webhook at this handler in RevenueDot** (dashboard: Integrations > Webhooks, or `POST /v2/projects/{project_id}/integrations/webhooks`) and copy the `signing_secret` from the response: it is shown only once.
- **Dedupe on `event.id`.** Delivery is at least once, like RevenueCat's.

## Docs
- [Webhooks guide](https://revenuedot.app/docs/guides/webhooks): setup, signature verification in Node, Python, Go, Ruby, PHP and C#, retries.
- [Webhook events](https://revenuedot.app/docs/api/webhook-events): every event type with a real payload.
- [Authentication](https://revenuedot.app/docs/api/authentication): secret keys for server-side calls.

## Related examples
- [`backend/go-webhook`](../go-webhook): Go standard library.
- [`backend/node-express-webhook`](../node-express-webhook): Express.
- [`backend/ruby-sinatra-webhook`](../ruby-sinatra-webhook): Sinatra.
- [`selfhost/docker-compose`](../../selfhost/docker-compose): a local RevenueDot to send the webhooks (`WEBHOOK_URL=... ./seed.sh`).
