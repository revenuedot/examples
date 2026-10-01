# RevenueDot examples

**Runnable sample apps, backends and self-host recipes for [RevenueDot](https://revenuedot.app), the open-source, self-hostable alternative to RevenueCat.**
RevenueDot speaks the same API as the RevenueCat SDKs, so an app points its SDK at a RevenueDot server with one setting (the proxy URL) and keeps its purchase code. Every example here runs against a local RevenueDot with the built-in Test Store, so you need no App Store or Google Play account to try it. They also work against RevenueDot Cloud: sign up at https://app.revenuedot.app and use `https://api.revenuedot.app` as the server URL.

> The "Status" column says exactly what was run for each example; "Live" and "against a server" mean it was run against a real RevenueDot server on 2026-09-30, not only compiled. "Written, not run" examples follow the same spec but have never been compiled; expect small fixes.

## Examples

| Stack | Folder | Status |
|---|---|---|
| Self-host: Docker Compose + Postgres, seed script | [`selfhost/docker-compose`](selfhost/docker-compose) | Verified: built from GitHub, started, seeded, backed up, restored, rebuilt |
| Migrate from RevenueCat: importer, catalog copy, notification forwarding, SDK diffs | [`migrate-from-revenuecat`](migrate-from-revenuecat) | Scripts verified between two RevenueDot projects; diffs checked against SDK sources |
| Mobile: iOS SwiftUI | [`mobile/ios-swiftui`](mobile/ios-swiftui) | Builds for the simulator; ran end to end with the server's `cycle_count` value patched; the server fix has shipped, the example has not been re-run since |
| Mobile: Android Jetpack Compose | [`mobile/android-compose`](mobile/android-compose) | Written, not run: no Android SDK on the build machine |
| Mobile: Android Google Play sandbox (`app.revenuedot.sandbox`) | [`mobile/android-sandbox`](mobile/android-sandbox) | Signed release bundle builds with Gradle 8.11.1 and JDK 17; Play internal testing not yet run |
| Mobile: Flutter | [`mobile/flutter`](mobile/flutter) | Written, not run: no Flutter SDK on the build machine |
| Mobile: React Native (Expo) | [`mobile/react-native-expo`](mobile/react-native-expo) | Typecheck and expo-doctor pass; web run verified with a Test Store purchase; native builds unverified |
| Web: React + Vite + purchases-js | [`web/purchases-js-vite`](web/purchases-js-vite) | Typecheck, build and a Playwright Test Store purchase against a server |
| Web: Next.js App Router + purchases-js | [`web/nextjs-purchases-js`](web/nextjs-purchases-js) | Typecheck, build and a Playwright Test Store purchase against a server |
| Web: vanilla TypeScript + purchases-js | [`web/vanilla-js`](web/vanilla-js) | Typecheck, build and a Playwright Test Store purchase against a server |
| Backend: Next.js route handler | [`backend/nextjs-webhook`](backend/nextjs-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Node.js + Express | [`backend/node-express-webhook`](backend/node-express-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Node.js + Fastify | [`backend/fastify-webhook`](backend/fastify-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: NestJS | [`backend/nestjs-webhook`](backend/nestjs-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Hono on Bun | [`backend/hono-bun-webhook`](backend/hono-bun-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Deno | [`backend/deno-webhook`](backend/deno-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Cloudflare Workers | [`backend/cloudflare-worker-webhook`](backend/cloudflare-worker-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) under `wrangler dev` |
| Backend: Supabase Edge Functions | [`backend/supabase-edge-function-webhook`](backend/supabase-edge-function-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) under `deno run` |
| Backend: AWS Lambda (Function URL) | [`backend/aws-lambda-webhook`](backend/aws-lambda-webhook) | Tests with a real signed delivery; not deployed |
| Backend: Firebase Functions | [`backend/firebase-function-webhook`](backend/firebase-function-webhook) | Tests with a real signed delivery; not deployed |
| Backend: Python + FastAPI | [`backend/python-fastapi-webhook`](backend/python-fastapi-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Python + Flask | [`backend/python-flask-webhook`](backend/python-flask-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Python + Django | [`backend/python-django-webhook`](backend/python-django-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Go net/http | [`backend/go-webhook`](backend/go-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Rust + axum | [`backend/rust-axum-webhook`](backend/rust-axum-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Ruby + Sinatra | [`backend/ruby-sinatra-webhook`](backend/ruby-sinatra-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Ruby on Rails | [`backend/ruby-rails-webhook`](backend/ruby-rails-webhook) | Tests; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)) |
| Backend: Java + Spring Boot | [`backend/java-spring-boot-webhook`](backend/java-spring-boot-webhook) | Written, not run: no JDK 21 or Maven on the build machine |
| Backend: Kotlin + Ktor | [`backend/kotlin-ktor-webhook`](backend/kotlin-ktor-webhook) | Written, not run: no JDK 21 or Maven on the build machine |
| Backend: PHP (no framework) | [`backend/php-webhook`](backend/php-webhook) | Written, not run: no PHP on the build machine |
| Backend: PHP + Laravel | [`backend/php-laravel-webhook`](backend/php-laravel-webhook) | Written, not run: no PHP or Composer on the build machine |
| Backend: C# + ASP.NET Core | [`backend/csharp-aspnet-webhook`](backend/csharp-aspnet-webhook) | Written, not run: no .NET SDK on the build machine |
| Backend: Elixir + Plug | [`backend/elixir-plug-webhook`](backend/elixir-plug-webhook) | Written, not run: no Elixir on the build machine |
| Backend: check an entitlement from your server (Node.js) | [`backend/check-entitlement-node`](backend/check-entitlement-node) | Tests plus live tests against a server |
| Backend: check an entitlement from your server (Python) | [`backend/check-entitlement-python`](backend/check-entitlement-python) | Tests plus live tests against a server |

## Every example follows one format
- A `README.md` in this order: **What this is** (with the exact verification status), **Why RevenueDot**, **Run it**, **How it works**, **Migrate from RevenueCat**, **Docs**, **Related examples**.
- A header comment in every source file:
  ```
  // RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
  // This file: <what it does in one line>.
  // Docs: https://revenuedot.app/docs/<page>   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
  ```
  `scripts/check-headers.sh` fails when a file lacks it.
- A `.env.example` with every setting, and a run path against a local RevenueDot with the Test Store.

## Start here
1. Run a server: [`selfhost/docker-compose`](selfhost/docker-compose) (`docker compose up -d`, then `./seed.sh`). It prints a Test Store key (`test_...`), a secret key (`sk_...`) and, with `WEBHOOK_URL`, a webhook signing secret.
2. Pick a client: [`web/purchases-js-vite`](web/purchases-js-vite) runs in a browser in two minutes; [`mobile/react-native-expo`](mobile/react-native-expo) runs in Expo Go; [`mobile/ios-swiftui`](mobile/ios-swiftui) is the native iOS app.
3. Pick a backend to receive webhooks: [`backend/`](backend) has one for every common stack.
4. Moving from RevenueCat? Start with [`migrate-from-revenuecat`](migrate-from-revenuecat).

## Verify everything
```bash
./scripts/verify.sh          # builds, type-checks or tests each example whose toolchain is installed
./scripts/check-headers.sh   # every source file has the RevenueDot header
# Live check for one webhook backend: a throwaway RevenueDot (PGlite) signs and delivers a purchase to it.
cd backend/node-express-webhook && ../../scripts/e2e-webhook.sh 3000 /webhooks/revenuedot -- node src/server.js
```

## License
MIT, see [LICENSE](LICENSE). RevenueDot itself is AGPL-3.0; the SDKs used here are RevenueCat's MIT-licensed SDKs.

## Links
[Website](https://revenuedot.app) · [Docs](https://github.com/revenuedot/docs) · [Server](https://github.com/revenuedot/revenuedot)

RevenueDot is not affiliated with, endorsed by or sponsored by RevenueCat, Inc. "RevenueCat" is a trademark of RevenueCat, Inc., used here only to describe compatibility.
