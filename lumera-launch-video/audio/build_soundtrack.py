"""Score, sound design and mix for the Lumera launch film.

Everything is synthesised here (no samples): a tense build over the clutter,
a tape-stop on the freeze, a glassy "ping" when it all collapses to a point,
a calm celesta bed under the typing, a riser and a silent beat before the
explosion, then a bright 120 BPM keynote groove in D major under the demo.
UI sounds (keys, clicks, hovers, whooshes, pops) are placed from events.json,
which render.js exports from the page so they land on the exact frames.

    python build_soundtrack.py            -> soundtrack.wav (+ soundtrack.m4a if ffmpeg exists)

Needs: numpy, scipy, soundfile.
"""
import json
import os
import shutil
import subprocess

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
EV = json.load(open(os.path.join(HERE, 'events.json')))
VO = json.load(open(os.path.join(HERE, 'vo_lines.json')))
DUR = EV['end']
N = int(DUR * SR)
R = np.random.default_rng(2024)
BEAT = .5                        # 120 BPM; the explosion (12.0s) lands on a downbeat


def tt(d):
    return np.arange(int(d * SR)) / SR


def bp(lo, hi, order=2):
    return signal.butter(order, [lo, min(hi, SR / 2 * .95)], 'bandpass', fs=SR, output='sos')


def lp(f, order=2):
    return signal.butter(order, f, 'lowpass', fs=SR, output='sos')


def hp(f, order=2):
    return signal.butter(order, f, 'highpass', fs=SR, output='sos')


NOTE = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'Bb': 10, 'B': 11}


def hz(name):
    """'F#4' -> frequency."""
    return 440 * 2 ** ((12 * (int(name[-1]) + 1) + NOTE[name[:-1]] - 69) / 12)


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


# ---------------------------------------------------------------- instruments
def bell(f, dur=1.8, bright=1.):
    """FM celesta / bell."""
    t = tt(dur)
    I = (2.0 * np.exp(-t / .16) + .2) * bright
    y = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * 3.5 * t))
    y += .3 * np.sin(2 * np.pi * f * 2 * t + .5 * I * np.sin(2 * np.pi * f * 7 * t)) * np.exp(-t / .22)
    return y * np.minimum(1, t / .002) * np.exp(-t / (dur * .3)) * .45


def keys(f, dur=1.4, tau=.7, bright=1.):
    """Bright piano-ish pluck: decaying partials plus a little hammer."""
    t = tt(dur)
    y = np.zeros_like(t)
    for k in range(1, 16):
        fk = k * f * (1 + .00035 * k * k)
        if fk > 15000:
            break
        amp = 1 / k ** 1.2 * (bright if k > 2 else 1)
        y += amp * np.sin(2 * np.pi * fk * t + R.random() * 6.28) * np.exp(-t / (tau / (1 + .5 * (k - 1))))
    y *= np.minimum(1, t / .002)
    y += signal.sosfilt(lp(3500), R.standard_normal(len(t)) * np.exp(-t / .004)) * .12
    r = int(.06 * SR)
    y[-r:] *= np.linspace(1, 0, r)
    return y * .3


def pad(freqs, dur, cutoff=2400, attack=.7, release=1.0, det=.1, level=1.):
    """Warm detuned-saw pad, stereo."""
    t = tt(dur)
    out = np.zeros((len(t), 2))
    for f in freqs:
        for ch, sgn in ((0, -1), (1, 1)):
            for dv in (-det, 0, det):
                ff = f * 2 ** ((dv * sgn + .025 * sgn) / 12)
                ph = R.random() * 6.28
                for k in range(1, int(min(36, 9000 / ff)) + 1):
                    out[:, ch] += np.sin(2 * np.pi * ff * k * t + ph * k) / k
    out = signal.sosfilt(lp(cutoff), out, axis=0)
    e = np.minimum(1, t / attack)
    r = min(len(t), int(release * SR))
    e[-r:] *= np.linspace(1, 0, r) ** 1.5
    return out * e[:, None] * (.035 / len(freqs)) * level


