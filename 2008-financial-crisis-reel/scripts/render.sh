#!/usr/bin/env bash
# Render the finished film:  out/reel_picture.mp4 (clean picture)  →  2008_financial_crisis_reel.mp4
#
#   scripts/render.sh            full 1080x1920 render + film grain + soundtrack
#   scripts/render.sh --audio    rebuild the soundtrack first (after changing the narration or timeline)
#   scripts/render.sh --finish   skip the picture render and only redo grain / encode / mux
#
# Environment: CONCURRENCY (default 4) · BROWSER_EXECUTABLE (Chrome Headless Shell; Remotion downloads one if unset)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=2008_financial_crisis_reel.mp4
BROWSER="${BROWSER_EXECUTABLE:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}"
BX=(); [ -x "$BROWSER" ] && BX=(--browser-executable="$BROWSER")
mkdir -p out

if [[ " $* " == *" --audio "* ]]; then
  python3 scripts/build_timeline.py
  python3 scripts/build_audio.py
fi

if [[ " $* " != *" --finish "* ]]; then
  npx remotion bundle src/index.ts --out-dir out/bundle >/dev/null
  # picture only, near-lossless: grain and the final encode happen in the next step
  npx remotion render out/bundle Reel out/reel_picture.mp4 --muted --concurrency="${CONCURRENCY:-4}" \
      --image-format=jpeg --jpeg-quality=95 --crf=10 --x264-preset=medium "${BX[@]}" --log=error
fi

# Film grain: blurred temporal noise blended into the luma, so it reads as grain and not as sensor noise.
# Encode: H.264 High, yuv420p, 30 fps, AAC 48 kHz – what Instagram expects for a 1080x1920 Reel.
ffmpeg -v error -stats -y -i out/reel_picture.mp4 -i public/audio/mix.wav -filter_complex "
  color=c=gray:s=1080x1920:r=30,format=gray,noise=alls=34:allf=t+u,gblur=sigma=0.75[grain];
  [0:v]format=yuv420p,eq=contrast=1.03:saturation=1.02[pic];
  [pic][grain]blend=c0_mode=overlay:c0_opacity=0.36:c1_mode=normal:c1_opacity=0:c2_mode=normal:c2_opacity=0:shortest=1,format=yuv420p[v]" \
  -map "[v]" -map 1:a -c:v libx264 -preset slow -crf 20 -maxrate 8M -bufsize 16M -profile:v high -level 4.2 -pix_fmt yuv420p -r 30 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart -shortest "$OUT"
ls -la "$OUT"
