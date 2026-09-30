#!/usr/bin/env bash
# RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
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

if has node; then
  step "backend/nextjs-webhook" backend/nextjs-webhook bash -c "npm ci --no-audit --no-fund >/dev/null && npm test && npm run typecheck && npx next build >/dev/null"
  step "backend/node-express-webhook" backend/node-express-webhook bash -c "npm ci --no-audit --no-fund >/dev/null && npm test"
  step "web/purchases-js-vite" web/purchases-js-vite bash -c "npm ci --no-audit --no-fund >/dev/null && npm run build >/dev/null"
  step "mobile/react-native-expo" mobile/react-native-expo bash -c "npm ci --no-audit --no-fund >/dev/null && npm run typecheck"
else skip+=("node examples (no node)"); fi

if has python3; then
  step "backend/python-fastapi-webhook" backend/python-fastapi-webhook bash -c "python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt && .venv/bin/python -m pytest -q"
else skip+=("python example (no python3)"); fi

if has go; then step "backend/go-webhook" backend/go-webhook bash -c "go vet ./... && go test ./..."; else skip+=("go example (no go)"); fi

if has flutter; then step "mobile/flutter" mobile/flutter bash -c "flutter pub get && flutter analyze"; else skip+=("mobile/flutter (no flutter)"); fi
if has xcodebuild && [ "${VERIFY_XCODE:-0}" = 1 ]; then
  step "mobile/ios-swiftui" mobile/ios-swiftui bash -c "xcodebuild -project RevenueDotPaywall.xcodeproj -scheme RevenueDotPaywall -destination 'generic/platform=iOS Simulator' -quiet build"
else skip+=("mobile/ios-swiftui (set VERIFY_XCODE=1 to build)"); fi
if [ -x mobile/android-compose/gradlew ] && [ "${VERIFY_GRADLE:-0}" = 1 ]; then
  step "mobile/android-compose" mobile/android-compose ./gradlew assembleDebug
else skip+=("mobile/android-compose (set VERIFY_GRADLE=1 with a Gradle wrapper and Android SDK)"); fi

if has bash; then step "selfhost/docker-compose (syntax)" selfhost/docker-compose bash -n seed.sh; fi
if has docker; then step "selfhost/docker-compose (config)" selfhost/docker-compose bash -c "POSTGRES_PASSWORD=x docker compose config -q"; else skip+=("docker compose config (no docker)"); fi

echo; echo "passed:  ${pass[*]:-none}"; echo "failed:  ${fail[*]:-none}"; echo "skipped: ${skip[*]:-none}"
[ ${#fail[@]} -eq 0 ]