def bass(f, dur):
    t = tt(dur)
    y = np.sin(2 * np.pi * f * t) + .35 * np.sin(4 * np.pi * f * t) + .15 * np.sin(6 * np.pi * f * t)
    e = np.minimum(1, t / .004) * (.6 + .4 * np.exp(-t / .07))
    r = int(.03 * SR)
    e[-r:] *= np.linspace(1, 0, r)
    return y * e * .32


def kick(punch=1.):
    t = tt(.5)
    f = 45 + 100 * np.exp(-t / .032)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .26)
    y += signal.sosfilt(hp(2000), R.standard_normal(len(t))) * np.exp(-t / .0015) * .25
    return y * .75 * punch


def clap():
    t = tt(.4)
    e = np.zeros_like(t)
    for d in (0, .009, .019, .03):
        e += np.where(t >= d, np.exp(-np.clip(t - d, 0, None) / .006), 0)
    e += np.where(t > .03, .55 * np.exp(-(t - .03) / .1), 0)
    return signal.sosfilt(bp(950, 3400), R.standard_normal(len(t)) * e) * .75


def snare():
    t = tt(.25)
    y = signal.sosfilt(bp(1200, 7000), R.standard_normal(len(t))) * np.exp(-t / .06)
    y += np.sin(2 * np.pi * 190 * t) * np.exp(-t / .04) * .5
    return y * .4


def hat(open_=False):
    t = tt(.35 if open_ else .08)
    return signal.sosfilt(hp(7500, 3), R.standard_normal(len(t))) * np.exp(-t / (.1 if open_ else .016)) * .22


def shaker():
    t = tt(.09)
    return signal.sosfilt(bp(4500, 11000), R.standard_normal(len(t))) * np.minimum(1, t / .01) * np.exp(-t / .03) * .12


def crash(dur=2.8):
    t = tt(dur)
    nz = R.standard_normal((len(t), 2))
    y = signal.sosfilt(hp(4200), nz, axis=0) + .35 * signal.sosfilt(bp(2800, 6500), nz[:, ::-1], axis=0)
    return y * (np.exp(-t / .95) * np.minimum(1, t / .002))[:, None] * .2


def subdrop(dur=1.9, f0=95, f1=30):
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t / .35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .75) * np.minimum(1, t / .003) * .9


def sweep(dur, f0, f1, q=2.2):
    """Stereo noise through a band-pass whose centre glides f0 -> f1."""
    n = int(dur * SR)
    nz = R.standard_normal((n, 2))
    out = np.zeros_like(nz)
    zi = None
    for i in range(0, n, 256):
        fc = f0 * (f1 / f0) ** (i / n)
        sos = bp(fc / (1 + 1 / (2 * q)), fc * (1 + 1 / (2 * q)))
        if zi is None:
            zi = np.zeros((sos.shape[0], 2, 2))
        out[i:i + 256], zi = signal.sosfilt(sos, nz[i:i + 256], axis=0, zi=zi)
    return out


def whoosh(dur=.45, f0=500, f1=3500, peak=.6):
    y = sweep(dur, f0, f1)
    t = np.linspace(0, 1, len(y))
    e = np.where(t < peak, np.sin(np.pi / 2 * t / peak) ** 2, np.cos(np.pi / 2 * (t - peak) / (1 - peak)) ** 2)
    pan = np.linspace(-.6, .6, len(y))
    y[:, 0] *= e * np.sqrt(1 - pan) * .9
    y[:, 1] *= e * np.sqrt(1 + pan) * .9
    return y * .35


def riser(dur, f0=300, f1=8000):
    y = sweep(dur, f0, f1, q=1.6)
    e = np.linspace(0, 1, len(y)) ** 2.2
    t = tt(dur)
    g = 120 * (1600 / 120) ** (t / dur)
    s = np.sin(2 * np.pi * np.cumsum(g) / SR) * e * .18
    return y * e[:, None] * .45 + s[:, None]


def click():
    def tr(g):
        t = tt(.03)
        y = signal.sosfilt(bp(1800, 6000), R.standard_normal(len(t))) * np.exp(-t / .0022)
        return (y + .5 * np.sin(2 * np.pi * 2300 * t) * np.exp(-t / .004)) * g
    out = np.zeros(int(.13 * SR))
    a, b = tr(.55), tr(.32)
    out[:len(a)] += a
    out[int(.07 * SR):int(.07 * SR) + len(b)] += b
    return out


