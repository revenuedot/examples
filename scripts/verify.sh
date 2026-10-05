#!/usr/bin/env bash
# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
# This file: builds, type-checks or tests every example whose toolchain is installed; skips the rest with a note.
# Docs: https://revenuedot.app/docs   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
pass=(); fail=(); skip=()
has() { command -v "$1" >/dev/null 2>&1; }
step() { # name dir command...
  local name="$1" dir="$2"; shift 2
  echo "==> $name"
  if (cd "$ROOT/$dir" && "$@"); then pass+=("$name"); else fail+=("$name"); fi
}

./scripts/check-headers.sh && pass+=("headers") || fail+=("headers")

# Docker can hang instead of failing when its VM is down; give it 10 seconds.
docker_ok() {
  has docker || return 1
  docker info >/dev/null 2>&1 & local p=$!
  for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 "$p" 2>/dev/null || { wait "$p"; return $?; }; sleep 1; done
  kill "$p" 2>/dev/null; return 1
}
NPM="npm ci --prefer-offline --no-audit --no-fund >/dev/null"
PY="python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt"
# Ruby examples need Ruby 3.2+; Homebrew's Ruby is used when present because macOS ships 2.6.
[ -x /opt/homebrew/opt/ruby/bin/ruby ] && export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
BUNDLE="bundle config set --local path vendor/bundle >/dev/null && bundle install --quiet"

if has node; then
  step "backend/nextjs-webhook" backend/nextjs-webhook bash -c "$NPM && npm test && npm run typecheck && npx next build >/dev/null"
  step "backend/node-express-webhook" backend/node-express-webhook bash -c "$NPM && npm test"
  step "backend/aws-lambda-webhook" backend/aws-lambda-webhook npm test
  step "backend/firebase-function-webhook" backend/firebase-function-webhook bash -c "$NPM && npm test"
  step "backend/check-entitlement-node" backend/check-entitlement-node npm test
  step "backend/cloudflare-worker-webhook" backend/cloudflare-worker-webhook bash -c "$NPM && npm test && npm run typecheck"
  step "backend/fastify-webhook" backend/fastify-webhook bash -c "$NPM && npm test"
  step "backend/nestjs-webhook" backend/nestjs-webhook bash -c "$NPM && npm test"
  step "web/purchases-js-vite" web/purchases-js-vite bash -c "$NPM && npm run build >/dev/null"
  step "web/nextjs-purchases-js" web/nextjs-purchases-js bash -c "$NPM && npm run typecheck && npm run build >/dev/null"
  step "web/vanilla-js" web/vanilla-js bash -c "$NPM && npm run build >/dev/null"
  step "mobile/react-native-expo" mobile/react-native-expo bash -c "$NPM && npm run typecheck"
  step "mobile/react-native-expo-focus" mobile/react-native-expo-focus bash -c "$NPM && npm run typecheck"
else skip+=("node examples (no node)"); fi

if has python3; then
  step "backend/python-fastapi-webhook" backend/python-fastapi-webhook bash -c "$PY && .venv/bin/python -m pytest -q"
  step "backend/python-flask-webhook" backend/python-flask-webhook bash -c "$PY && .venv/bin/pytest -q"
  step "backend/python-django-webhook" backend/python-django-webhook bash -c "$PY && .venv/bin/python manage.py test"
  step "backend/check-entitlement-python" backend/check-entitlement-python bash -c "$PY && .venv/bin/pytest -q"
else skip+=("python examples (no python3)"); fi

if has bun; then step "backend/hono-bun-webhook" backend/hono-bun-webhook bash -c "bun install --frozen-lockfile >/dev/null && bun test"; else skip+=("backend/hono-bun-webhook (no bun)"); fi
if has deno; then
  step "backend/deno-webhook" backend/deno-webhook bash -c "deno test && deno check main.ts"
  step "backend/supabase-edge-function-webhook" backend/supabase-edge-function-webhook bash -c "deno test && deno check supabase/functions/revenuedot-webhook/index.ts"
else skip+=("deno and supabase examples (no deno)"); fi

