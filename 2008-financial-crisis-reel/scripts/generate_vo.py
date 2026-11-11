#!/usr/bin/env python3
"""Generate the narration with Kokoro (open-weights neural TTS, Apache-2.0), one WAV per scene.

Each sentence is synthesised separately so that pauses are exact, then the scene is
assembled, lightly mastered (high-pass, presence, compression, de-ess) and written at 48 kHz.
Word-level timings are recovered with faster-whisper and saved to src/data/vo.json — the
Remotion timeline is driven by those numbers, so replacing a WAV and re-running
`python3 scripts/generate_vo.py --timings-only` re-syncs the whole edit.

usage: python3 scripts/generate_vo.py [--model-dir DIR] [--timings-only]
"""
import argparse, json, os, sys
import numpy as np, soundfile as sf
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "audio", "vo")
SR = 48000

def trim(x, sr, thresh=0.012, pad=0.035):
    env = np.abs(signal.sosfiltfilt(signal.butter(2, 30, fs=sr, output="sos"), np.abs(x)))
    idx = np.where(env > thresh)[0]
    if len(idx) == 0: return x
    a, b = max(0, idx[0] - int(pad * sr)), min(len(x), idx[-1] + int(pad * 2.2 * sr))
    y = x[a:b].copy()
    f = int(0.012 * sr); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    return y

def compress(x, sr, thresh_db=-20.0, ratio=3.0, attack=0.004, release=0.12, makeup_db=4.0):
    """Feed-forward soft compressor: evens out the narration like a broadcast chain."""
    a_a, a_r = np.exp(-1 / (attack * sr)), np.exp(-1 / (release * sr))
    lvl = np.zeros(len(x)); e = 0.0; ax = np.abs(x)
    for i in range(len(x)):
        c = a_a if ax[i] > e else a_r
        e = c * e + (1 - c) * ax[i]; lvl[i] = e
    db = 20 * np.log10(np.maximum(lvl, 1e-6))
    over = np.maximum(db - thresh_db, 0)
    gain = 10 ** ((-over * (1 - 1 / ratio) + makeup_db) / 20)
    return x * gain

def master_voice(x, sr):
    x = signal.sosfiltfilt(signal.butter(2, 75, "highpass", fs=sr, output="sos"), x)
    def peak(x, f0, q, gdb):  # RBJ peaking EQ
        A = 10 ** (gdb / 40); w = 2 * np.pi * f0 / sr; al = np.sin(w) / (2 * q)
        b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
        return signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x)
    x = peak(x, 140, 0.9, 2.0)      # chest / warmth
    x = peak(x, 320, 1.2, -1.5)     # remove boxiness
    x = peak(x, 3400, 1.0, 2.2)     # presence
    x = peak(x, 7200, 2.0, -2.0)    # soften sibilance
    x = compress(x, sr)
    x = np.tanh(x * 1.15) / 1.15     # gentle saturation / safety
    return x

def synth(args, cfg):
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(args.model_dir, "kokoro-v1.0.onnx"), os.path.join(args.model_dir, "voices-v1.0.bin"))
    os.makedirs(OUT, exist_ok=True)
    for name, lines in cfg["scenes"].items():
        parts = []
        for text, pause in lines:
            a, sr = k.create(text, voice=cfg["voice"], speed=cfg["speed"], lang=cfg["lang"])
            a = signal.resample_poly(a.astype(np.float64), SR, sr)
            parts += [trim(a, SR), np.zeros(int(pause * SR))]
        x = master_voice(np.concatenate(parts), SR)
        x = x / np.max(np.abs(x)) * 0.89
        sf.write(os.path.join(OUT, f"{name}.wav"), x.astype(np.float32), SR, subtype="PCM_24")
        print(f"{name:20s} {len(x)/SR:6.2f}s")

def timings(cfg):
    from faster_whisper import WhisperModel
    model = WhisperModel("small.en", device="cpu", compute_type="int8")
    out = {"voice": cfg["voice"], "scenes": {}}
    for name, lines in cfg["scenes"].items():
        path = os.path.join(OUT, f"{name}.wav")
        x, sr = sf.read(path); dur = len(x) / sr
        x16 = signal.resample_poly(x, 16000, sr).astype(np.float32)   # decode ourselves (no PyAV dependency)
        segs, _ = model.transcribe(x16, word_timestamps=True, beam_size=5, condition_on_previous_text=False,
                                   initial_prompt="Lehman Brothers, subprime mortgages, mortgage-backed securities.")
        words = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)} for s in segs for w in s.words]
        out["scenes"][name] = {"file": f"audio/vo/{name}.wav", "duration": round(dur, 3), "words": words,
                               "script": " ".join(t for t, _ in lines)}
        print(f"{name:20s} {dur:6.2f}s  | " + " ".join(w["w"] for w in words))
    with open(os.path.join(ROOT, "src", "data", "vo.json"), "w") as f:
        json.dump(out, f, indent=1)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-dir", default=os.environ.get("KOKORO_DIR", os.path.join(ROOT, ".cache", "kokoro")))
    ap.add_argument("--timings-only", action="store_true")
    args = ap.parse_args()
    cfg = json.load(open(os.path.join(ROOT, "scripts", "vo_script.json")))
    if not args.timings_only: synth(args, cfg)
    timings(cfg)
