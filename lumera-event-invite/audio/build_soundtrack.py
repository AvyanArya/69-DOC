"""Music and foley for the Lumera launch invitation.

A warm bossa nova at 120 BPM in F: nylon guitar, bass, brushes and a rim-click
clave, a flute melody, with piano and harp around the key moments. The band
comes in as the wax seal cracks (3.6s), stops dead when the ticket tears
(23.6s) and resolves as the closing seal is stamped down (25.6s). Foley is
recorded paper, card, cloth and stamp sounds (Kenney, CC0); run
fetch_samples.py once first.

    node ../render.js --events-only && python build_soundtrack.py   -> soundtrack.wav (+ ../assets/audio/soundtrack.m4a)
"""
import glob
import json
import os
import re
import shutil
import subprocess

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
EV = json.load(open(os.path.join(HERE, 'events.json')))
DUR = EV['end']
N = int(DUR * SR)
R = np.random.default_rng(904)
BAR = 2.0                        # 120 BPM, 4/4
B0 = EV['crack']                 # the first downbeat


def tt(d):
    return np.arange(int(d * SR)) / SR


def bp(lo, hi, order=2):
    return signal.butter(order, [lo, min(hi, SR / 2 * .95)], 'bandpass', fs=SR, output='sos')


def lp(f, order=2):
    return signal.butter(order, f, 'lowpass', fs=SR, output='sos')


def hp(f, order=2):
    return signal.butter(order, f, 'highpass', fs=SR, output='sos')


NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    m = re.fullmatch(r'([A-G])(#|s|b)?(-?\d)', name)
    return 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + {'#': 1, 's': 1, 'b': -1}.get(m.group(2), 0)


class Bus:
    def __init__(self):
        self.x = np.zeros((N, 2))

    def add(self, sig, t, gain=1., pan=0.):
        if sig.ndim == 1:
            a = (pan + 1) * np.pi / 4
            sig = np.stack([sig * np.cos(a), sig * np.sin(a)], 1) * np.sqrt(2)
        i = int(round(t * SR))
        if i < 0:
            sig, i = sig[-i:], 0
        if i >= N:
            return
        j = min(N, i + len(sig))
        self.x[i:j] += sig[:j - i] * gain


class Sampler:
    """Nearest recorded note, repitched by resampling, with a natural release."""

    def __init__(self, folder):
        self.notes = {}
        for f in glob.glob(os.path.join(HERE, 'samples', folder, '*.flac')):
            a, sr = sf.read(f)
            on = max(0, int(np.argmax(np.abs(a) > .03 * np.abs(a).max())) - int(.002 * SR))
            self.notes[midi(os.path.basename(f)[:-5])] = a[on:] / np.abs(a).max()
        if not self.notes:
            raise SystemExit(f'no samples for {folder}: run fetch_samples.py first')

    def __call__(self, name, dur, vel=1., release=.25, attack=0.):
        m = midi(name) if isinstance(name, str) else name
        base = min(self.notes, key=lambda k: abs(k - m))
        src = self.notes[base]
        pos = np.arange(int((dur + release) * SR)) * 2 ** ((m - base) / 12)
        pos = pos[pos < len(src) - 1]
        y = np.interp(pos, np.arange(len(src)), src)
        env = np.ones(len(y))
        k = int(dur * SR)
        if k < len(y):
            env[k:] = np.cos(np.linspace(0, np.pi / 2, len(y) - k)) ** 2
        if attack > 0:
            a = min(len(y), int(attack * SR))
            env[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
        return y * env * vel


piano, guitar, flute, harp, bass = (Sampler(f) for f in ('piano', 'guitar-nylon', 'flute', 'harp', 'bass-electric'))
FOLEY = {os.path.basename(f)[:-5]: sf.read(f)[0] for f in glob.glob(os.path.join(HERE, 'samples', 'foley', '*.flac'))}


def foley(name):
    return FOLEY[name] / np.abs(FOLEY[name]).max()


def strum(inst, notes, dur, vel, gap=.012, **kw):
    n = int((dur + kw.get('release', .25) + gap * len(notes) + .05) * SR)
    out = np.zeros((n, 2))
    for i, nm in enumerate(notes):
        y = inst(nm, dur, vel * (.85 + .15 * R.random()), **kw)
        pan = -.3 + .6 * i / max(1, len(notes) - 1)
        a = (pan + 1) * np.pi / 4
        o = int(i * gap * SR)
        out[o:o + len(y), 0] += y * np.cos(a)
        out[o:o + len(y), 1] += y * np.sin(a)
    return out


# ---------------------------------------------------------------- percussion (synthesised, soft)
def brush_tap():
    t = tt(.18)
    return signal.sosfilt(bp(1500, 7000), R.standard_normal(len(t))) * np.exp(-t / .045) * .35


def brush_swirl(dur):
    t = tt(dur)
    y = signal.sosfilt(bp(2200, 8000), R.standard_normal(len(t)))
    return y * (np.sin(np.pi * t / dur) ** 1.5) * .12


def rim():
    t = tt(.08)
    y = np.sin(2 * np.pi * 1750 * t) * np.exp(-t / .012) * .5 + signal.sosfilt(bp(2000, 6000), R.standard_normal(len(t))) * np.exp(-t / .004) * .4
    return y * .6


def kick():
    t = tt(.35)
    f = 50 + 70 * np.exp(-t / .03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .18) * .5


def shaker():
    t = tt(.09)
    return signal.sosfilt(bp(4500, 11000), R.standard_normal(len(t))) * np.minimum(1, t / .012) * np.exp(-t / .035) * .1


def pen(dur):
    """Ink on paper: a scratchy, uneven nib stroke."""
    t = tt(dur)
    y = signal.sosfilt(bp(2500, 9000), R.standard_normal(len(t)))
    strokes = np.abs(np.sin(2 * np.pi * (6 + 3 * R.random()) * t + R.random() * 6)) ** 3
    return y * strokes * np.sin(np.pi * t / dur) ** .5 * .12


def snap():
    """Wax cracking: a sharp crack and a few crumbs."""
    t = tt(.35)
    y = signal.sosfilt(hp(1800), R.standard_normal(len(t))) * np.exp(-t / .006) * .9
    y += np.sin(2 * np.pi * 140 * t) * np.exp(-t / .03) * .4
    for d in R.uniform(.03, .25, 6):
        i = int(d * SR)
        y[i:i + 200] += signal.sosfilt(hp(3000), R.standard_normal(200)) * np.exp(-np.arange(200) / 40) * .25
    return y


def whoosh(dur=.5, f0=500, f1=3000):
    n = int(dur * SR)
    nz = R.standard_normal(n)
    out = np.zeros(n)
    zi = None
    for i in range(0, n, 256):
        fc = f0 * (f1 / f0) ** (i / n)
        sos = bp(fc * .7, fc * 1.4)
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + 256], zi = signal.sosfilt(sos, nz[i:i + 256], zi=zi)
    return out * np.sin(np.pi * np.linspace(0, 1, n)) ** 2 * .3


