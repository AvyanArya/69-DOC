"""Music, sound design and voiceover mix for the Lumera launch event reel.

An upbeat house groove (about 124 BPM, A minor / C major) on recorded piano and
bass with synthesised drums. The tempo is set so a bar line lands exactly on
the spoken word "live": the beat drops out for a build under "then at 7:25"
and comes back in on "we go LIVE". All timings come from the page
(events.json), which takes them from the voiceover (timing.py). Every big word gets a hit, every sticker a
pop (Kenney UI sounds, CC0), every scene cut a whoosh. The narration sits on
top and the music ducks under it.

    node ../render.js --events-only && python build_soundtrack.py   -> soundtrack.wav (+ ../assets/audio/soundtrack.m4a)
Run fetch_samples.py once first.
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
Wd, SC, CUE = EV['W'], EV['SC'], EV['cue']
DUR = EV['end']
N = int(DUR * SR)
R = np.random.default_rng(77)
DROP = Wd['live']
DROPBAR = int(round(DROP / (4 * 60 / 124)))     # whole bars from the top to "live", as near 124 BPM as they fit
BEAT = DROP / (4 * DROPBAR)
BAR = BEAT * 4


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
    def __init__(self, folder):
        self.notes = {}
        for f in glob.glob(os.path.join(HERE, 'samples', folder, '*.flac')):
            a, sr = sf.read(f)
            on = max(0, int(np.argmax(np.abs(a) > .03 * np.abs(a).max())) - int(.002 * SR))
            self.notes[midi(os.path.basename(f)[:-5])] = a[on:] / np.abs(a).max()
        if not self.notes:
            raise SystemExit(f'no samples for {folder}: run fetch_samples.py first')

    def __call__(self, name, dur, vel=1., release=.2):
        m = midi(name) if isinstance(name, str) else name
        base = min(self.notes, key=lambda k: abs(k - m))
        src = self.notes[base]
        pos = np.arange(int((dur + release) * SR)) * 2 ** ((m - base) / 12)
        pos = pos[pos < len(src) - 1]
        y = np.interp(pos, np.arange(len(src)), src)
        k = int(dur * SR)
        if k < len(y):
            y[k:] *= np.cos(np.linspace(0, np.pi / 2, len(y) - k)) ** 2
        return y * vel


piano, bass, harp = Sampler('piano'), Sampler('bass-electric'), Sampler('harp')
UI = {os.path.basename(f)[:-5]: sf.read(f)[0] for f in glob.glob(os.path.join(HERE, 'samples', 'ui', '*.flac'))}
FOLEY = {os.path.basename(f)[:-5]: sf.read(f)[0] for f in glob.glob(os.path.join(HERE, 'samples', 'foley', '*.flac'))}


def ui(name, pitch=0.):
    a = UI[name] / np.abs(UI[name]).max()
    if pitch:
        a = np.interp(np.arange(0, len(a) - 1, 2 ** (pitch / 12)), np.arange(len(a)), a)
    return a


def chord(notes, dur, vel, spread=.6, release=.15):
    out = np.zeros((int((dur + release + .05) * SR), 2))
    for i, nm in enumerate(notes):
        y = piano(nm, dur, vel * (.9 + .1 * R.random()), release)
        pan = (i / max(1, len(notes) - 1) - .5) * spread
        a = (pan + 1) * np.pi / 4
        out[:len(y), 0] += y * np.cos(a)
        out[:len(y), 1] += y * np.sin(a)
    return out


# ---------------------------------------------------------------- drums and design (synthesised)
def kick(p=1.):
    t = tt(.45)
    f = 48 + 110 * np.exp(-t / .03)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .22)
    y += signal.sosfilt(hp(2500), R.standard_normal(len(t))) * np.exp(-t / .0015) * .3
    return np.tanh(y * 1.4 * p) * .8


def clap():
    t = tt(.35)
    e = np.zeros_like(t)
    for d in (0, .008, .017, .027):
        e += np.where(t >= d, np.exp(-np.clip(t - d, 0, None) / .006), 0)
    e += np.where(t > .027, .5 * np.exp(-(t - .027) / .09), 0)
    return signal.sosfilt(bp(1000, 3800), R.standard_normal(len(t)) * e) * .8


def hat(open_=False):
    t = tt(.3 if open_ else .06)
    return signal.sosfilt(hp(8000, 3), R.standard_normal(len(t))) * np.exp(-t / (.08 if open_ else .014)) * .25


def snare():
    t = tt(.2)
    return (signal.sosfilt(bp(1500, 8000), R.standard_normal(len(t))) * np.exp(-t / .05) + np.sin(2 * np.pi * 200 * t) * np.exp(-t / .035) * .5) * .4


def crash(dur=2.4):
    t = tt(dur)
    nz = R.standard_normal((len(t), 2))
    y = signal.sosfilt(hp(4500), nz, axis=0) + .3 * signal.sosfilt(bp(3000, 7000), nz[:, ::-1], axis=0)
    return y * (np.exp(-t / .8) * np.minimum(1, t / .002))[:, None] * .22


def sub(dur=.9, f0=90, f1=40):
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t / .12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * .4)) * .8


def sweep(dur, f0, f1, q=2.):
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


def whoosh(dur=.35, f0=600, f1=5000):
    y = sweep(dur, f0, f1)
    t = np.linspace(0, 1, len(y))
    return y * (np.sin(np.pi * t) ** 2)[:, None] * .4


def hit(k=1.):
    """A word landing: short low thump plus a bit of snap."""
    t = tt(.3)
    y = np.sin(2 * np.pi * np.cumsum(70 + 80 * np.exp(-t / .02)) / SR) * np.exp(-t / .09) * .7
    y += signal.sosfilt(bp(1500, 6000), R.standard_normal(len(t))) * np.exp(-t / .01) * .3
    return y * k


def reverb(x, dur=1.8, decay=.4):
    t = tt(dur)
    ir = signal.sosfilt(lp(7000, 1), R.standard_normal((len(t), 2)), axis=0) * np.exp(-t / decay)[:, None]
    ir[:int(.01 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(0))
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in (0, 1)], 1)


music, drums, fx, send = Bus(), Bus(), Bus(), Bus()
kicks = []

# ---------------------------------------------------------------- the groove
PROG = [(['A3', 'C4', 'E4', 'G4'], 'A1'), (['A3', 'C4', 'E4', 'F4'], 'F1'), (['G3', 'C4', 'E4', 'G4'], 'C2'), (['G3', 'B3', 'D4', 'G4'], 'G1')]
STABS = [0, 3, 6, 10, 13]                       # 16th-note positions of the piano stabs in a bar
BREAK = DROPBAR - 1                             # the bar before "live" is the build, "live" the drop
ENDBAR = int(round(Wd['see'] / BAR))            # the last bar lands near "see you at Dubai College"
nbars = int(np.ceil(DUR / BAR))
for b in range(nbars):
    b0 = b * BAR
    if b0 >= DUR:
        break
    voic, root = PROG[b % 4]
    if b == BREAK:
        # the build: held chord through a filter, a snare roll and a riser, then a breath
        held = chord(voic, BAR - .1, .45, release=.05)
        music.add(signal.sosfilt(lp(900), held, axis=0), b0, .9)
        roll = b0
        while roll < b0 + BAR - .08:
            p = (roll - b0) / BAR
            drums.add(snare(), roll, .1 + .55 * p ** 2)
            roll += BEAT / 2 if p < .5 else BEAT / 4
        rs = sweep(BAR - .06, 300, 9000) * (np.linspace(0, 1, int((BAR - .06) * SR)) ** 2)[:, None] * .5
        fx.add(rs, b0, .9)
        continue
    if b >= ENDBAR:
        # the close: one big chord, a last stab, and the room rings out
        music.add(chord(['A2', 'E3', 'A3', 'C4', 'E4', 'A4'], 1.6, .8, release=1.2), b0, .9)
        music.add(bass(root, 1.4, .9, release=.6), b0, .7)
        drums.add(kick(1.2), b0, 1); kicks.append(b0)
        drums.add(crash(2.0), b0, .8)
        music.add(chord(['C4', 'E4', 'G4', 'C5'], .5, .6, release=.8), b0 + BEAT * 2, .7)
        break
    for s in STABS:
        music.add(chord(voic, BEAT * .45, .6 + .1 * (s == 0)), b0 + s * BEAT / 4, .75)
    for e in range(8):                          # offbeat house bass
        if e % 2 == 1:
            music.add(bass(root, BEAT * .42, .9, release=.05), b0 + e * BEAT / 2, .6)
            music.add(bass(midi(root) + 12, BEAT * .2, .4, release=.04), b0 + e * BEAT / 2 + BEAT / 4, .35)
    for bt in range(4):
        tb = b0 + bt * BEAT
        drums.add(kick(), tb, 1); kicks.append(tb)
        if bt in (1, 3):
            drums.add(clap(), tb, .55); send.add(clap(), tb, .15)
        drums.add(hat(True), tb + BEAT / 2, .45, pan=.2)
        for s in range(4):
            drums.add(hat(), tb + s * BEAT / 4, .25 + .15 * (s == 2), pan=-.25)
    if b == BREAK + 1:                          # the drop
        drums.add(crash(2.6), b0, 1.0)
        fx.add(sub(1.4, 110, 35), b0, .9)
        harp_notes = ['A5', 'C6', 'E6', 'G6', 'A6', 'C7']
        for i, nm in enumerate(harp_notes):
            y = harp(nm, .8, .6, release=.6)
            fx.add(y, b0 + i * .05, .3, pan=-.5 + i * .2); send.add(y, b0 + i * .05, .2)
    if b == 0:
        drums.add(crash(2.0), 0, .7)

# ---------------------------------------------------------------- sound design on the picture
for k, t0 in SC.items():
    if t0 > 0:
        fx.add(whoosh(.32, 500, 6000), t0 - .16, .55, pan=R.uniform(-.3, .3))
for st, k in EV['slams']:
    fx.add(hit(.5 + .4 * k), st, .7)
POPS = [  # (time, sample, pitch)
    (CUE['stamp'], 'drop_002', 0), (Wd['lumera'], 'maximize_003', 0),
    *[(CUE['s2m'] + i * .09, 'pluck_001', i * 2) for i in range(5)],
    (CUE['cal'], 'drop_003', -2), (CUE['clock'], 'drop_001', 0), (Wd['dc'] + .15, 'select_002', 0),
    *[(Wd['kahoot'] + .2 + i * .07, 'tick_002', i * 2) for i in range(4)], (CUE['sprout'], 'pluck_002', 0), (Wd['prizes'] + .05, 'confirmation_002', 0),
    (CUE['nova'], 'pluck_001', 3), *[(Wd['showcase'] + .15 + i * .08, 'drop_004', i) for i in range(3)],
    (CUE['ticket'], 'drop_002', 2), (CUE['blaze'], 'pluck_002', 4),
    (Wd['drinks'] - .1, 'pluck_001', 0), (Wd['drinks'] + .12, 'pluck_001', 3), (Wd['snacks'] - .05, 'pluck_001', 7), (Wd['free'], 'confirmation_001', 0),
    (CUE['laptop'], 'maximize_005', 0),
    *[(Wd['sixty'] + .05 + r * .07, 'pluck_002', r * 2) for r in range(6)],      # the seats fill, row by row
    (Wd['spots'] + .25, 'drop_002', 0),                                              # LIMITED badge
    (CUE['signup'], 'maximize_003', 0), (Wd['tapf'], 'click_004', 0), (Wd['tapf'] + .04, 'confirmation_002', 0),
    (Wd['caption'] - .1, 'drop_001', 2),
    (Wd['tag'] - .05, 'pluck_001', 0), (Wd['tag'] + .02, 'pluck_001', 4), (Wd['last'] + .1, 'drop_003', 0),
]
for t0, name, pitch in POPS:
    fx.add(ui(name, pitch), t0, .45, pan=R.uniform(-.35, .35))
# the clock ticking round to 3:30 and the flaps rolling to 7:25
for i in range(14):
    fx.add(ui('tick_002', 5), CUE['spin'] + i * .05, .25, pan=.2)
for i in range(16):
    fx.add(ui('tick_004', -3), Wd['seven'] - .25 + i * .04, .25, pan=-.2)
fx.add(FOLEY['bookFlip1'] / np.abs(FOLEY['bookFlip1']).max(), CUE['cal'] - .02, .4)
fx.add(FOLEY['card-place-1'] / np.abs(FOLEY['card-place-1']).max(), CUE['ticket'], .5)
fx.add(hit(1.2), Wd['venue'], .8)                                    # the pin lands
fx.add(clap(), Wd['friend'], .9); send.add(clap(), Wd['friend'], .3)       # the high five
# confetti sparkle
for b in EV['bursts']:
    for i in range(6):
        y = harp(['E6', 'G6', 'A6', 'C7', 'E7', 'G6'][i], .5, .4, release=.5)
        fx.add(y, b + .02 + i * .04, .16, pan=R.uniform(-.7, .7)); send.add(y, b + .02 + i * .04, .1)

# ---------------------------------------------------------------- voiceover
vo = Bus()
for ln in VO:
    a, sr = sf.read(os.path.join(HERE, 'vo', ln['id'] + '.wav'))
    if a.ndim > 1:
        a = a.mean(1)
    sp = signal.sosfilt(bp(250, 6000), a)                  # level every line to the same speech loudness
    a = a * 10 ** ((-21 - 20 * np.log10(np.sqrt(np.mean(sp ** 2)) + 1e-9)) / 20)
    vo.add(a, ln['t'], 1.0)
    send.add(a, ln['t'], .08)


def follower(x, att=.015, rel=.4):
    e = np.convolve(np.abs(x).max(1), np.ones(480) / 480, 'same')
    out = np.empty_like(e)
    a, r, v = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)), 0.
    for i in range(0, len(e), 64):
        s = e[i:i + 64].max()
        v = a * v + (1 - a) * s if s > v else r * v + (1 - r) * s
        out[i:i + 64] = v
    return out


pump = np.ones(N)
for kt in kicks:
    i = int(kt * SR)
    n = min(N - i, int(.25 * SR))
    if n > 0:
        pump[i:i + n] = np.minimum(pump[i:i + n], 1 - .35 * np.exp(-np.arange(n) / (.07 * SR)))
music.x *= pump[:, None]
venv = follower(vo.x)
duck = 1 - .66 * np.clip(venv / .15, 0, 1)                 # about -9 dB under the voice
bed = (music.x * .6 + drums.x * .75) * duck[:, None]
fxm = fx.x * (1 - .55 * np.clip(venv / .15, 0, 1))[:, None]
send.x += music.x * .08
wet = reverb(send.x)
# a breath of silence just before the drop
gate = np.ones(N)
g0, g1 = int((DROP - .06) * SR), int(DROP * SR)
gate[g0 - 200:g0] = np.linspace(1, 0, 200); gate[g0:g1] = 0
mix = (bed + fxm + wet * .35) * gate[:, None] + vo.x * 1.9
mix = signal.sosfilt(hp(28), mix, axis=0)
mix = mix / np.abs(mix).max() * 1.7
mix = np.tanh(mix) / np.tanh(1.7)
fo = int(.25 * SR)
mix[-fo:] *= np.cos(np.linspace(0, np.pi / 2, fo))[:, None] ** 2
mix *= 10 ** (-1 / 20) / np.abs(mix).max()

rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
SPEECH = bp(250, 6000)
print(f'tempo {60 / BEAT:.1f} BPM, drop at {DROP:.2f}s; mix RMS {rms(mix):.1f} dBFS')
for ln in VO:
    a = int(ln['t'] * SR); b = a + len(sf.read(os.path.join(HERE, 'vo', ln['id'] + '.wav'))[0])
    v = rms(signal.sosfilt(SPEECH, vo.x[a:b] * 1.9, axis=0)); m = rms(signal.sosfilt(SPEECH, (bed + fxm + wet * .35)[a:b], axis=0))
    print(f"  {ln['id']} voice {v:6.1f} dB, margin {v - m:5.1f} dB")
out = os.path.join(HERE, 'soundtrack.wav')
sf.write(out, mix, SR, subtype='PCM_24')
print('wrote', out)
if shutil.which('ffmpeg'):
    m4a = os.path.join(os.path.dirname(HERE), 'assets', 'audio', 'soundtrack.m4a')
    os.makedirs(os.path.dirname(m4a), exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', out, '-c:a', 'aac', '-b:a', '192k', m4a], check=True)
    print('wrote', m4a)
