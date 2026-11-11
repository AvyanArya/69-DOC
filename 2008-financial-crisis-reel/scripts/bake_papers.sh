#!/usr/bin/env bash
# Bake every newspaper front page (React components in src/papers) to a JPEG texture in public/papers.
# The opening scene flies these textures around instead of live DOM, which keeps renders fast.
set -euo pipefail
cd "$(dirname "$0")/.."
BROWSER="${BROWSER_EXECUTABLE:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}"
BX=(); [ -x "$BROWSER" ] && BX=(--browser-executable="$BROWSER")
mkdir -p public/papers
npx remotion bundle src/index.ts --out-dir out/bundle >/dev/null
IDS=(hero courier dispatch ledger metro broadsheet gazette city)
for i in "${!IDS[@]}"; do
  scale=1.25; [ "${IDS[$i]}" = "hero" ] && scale=3
  npx remotion still out/bundle FrontPages "public/papers/${IDS[$i]}.jpg" --frame="$i" --scale="$scale" --image-format=jpeg --jpeg-quality=92 "${BX[@]}" --log=error
done
WIKI=(17sep2008 16sep2008 18sep2008 25sep2008 26sep2008)
for i in "${!WIKI[@]}"; do
  scale=1.25; [ "${WIKI[$i]}" = "17sep2008" ] && scale=2.4
  npx remotion still out/bundle WikinewsPages "public/papers/wikinews_${WIKI[$i]}.jpg" --frame="$i" --scale="$scale" --image-format=jpeg --jpeg-quality=92 "${BX[@]}" --log=error
done
ls -la public/papers
