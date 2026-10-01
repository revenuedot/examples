# Self-host RevenueDot with Docker Compose and Postgres

## What this is
A `docker-compose.yml` that runs RevenueDot (API and dashboard in one container) next to Postgres 16, plus `seed.sh`, which fills a fresh server with a Test Store app, a `pro` entitlement and a `default` offering so an SDK can buy something within minutes.

**Status: verified.** Built from `https://github.com/revenuedot/revenuedot.git#main`, started, seeded with `seed.sh` (twice, to check it is safe to re-run), backed up with `pg_dump`, restored with `pg_restore`, and rebuilt, on 2026-09-30.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat: free, and it speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
Needs Docker (with Compose v2), `curl` and `jq`.

```bash
git clone https://github.com/revenuedot/examples.git
cd examples/selfhost/docker-compose
cp .env.example .env          # set POSTGRES_PASSWORD before the first start
docker compose up -d          # the first start builds the image from source (a few minutes)
curl http://localhost:8787/v1/health        # {"status":"ok"}
./seed.sh
```

`seed.sh` prints what an app and a backend need:

```text
RevenueDot is seeded.
  Dashboard        http://localhost:8787  (sign in as dev@example.com)
  Project id       projqhf9p5jb
  Test Store key   test_960d2b3001bac439c7a73d7f4214514c      <- the SDK's API key; the SDK's proxy URL is http://localhost:8787
  Secret key       sk_8b8dc12a743e51f4de759b0b9c6d372e6d25d32fe7280672    <- server-side only (REST API, backend checks)
Try it:
  curl -s -H "Authorization: Bearer test_960d2b3001bac439c7a73d7f4214514c" http://localhost:8787/v1/subscribers/user_1/offerings
```

Open the dashboard at `http://localhost:8787/login` (the bare `/` answers with a small JSON document). Set `RD_EMAIL` and `RD_PASSWORD` to choose the account `seed.sh` creates, and `WEBHOOK_URL` to also create a webhook and print its signing secret:

```bash
RD_EMAIL=you@example.com RD_PASSWORD='a-long-password' WEBHOOK_URL=http://host.docker.internal:3000/api/webhooks/revenuedot ./seed.sh
```

`host.docker.internal` is how the RevenueDot container reaches a server running on your Mac or Windows machine. On Linux, add `extra_hosts: ["host.docker.internal:host-gateway"]` to the `revenuedot` service.

### Settings
| Variable | Default | What it does |
|---|---|---|
| `POSTGRES_PASSWORD` | none (required) | Password of the bundled Postgres. It is stored in the volume on the first start; changing it later needs `ALTER USER` in Postgres too |
| `REVENUEDOT_PORT` | `8787` | Host port for the API and the dashboard |
| `REVENUEDOT_SOURCE` | `https://github.com/revenuedot/revenuedot.git#main` | Where the image is built from. Point it at a local checkout to run your own changes |
| `REVENUEDOT_SIGNING_KEY` | unset (signing off) | Optional. Base64 Ed25519 seed that signs SDK responses, for apps that pin this server's public key. `pnpm tsx scripts/signing-keygen.ts` in a `revenuedot/revenuedot` checkout prints it. Compose passes it to the server |

Inside the container the server reads `DATABASE_URL` and `PORT`, which Compose sets, and `REVENUEDOT_SIGNING_KEY`, which Compose passes from `.env`. App Store and Google Play credentials are not environment variables: they belong to each app and are set in the dashboard or through the REST API.

### Back up, restore, upgrade
```bash
# Back up (a compressed custom-format dump)
docker compose exec -T db pg_dump -U revenuedot -Fc revenuedot > revenuedot-$(date +%F).dump

# Restore: stop the API, restore, start it again
docker compose stop revenuedot
docker compose exec -T db pg_restore -U revenuedot -d revenuedot --clean --if-exists < revenuedot-2026-09-30.dump
docker compose start revenuedot

# Upgrade: rebuild from the latest source; database migrations run when the server starts
docker compose build --pull revenuedot && docker compose up -d

# Start over (deletes every customer and purchase)
docker compose down -v
```

## How it works
- **One container, two jobs.** The `revenuedot` service serves the SDK API (`/v1`), the REST API (`/v2`), store notifications (`/v1/notifications/...`) and the dashboard from one Node.js process. See [Self-hosting](https://revenuedot.app/docs/guides/self-hosting).
- **Migrations on start.** Every start applies any new database migrations before the server listens, so an upgrade is a rebuild and a restart.
- **A 30-second background job** in the same process records expirations and sends webhooks. Run one `revenuedot` container per database for now.
- **`seed.sh` uses only the public API:** `POST /auth/signup` (dashboard account and first project), then `/v2/projects/{id}/apps`, `/products`, `/entitlements`, `/offerings`, `/packages` and `/api_keys`. See the [REST API v2 reference](https://revenuedot.app/docs/api/rest-v2).
- **The Test Store** (`type: test_store`) accepts purchases made with its `test_` key without any App Store or Google Play account. See [Test Store](https://revenuedot.app/docs/guides/test-store).

## Migrate from RevenueCat
Point the SDK at this server and turn off the SDK's response-signature check:

```diff
+ Purchases.proxyURL = URL(string: "https://revenuedot.example.com")!
+ // RevenueDot does not sign responses with RevenueCat's key.
- Purchases.configure(withAPIKey: "appl_...")
+ Purchases.configure(with: Configuration.Builder(withAPIKey: "appl_...").with(entitlementVerificationMode: .disabled).build())
```

The full, safe order (notification forwarding, side-by-side run, cut-over) is in [Migrate from RevenueCat](https://revenuedot.app/docs/migrate) and [`migrate-from-revenuecat/`](../../migrate-from-revenuecat).

## Docs
- [Quickstart](https://revenuedot.app/docs/getting-started/quickstart)
- [Self-hosting](https://revenuedot.app/docs/guides/self-hosting), [Backups](https://revenuedot.app/docs/guides/backups), [Upgrades](https://revenuedot.app/docs/guides/upgrades)
- [Going to production](https://revenuedot.app/docs/guides/going-to-production)

## Related examples
- [`backend/nextjs-webhook`](../../backend/nextjs-webhook): receive the webhooks this server sends.
- [`web/purchases-js-vite`](../../web/purchases-js-vite): buy with the Test Store from a browser against this server.
- [`mobile/react-native-expo`](../../mobile/react-native-expo): the same from an Expo app.
