# Receive RevenueDot webhooks in Laravel

## What this is
A minimal Laravel 12 app with `POST /webhooks/revenuedot` that verifies the HMAC signature of each RevenueDot webhook, ignores duplicate deliveries and acts on the event type. To add it to your own Laravel app, copy `app/Http/Controllers/RevenueDotWebhookController.php`, `app/Support/RevenueDotSignature.php`, the route in `routes/api.php` and the `revenuedot` block of `config/services.php`.

**Status: verified.** `composer install` resolves the committed `composer.lock` (Laravel 12.69.3) and `php artisan test` (2 tests, 13 assertions, with a real signed delivery captured from a RevenueDot server) passes on PHP 8.5.11 with PHPUnit 11.5.56. Also tested live on 2026-10-03 with [`scripts/e2e-webhook.sh`](../../scripts/e2e-webhook.sh): a local RevenueDot signed and delivered a Test Store `INITIAL_PURCHASE` to `php artisan serve` and recorded `delivered`, HTTP 200.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat. It speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL. Its webhooks use RevenueCat's payload shape, so a handler written for RevenueCat keeps working.

## Run it
You need PHP 8.2 or newer and Composer.

```bash
cd backend/php-laravel-webhook
composer install
cp .env.example .env              # set REVENUEDOT_WEBHOOK_SECRET (whsec_...)
php artisan test
php artisan serve --port=3000     # http://localhost:3000/webhooks/revenuedot
```

Then create the webhook on your RevenueDot server with `url` set to `http://host.docker.internal:3000/webhooks/revenuedot` (see [Webhooks](https://revenuedot.app/docs/guides/webhooks)). With a local RevenueDot from [`selfhost/docker-compose`](../../selfhost/docker-compose) (`docker compose up`), `WEBHOOK_URL=http://host.docker.internal:3000/webhooks/revenuedot ./seed.sh` creates the webhook and prints its signing secret.

## How it works
1. RevenueDot sends `POST` with `Content-Type: application/json`, your `Authorization` header (if you set one) and `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex>`. See [Webhooks](https://revenuedot.app/docs/guides/webhooks).
2. The controller reads the **raw body** (`$request->getContent()`) and checks `v1 == HMAC-SHA256(signing_secret, "<t>.<raw body>")` with `hash_equals`, and that `t` is within 5 minutes. Decoding the JSON and encoding it again would change the bytes and fail the check.
3. It remembers `event.id` with `Cache::add`, which writes only when the key is missing, so a retried delivery is answered `200` without being processed twice. The example uses the file cache (`CACHE_STORE=file`); use a table with a unique index in production.
4. The route lives in `routes/api.php`, loaded without the `/api` prefix (`bootstrap/app.php`). The `api` middleware group has no session or CSRF check, so RevenueDot's server-to-server `POST` is not refused with 419.
5. It answers **HTTP 200**. RevenueDot counts only 200 as delivered; any other status or a timeout (60 seconds) is retried after 5, 10, 20, 40 and 80 minutes, then marked failed. Failed deliveries can be retried from the dashboard or with `POST /v2/projects/{project_id}/webhooks/{webhook_id}/deliveries/{delivery_id}/retry`.
6. Event types and payloads: [Webhook events](https://revenuedot.app/docs/api/webhook-events). For the current state of a customer, call `GET /v1/subscribers/{app_user_id}` with a secret key rather than rebuilding it from events.

## Migrate from RevenueCat
RevenueDot sends the same JSON body (`{"api_version": "1.0", "event": {...}}`) and the same `Authorization` header you configure, so an existing RevenueCat controller keeps working. Two things to add or check:

- **Verify `X-RevenueCat-Webhook-Signature`.** RevenueDot signs every delivery with HMAC-SHA256 over `"<t>.<raw body>"`. If your RevenueCat controller only checked the `Authorization` header, add `RevenueDotSignature::verify` from this example and pass it `$request->getContent()`; the `Authorization` check can stay.
- **Point the webhook at this controller in RevenueDot** (dashboard: Integrations > Webhooks, or `POST /v2/projects/{project_id}/integrations/webhooks`) and copy the `signing_secret` from the response: it is shown only once.
- **Dedupe on `event.id`.** Delivery is at least once, like RevenueCat's.

## Docs
- [Webhooks guide](https://revenuedot.app/docs/guides/webhooks): setup, signature verification, retries.
- [Webhook events](https://revenuedot.app/docs/api/webhook-events): every event type with a real payload.
- [Authentication](https://revenuedot.app/docs/api/authentication): secret keys for server-side calls.

## Related examples
- [`backend/php-webhook`](../php-webhook): plain PHP, no framework.
- [`backend/go-webhook`](../go-webhook): Go net/http.
- [`backend/node-express-webhook`](../node-express-webhook): Express.
- [`selfhost/docker-compose`](../../selfhost/docker-compose): a local RevenueDot to send the webhooks (`WEBHOOK_URL=... ./seed.sh`).
