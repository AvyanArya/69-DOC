"""Score, sound design and mix for the Lumera launch film.

The music is played on recorded instruments (Salamander grand piano, harp,
violin, cello and electric bass samples) and the interface sounds are
Kenney's recorded UI sounds; run fetch_samples.py once to download them.
Only the drums, air (whooshes, risers) and the explosion's low end are
synthesised.

  0 - 5.5s   cello ostinato and ticking piano build, violins swell into dissonance
  5.5s       everything stops dead; a reverse piano swell sucks into the point of light
  7 - 12s    soft strings and harp under the typing; a riser, then a beat of silence
  12s        the hit: sub boom, low piano cluster, full string stab, harp glissando
  12 - 28s   a bright 120 BPM keynote groove in D major, ducked under the narrator
  28s on     the band drops out and resolves on the end card

UI sounds land on frames exported by render.js into events.json.

    python build_soundtrack.py            -> soundtrack.wav (+ ../assets/audio/soundtrack.m4a)

Needs: numpy, scipy, soundfile.
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


NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    """'F#4', 'Fs4', 'Bb3' -> MIDI number."""
    m = re.fullmatch(r'([A-G])(#|s|b)?(-?\d)', name)
    acc = {'#': 1, 's': 1, 'b': -1}.get(m.group(2), 0)
    return 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + acc


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


# ---------------------------------------------------------------- recorded instruments
class Sampler:
    """Nearest recorded note, repitched by resampling, with a natural release."""

    def __init__(self, folder):
        self.notes = {}
        for f in glob.glob(os.path.join(HERE, 'samples', folder, '*.flac')):
            a, sr = sf.read(f)
            assert sr == SR
            on = max(0, int(np.argmax(np.abs(a) > .03 * np.abs(a).max())) - int(.002 * SR))
            a = a[on:]
            self.notes[midi(os.path.basename(f)[:-5])] = a / np.abs(a).max()
        if not self.notes:
            raise SystemExit(f'no samples for {folder}: run fetch_samples.py first')

    def __call__(self, name, dur, vel=1., release=.25, attack=0.):
        m = midi(name) if isinstance(name, str) else name
        base = min(self.notes, key=lambda k: abs(k - m))
        src = self.notes[base]
        ratio = 2 ** ((m - base) / 12)
        n = int((dur + release) * SR)
        pos = np.arange(n) * ratio
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


piano, harp, violin, cello, ebass = (Sampler(f) for f in ('piano', 'harp', 'violin', 'cello', 'bass-electric'))


def chord(inst, notes, dur, vel=1., spread=.5, strum=0., **kw):
    """Stereo chord, notes spread across the field, optionally strummed."""
    out = np.zeros((int((dur + kw.get('release', .25) + strum * len(notes) + .05) * SR), 2))
    for i, nm in enumerate(notes):
        y = inst(nm, dur, vel, **kw)
        pan = (i / max(1, len(notes) - 1) - .5) * 2 * spread
        a = (pan + 1) * np.pi / 4
        o = int(i * strum * SR)
        out[o:o + len(y), 0] += y * np.cos(a)
        out[o:o + len(y), 1] += y * np.sin(a)
    return out


def strings(notes, dur, vel=.5, attack=.4, release=.6):
    """Ensemble pad: cello under G3, violins above, each doubled a few cents apart."""
    out = np.zeros((int((dur + release + .1) * SR), 2))
    for i, nm in enumerate(notes):
        m = midi(nm)
        inst = cello if m < midi('G3') else violin
        for det, side, dl in ((-.06, 0, 0), (.06, 1, .012)):
            y = inst(m + det, dur, vel, release=release, attack=attack)
            o = int(dl * SR)
            pan = .25 + .5 * (i % 2)
            out[o:o + len(y), side] += y * (1 - pan * .5)
            out[o:o + len(y), 1 - side] += y * pan * .5
    return out * .45


def harp_gliss(notes, t0, dur, bus, vel=.5, pan=(-.5, .5)):
    for i, nm in enumerate(notes):
        p = i / max(1, len(notes) - 1)
        bus.add(harp(nm, 1.6, vel * (.7 + .3 * p), release=.8), t0 + dur * p ** 1.15, 1, pan=lerp(pan[0], pan[1], p))


def lerp(a, b, t):
    return a + (b - a) * t


UI = {os.path.basename(f)[:-5]: sf.read(f)[0] for f in glob.glob(os.path.join(HERE, 'samples', 'ui', '*.flac'))}


def ui(name, pitch=0.):
    a = UI[name]
    if pitch:
        r = 2 ** (pitch / 12)
        a = np.interp(np.arange(0, len(a) - 1, r), np.arange(len(a)), a)
    return a


# ---------------------------------------------------------------- synthesised parts
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
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * .4)) * np.minimum(1, t / .003) * .9


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
    return y * (np.linspace(0, 1, len(y)) ** 2.2)[:, None] * .45


def paper():
    """A page flicking past: crackly, band-limited noise."""
    d = .04 + R.random() * .1
    t = tt(d)
    crackle = (R.random(len(t)) < .08) * R.standard_normal(len(t)) * 3 + R.standard_normal(len(t)) * .4
    y = signal.sosfilt(bp(1400 + R.random() * 1600, 6500 + R.random() * 3500), crackle)
    return y * np.sin(np.pi * t / d) ** 2 * .16


def keyclick():
    a = ui(f'click_00{R.integers(1, 6)}', pitch=R.uniform(-3, 1))
    t = tt(.05)
    body = signal.sosfilt(lp(900), R.standard_normal(len(t))) * np.exp(-t / .008) * .6
    out = np.zeros(max(len(a), len(t)))
    out[:len(a)] += a * .7
    out[:len(t)] += body
    return out


def mouse_click():
    out = np.zeros(int(.15 * SR))
    a, b = ui('click_004'), ui('click_002', pitch=-2)
    out[:len(a)] += a
    out[int(.075 * SR):int(.075 * SR) + len(b)] += b * .55
    return out


def reverb(x, dur=2.8, decay=.65, tone=6500):
    t = tt(dur)
    ir = signal.sosfilt(lp(tone, 1), R.standard_normal((len(t), 2)), axis=0) * np.exp(-t / decay)[:, None]
    ir[:int(.018 * SR)] = 0
    for d, g in ((.007, .5), (.013, .35), (.021, .3)):       # a few early reflections
        ir[int(d * SR)] += g * np.array([1, .8])
    ir /= np.sqrt((ir ** 2).sum(0))
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in (0, 1)], 1)


# ---------------------------------------------------------------- buses
tension, music, drums, sfx, send = Bus(), Bus(), Bus(), Bus(), Bus()
kicks = []


def put_kick(t, punch=1., bus=None):
    (bus or drums).add(kick(punch), t, .9)
    kicks.append(t)


FREEZE, COLL, POP, BOOM = EV['freeze'], EV['collapse'], EV['pop'], EV['boom']
BLACK = EV['blackout']

# ---------------- 1. the clutter builds (0 - 5.55s)
t = .45
while t < FREEZE:               # marcato cello ostinato, tightening from quarters to 8ths
    step = .5 if t < 2.0 else .25
    g = .25 + .6 * (t / FREEZE) ** 1.3
    tension.add(cello('D2', step * .7, g, release=.08), t, 1, pan=-.25)
    if t > 1.5:
        tension.add(cello('A2', step * .7, g * .6, release=.08), t, 1, pan=.25)
    t += step
t = 1.0
while t < FREEZE:               # ticking piano: octave Ds in 8ths, then 16ths
    step = .25 if t < 3.5 else .125
    v = .12 + .5 * (t / FREEZE) ** 1.6
    tension.add(piano('D5' if int(t / step) % 2 else 'D4', step * .9, v, release=.1), t, 1, pan=.3 * np.sin(t * 3))
    t += step
tension.add(strings(['A4', 'Bb4', 'D5'], FREEZE - 2.2, .5, attack=2.6, release=.05), 2.2, 1)
tension.add(strings(['D3', 'A3'], FREEZE - 3.2, .45, attack=1.5, release=.05), 3.2, 1)
for k_t in [1.0, 2.0, 2.5, 3.0, 3.5, 4.0, 4.25, 4.5, 4.75, 5.0, 5.125, 5.25, 5.375, 5.5]:
    tension.add(signal.sosfilt(lp(160), kick(.6 + .5 * k_t / 5.5)), k_t, .9)
t = 1.5
while t < FREEZE:               # a quiet clock
    tension.add(ui('tick_002', pitch=-5), t, .06 + .14 * (t / FREEZE), pan=.4)
    t += .25
tension.add(riser(FREEZE - 2.4, 250, 7000), 2.4, .6)
tension.add(chord(piano, ['D1', 'A1', 'D2'], 1.4, .7, release=.6), EV['tooMuch'], .8)
tension.add(subdrop(1.4, 70, 32), EV['tooMuch'], .4)
# everything stops dead on the freeze; only the room keeps ringing
cut = int(FREEZE * SR)
tension.x[cut:cut + 240] *= np.linspace(1, 0, 240)[:, None]
tension.x[cut + 240:] = 0
send.x += tension.x * .3

t = .15                         # pages flicking past, denser as they multiply
while t < FREEZE:
    rate = 4 + 80 * (t / FREEZE) ** 2.4
    sfx.add(paper(), t, .6 + .5 * R.random(), pan=R.uniform(-.85, .85))
    t += R.exponential(1 / rate)
for i, wt in enumerate(EV['words']):
    big = i < 4
    sfx.add(whoosh(.42, 350, 2600), wt - .12, .7 if big else .35, pan=R.uniform(-.4, .4))
    if big:
        sfx.add(piano('D2', .5, .55, release=.4), wt, .6)

# ---------------- 2. collapse into the point (5.8 - 7.0s)
swell = chord(piano, ['D2', 'A2', 'D3', 'F#3', 'A3', 'E4'], 2.2, .8, spread=.6, release=.3)[::-1]
swell = swell[-int((POP - COLL + .05) * SR):]
sfx.add(swell * 1.4, COLL - .05)
rc = crash(.8)[::-1] * np.linspace(0, 1, int(.8 * SR))[:, None] ** 2
sfx.add(rc * 1.6, POP - .8)
sfx.add(sweep(POP - COLL, 6000, 300) * (np.linspace(0, 1, int((POP - COLL) * SR)) ** 2)[:, None] * .4, COLL)
ping = np.zeros(int(3.2 * SR))
for nm, v in (('D6', .8), ('A6', .45), ('D7', .3)):
    y = harp(nm, 2.5, v, release=.6)
    ping[:len(y)] += y
g = ui('glass_002')
ping[:len(g)] += g * .35
sfx.add(ping, POP, .5)
send.add(ping, POP, .8)
sfx.add(kick(.45), POP, .45)

# ---------------- 3. calm search bar (7.0 - 12.0s)
music.add(strings(['D3', 'A3', 'F#4', 'A4', 'E5'], 4.9, .4, attack=1.6, release=.3), 6.6, 1)
sfx.add(whoosh(.5, 900, 9000, .75), EV['line'] - .08, .5)
harp_gliss(['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6'], EV['line'] + .02, .32, sfx, .3)
sfx.add(ui('maximize_001'), EV['barOpen'], .3)
motif = ['D5', 'A5', 'F#5', 'E5', 'D5', 'A5', 'B5', 'A5', 'F#5', 'E5', 'D5', 'A5', 'E6', 'F#5']
for i, nm in enumerate(motif):
    y = harp(nm, 1.4, .55, release=.6)
    music.add(y, 7.5 + i * .3, .5, pan=-.35 if i % 2 else .35)
    send.add(y, 7.5 + i * .3, .15)
for kt in EV['type']:
    sfx.add(keyclick(), kt, .4 * (.8 + .4 * R.random()), pan=R.uniform(-.15, .15))
# the build into the explosion
THINK = EV['think']
music.add(riser(BLACK - THINK, 400, 9000), THINK, .75)
music.add(strings(['D5', 'A5', 'D6'], BLACK - THINK, .7, attack=BLACK - THINK, release=.02), THINK, 1)
roll = THINK + .1
while roll < BLACK - .03:
    p = (roll - THINK) / (BLACK - THINK)
    drums.add(snare(), roll, .12 + .5 * p ** 2, pan=.2 * np.sin(roll * 9))
    music.add(piano('D3', .1, .2 + .5 * p, release=.05), roll, .6)
    roll += .25 if p < .35 else .125 if p < .7 else .0625
rc = crash(1.0)[::-1] * np.linspace(0, 1, SR)[:, None] ** 2.5
sfx.add(rc * 1.6, BLACK - 1.0)

# ---------------- 4. the explosion
put_kick(BOOM, 2.0, sfx)
sfx.add(subdrop(2.8, 110, 26), BOOM, 1.0)
burst = signal.sosfilt(lp(1200), R.standard_normal(int(1.4 * SR))) * np.exp(-tt(1.4) / .28) * .6
sfx.add(burst, BOOM, 1.0)
crack = signal.sosfilt(hp(1500), R.standard_normal(int(.04 * SR))) * np.exp(-tt(.04) / .006)
sfx.add(np.tanh(crack * 3) * .5, BOOM)
sfx.add(crash(3.8), BOOM, 1.1)
sfx.add(chord(piano, ['D1', 'A1', 'D2', 'A2', 'D3'], 1.5, 1.0, spread=.4, release=.6), BOOM, .9)
sfx.add(strings(['D2', 'A2', 'D4', 'F#4', 'A4', 'D5'], .7, 1.0, attack=.01, release=.5), BOOM, 1.1)
harp_gliss(['D4', 'F#4', 'A4', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6', 'D7'], BOOM + .04, .6, sfx, .55, (-.7, .7))
send.add(sfx.x[int(BOOM * SR):int((BOOM + 1.0) * SR)] * .3, BOOM)
sfx.add(whoosh(1.1, 7000, 250, .12), BOOM, .8)

# ---------------- 5. the keynote groove (12.0 - 28.0s)
CH = {  # strings voicing, piano voicing, bass root, harp arpeggio
    'D': (['D3', 'A3', 'F#4', 'A4'], ['D4', 'F#4', 'A4', 'D5'], 'D2', ['D5', 'F#5', 'A5', 'D6', 'E6', 'A6']),
    'A': (['A2', 'E3', 'C#4', 'E4'], ['C#4', 'E4', 'A4', 'C#5'], 'A1', ['C#5', 'E5', 'A5', 'B5', 'C#6', 'E6']),
    'Bm': (['B2', 'F#3', 'D4', 'F#4'], ['D4', 'F#4', 'B4', 'D5'], 'B1', ['B4', 'D5', 'F#5', 'B5', 'C#6', 'F#6']),
    'G': (['G2', 'D3', 'B3', 'D4'], ['D4', 'G4', 'B4', 'D5'], 'G1', ['B4', 'D5', 'G5', 'A5', 'B5', 'D6']),
    'Em7': (['E3', 'B3', 'D4', 'G4'], ['E4', 'G4', 'B4', 'D5'], 'E2', ['E5', 'G5', 'B5', 'D6']),
    'Asus': (['A2', 'E3', 'D4', 'E4'], ['D4', 'E4', 'A4', 'D5'], 'A1', ['A5', 'D6', 'E6']),
}
FORMED = EV['formed']
progression = [(12, 'D'), (14, 'A'), (16, 'Bm'), (18, 'G'), (20, 'D'), (22, 'A'), (24, 'Bm'), (26, 'G')]
for b0, ch in progression:
    sv, pv, root, arp = CH[ch]
    music.add(strings(sv, 2.0, .38, attack=.35, release=.5), b0, 1)
    for off in (0, .75, 1.5):                       # 3-3-2 piano stabs
        if b0 == 12 and off == 0:
            continue
        music.add(chord(piano, pv, .55, .55, spread=.35, release=.25), b0 + off, .8)
    for e in range(8):                               # electric bass 8ths
        music.add(ebass(midi(root) + (12 if e in (3, 7) else 0), .2, .8, release=.05), b0 + e * .25, .55)
    if b0 >= 16:                                     # harp 16ths once the site is on screen
        for s in range(16):
            ts = b0 + s * .125
            if ts < FORMED:
                continue
            nm = arp[[0, 1, 2, 3, 4, 5, 4, 3][s % 8] % len(arp)]
            y = harp(nm, .5, .45, release=.5)
            music.add(y, ts, .32, pan=-.45 if s % 2 else .45)
            send.add(y, ts, .05)
    for bt in range(4):                              # drums
        tb = b0 + bt * BEAT
        if (b0 >= 16 or bt in (0, 2)) and not (b0 == 12 and bt == 0):
            put_kick(tb, .8)
        if b0 >= 14 and bt in (1, 3):
            drums.add(clap(), tb, .45)
            send.add(clap(), tb, .08)
        drums.add(hat(), tb + .25, .45, pan=.25)
        if b0 >= 16:
            for s in range(4):
                drums.add(shaker(), tb + s * .125, .5 + .25 * (s == 2), pan=-.3)
for i in range(8):                                   # fill into the outro
    drums.add(snare(), 27.5 + i * .0625, .2 + .06 * i)

# ---------------- 6. outro (28.0 - end)
music.add(strings(CH['Em7'][0], .55, .45, attack=.08, release=.4), 28.0, 1)
music.add(chord(piano, CH['Em7'][1], .5, .55, release=.3), 28.0, .8)
music.add(strings(CH['Asus'][0], .5, .45, attack=.08, release=.35), 28.5, 1)
music.add(chord(piano, CH['Asus'][1], .5, .55, release=.3), 28.5, .8)
music.add(ebass('E2', .45, .8), 28.0, .55)
music.add(ebass('A1', .45, .8), 28.5, .55)
END_CHORD = 29.0
music.add(chord(piano, ['D2', 'A2', 'D3', 'A3', 'E4', 'F#4', 'A4', 'D5'], 3.2, .75, spread=.6, strum=.012, release=1.4), END_CHORD, .8)
music.add(strings(['D3', 'A3', 'F#4', 'A4', 'E5'], DUR - END_CHORD - .6, .45, attack=.3, release=.8), END_CHORD, 1.1)
music.add(ebass('D2', 2.0, .8, release=.6), END_CHORD, .55)
put_kick(END_CHORD, 1.1, sfx)
sfx.add(crash(3.0), END_CHORD, .5)
harp_gliss(['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6', 'B6', 'D7'], EV['whoosh'][6] + .1, .75, sfx, .4)  # mark lifts off
sfx.add(harp('A6', 1.6, .6, release=.8), 29.35, .4)
sfx.add(ui('glass_001'), 29.35, .2)

# ---------------- UI sounds
for c in EV['clicks']:
    sfx.add(mouse_click(), c - .005, .75)
for h in EV['hovers']:
    sfx.add(ui('tick_004'), h, .25, pan=R.uniform(-.3, .3))
for i, h in enumerate(EV['hovers'][2:6]):            # the four world cards each get a harp note
    y = harp(['D6', 'F#6', 'A6', 'D7'][i], 1.0, .55, release=.6)
    sfx.add(y, h, .35, pan=-.45 + i * .3)
    send.add(y, h, .2)
for w in EV['whoosh']:
    sfx.add(whoosh(.5, 400, 3800), w - .15, .55)
sfx.add(ui('select_002'), EV['clicks'][1] + .04, .35)                 # Worlds
sfx.add(ui('maximize_004'), EV['clicks'][2] + .04, .4)                # Open the app
harp_gliss(['A4', 'D5', 'F#5', 'A5', 'D6'], EV['clicks'][2] + .1, .3, sfx, .35)
for i in range(3):                                                     # stat cards pop in
    sfx.add(ui('drop_002', pitch=3 * i), 24.0 + i * .12, .35, pan=.2 + .2 * i)
t = 24.1
while t < 25.2:                                                        # the score counting up
    sfx.add(ui('tick_002', pitch=2), t, .08 * (1 - (t - 24.1) / 1.3), pan=-.2)
    t += .085
harp_gliss(['B4', 'D5', 'F#5', 'A5', 'B5', 'D6', 'F#6'], 24.1, 1.0, sfx, .2, (-.3, .3))   # ring fills
sfx.add(ui('scroll_002'), EV['scroll'], .3)
for i in range(8):                                                     # breakdown bars fill
    sfx.add(ui('pluck_001', pitch=i), EV['scroll'] + .35 + i * .06, .22, pan=-.4 + i * .1)
sfx.add(ui('maximize_002'), 30.25, .35)                                # CTA appears
sfx.add(whoosh(.6, 2000, 11000, .5), 30.7, .2)                         # shine
CTA = EV['clicks'][-1]
sfx.add(ui('confirmation_002'), CTA + .03, .4)
pent = ['D6', 'E6', 'F#6', 'A6', 'B6', 'D7', 'E7']
for i in range(16):                                                    # confetti sparkle
    ts = CTA + .03 + R.exponential(.2)
    y = harp(pent[R.integers(len(pent))], .8, .4, release=.5)
    sfx.add(y, ts, .25, pan=R.uniform(-.8, .8))
    send.add(y, ts, .15)

# ---------------- voiceover
vo = Bus()
for ln in VO:
    a, sr = sf.read(os.path.join(HERE, 'vo', ln['id'] + '.wav'))
    assert sr == SR
    vo.add(a, ln['t'], 1.8)
    send.add(a, ln['t'], .08)


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


pump = np.ones(N)                                   # gentle sidechain from the kick
for kt in kicks:
    i = int(kt * SR)
    n = min(N - i, int(.3 * SR))
    if n > 0:
        pump[i:i + n] = np.minimum(pump[i:i + n], 1 - .22 * np.exp(-np.arange(n) / (.09 * SR)))
music.x *= pump[:, None]

venv = follower(vo.x)
duck = 1 - .69 * np.clip(venv / .2, 0, 1)            # about -10 dB under the narrator
MUSIC, TENSION = .36, .38
bed = (tension.x * TENSION + music.x * MUSIC + drums.x * .8) * duck[:, None]
fx = sfx.x * (1 - .45 * np.clip(venv / .2, 0, 1))[:, None]
send.x += (music.x * .07 + drums.x * .04)
wet = reverb(send.x)

# the silent beat before the explosion
gate = np.ones(N)
g0, g1 = int(BLACK * SR), int(BOOM * SR)
gate[g0 - 240:g0] = np.linspace(1, 0, 240)
gate[g0:g1] = 0
mix = (bed + fx + wet * .45) * gate[:, None] + vo.x
mix = signal.sosfilt(hp(28), mix, axis=0)

# master: gentle glue + soft clip, then normalise
mix = mix / np.abs(mix).max() * 1.25
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
             (('bed', bed + fx + wet * .45), ('music', music.x * MUSIC * duck[:, None]), ('drums', drums.x * duck[:, None]), ('sfx', fx), ('verb', wet * .45))}
    print(f"  {ln['id']} @ {ln['t']:5.2f}s  voice {v:6.1f} dB  margin {v - parts['bed']:5.1f} dB   " + '  '.join(f'{k} {x:6.1f}' for k, x in parts.items() if k != 'bed'))
out = os.path.join(HERE, 'soundtrack.wav')
sf.write(out, mix, SR, subtype='PCM_24')
print('wrote', out)
if shutil.which('ffmpeg'):
    m4a = os.path.join(os.path.dirname(HERE), 'assets', 'audio', 'soundtrack.m4a')
    os.makedirs(os.path.dirname(m4a), exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-c:a', 'aac', '-b:a', '192k', m4a], check=True)
    print('wrote', m4a)