def keyclick(deep=False):
    t = tt(.06)
    y = signal.sosfilt(bp(2400, 7500), R.standard_normal(len(t))) * np.exp(-t / .0028) * .45
    f = (165 if deep else 250) * (1 + .08 * R.standard_normal())
    return y + np.sin(2 * np.pi * f * t) * np.exp(-t / .011) * .38


def tick(f=2600):
    t = tt(.08)
    return np.sin(2 * np.pi * f * t) * np.exp(-t / .014) * np.minimum(1, t / .001) * .22


def pop(f0=380, f1=900, dur=.14):
    t = tt(dur)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / .02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .045) * np.minimum(1, t / .002) * .4


def paper():
    d = .03 + R.random() * .09
    t = tt(d)
    y = signal.sosfilt(bp(1000 + R.random() * 1800, 5500 + R.random() * 4000), R.standard_normal(len(t)))
    am = .55 + .45 * np.sin(2 * np.pi * (20 + R.random() * 45) * t + R.random() * 6)
    return y * am * np.sin(np.pi * t / d) ** 2 * .2


def reverb(x, dur=2.6, decay=.62, tone=6000):
    t = tt(dur)
    ir = signal.sosfilt(lp(tone, 1), R.standard_normal((len(t), 2)), axis=0) * np.exp(-t / decay)[:, None]
    ir[:int(.015 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(0))
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in (0, 1)], 1)


def tape_stop(x, t0, dur):
    i0, n = int(t0 * SR), int(dur * SR)
    pos = i0 + np.cumsum(np.cos(np.linspace(0, np.pi / 2, n)) ** 1.6)
    for c in (0, 1):
        x[i0:i0 + n, c] = np.interp(pos, np.arange(len(x)), x[:, c])
    x[i0:i0 + n] *= np.linspace(1, 0, n)[:, None] ** .5
    x[i0 + n:] = 0


# ---------------------------------------------------------------- buses
tension, music, drums, sfx, send = Bus(), Bus(), Bus(), Bus(), Bus()
kicks = []


def put_kick(t, punch=1., bus=None):
    (bus or drums).add(kick(punch), t, .9)
    kicks.append((t, punch))


# ---------------- 1. the clutter builds (0 - 5.55s)
FREEZE, COLL, POP = EV['freeze'], EV['collapse'], EV['pop']
dark = pad([hz('D2'), hz('A2')], 6.2, cutoff=380, attack=1.2, release=.4, level=1.3)
bright = pad([hz('D2'), hz('A2'), hz('D3')], 6.2, cutoff=2600, attack=4.5, release=.4, level=.9)
tension.add(dark, 0, 1)
tension.add(bright * (np.linspace(0, 1, len(bright)) ** 2)[:, None], 0, 1)
clus = pad([hz('Eb3'), hz('Bb2'), hz('E4')], 3.2, cutoff=1800, attack=2.6, release=.3)
tension.add(clus, 2.4, .9)
t = .5
while t < FREEZE:               # anxious pulse: 8ths, then 16ths
    step = .25 if t < 3.5 else .125
    g = .2 + .7 * (t / FREEZE) ** 1.5
    tension.add(keys(hz('D2') if int(t / step) % 2 == 0 else hz('D3'), .3, tau=.11), t, g)
    t += step
t = 1.5
while t < FREEZE:
    tension.add(hat(), t, .05 + .35 * (t / FREEZE) ** 2, pan=.3 * np.sin(t * 7))
    t += .125
for k_t in [1.0, 2.0, 2.5, 3.0, 3.5, 4.0, 4.25, 4.5, 4.75, 5.0, 5.125, 5.25, 5.375, 5.5]:
    tension.add(kick(.6 + .5 * k_t / 5.5), k_t, .8)
tension.add(riser(FREEZE - 2.4, 250, 7000), 2.4, .8)
tension.add(subdrop(1.4, 70, 32), EV['tooMuch'], .55)
tape_stop(tension.x, FREEZE - .06, .24)
send.x += tension.x * .25         # the build's reverb keeps ringing into the freeze

