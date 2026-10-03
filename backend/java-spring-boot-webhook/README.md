# Receive RevenueDot webhooks in Java (Spring Boot)

## What this is
A Spring Boot 3.5 app (Java 21) with `POST /webhooks/revenuedot` that verifies the HMAC signature of each RevenueDot webhook, ignores duplicate deliveries and acts on the event type. The controller takes the body as `byte[]` so the signature is checked on the exact bytes. `WebhookSignature.java` uses only the JDK and can be copied into any Java server.

**Status: verified.** `mvn test` (3 tests: the signature unit tests and `WebhookControllerTest` through `MockMvc`, with a real signed delivery captured from a RevenueDot server) passes on JDK 21.0.12 with Maven 3.9.16 and Spring Boot 3.5.6. Also tested live on 2026-10-03 with [`scripts/e2e-webhook.sh`](../../scripts/e2e-webhook.sh): a local RevenueDot signed and delivered a Test Store `INITIAL_PURCHASE` to `mvn spring-boot:run` and recorded `delivered`, HTTP 200.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL. Its webhooks use RevenueCat's payload shape, so a handler written for RevenueCat keeps working.

## Run it
You need JDK 21 and Maven.

```bash
cd backend/java-spring-boot-webhook
mvn test
REVENUEDOT_WEBHOOK_SECRET=whsec_... mvn spring-boot:run      # http://localhost:3000/webhooks/revenuedot  (PORT to change)
```

Then create the webhook on your RevenueDot server with `url` set to `http://host.docker.internal:3000/webhooks/revenuedot` (see [Webhooks](https://revenuedot.app/docs/guides/webhooks)). With a local RevenueDot from [`selfhost/docker-compose`](../../selfhost/docker-compose) (`docker compose up`), `WEBHOOK_URL=http://host.docker.internal:3000/webhooks/revenuedot ./seed.sh` creates the webhook and prints its signing secret.

## How it works
1. RevenueDot sends `POST` with `Content-Type: application/json`, your `Authorization` header (if you set one) and `X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex>`. See [Webhooks](https://revenuedot.app/docs/guides/webhooks).
2. The controller reads the **raw body** (`@RequestBody byte[]`) and checks `v1 == HMAC-SHA256(signing_secret, "<t>.<raw body>")` in constant time, and that `t` is within 5 minutes of the injected `java.time.Clock`. Binding the body to a Java object first and serialising it again would change the bytes and fail the check.
3. It remembers `event.id`, so a retried delivery is answered `200` without being processed twice. The example keeps ids in memory; use a table with a unique index in production.
4. It answers **HTTP 200**. RevenueDot counts only 200 as delivered; any other status or a timeout (60 seconds) is retried after 5, 10, 20, 40 and 80 minutes, then marked failed. Failed deliveries can be retried from the dashboard or with `POST /v2/projects/{project_id}/webhooks/{webhook_id}/deliveries/{delivery_id}/retry`.
5. Event types and payloads: [Webhook events](https://revenuedot.app/docs/api/webhook-events). For the current state of a customer, call `GET /v1/subscribers/{app_user_id}` with a secret key rather than rebuilding it from events.

## Migrate from RevenueCat
RevenueDot sends the same JSON body (`{"api_version": "1.0", "event": {...}}`) and the same `Authorization` header you configure, so an existing RevenueCat controller keeps working. Two things to add or check:

- **Verify `X-RevenueCat-Webhook-Signature`.** RevenueDot signs every delivery with HMAC-SHA256 over `"<t>.<raw body>"`. If your RevenueCat controller only checked the `Authorization` header, add `WebhookSignature.verify` from this example and take the body as `byte[]`; the `Authorization` check can stay.
- **Point the webhook at this controller in RevenueDot** (dashboard: Integrations > Webhooks, or `POST /v2/projects/{project_id}/integrations/webhooks`) and copy the `signing_secret` from the response: it is shown only once.
- **Dedupe on `event.id`.** Delivery is at least once, like RevenueCat's.

## Docs
- [Webhooks guide](https://revenuedot.app/docs/guides/webhooks): setup, signature verification, retries.
- [Webhook events](https://revenuedot.app/docs/api/webhook-events): every event type with a real payload.
- [Authentication](https://revenuedot.app/docs/api/authentication): secret keys for server-side calls.

## Related examples
- [`backend/kotlin-ktor-webhook`](../kotlin-ktor-webhook): Kotlin and Ktor.
- [`backend/go-webhook`](../go-webhook): Go net/http.
- [`backend/node-express-webhook`](../node-express-webhook): Express.
- [`selfhost/docker-compose`](../../selfhost/docker-compose): a local RevenueDot to send the webhooks (`WEBHOOK_URL=... ./seed.sh`).
