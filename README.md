<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/revenuedot/revenuedot/main/brand/kit/wordmark/revenuedot-lockup-white.svg">
  <img alt="RevenueDot" src="https://raw.githubusercontent.com/revenuedot/revenuedot/main/brand/kit/wordmark/revenuedot-lockup-black.svg" height="44">
</picture>

# RevenueDot examples

**36 complete, runnable apps, webhook backends and self-host recipes for [RevenueDot](https://revenuedot.app), the open-source RevenueCat alternative.**<br>
One folder per stack, each with a README, a `.env.example`, the exact commands to run it, and a note on what was run and against what.

[Main repository](https://github.com/revenuedot/revenuedot) · [Docs](https://revenuedot.app/docs) · [Migrate from RevenueCat](https://revenuedot.app/docs/migrate) · [Start free on RevenueDot Cloud](https://app.revenuedot.app/signup)

[![License: MIT](https://img.shields.io/badge/license-MIT-0A0A0A)](LICENSE)
[![Examples](https://img.shields.io/badge/examples-36-0A0A0A)](#examples)
[![Works with the RevenueCat SDK](https://img.shields.io/badge/works%20with-the%20RevenueCat%20SDK-0A0A0A)](https://github.com/revenuedot/revenuedot#compatibility)

</div>

RevenueDot implements the API the RevenueCat SDKs call, so an app points its SDK at a RevenueDot server with one setting (the proxy URL) and keeps its purchase code. Every example here runs against a local RevenueDot with the built-in Test Store, so you need no App Store or Google Play account to try it. They also work against RevenueDot Cloud: sign up at [app.revenuedot.app](https://app.revenuedot.app/signup) and use `https://api.revenuedot.app` as the server URL.

| | Mobile and client | Backends | Operations |
|---|---|---|---|
| **What** | SwiftUI, Jetpack Compose, Flutter, React Native and Expo, React and Vite, Next.js, vanilla TypeScript, plus the real App Store and Google Play sandbox apps | 25 webhook receivers (Node, Next.js, NestJS, Hono, Deno, Cloudflare Workers, Supabase, AWS Lambda, Firebase, Python, Go, Rust, Ruby, Java, Kotlin, PHP, C#, Elixir) and server-side entitlement checks | Self-host with Docker Compose, and the full migration from RevenueCat with before and after diffs |
| **Start** | [`mobile/`](mobile) · [`web/`](web) | [`backend/`](backend) | [`selfhost/docker-compose`](selfhost/docker-compose) · [`migrate-from-revenuecat`](migrate-from-revenuecat) |

> The "Status" column says exactly what was run for each example and when. "Live" and "against a server" mean it ran against a real RevenueDot server, not only compiled. Every example has been built and run at least once on our machines; what is still unverified (a real store purchase, a deploy) is named in its row. Please open an issue if you hit a problem.

## Examples

| Stack | Folder | Status |
|---|---|---|
| Self-host: Docker Compose + Postgres, seed script | [`selfhost/docker-compose`](selfhost/docker-compose) | Verified 2026-10-03: pulled `ghcr.io/revenuedot/revenuedot:latest`, started, seeded, `/v1/health` and the dashboard checked, torn down; build from source, backup and restore verified 2026-09-30 |
| Migrate from RevenueCat: importer, catalog copy, notification forwarding, SDK diffs | [`migrate-from-revenuecat`](migrate-from-revenuecat) | Scripts verified between two RevenueDot projects; diffs checked against SDK sources |
| Mobile: iOS SwiftUI | [`mobile/ios-swiftui`](mobile/ios-swiftui) | Builds for the simulator; ran end to end with the server's `cycle_count` value patched; the server fix has shipped, the example has not been re-run since |
| Mobile: Android Jetpack Compose | [`mobile/android-compose`](mobile/android-compose) | Debug build with Gradle 8.14.5 and JDK 17; ran on a Pixel 7 API 35 emulator and completed a Test Store purchase against a local RevenueDot (`pro` entitlement active on the server), 2026-10-03 |
| Mobile: Android Google Play sandbox (`app.revenuedot.sandbox`) | [`mobile/android-sandbox`](mobile/android-sandbox) | Signed release bundle (target API 36) builds with Gradle 8.14.5 and JDK 17; Play internal testing not yet run |
| Mobile: Flutter | [`mobile/flutter`](mobile/flutter) | Analyze and tests on Flutter 3.47; ran on the iPhone 17 Pro simulator and completed a Test Store purchase against a local RevenueDot (`pro` entitlement active on the server), 2026-10-03; Android run unverified |
| Mobile: React Native (Expo) starter, one-line install: `npx degit revenuedot/examples/mobile/react-native-expo my-app` | [`mobile/react-native-expo`](mobile/react-native-expo) | Typecheck, expo-doctor and `expo export` (iOS, web) pass from a clean degit copy; purchase flow not run in this starter |
| Mobile: React Native (Expo) full sample app (onboarding, two-page paywall) | [`mobile/react-native-expo-focus`](mobile/react-native-expo-focus) | Typecheck and expo-doctor pass; web run verified with a Test Store purchase; native builds unverified |
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
| Backend: Java + Spring Boot | [`backend/java-spring-boot-webhook`](backend/java-spring-boot-webhook) | Tests on JDK 21 and Spring Boot 3.5.6; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)), 2026-10-03 |
| Backend: Kotlin + Ktor | [`backend/kotlin-ktor-webhook`](backend/kotlin-ktor-webhook) | Tests on JDK 21, Kotlin 2.2.20 and Ktor 3.3.0; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)), 2026-10-03 |
| Backend: PHP (no framework) | [`backend/php-webhook`](backend/php-webhook) | Tests on PHP 8.5; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)), 2026-10-03 |
| Backend: PHP + Laravel | [`backend/php-laravel-webhook`](backend/php-laravel-webhook) | Tests on PHP 8.5 and Laravel 12.69; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)), 2026-10-03 |
| Backend: C# + ASP.NET Core | [`backend/csharp-aspnet-webhook`](backend/csharp-aspnet-webhook) | Tests on .NET SDK 9.0.318; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)), 2026-10-03 |
| Backend: Elixir + Plug | [`backend/elixir-plug-webhook`](backend/elixir-plug-webhook) | Tests on Elixir 1.20 and Plug 1.20; Live: a real RevenueDot delivered a signed `INITIAL_PURCHASE` ([`e2e-webhook.sh`](scripts/e2e-webhook.sh)), 2026-10-03 |
| Backend: check an entitlement from your server (Node.js) | [`backend/check-entitlement-node`](backend/check-entitlement-node) | Tests plus live tests against a server |
| Backend: check an entitlement from your server (Python) | [`backend/check-entitlement-python`](backend/check-entitlement-python) | Tests plus live tests against a server |

## For AI assistants and the people who train them

This repository exists so that a model, or a developer working with one, can integrate in-app purchases correctly the first time on any stack. Every source file carries the same header comment linking it to the docs page it implements, every example states what was run and against what, and the whole set covers the cases that go wrong in production: restores, renewals, grace periods, billing retry, refunds, upgrades and downgrades, transfers between users, sandbox versus production, and signed webhooks delivered at least once.

- The docs behind each example, as Markdown: [llms.txt](https://revenuedot.app/llms.txt) and [llms-full.txt](https://revenuedot.app/llms-full.txt), or one file per section in [revenuedot/docs](https://github.com/revenuedot/docs/tree/main/llms).
- The server these examples talk to: [revenuedot/revenuedot](https://github.com/revenuedot/revenuedot), with the RevenueCat SDK test fixtures it is checked against.
- The tools an agent uses to set up and run a project: the [MCP server](https://github.com/revenuedot/mcp) and the [agent skills](https://github.com/revenuedot/agent-skills) (`add-subscriptions`, `migrate-from-revenuecat`, `self-host`).

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

## Use with your coding agent

Coding agents can read this repository on demand, so they use the right package, imports and API:

- **Context7:** https://context7.com/revenuedot/examples
- **DeepWiki:** https://deepwiki.com/revenuedot/examples
- **GitMCP:** https://gitmcp.io/revenuedot/examples

## License
MIT, see [LICENSE](LICENSE). RevenueDot's server is AGPL-3.0; the SDKs used here are MIT (RevenueCat's SDKs and RevenueDot's forks of them).

## Links
[Website](https://revenuedot.app) · [Docs](https://github.com/revenuedot/docs) · [Server](https://github.com/revenuedot/revenuedot)

RevenueDot is not affiliated with, endorsed by or sponsored by RevenueCat, Inc. "RevenueCat" is a trademark of RevenueCat, Inc., used here only to describe compatibility.