# paper flutter, denser as the pages multiply
t = .15
while t < FREEZE:
    rate = 4 + 85 * (t / FREEZE) ** 2.4
    sfx.add(paper(), t, .55 + .5 * R.random(), pan=R.uniform(-.85, .85))
    t += R.exponential(1 / rate)
for i, wt in enumerate(EV['words']):
    big = i < 4
    sfx.add(whoosh(.42, 350, 2600), wt - .12, .75 if big else .4, pan=R.uniform(-.4, .4))
    if big:
        sfx.add(kick(.45), wt, .5)

# ---------------- 2. freeze, collapse, the point (5.55 - 7.0s)
t = tt(.9)
sfx.add(np.sin(2 * np.pi * 3150 * t) * np.sin(np.pi * t / .9) ** 2 * .02, FREEZE + .05)
rc = crash(.8)[::-1] * np.linspace(0, 1, int(.8 * SR))[:, None] ** 2
sfx.add(rc * 2.2, POP - .8)
t = tt(POP - COLL)
g = 90 * (1100 / 90) ** (t / t[-1])
suck = np.sin(2 * np.pi * np.cumsum(g) / SR) * (t / t[-1]) ** 2.5 * .22
sfx.add(suck, COLL)
sfx.add(sweep(POP - COLL, 6000, 300) * (np.linspace(0, 1, int((POP - COLL) * SR)) ** 2)[:, None] * .5, COLL)
ping = bell(hz('D6'), 3.2, .8) + .5 * bell(hz('A6'), 3.2, .6) + .25 * bell(hz('D7'), 3.2, .5)
sfx.add(ping, POP, .55)
send.add(ping, POP, .7)
sfx.add(kick(.5), POP, .5)

# ---------------- 3. calm search bar (7.0 - 12.0s)
calm = pad([hz('D3'), hz('A3'), hz('E4'), hz('F#4')], 5.4, cutoff=1900, attack=1.6, release=.3, level=2.0)
music.add(calm, 6.6, 1)
sfx.add(whoosh(.5, 900, 9000, .75), EV['line'] - .08, .55)
sfx.add(bell(hz('A6'), 1.4, .5), EV['line'] + .2, .12)
sfx.add(pop(260, 640, .18), EV['barOpen'], .55)
motif = ['D5', 'A5', 'F#5', 'E5', 'D5', 'A5', 'B5', 'A5', 'F#5', 'E5', 'D5', 'A5', 'E6', 'F#5']
for i, nm in enumerate(motif):
    b = bell(hz(nm), 1.6, .7)
    music.add(b, 7.5 + i * BEAT * .6, .19, pan=-.35 if i % 2 else .35)
    send.add(b, 7.5 + i * BEAT * .6, .12)
for i, kt in enumerate(EV['type']):
    sfx.add(keyclick(), kt, .45 * (.8 + .4 * R.random()), pan=R.uniform(-.15, .15))
# riser into the boom, then a beat of silence
BOOM = EV['boom']
THINK = EV['think']
music.add(riser(BOOM - .05 - THINK, 400, 9000), THINK, .8)
roll = THINK + .1
while roll < BOOM - .06:
    p = (roll - THINK) / (BOOM - THINK)
    drums.add(snare(), roll, .12 + .5 * p ** 2, pan=.2 * np.sin(roll * 9))
    roll += .25 if p < .35 else .125 if p < .7 else .0625
rc = crash(1.0)[::-1] * np.linspace(0, 1, SR)[:, None] ** 2.5
sfx.add(rc * 1.8, BOOM - 1.05)
brightcalm = pad([hz('D3'), hz('A3'), hz('E4'), hz('F#4'), hz('A4')], BOOM - THINK, cutoff=5200, attack=.9, release=.05)
music.add(brightcalm, THINK, 1)

