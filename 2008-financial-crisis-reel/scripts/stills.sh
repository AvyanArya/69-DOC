#!/usr/bin/env bash
# Render stills of the Reel at the given times (seconds) into out/stills and tile them into one sheet.
# usage: scripts/stills.sh NAME SCALE t1 t2 t3 ...
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=$1; SCALE=$2; shift 2
BROWSER="${BROWSER_EXECUTABLE:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}"
BX=(); [ -x "$BROWSER" ] && BX=(--browser-executable="$BROWSER")
mkdir -p out/stills
npx remotion bundle src/index.ts --out-dir out/bundle >/dev/null
i=0; files=()
for t in "$@"; do
  f=$(python3 -c "print(int(round($t*30)))")
  o=$(printf "out/stills/%s_%02d.jpg" "$NAME" "$i")
  npx remotion still out/bundle Reel "$o" --frame="$f" --scale="$SCALE" --image-format=jpeg --jpeg-quality=88 "${BX[@]}" --log=error
  files+=("$o"); i=$((i+1))
done
python3 - "$NAME" "${files[@]}" <<'PY'
import sys
from PIL import Image
name, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f) for f in files]
w, h = ims[0].size
cols = min(len(ims), 6); rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w + (cols - 1) * 6, rows * h + (rows - 1) * 6), (60, 0, 60))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
sheet.save(f"out/stills/{name}_sheet.jpg", quality=86)
print("sheet", sheet.size)
PY
