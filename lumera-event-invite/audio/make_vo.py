"""Voiceover for the Lumera event reel.

Generates each line in vo_lines.json with the Kokoro neural TTS model, then
gives it a light polish: gentle EQ and compression. A line can carry its own
"speed" to fit its slot in the edit.

    python make_vo.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin              # the launch film narrator
    python make_vo.py ... --voice bf_emma                                            # or any other Kokoro voice

Needs: kokoro-onnx, soundfile, scipy, numpy.
"""
import argparse
import json
import os

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from scipy import signal

SR = 48000


def biquad_shelf(f0, gain_db, kind, fs=SR, s=0.8):
    """RBJ cookbook low/high shelf as an SOS row."""
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / fs
    alpha = np.sin(w) / 2 * np.sqrt((A + 1 / A) * (1 / s - 1) + 2)
    c = np.cos(w)
    if kind == 'low':
        b = [A * ((A + 1) - (A - 1) * c + 2 * np.sqrt(A) * alpha), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - 2 * np.sqrt(A) * alpha)]
        a = [(A + 1) + (A - 1) * c + 2 * np.sqrt(A) * alpha, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - 2 * np.sqrt(A) * alpha]
    else:
        b = [A * ((A + 1) + (A - 1) * c + 2 * np.sqrt(A) * alpha), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - 2 * np.sqrt(A) * alpha)]
        a = [(A + 1) - (A - 1) * c + 2 * np.sqrt(A) * alpha, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - 2 * np.sqrt(A) * alpha]
    return np.array([b[0] / a[0], b[1] / a[0], b[2] / a[0], 1.0, a[1] / a[0], a[2] / a[0]])


def biquad_peak(f0, gain_db, q, fs=SR):
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / fs
    alpha = np.sin(w) / (2 * q)
    b = [1 + alpha * A, -2 * np.cos(w), 1 - alpha * A]
    a = [1 + alpha / A, -2 * np.cos(w), 1 - alpha / A]
    return np.array([b[0] / a[0], b[1] / a[0], b[2] / a[0], 1.0, a[1] / a[0], a[2] / a[0]])


def compress(x, thresh_db=-22, ratio=3.0, attack=.004, release=.12):
    env = np.abs(x)
    a_att, a_rel = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    # one-pole follower, vectorised in blocks is overkill for a few seconds of audio
    e = np.empty_like(env)
    v = 0.0
    for i, s in enumerate(env):
        v = a_att * v + (1 - a_att) * s if s > v else a_rel * v + (1 - a_rel) * s
        e[i] = v
    lvl = 20 * np.log10(np.maximum(e, 1e-6))
    over = np.maximum(lvl - thresh_db, 0)
    gain = 10 ** (-(over * (1 - 1 / ratio)) / 20)
    return x * gain


# The brand is said "loo-MAIR-uh" and the city "doo-BYE"; the default G2P stresses the first syllable of both.
PRONOUNCE = {
    'en-us': {'Lumera': 'luːmˈɛɹə', 'Dubai': 'duːbˈaɪ'},
    'en-gb': {'Lumera': 'luːmˈɛəɹə', 'Dubai': 'duːbˈaɪ'},
}


def narrate(k, style, text, speed, lang='en-us'):
    ph = k.tokenizer.phonemize(text, lang)
    for word, ipa in PRONOUNCE[lang].items():
        ph = ph.replace(k.tokenizer.phonemize(word, lang).strip(' .'), ipa)
    audio, sr = k.create(ph, voice=style, speed=speed, lang=lang, is_phonemes=True)
    audio = signal.resample_poly(audio.astype(np.float64), SR // sr, 1)
    # trim silence, keep a short breath either side
    idx = np.where(np.abs(audio) > .01)[0]
    audio = audio[max(0, idx[0] - int(.03 * SR)): idx[-1] + int(.12 * SR)]
    sos = np.vstack([
        signal.butter(2, 70, 'highpass', fs=SR, output='sos'),
        biquad_shelf(170, 1.5, 'low'),
        biquad_peak(320, -1.5, 1.0),
        biquad_peak(3200, 2.0, .9),
        biquad_shelf(9000, -1.5, 'high'),
    ])
    audio = signal.sosfilt(sos, audio)
    audio = compress(audio, thresh_db=-20, ratio=2.2)
    fade = int(.01 * SR)
    audio[:fade] *= np.linspace(0, 1, fade)
    audio[-fade * 4:] *= np.linspace(1, 0, fade * 4)
    return audio / np.abs(audio).max() * 10 ** (-3 / 20)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True)
    ap.add_argument('--voices', required=True)
    ap.add_argument('--lines', default=os.path.join(os.path.dirname(__file__), 'vo_lines.json'))
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), 'vo'))
    ap.add_argument('--voice', default='am_michael:.85,am_onyx:.15', help='a Kokoro voice or a blend; the default is the launch film narrator')
    ap.add_argument('--speed', type=float, default=1.0, help='used for lines without their own speed')
    ap.add_argument('--only', nargs='*', help='line ids to (re)generate')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    k = Kokoro(args.model, args.voices)
    parts = [(v.split(':')[0], float(v.split(':')[1]) if ':' in v else 1.) for v in args.voice.split(',')]
    style = sum(w * k.get_voice_style(v) for v, w in parts) / sum(w for _, w in parts)
    lang = 'en-gb' if parts[0][0].startswith('b') else 'en-us'
    lines = json.load(open(args.lines))
    for ln in lines:
        if args.only and ln['id'] not in args.only:
            continue
        a = narrate(k, style, ln['text'], ln.get('speed', args.speed), lang)
        sf.write(os.path.join(args.out, ln['id'] + '.wav'), a, SR, subtype='PCM_24')
        print(f"{ln['id']}  +{len(a) / SR:4.2f}s  {ln['text']}")


if __name__ == '__main__':
    main()