if has go; then step "backend/go-webhook" backend/go-webhook bash -c "go vet ./... && go test ./..."; else skip+=("go example (no go)"); fi
if has cargo; then step "backend/rust-axum-webhook" backend/rust-axum-webhook cargo test -q; else skip+=("rust example (no cargo)"); fi
if has bundle && ruby -e 'exit(RUBY_VERSION >= "3.2" ? 0 : 1)' 2>/dev/null; then
  step "backend/ruby-sinatra-webhook" backend/ruby-sinatra-webhook bash -c "$BUNDLE && bundle exec ruby test/webhook_test.rb"
  step "backend/ruby-rails-webhook" backend/ruby-rails-webhook bash -c "$BUNDLE && bundle exec ruby test/webhook_test.rb"
else skip+=("ruby examples (need Ruby 3.2+ with bundler)"); fi
# The Java and Kotlin examples need JDK 21; Homebrew's openjdk@21 is used when present.
[ -d /opt/homebrew/opt/openjdk@21 ] && export JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
if has mvn; then
  step "backend/java-spring-boot-webhook" backend/java-spring-boot-webhook mvn -q -B test
  step "backend/kotlin-ktor-webhook" backend/kotlin-ktor-webhook mvn -q -B test
else skip+=("java and kotlin examples (no mvn; need JDK 21)"); fi
if has php; then step "backend/php-webhook" backend/php-webhook php tests/run.php; else skip+=("backend/php-webhook (no php)"); fi
if has php && has composer; then
  step "backend/php-laravel-webhook" backend/php-laravel-webhook bash -c "composer install --no-interaction --quiet && php artisan test"
else skip+=("backend/php-laravel-webhook (no php or composer)"); fi
# Microsoft's dotnet-install.sh puts the SDK in ~/.dotnet without touching the system.
[ -x "$HOME/.dotnet/dotnet" ] && export DOTNET_ROOT="$HOME/.dotnet" PATH="$HOME/.dotnet:$PATH"
if has dotnet; then step "backend/csharp-aspnet-webhook" backend/csharp-aspnet-webhook dotnet test tests/Webhook.Tests; else skip+=("backend/csharp-aspnet-webhook (no dotnet)"); fi
if has mix; then step "backend/elixir-plug-webhook" backend/elixir-plug-webhook bash -c "mix deps.get && mix test"; else skip+=("backend/elixir-plug-webhook (no elixir)"); fi

if has flutter; then step "mobile/flutter" mobile/flutter bash -c "flutter pub get && flutter analyze && flutter test"; else skip+=("mobile/flutter (no flutter)"); fi
if has xcodebuild && [ "${VERIFY_XCODE:-0}" = 1 ]; then
  step "mobile/ios-swiftui" mobile/ios-swiftui bash -c "xcodebuild -project RevenueDotPaywall.xcodeproj -scheme RevenueDotPaywall -destination 'generic/platform=iOS Simulator' -quiet build"
else skip+=("mobile/ios-swiftui (set VERIFY_XCODE=1 to build)"); fi
if [ -x mobile/android-compose/gradlew ] && [ "${VERIFY_GRADLE:-0}" = 1 ]; then
  step "mobile/android-compose" mobile/android-compose ./gradlew assembleDebug
else skip+=("mobile/android-compose (set VERIFY_GRADLE=1 with a Gradle wrapper and Android SDK)"); fi

if [ -x mobile/android-sandbox/gradlew ] && [ "${VERIFY_GRADLE:-0}" = 1 ]; then
  step "mobile/android-sandbox" mobile/android-sandbox ./gradlew -q bundleRelease
else skip+=("mobile/android-sandbox (set VERIFY_GRADLE=1 with JDK 17 and the Android SDK)"); fi

step "selfhost/docker-compose (syntax)" selfhost/docker-compose bash -n seed.sh
step "scripts/e2e-webhook.sh (syntax)" scripts bash -n e2e-webhook.sh
if docker_ok; then step "selfhost/docker-compose (config)" selfhost/docker-compose bash -c "POSTGRES_PASSWORD=x docker compose config -q"
else skip+=("docker compose config (docker missing or not answering)"); fi

echo; echo "passed:  ${pass[*]:-none}"; echo "failed:  ${fail[*]:-none}"; echo "skipped: ${skip[*]:-none}"
[ ${#fail[@]} -eq 0 ]