def reverb(x, dur=2.2, decay=.5, tone=7000):
    t = tt(dur)
    ir = signal.sosfilt(lp(tone, 1), R.standard_normal((len(t), 2)), axis=0) * np.exp(-t / decay)[:, None]
    ir[:int(.012 * SR)] = 0
    for d, g in ((.006, .5), (.011, .35), (.019, .3)):
        ir[int(d * SR)] += g * np.array([1, .8])
    ir /= np.sqrt((ir ** 2).sum(0))
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in (0, 1)], 1)


music, drums, fx, send = Bus(), Bus(), Bus(), Bus()

# ---------------------------------------------------------------- 1. intro: piano alone, before the seal breaks
for i, nm in enumerate(['F2', 'C3', 'A3', 'E4', 'G4', 'C5']):                 # Fmaj9, rolled
    music.add(piano(nm, 2.2, .45, release=1.0), .5 + i * .07, .8, pan=-.3 + i * .12)
for i, nm in enumerate(['C2', 'Bb2', 'F3', 'A3', 'D4', 'G4']):                # C9sus, rolled, leading in
    music.add(piano(nm, 1.3, .42, release=.8), 2.25 + i * .06, .8, pan=-.3 + i * .12)

# ---------------------------------------------------------------- 2. the bossa
CH = {   # guitar voicing, bass root, fifth
    'Fmaj7': (['A3', 'C4', 'E4'], 'F2', 'C2'), 'Dm7': (['A3', 'C4', 'F4'], 'D2', 'A1'),
    'Gm7': (['Bb3', 'D4', 'F4'], 'G1', 'D2'), 'C7': (['Bb3', 'E4', 'G4'], 'C2', 'G1'),
    'Am7': (['G3', 'C4', 'E4'], 'A1', 'E2'), 'D7': (['F#3', 'A3', 'C4'], 'D2', 'A1'),
    'Bbmaj7': (['A3', 'D4', 'F4'], 'Bb1', 'F2'), 'C9sus': (['Bb3', 'D4', 'G4'], 'C2', 'G1'),
}
SONG = ['Fmaj7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'Am7|D7', 'Gm7', 'C7', 'Fmaj7', 'Dm7']   # 3.6 .. 23.6
STOP = EV['tear']
END_IN = EV['seal']
TAIL = ['Bbmaj7|C9sus']                                                                   # 25.6 .. 27.6
FINAL = END_IN + BAR


def play_bar(b0, name, full=True):
    halves = name.split('|')
    for h, ch in enumerate(halves):
        voic, root, fifth = CH[ch]
        hb = b0 + h * BAR / len(halves)
        span = BAR / len(halves)
        # nylon guitar: syncopated bossa comping
        hits = [0, .75, 1.25] if len(halves) == 1 else [0, .75]
        for k, off in enumerate(hits + ([1.75] if len(halves) == 1 else [])):
            if off >= span:
                continue
            music.add(strum(guitar, voic, .32, .55 if k == 0 else .42, release=.12), hb + off, .55)
        # bass: root on 1, fifth on 3
        music.add(bass(root, .45, .85, release=.08), hb, .6)
        if len(halves) == 1:
            music.add(bass(fifth, .45, .75, release=.08), hb + 1.0, .6)
            music.add(bass(root, .2, .5, release=.05), hb + 1.75, .5)
    if not full:
        return
    for bt in range(4):                                      # brushes + soft kick
        tb = b0 + bt * .5
        drums.add(brush_swirl(.5), tb, 1, pan=.3)
        if bt in (1, 3):
            drums.add(brush_tap(), tb, .8, pan=.2)
        if bt in (0, 2):
            drums.add(kick(), tb, .7)
        for s in range(2):
            drums.add(shaker(), tb + s * .25 + .125, 1, pan=-.35)


for i, name in enumerate(SONG):
    b0 = B0 + i * BAR
    play_bar(b0, name)
    clave = [0, 1.5, 3] if i % 2 == 0 else [1, 2]            # 3-2 son clave, in beats
    for c in clave:
        drums.add(rim(), b0 + c * .5, .5, pan=.4)

# flute melody, from when the invitation is in view (bar 0 is the first downbeat)
MEL = [  # bar, beat, note, beats
    (2, 0, 'Bb4', 1), (2, 1, 'D5', .5), (2, 1.5, 'F5', 1.5), (2, 3, 'E5', 1),        # Gm7
    (3, 0, 'E5', 1), (3, 1, 'D5', .5), (3, 1.5, 'C5', .5), (3, 2, 'Bb4', 2),          # C7
    (4, 0, 'A4', 1), (4, 1, 'C5', .5), (4, 1.5, 'E5', 1.5), (4, 3, 'D5', 1),          # Fmaj7
    (5, 0, 'C5', 1.5), (5, 1.5, 'A4', .5), (5, 2, 'F#4', 1), (5, 3, 'A4', 1),         # Am7 | D7
    (6, 0, 'Bb4', 1.5), (6, 1.5, 'D5', .5), (6, 2, 'G5', 2),                          # Gm7
    (7, 0, 'E5', 1), (7, 1, 'C5', 1), (7, 2, 'Bb4', 1), (7, 3, 'G4', 1),              # C7
    (8, 0, 'A4', 1.5), (8, 1.5, 'C5', .5), (8, 2, 'F5', 2),                           # Fmaj7
    (9, 0, 'E5', 2), (9, 2, 'D5', 1), (9, 3, 'C5', 1),                                # Dm7
]
for b, beat, nm, beats in MEL:
    tn = B0 + b * BAR + beat * .5
    y = flute(nm, beats * .5 * .92, .5, release=.25, attack=.04)
    music.add(y, tn, .5, pan=.15)
    send.add(y, tn, .25)

# piano colour while the cards are dealt
for i, lt in enumerate(EV['deal']):
    y = piano(['C5', 'E5', 'G5', 'A5', 'C6', 'E6'][i], .6, .4, release=.6)
    music.add(y, lt, .5, pan=-.4 + i * .16)
    send.add(y, lt, .2)

# the stop: the band hits once with the tear, then only piano and a held bass
music.add(strum(guitar, ['A3', 'C4', 'E4', 'G4'], .6, .7, release=.4), STOP, .6)
music.add(bass('F1', 1.8, .8, release=.4), STOP, .55)
for i, nm in enumerate(['A4', 'C5', 'E5', 'G5', 'C6']):
    music.add(piano(nm, .9, .32, release=.8), STOP + .45 + i * .32, .6, pan=-.2 + i * .1)

# back in for the close, resolving on Fmaj9
play_bar(END_IN, TAIL[0])
for i, nm in enumerate(['F2', 'C3', 'A3', 'E4', 'G4', 'C5', 'A5']):
    music.add(piano(nm, 1.6, .55, release=1.0), FINAL + i * .05, .7, pan=-.35 + i * .1)
music.add(strum(guitar, ['A3', 'E4', 'G4', 'C5'], 1.3, .6, gap=.03, release=.6), FINAL + .02, .55)
music.add(bass('F1', 1.4, .85, release=.5), FINAL, .6)
y = flute('A5', 1.2, .5, release=.4, attack=.05)
music.add(y, FINAL, .45)
send.add(y, FINAL, .3)

# ---------------------------------------------------------------- harp glints
def harp_gliss(notes, t0, dur, gain=.4):
    for i, nm in enumerate(notes):
        p = i / max(1, len(notes) - 1)
        y = harp(nm, 1.2, .5 + .3 * p, release=.7)
        fx.add(y, t0 + dur * p ** 1.1, gain, pan=-.5 + p)
        send.add(y, t0 + dur * p ** 1.1, gain * .5)


harp_gliss(['C6', 'F6', 'A6', 'C7'], EV['glint'], .3, .3)
harp_gliss(['F5', 'A5', 'C6', 'E6', 'F6', 'A6', 'C7'], EV['shimmer'], .55, .3)
harp_gliss(['C5', 'E5', 'F5', 'A5', 'C6', 'E6', 'F6', 'A6'], END_IN + .05, .6, .35)

# ---------------------------------------------------------------- foley
fx.add(foley('card-slide-2'), EV['envIn'] + .2, .55)
fx.add(foley('cloth2'), EV['envIn'] + .4, .25)
fx.add(foley('bookPlace1'), EV['envLand'] - .03, .5)
fx.add(snap(), EV['crack'], .7)
fx.add(foley('bookOpen'), EV['flap'] + .05, .35)
fx.add(foley('cards-pack-take-out-1'), EV['cardOut'] + .1, .6)
fx.add(foley('card-slide-5'), EV['envAway'], .4)
fx.add(whoosh(.9, 400, 2200), EV['cardCam'] + .1, .5)
fx.add(foley('card-place-2'), EV['cardSet'] - .05, .35)
fx.add(pen(.95), EV['invited'], .9, pan=-.1)
fx.add(foley('impactSoft_medium_001'), EV['lumera'] + .02, .2)
fx.add(foley('bookFlip2'), EV['flip'], .55)
fx.add(pen(.55), EV['bFriday'], .9)
fx.add(foley('impactSoft_heavy_002'), EV['stamp'], .7)
fx.add(foley('impactWood_light_001'), EV['stamp'] + .005, .3)
fx.add(foley('card-slide-7'), EV['cardAway'], .45)
fx.add(pen(.8), EV['head'] + .1, .6)
for i, lt in enumerate(EV['deal']):
    fx.add(foley(f'card-slide-{1 + i % 8}'), lt - .36, .35, pan=-.3 + .12 * i)
    fx.add(foley(f'card-place-{1 + i % 4}'), lt - .01, .55, pan=-.3 + .12 * i)
    fx.add(foley(f'card-fan-{1 + i % 2}'), lt + .08, .2, pan=-.3 + .12 * i)
fx.add(foley('card-shove-2'), EV['sweep'], .6)
fx.add(foley('card-slide-4'), EV['ticketIn'], .5)
fx.add(foley('card-place-3'), EV['ticketSet'] - .03, .5)
fx.add(foley('cards-pack-open-1'), STOP - .08, .85)
fx.add(foley('card-slide-6'), EV['endOut'], .35)
fx.add(foley('impactSoft_heavy_000'), END_IN, .8)
fx.add(pen(1.0), EV['see'], .9)

# ---------------------------------------------------------------- mix
send.x += music.x * .18 + drums.x * .05
wet = reverb(send.x)
mix = music.x * 1.0 + drums.x * .75 + fx.x * .9 + wet * .5
mix = signal.sosfilt(hp(30), mix, axis=0)
mix = mix / np.abs(mix).max() * 1.2
mix = np.tanh(mix) / np.tanh(1.2)
fi, fo = int(.25 * SR), int(.5 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]
mix[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo))[:, None] ** 2
mix *= 10 ** (-1 / 20) / np.abs(mix).max()
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
print(f'mix RMS {rms(mix):.1f} dBFS; music {rms(music.x):.1f}  drums {rms(drums.x):.1f}  foley {rms(fx.x):.1f}')
out = os.path.join(HERE, 'soundtrack.wav')
sf.write(out, mix, SR, subtype='PCM_24')
print('wrote', out)
if shutil.which('ffmpeg'):
    m4a = os.path.join(os.path.dirname(HERE), 'assets', 'audio', 'soundtrack.m4a')
    os.makedirs(os.path.dirname(m4a), exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-c:a', 'aac', '-b:a', '192k', m4a], check=True)
    print('wrote', m4a)
