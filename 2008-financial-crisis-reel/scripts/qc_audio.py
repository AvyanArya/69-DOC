#!/usr/bin/env python3
"""Objective checks on the soundtrack (run after build_audio.py).
 * loudness / true peak / clipping
 * narration-to-background ratio in every scene
 * intelligibility: Whisper transcribes the *final mix* and the result is compared with the script
 * images: out/qc/spectrogram.png, out/qc/waveform.png
usage: python3 scripts/qc_audio.py [--no-asr]
"""
import json, os, subprocess, sys
import numpy as np, soundfile as sf
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, "src", "data", "timeline.json")))
os.makedirs(os.path.join(ROOT, "out", "qc"), exist_ok=True)
mix, SR = sf.read(os.path.join(ROOT, "public", "audio", "mix.wav"))
st = {k: sf.read(os.path.join(ROOT, "assets_src", "audio_stems", k + ".flac"))[0] for k in ("narration", "music", "effects")}
import pyloudnorm as pyln
meter = pyln.Meter(SR)
db = lambda x: 20 * np.log10(max(x, 1e-9))
rms = lambda x: np.sqrt((x ** 2).mean())
tp = np.abs(signal.resample_poly(mix, 4, 1, axis=0)).max()
print(f"duration {len(mix)/SR:.2f}s · integrated {meter.integrated_loudness(mix):.1f} LUFS · true peak {db(tp):.2f} dBTP · sample peak {db(np.abs(mix).max()):.2f} dBFS")
clipped = int((np.abs(mix) >= 0.999).sum())
print(f"samples at full scale: {clipped}   DC offset: {mix.mean():+.5f}")
print("\nloudness while the narrator is speaking (LUFS):  narration   music   effects   voice above the rest")
for k, s in TL["scenes"].items():
    a, b = int(s["voStart"] * SR), int(s["voEnd"] * SR)
    v, m, e = (meter.integrated_loudness(st[x][a:b]) for x in ("narration", "music", "effects"))
    rest = meter.integrated_loudness((st["music"] + st["effects"])[a:b])
    print(f"  {k}                                               {v:6.1f}  {m:6.1f}   {e:6.1f}        {v - rest:5.1f} LU")
# moment-by-moment: how far the voice sits above music + effects (0.8 s windows, only while speaking)
rest_all = st["music"] + st["effects"]
diffs = []
for i in range(0, len(mix) - int(0.8 * SR), int(0.2 * SR)):
    v = meter.integrated_loudness(st["narration"][i:i + int(0.8 * SR)])
    if v > -28:
        diffs.append(v - meter.integrated_loudness(rest_all[i:i + int(0.8 * SR)]))
diffs = np.array(diffs)
print(f"voice above background, moment by moment: median {np.median(diffs):.1f} LU · 10th percentile {np.percentile(diffs, 10):.1f} LU · windows where background is louder: {100 * (diffs < 0).mean():.0f}%")
print("\nshort-term level every 2 s (dBFS RMS):")
row = ""
for i in range(0, len(mix) - SR, 2 * SR):
    row += f"{db(rms(mix[i:i + 2 * SR])):5.0f}"
print(row)
for a, b, name in ((TL["scenes"]["s5"]["start"] - 0.005, TL["scenes"]["s5"]["start"] + 0.18, "silence before 'On September 15'"),
                   (TL["cues"]["s7.silence"] + 0.05, TL["cues"]["s7.wrong"] - 0.32, "silence before 'THEY WERE WRONG.'")):
    print(f"{name}: {db(rms(mix[int(a*SR):int(b*SR)])):.1f} dBFS")
src = os.path.join(ROOT, "public", "audio", "mix.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-lavfi", "showspectrumpic=s=1800x700:legend=1:scale=log:fscale=log:stop=16000", os.path.join(ROOT, "out", "qc", "spectrogram.png")], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-lavfi", "showwavespic=s=1800x360:split_channels=0:colors=white", os.path.join(ROOT, "out", "qc", "waveform.png")], check=True)
if "--no-asr" not in sys.argv:
    from faster_whisper import WhisperModel
    import re
    model = WhisperModel("small.en", device="cpu", compute_type="int8")
    x16 = signal.resample_poly(mix.mean(1), 16000, SR).astype(np.float32)
    segs, _ = model.transcribe(x16, beam_size=5)
    heard = " ".join(s.text.strip() for s in segs)
    norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("-", " ")).split()
    want = norm(" ".join(c["text"] for sc in TL["captions"].values() for c in sc))
    got = norm(heard)
    import difflib
    ratio = difflib.SequenceMatcher(None, want, got).ratio()
    print("\nWhisper on the final mix heard:\n ", heard)
    print(f"word match with the script: {ratio * 100:.1f}%")
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, want, got).get_opcodes():
        if tag != "equal":
            print(f"   differs: script {want[i1:i2]} → heard {got[j1:j2]}")