# ---------------- 4. BOOM + the keynote groove (12.0 - 28.0s)
put_kick(BOOM, 1.7, sfx)
sfx.add(subdrop(), BOOM, .9)
sfx.add(crash(3.2), BOOM, 1.4)
burst = signal.sosfilt(lp(1400), R.standard_normal(int(.7 * SR))) * np.exp(-tt(.7) / .18) * .5
sfx.add(burst, BOOM, .8)
for i, nm in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4', 'D5']):
    music.add(keys(hz(nm), 2.6, tau=1.4, bright=1.2), BOOM, .35)
for i, nm in enumerate(['D6', 'F#6', 'A6', 'D7']):
    b = bell(hz(nm), 2.2, .9)
    sfx.add(b, BOOM + .05 + i * .07, .16, pan=-.5 + i * .33)
    send.add(b, BOOM + .05 + i * .07, .2)

CH = {  # pad voicing, stab voicing, bass root, arp tones
    'D': (['D3', 'F#3', 'A3', 'E4'], ['F#4', 'A4', 'D5'], 'D2', ['D5', 'F#5', 'A5', 'D6', 'E6', 'A6']),
    'A': (['C#3', 'E3', 'A3', 'B3'], ['E4', 'A4', 'C#5'], 'A1', ['C#5', 'E5', 'A5', 'B5', 'C#6', 'E6']),
    'Bm': (['D3', 'F#3', 'B3', 'C#4'], ['F#4', 'B4', 'D5'], 'B1', ['B4', 'D5', 'F#5', 'B5', 'C#6', 'F#6']),
    'G': (['D3', 'G3', 'B3', 'A3'], ['G4', 'B4', 'D5'], 'G1', ['B4', 'D5', 'G5', 'A5', 'B5', 'D6']),
    'Em7': (['E3', 'G3', 'B3', 'D4'], ['G4', 'B4', 'D5'], 'E2', ['E5', 'G5', 'B5', 'D6']),
    'Asus': (['D3', 'E3', 'A3', 'B3'], ['E4', 'A4', 'D5'], 'A1', ['A5', 'D6', 'E6']),
}
FORMED = EV['formed']
prog = [(12, 'D'), (14, 'A'), (16, 'Bm'), (18, 'G'), (20, 'D'), (22, 'A'), (24, 'Bm'), (26, 'G')]
for b0, ch in prog:
    pv, sv, root, arp = CH[ch]
    music.add(pad([hz(n) for n in pv], 2.5, cutoff=2600, attack=.25, release=.6), b0, 1.0)
    for off in (0, .75, 1.5):                       # 3-3-2 stabs
        if b0 == 12 and off == 0:
            continue
        for nm in sv:
            music.add(keys(hz(nm), .9, tau=.32, bright=1.1), b0 + off, .32, pan=.15)
    for e in range(8):                               # bass 8ths
        f = hz(root) * (2 if e in (2, 6) else 1)
        music.add(bass(f, .23), b0 + e * .25, .85)
    if b0 >= 16:                                     # sparkling 16th arp once the site is on screen
        for s in range(16):
            ts = b0 + s * .125
            if ts < FORMED:
                continue
            nm = arp[[0, 1, 2, 3, 4, 5, 4, 3][s % 8] % len(arp)]
            b = bell(hz(nm), .7, .6)
            music.add(b, ts, .065, pan=-.45 if s % 2 else .45)
            send.add(b, ts, .05)
    for bt in range(4):                              # drums
        tb = b0 + bt * BEAT
        if b0 >= 16 or bt in (0, 2):
            if not (b0 == 12 and bt == 0):
                put_kick(tb, .85)
        if b0 >= 14 and bt in (1, 3):
            drums.add(clap(), tb, .55)
            send.add(clap(), tb, .25)
        if b0 >= 12.5 or bt > 0:
            drums.add(hat(), tb + .25, .5, pan=.25)
        if b0 >= 16:
            for s in range(4):
                drums.add(shaker(), tb + s * .125, .55 + .25 * (s == 2), pan=-.3)
# drum fill into the outro, then the band drops out
for i in range(8):
    drums.add(snare(), 27.5 + i * .0625, .2 + .06 * i)

# ---------------- 5. outro (28.0 - end)
music.add(pad([hz(n) for n in CH['Em7'][0]], 1.2, cutoff=2600, attack=.15, release=.5), 28.0, 1)
for nm in CH['Em7'][1]:
    music.add(keys(hz(nm), 1.0, tau=.5), 28.0, .32)
