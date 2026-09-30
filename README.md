# RevenueDot examples

**Runnable sample apps, backends and self-host recipes for [RevenueDot](https://revenuedot.app), the open-source, self-hostable alternative to RevenueCat.**
RevenueDot speaks the same API as the RevenueCat SDKs, so an app points its SDK at a RevenueDot server with one setting (the proxy URL) and keeps its purchase code. Every example here runs against a local RevenueDot with the built-in Test Store, so you need no App Store or Google Play account to try it.

> Status: pre-alpha. RevenueDot and these examples change quickly. The "Status" column says exactly what was run for each example; "verified" means it was run against a real RevenueDot server, not only compiled.

## Examples

| Stack | Folder | Status |
|---|---|---|
| Self-host: Docker Compose + Postgres, seed script | [`selfhost/docker-compose`](selfhost/docker-compose) | Verified: built from GitHub, started, seeded, backed up, restored, rebuilt |
| Backend: Next.js route handler (webhook) | [`backend/nextjs-webhook`](backend/nextjs-webhook) | Verified: 9 unit tests with a real signed delivery, typecheck, `next build`, live delivery from a server |
| Backend: Node.js + Express (webhook) | [`backend/node-express-webhook`](backend/node-express-webhook) | Verified: tests with a real signed delivery, live delivery from a server |
| Backend: Python + FastAPI (webhook) | [`backend/python-fastapi-webhook`](backend/python-fastapi-webhook) | Verified: pytest with a real signed delivery, live delivery from a server |
| Backend: Go net/http (webhook) | [`backend/go-webhook`](backend/go-webhook) | Verified: `go vet`, `go test` with a real signed delivery, live delivery from a server |
| Web: React + Vite + purchases-js | [`web/purchases-js-vite`](web/purchases-js-vite) | Verified: typecheck, Playwright purchase through the Test Store dialog against a server |
| Mobile: React Native (Expo) | [`mobile/react-native-expo`](mobile/react-native-expo) | Typecheck and expo-doctor pass; web run verified with a Test Store purchase; native builds unverified |

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
2. Pick a client: [`web/purchases-js-vite`](web/purchases-js-vite) runs in a browser in two minutes; [`mobile/react-native-expo`](mobile/react-native-expo) runs in Expo Go.
3. Pick a backend to receive webhooks: [`backend/`](backend).

## Verify everything
```bash
./scripts/verify.sh          # builds, type-checks or tests each example whose toolchain is installed
./scripts/check-headers.sh   # every source file has the RevenueDot header
```

## License
MIT, see [LICENSE](LICENSE). RevenueDot itself is AGPL-3.0; the SDKs used here are RevenueCat's MIT-licensed SDKs.

## Links
[Website](https://revenuedot.app) · [Docs](https://github.com/revenuedot/docs) · [Server](https://github.com/revenuedot/revenuedot)

RevenueDot is not affiliated with, endorsed by or sponsored by RevenueCat, Inc. "RevenueCat" is a trademark of RevenueCat, Inc., used here only to describe compatibility.
