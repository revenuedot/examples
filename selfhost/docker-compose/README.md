# Self-host RevenueDot with Docker Compose and Postgres

## What this is
A `docker-compose.yml` that runs RevenueDot (API and dashboard in one container) next to Postgres 16, plus `seed.sh`, which fills a fresh server with a Test Store app, a `pro` entitlement and a `default` offering so an SDK can buy something within minutes.

**Status: verified.** Pulled `ghcr.io/revenuedot/revenuedot:latest`, started with `docker compose up -d`, seeded with `seed.sh`, checked `/v1/health` and the dashboard at `/login`, and torn down with `docker compose down -v`, on 2026-10-03. The build-from-source path, backup with `pg_dump` and restore with `pg_restore` were verified on 2026-09-30.

## Why RevenueDot
RevenueDot is the open-source, self-hostable alternative to RevenueCat. It speaks the same API as the RevenueCat SDKs, so apps switch by setting one proxy URL.

## Run it
Needs Docker (with Compose v2), `curl` and `jq`.

```bash
git clone https://github.com/revenuedot/examples.git
cd examples/selfhost/docker-compose
cp .env.example .env          # set POSTGRES_PASSWORD and REVENUEDOT_ENCRYPTION_KEY before the first start
openssl rand -base64 32       # paste the output after REVENUEDOT_ENCRYPTION_KEY= in .env
docker compose up -d          # pulls ghcr.io/revenuedot/revenuedot:latest and starts it next to Postgres
curl http://localhost:8787/v1/health        # {"status":"ok"}
./seed.sh
```

The image is [`ghcr.io/revenuedot/revenuedot`](https://github.com/revenuedot/revenuedot/pkgs/container/revenuedot), built for linux/amd64 and linux/arm64 on every change to `main` and tagged `latest`, by date (`2026.10.03`) and by commit. `docker pull ghcr.io/revenuedot/revenuedot:latest` needs no account. For production, pin a date or commit tag with `REVENUEDOT_IMAGE` in `.env` so a restart never picks up a build you have not tested.

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
| `REVENUEDOT_IMAGE` | `ghcr.io/revenuedot/revenuedot:latest` | The server image. Pin a date tag (`2026.10.03`) or a commit tag for production. Compose pulls it when it is missing |
| `REVENUEDOT_SOURCE` | `https://github.com/revenuedot/revenuedot.git#main` | Where `docker compose build` builds the image from, for running your own changes. Point it at a local checkout; see "Build from source" below |
| `REVENUEDOT_ENCRYPTION_KEY` | empty | Set it before the first start with the output of `openssl rand -base64 32` (the base64 of 32 random bytes). It seals the API keys and tokens of integrations and data exports. Empty falls back to a key derived from `REVENUEDOT_SIGNING_KEY`; with neither, those credentials are stored unencrypted. Back it up with the database: changing or losing it means entering the integrations' keys again |
| `REVENUEDOT_PUBLIC_URL` | empty (the address each request came in on) | The address people open the dashboard on, such as `https://revenuedot.example.com`, used for links in emails |
| `REVENUEDOT_ALLOW_SIGNUP` | `false` | Only the first account (the owner) can sign up. `true` lets anyone who can reach the dashboard create an account |
| `REVENUEDOT_SMTP_URL` | empty (emails go to the log) | SMTP server for password resets, invites, verification links and alerts, such as `smtp://user:password@smtp.example.com:587` (`smtps://` for TLS on port 465). Empty prints every email to `docker compose logs revenuedot` |
| `REVENUEDOT_MAIL_FROM` | `RevenueDot <no-reply@localhost>` | Sender of those emails |
| `REVENUEDOT_MAIL_REPLY_TO` | empty | Reply-to address of those emails |
| `REVENUEDOT_SIGNING_KEY` | unset (signing off) | Optional. Base64 Ed25519 seed that signs SDK responses, for apps that pin this server's public key. `pnpm tsx scripts/signing-keygen.ts` in a `revenuedot/revenuedot` checkout prints it. Compose passes it to the server |

Inside the container the server reads `DATABASE_URL` and `PORT`, which Compose sets, and the `REVENUEDOT_*` settings above other than `REVENUEDOT_PORT`, `REVENUEDOT_IMAGE` and `REVENUEDOT_SOURCE`, which Compose passes from `.env`. The compose file also passes the optional settings the monorepo's own `docker-compose.yml` passes, all off or at their default when unset: web billing (`REVENUEDOT_PAY_URL`, `REVENUEDOT_CUSTOM_DOMAIN_TARGET`), AI features (`AI_GATEWAY_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, the `REVENUEDOT_*_MODEL` variables, `REVENUEDOT_INSIGHTS_DIGEST`), the AdMob OAuth client and the export archive location (`REVENUEDOT_ARCHIVE_DIR`, a volume, or `REVENUEDOT_ARCHIVE_S3_*`). They are described in the [self-hosting guide's settings table](https://revenuedot.app/docs/guides/self-hosting#settings). App Store and Google Play credentials are not environment variables: they belong to each app and are set in the dashboard or through the REST API.

### Back up, restore, upgrade
```bash
# Back up (a compressed custom-format dump)
docker compose exec -T db pg_dump -U revenuedot -Fc revenuedot > revenuedot-$(date +%F).dump

# Restore: stop the API, restore, start it again
docker compose stop revenuedot
docker compose exec -T db pg_restore -U revenuedot -d revenuedot --clean --if-exists < revenuedot-2026-09-30.dump
docker compose start revenuedot

# Upgrade: back up first, then pull the new image and restart; database migrations run when the server starts
docker compose pull && docker compose up -d

# Start over (deletes every customer and purchase)
docker compose down -v
```

With `REVENUEDOT_IMAGE` pinned to a date or commit tag, an upgrade is: back up, change the tag in `.env`, `docker compose up -d`. If the new build fails to start (`docker compose logs revenuedot --tail 100` names the failed migration), set the tag that worked in `.env` and run `docker compose up -d` again. The tags are listed on the [package page](https://github.com/revenuedot/revenuedot/pkgs/container/revenuedot); the full procedure is in [Upgrades](https://revenuedot.app/docs/guides/upgrades).

### Build from source
To run your own changes, build the same image from a checkout instead of pulling it:

```bash
# .env: REVENUEDOT_SOURCE=../../../revenuedot   (a local checkout; the default builds GitHub main)
#       REVENUEDOT_IMAGE=revenuedot:local       (a name of your own, so `docker compose pull` never replaces your build)
docker compose build && docker compose up -d
```

The first build takes a few minutes. Rebuild with `docker compose build --pull && docker compose up -d` after each change.

## How it works
- **One container, two jobs.** The `revenuedot` service serves the SDK API (`/v1`), the REST API (`/v2`), store notifications (`/v1/notifications/...`) and the dashboard from one Node.js process. See [Self-hosting](https://revenuedot.app/docs/guides/self-hosting).
- **Migrations on start.** Every start applies any new database migrations before the server listens, so an upgrade is a pull and a restart.
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
