#!/usr/bin/env bash
# Vercel serves the `public/` directory, but the app is authored as Lumera.html
# at the repo root. Those copies drift silently, which means the live site can
# quietly fall behind the source. Run this after any edit to the source files.
#
#   ./sync-public.sh          # copy source -> public/
#   ./sync-public.sh --check  # fail if they differ (use in CI / before deploy)

set -euo pipefail
cd "$(dirname "$0")"

pairs=("lumera.html:public/lumera.html" "landing.html:public/index.html" "admin-portal.html:public/admin.html" "admin-portal.html:public/admin-portal.html" "ui-styles.html:public/ui-styles.html" "worlds.html:public/worlds.html" "leaf.html:public/leaf.html" "atlas.html:public/atlas.html" "shield.html:public/shield.html" "forge.html:public/forge.html" "features.html:public/features.html" "how-it-works.html:public/how-it-works.html" "team.html:public/team.html" "about.html:public/about.html" "pricing.html:public/pricing.html" "privacy.html:public/privacy.html" "refunds.html:public/refunds.html" "cookies.html:public/cookies.html" "terms.html:public/terms.html")

if [[ "${1:-}" == "--check" ]]; then
  status=0
  for p in "${pairs[@]}"; do
    src="${p%%:*}"; dst="${p##*:}"
    if ! diff -q "$src" "$dst" >/dev/null 2>&1; then
      echo "OUT OF SYNC: $dst is behind $src"
      status=1
    fi
  done
  if ! diff -rq assets public/assets >/dev/null 2>&1; then echo "OUT OF SYNC: public/assets is behind assets"; status=1; fi
  if ! diff -rq previews public/previews >/dev/null 2>&1; then echo "OUT OF SYNC: public/previews is behind previews"; status=1; fi
  # public/app.html is Lumera.html with its JSX compiled (build-app.py).
  tmp="$(mktemp -d)"; python3 build-app.py "$tmp/app.html" >/dev/null
  if ! diff -q "$tmp/app.html" public/app.html >/dev/null 2>&1; then echo "OUT OF SYNC: public/app.html is behind Lumera.html"; status=1; fi
  rm -rf "$tmp"
  [[ $status -eq 0 ]] && echo "public/ is in sync with source."
  exit $status
fi

mkdir -p public
for p in "${pairs[@]}"; do
  src="${p%%:*}"; dst="${p##*:}"
  cp "$src" "$dst"
  echo "synced $src -> $dst"
done
# the app, with its JSX compiled ahead of time
python3 build-app.py
# fonts and brand artwork used by every page
rm -rf public/assets && cp -R assets public/assets && echo "synced assets/ -> public/assets/"
# design previews (each frames the built pages above)
rm -rf public/previews && cp -R previews public/previews && echo "synced previews/ -> public/previews/"
