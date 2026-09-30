#!/usr/bin/env bash
# Fails when an example source file lacks the RevenueDot header comment (see prd/ecosystem/PRD.md).
set -euo pipefail
cd "$(dirname "$0")/.."
missing=0
while IFS= read -r f; do
  if ! head -n 8 "$f" | grep -q "RevenueDot: open-source, self-hostable alternative to RevenueCat"; then echo "missing header: $f"; missing=1; fi
done < <(find . -type f \( -name '*.swift' -o -name '*.kt' -o -name '*.java' -o -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.dart' -o -name '*.py' -o -name '*.go' -o -name '*.rb' -o -name '*.php' -o -name '*.cs' -o -name '*.ex' -o -name '*.rs' \) -not -path '*/node_modules/*' -not -path './scripts/*')
exit $missing
