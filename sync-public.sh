#!/usr/bin/env bash
# Vercel serves the `public/` directory, but the app is authored as Lumera.html
# at the repo root. Those copies drift silently, which means the live site can
# quietly fall behind the source. Run this after any edit to the source files.
#
#   ./sync-public.sh          # copy source -> public/
#   ./sync-public.sh --check  # fail if they differ (use in CI / before deploy)

set -euo pipefail
cd "$(dirname "$0")"

pairs=("lumera.html:public/lumera.html" "landing.html:public/index.html" "Lumera.html:public/app.html" "admin-portal.html:public/admin.html" "worlds.html:public/worlds.html" "leaf.html:public/leaf.html" "atlas.html:public/atlas.html" "shield.html:public/shield.html" "forge.html:public/forge.html" "features.html:public/features.html" "how-it-works.html:public/how-it-works.html" "team.html:public/team.html" "about.html:public/about.html" "pricing.html:public/pricing.html" "privacy.html:public/privacy.html" "font-options.html:public/font-options.html" "launch.html:public/launch.html" "hero.html:public/hero.html")

if [[ "${1:-}" == "--check" ]]; then
  status=0
  for p in "${pairs[@]}"; do
    src="${p%%:*}"; dst="${p##*:}"
    if ! diff -q "$src" "$dst" >/dev/null 2>&1; then
      echo "OUT OF SYNC: $dst is behind $src"
      status=1
    fi
  done
  [[ $status -eq 0 ]] && echo "public/ is in sync with source."
  exit $status
fi

mkdir -p public
for p in "${pairs[@]}"; do
  src="${p%%:*}"; dst="${p##*:}"
  cp "$src" "$dst"
  echo "synced $src -> $dst"
done