music.add(pad([hz(n) for n in CH['Asus'][0]], 1.1, cutoff=3000, attack=.2, release=.4), 28.5, 1)
music.add(bass(hz('E2'), .5), 28.0, .8)
music.add(bass(hz('A1'), .5), 28.5, .8)
END_CHORD = 29.0
for nm in ['D3', 'A3', 'E4', 'F#4', 'A4', 'D5']:
    music.add(keys(hz(nm), 3.4, tau=1.8, bright=1.1), END_CHORD, .3)
music.add(pad([hz(n) for n in ['D3', 'A3', 'E4', 'F#4', 'A4']], DUR - END_CHORD, cutoff=3400, attack=.4, release=1.6, level=1.3), END_CHORD, 1)
music.add(bass(hz('D2'), 2.4), END_CHORD, .7)
put_kick(END_CHORD, 1.1, sfx)
sfx.add(crash(3.0), END_CHORD, .55)
for i, nm in enumerate(['D6', 'A6', 'F#6', 'D7', 'E7']):
    b = bell(hz(nm), 2.4, .8)
    music.add(b, END_CHORD + .08 + i * .11, .12, pan=-.5 + i * .25)
    send.add(b, END_CHORD + .08 + i * .11, .18)
# the mark lifting off the app: a rising glissando
for i, nm in enumerate(['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6', 'D7']):
    b = bell(hz(nm), .9, .5)
    sfx.add(b, EV['whoosh'][6] + .1 + i * .07, .1, pan=-.6 + i * .13)
    send.add(b, EV['whoosh'][6] + .1 + i * .07, .1)
sfx.add(bell(hz('A6'), 2.4, .7), 29.35, .2)

# ---------------- UI sounds
for c in EV['clicks']:
    sfx.add(click(), c - .005, .8)
for h in EV['hovers']:
    sfx.add(tick(2400 + 600 * R.random()), h, .55, pan=R.uniform(-.3, .3))
card_notes = ['D6', 'F#6', 'A6', 'D7']
for i, h in enumerate(EV['hovers'][2:6]):           # the four world cards
    b = bell(hz(card_notes[i]), 1.0, .6)
    sfx.add(b, h, .12, pan=-.45 + i * .3)
    send.add(b, h, .1)
for w in EV['whoosh']:
    sfx.add(whoosh(.5, 400, 3800), w - .15, .6)
sfx.add(pop(420, 960), EV['clicks'][1] + .05, .35)                     # Worlds
sfx.add(pop(330, 820), EV['clicks'][2] + .05, .45)                     # Open the app
for i in range(3):                                                     # stat cards pop in
    sfx.add(pop(500 + 120 * i, 1100 + 150 * i, .12), 24.0 + i * .12, .35, pan=.2 + .2 * i)
t = 24.05
while t < 25.3:                                                        # count-up ticks
    sfx.add(tick(3200), t, .18 * (1 - (t - 24.05) / 1.4), pan=-.2)
    t += .045
tr = tt(1.2)
sfx.add(np.sin(2 * np.pi * np.cumsum(380 * (2.2 ** (tr / 1.2))) / SR) * np.sin(np.pi * tr / 1.2) ** 2 * .05, 24.05)
for i in range(8):                                                     # breakdown bars fill
    sfx.add(pop(600 + 50 * i, 1300 + 60 * i, .1), EV['scroll'] + .35 + i * .06, .22, pan=-.4 + i * .1)
sfx.add(pop(300, 700), 30.25, .45)                                     # CTA appears
sfx.add(whoosh(.6, 2000, 11000, .5), 30.7, .25)                        # shine
CTA = EV['clicks'][-1]
pent = ['D6', 'E6', 'F#6', 'A6', 'B6', 'D7', 'E7', 'F#7']
for i in range(26):                                                    # confetti sparkle
    ts = CTA + .02 + R.exponential(.18)
    b = bell(hz(pent[R.integers(len(pent))]), .8, .7)
    sfx.add(b, ts, .07, pan=R.uniform(-.8, .8))
    send.add(b, ts, .06)
