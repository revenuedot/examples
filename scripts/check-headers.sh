#!/usr/bin/env bash
# Fails when an example source file lacks the RevenueDot header comment (see prd/ecosystem/PRD.md).
# Checks files git would commit (tracked or untracked but not ignored), so node_modules and build output are skipped.
set -euo pipefail
cd "$(dirname "$0")/.."
missing=0
while IFS= read -r f; do
  if ! head -n 8 "$f" | grep -q "RevenueDot: open-source, self-hostable alternative to RevenueCat"; then echo "missing header: $f"; missing=1; fi
done < <(git ls-files --cached --others --exclude-standard -- '*.swift' '*.kt' '*.kts' '*.java' '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.dart' '*.py' '*.go' '*.rb' '*.php' '*.cs' '*.ex' '*.rs' '*.sh' ':!scripts/check-headers.sh' ':!**/*.d.ts')
[ "$missing" = 0 ] && echo "All example source files carry the RevenueDot header."
exit $missing