for i, nm in enumerate(['D6', 'F#6', 'A6', 'D7']):
    sfx.add(bell(hz(nm), 1.6, .8), CTA + .04 + i * .06, .12, pan=-.3 + i * .2)

# ---------------- voiceover
vo = Bus()
for ln in VO:
    a, sr = sf.read(os.path.join(HERE, 'vo', ln['id'] + '.wav'))
    assert sr == SR
    vo.add(a, ln['t'], 1.8)
    send.add(a, ln['t'], .1)

# ---------------- mix
def follower(x, att=.02, rel=.35):
    e = np.abs(x).max(1)
    win = int(.01 * SR)
    e = np.convolve(e, np.ones(win) / win, 'same')
    out = np.empty_like(e)
    a, r, v = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)), 0.
    blk = 64                                   # block-wise follower: fast enough, smooth enough
    for i in range(0, len(e), blk):
        s = e[i:i + blk].max()
        v = a * v + (1 - a) * s if s > v else r * v + (1 - r) * s
        out[i:i + blk] = v
    return out


pump = np.ones(N)                                   # sidechain from the kick
for kt, p in kicks:
    i = int(kt * SR)
    n = min(N - i, int(.3 * SR))
    if n > 0:
        pump[i:i + n] = np.minimum(pump[i:i + n], 1 - .32 * np.exp(-np.arange(n) / (.09 * SR)))
music.x *= pump[:, None]

venv = follower(vo.x)
duck = 1 - .69 * np.clip(venv / .2, 0, 1)            # about -10 dB under the narrator
bed = (tension.x * .9 + music.x * 1.25 + drums.x * 1.0) * duck[:, None]
fx = sfx.x * (1 - .45 * np.clip(venv / .2, 0, 1))[:, None]
send.x += (music.x * .12 + drums.x * .05)
wet = reverb(send.x)

# the silent beat before the explosion
gate = np.ones(N)
g0, g1 = int((BOOM - .05) * SR), int(BOOM * SR)
gate[g0 - 120:g0] = np.linspace(1, 0, 120)
gate[g0:g1] = 0
mix = (bed + fx) * gate[:, None] + wet * .4 * gate[:, None] + vo.x
mix = signal.sosfilt(hp(28), mix, axis=0)

# master: gentle glue + soft clip, then normalise
peak = np.abs(mix).max()
mix = mix / peak * 1.25
mix = np.tanh(mix) / np.tanh(1.25)
fade = int(.35 * SR)
mix[-fade:] *= np.cos(np.linspace(0, np.pi / 2, fade))[:, None] ** 2
mix *= 10 ** (-1 / 20) / np.abs(mix).max()


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)


print(f'mix RMS {rms_db(mix):.1f} dBFS, peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS')
# balance check in the speech band (bass energy masks a voice far less than its RMS suggests)
SPEECH = bp(250, 6000)
for ln in VO:
    a = int(ln['t'] * SR)
    b = a + int(len(sf.read(os.path.join(HERE, 'vo', ln['id'] + '.wav'))[0]))
    v = rms_db(signal.sosfilt(SPEECH, vo.x[a:b], axis=0))
    parts = {k: rms_db(signal.sosfilt(SPEECH, x[a:b], axis=0)) for k, x in
             (('bed', bed + fx + wet * .4), ('music', music.x * duck[:, None]), ('drums', drums.x * duck[:, None]), ('sfx', fx), ('verb', wet * .4))}
    print(f"  {ln['id']} @ {ln['t']:5.2f}s  voice {v:6.1f} dB  margin {v - parts['bed']:5.1f} dB   " + '  '.join(f'{k} {x:6.1f}' for k, x in parts.items() if k != 'bed'))
out = os.path.join(HERE, 'soundtrack.wav')
sf.write(out, mix, SR, subtype='PCM_24')
print('wrote', out)
if shutil.which('ffmpeg'):
    m4a = os.path.join(os.path.dirname(HERE), 'assets', 'audio', 'soundtrack.m4a')
    os.makedirs(os.path.dirname(m4a), exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-c:a', 'aac', '-b:a', '192k', m4a], check=True)
    print('wrote', m4a)
