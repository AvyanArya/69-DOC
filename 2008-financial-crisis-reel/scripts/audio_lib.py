"""Synthesis toolbox for the reel's sound design — every sound effect is generated here from
oscillators and filtered noise, so nothing has to be licensed. All functions return float64
numpy arrays at SR; stereo arrays are shaped (n, 2)."""
import numpy as np
from scipy import signal

SR = 48000
_rng = np.random.default_rng(2008)


def n(sec):
    return max(1, int(round(sec * SR)))


def tt(sec):
    return np.arange(n(sec)) / SR


def white(sec):
    return _rng.standard_normal(n(sec))


def sos(kind, f, order=2):
    return signal.butter(order, f, kind, fs=SR, output="sos")


def lp(x, f, order=2):
    return signal.sosfilt(sos("lowpass", min(f, SR * 0.49), order), x, axis=0)


def hp(x, f, order=2):
    return signal.sosfilt(sos("highpass", f, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(sos("bandpass", [lo, min(hi, SR * 0.49)], order), x, axis=0)


def env(sec, a=0.005, d=0.1, curve=4.0):
    """Fast attack, exponential decay over the whole duration."""
    t = tt(sec)
    return np.minimum(t / max(a, 1e-4), 1) * np.exp(-curve * np.maximum(t - a, 0) / max(d, 1e-4))


def hann_env(sec, peak=0.5, sharp=1.0):
    """Swell that peaks `peak` of the way through (0..1)."""
    u = np.linspace(0, 1, n(sec))
    up = np.clip(u / max(peak, 1e-3), 0, 1)
    down = np.clip((1 - u) / max(1 - peak, 1e-3), 0, 1)
    return (np.sin(np.minimum(up, down) * np.pi / 2) ** 2) ** sharp


def fade(x, a=0.004, r=0.01):
    y = x.copy()
    na, nr = min(n(a), len(y) // 2), min(n(r), len(y) // 2)
    ra, rr = np.linspace(0, 1, na), np.linspace(1, 0, nr)
    if y.ndim == 2:
        ra, rr = ra[:, None], rr[:, None]
    y[:na] *= ra
    y[-nr:] *= rr
    return y


def pan(x, p=0.0):
    """Mono → stereo, equal-power. p in [-1, 1]."""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], -1)


def pan_sweep(x, p0, p1):
    a = (np.linspace(p0, p1, len(x)) + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], -1)


def sweep_bp(x, f0, f1, q=1.2, curve=1.0):
    """Band-pass whose centre glides f0→f1 (state-variable filter, per-sample)."""
    u = np.linspace(0, 1, len(x)) ** curve
    fc = f0 * (f1 / f0) ** u
    g = 2 * np.sin(np.pi * np.minimum(fc, SR / 6.2) / SR)
    low = band = 0.0
    out = np.empty(len(x))
    damp = 1 / q
    for i in range(len(x)):
        low += g[i] * band
        high = x[i] - low - damp * band
        band += g[i] * high
        out[i] = band
    return out


def reverb_ir(sec, bright=6000, dark=900, seed=1, predelay=0.012):
    rng = np.random.default_rng(seed)
    t = tt(sec)
    ir = np.zeros((len(t), 2))
    for ch in range(2):
        hi = lp(rng.standard_normal(len(t)), bright) * np.exp(-t * 6.9 / (sec * 0.55))
        lo = lp(rng.standard_normal(len(t)), dark) * np.exp(-t * 6.9 / sec)
        ir[:, ch] = hi * 0.6 + lo
    ir = np.concatenate([np.zeros((n(predelay), 2)), ir])
    ir[: n(predelay) + n(0.004)] *= 0.0
    return ir / np.sqrt((ir ** 2).sum(0)).max()


def convolve(x, ir):
    if x.ndim == 1:
        x = np.stack([x, x], -1)
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x) + len(ir)] for c in range(2)], -1)


# ───────────────────────────── individual sounds ─────────────────────────────


def boom(sec=1.6, f0=95, f1=32, drive=2.2, click=0.5, noise_amt=0.5):
    """Cinematic bass impact: pitch-dropping sub, a transient and a burst of low noise."""
    t = tt(sec)
    f = f1 + (f0 - f1) * np.exp(-t * 9)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sub = np.sin(ph) * np.exp(-t * 3.2 / sec * 1.4)
    sub = np.tanh(sub * drive) / np.tanh(drive)
    body = lp(white(sec), 240, 4) * np.exp(-t * 7) * 1.6 * noise_amt
    crack = hp(white(sec), 1800) * np.exp(-t * 90) * click
    thud = np.sin(2 * np.pi * 160 * t) * np.exp(-t * 40) * 0.5
    return fade(sub + body + crack + thud, 0.001, 0.05)


def hit(sec=0.9, f0=120, f1=48, bright=0.5):
    """Tighter, punchier impact for cuts and text slams."""
    return boom(sec, f0, f1, drive=2.6, click=0.3 + bright * 0.6, noise_amt=0.35 + bright * 0.4)


def whoosh(sec=0.6, f0=300, f1=4500, peak=0.6, q=1.0, air=0.25):
    x = sweep_bp(white(sec), f0, f1, q) * hann_env(sec, peak, 1.3)
    x += hp(white(sec), 5000) * hann_env(sec, peak, 2.0) * air
    return fade(x, 0.01, 0.03)


def riser(sec=1.3, f0=160, f1=5200):
    u = np.linspace(0, 1, n(sec))
    nz = sweep_bp(white(sec), f0, f1, 1.6, 1.6) * u ** 2.2
    f = 70 * (9 ** (u ** 1.5))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * u ** 3 * 0.45
    trem = 1 - 0.35 * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(6 + 26 * u ** 2) / SR)) * u
    return fade((nz * 1.4 + tone) * trem, 0.02, 0.004)


def reverse_swell(sec=0.5, f=110, ir=None):
    """Reversed reverberant tone: the 'suck' that leads into a big hit."""
    t = tt(sec * 1.2)
    x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) + lp(white(sec * 1.2), 1800) * 0.7) * np.exp(-t * 30)
    w = convolve(x, ir if ir is not None else reverb_ir(sec * 1.6, seed=7))[: n(sec)]
    return fade(w[::-1].copy(), 0.03, 0.003)


def paper_flap(sec=0.16, tone=1.0):
    """One sheet snapping through the air."""
    t = tt(sec)
    flutter = 0.55 + 0.45 * np.sin(2 * np.pi * (22 + 30 * _rng.random()) * t + _rng.random() * 6)
    x = bp(white(sec), 900 * tone, 7500 * tone) * flutter * hann_env(sec, 0.3, 1.2)
    x += lp(white(sec), 420) * hann_env(sec, 0.25, 2) * 0.5
    return fade(x, 0.004, 0.02)


def paper_slap(sec=0.12):
    """A sheet landing on a pile."""
    t = tt(sec)
    x = bp(white(sec), 500, 6000) * np.exp(-t * 55) + np.sin(2 * np.pi * 150 * t) * np.exp(-t * 60) * 0.7
    return fade(x, 0.001, 0.02)


def paper_slide(sec=0.4):
    x = bp(white(sec), 1200, 9000) * hann_env(sec, 0.55, 1.0) * (0.7 + 0.3 * np.sin(2 * np.pi * 31 * tt(sec)))
    return fade(x, 0.01, 0.04)


def rustle(sec=0.8, density=90):
    """Loose paper settling: a spray of tiny crackles."""
    x = np.zeros(n(sec))
    for _ in range(int(density * sec)):
        i = _rng.integers(0, len(x) - n(0.02))
        g = bp(white(0.012 + 0.01 * _rng.random()), 1500, 9000) * env(0.02, 0.0005, 0.006)[: n(0.012)].max()
        g = g * np.hanning(len(g)) * (0.2 + 0.8 * _rng.random())
        x[i : i + len(g)] += g
    return x * hann_env(sec, 0.3, 0.8)


def marker(sec=0.75, pressure=1.0):
    """Felt-tip marker dragged across paper: breathy friction plus a faint squeak."""
    t = tt(sec)
    u = np.linspace(0, 1, len(t))
    speed = 0.55 + 0.45 * np.sin(np.pi * u) ** 0.6
    wob = 0.75 + 0.25 * np.sin(2 * np.pi * 9 * t + 1.0) * np.sin(2 * np.pi * 2.3 * t)
    fr = bp(white(sec), 700, 3800) * speed * wob
    fr += bp(white(sec), 3500, 8500) * speed * 0.35
    sq_f = 2500 + 500 * np.sin(2 * np.pi * 5 * t) + 300 * u
    squeak = np.sin(2 * np.pi * np.cumsum(sq_f) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * t)) ** 4 * 0.05
    return fade((fr + squeak) * pressure, 0.02, 0.05)


def shutter():
    """SLR shutter: mirror slap, a beat, then the curtain."""
    out = np.zeros(n(0.2))

    def clk(at, f, amp, dec):
        t = tt(0.06)
        c = (bp(white(0.06), 900, 7000) * 0.9 + np.sin(2 * np.pi * f * t) * 0.6) * np.exp(-t * dec) * amp
        i = n(at)
        out[i : i + len(c)] += c

    clk(0.0, 310, 1.0, 95)
    clk(0.012, 1900, 0.5, 160)
    clk(0.068, 240, 0.85, 80)
    clk(0.078, 2600, 0.4, 170)
    whir = bp(white(0.11), 1800, 5200) * hann_env(0.11, 0.4, 1.5) * 0.18
    out[n(0.085) : n(0.085) + len(whir)] += whir
    return out


def typekey(v=1.0):
    """One typewriter key: type-bar strike and the machine's resonance."""
    sec = 0.075
    t = tt(sec)
    strike = hp(white(sec), 2200) * np.exp(-t * 320)
    body = np.sin(2 * np.pi * (1050 + 240 * _rng.random()) * t) * np.exp(-t * 70) * 0.5
    low = np.sin(2 * np.pi * (190 + 40 * _rng.random()) * t) * np.exp(-t * 55) * 0.6
    return (strike + body + low) * v * (0.75 + 0.5 * _rng.random())


def typebell():
    t = tt(0.5)
    return (np.sin(2 * np.pi * 2090 * t) + 0.5 * np.sin(2 * np.pi * 4630 * t)) * np.exp(-t * 9) * 0.3


def tick(pitch=1.0, v=1.0):
    """Clock escapement."""
    sec = 0.05
    t = tt(sec)
    x = np.sin(2 * np.pi * 2300 * pitch * t) * np.exp(-t * 190) + 0.6 * np.sin(2 * np.pi * 3900 * pitch * t) * np.exp(-t * 260)
    x += hp(white(sec), 3000) * np.exp(-t * 500) * 0.5 + np.sin(2 * np.pi * 420 * pitch * t) * np.exp(-t * 120) * 0.5
    return x * v


def stamp(v=1.0):
    """Rubber stamp: a dead wooden thump with a slap of ink on paper."""
    sec = 0.28
    t = tt(sec)
    x = np.sin(2 * np.pi * (96 * np.exp(-t * 9) + 58) * t) * np.exp(-t * 26) * 1.2
    x += bp(white(sec), 250, 3200) * np.exp(-t * 85) * 0.9
    x += np.sin(2 * np.pi * 640 * t) * np.exp(-t * 95) * 0.3
    return np.tanh(x * 1.6) * v


def ping(f=880, sec=0.9, v=1.0, dark=False):
    t = tt(sec)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 6) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 11)
    if dark:
        x += 0.7 * np.sin(2 * np.pi * f * 1.059 * t) * np.exp(-t * 7)      # minor-second beat: alarm, not chime
        x = lp(x, 2600)
    return fade(x * v * np.minimum(t / 0.003, 1), 0.001, 0.05)


def clack(pitch=1.0):
    """Split-flap display turning over."""
    sec = 0.09
    t = tt(sec)
    x = bp(white(sec), 800, 6000) * np.exp(-t * 110) + np.sin(2 * np.pi * 1400 * pitch * t) * np.exp(-t * 90) * 0.5
    x += np.sin(2 * np.pi * 230 * pitch * t) * np.exp(-t * 60) * 0.8
    return x


def crack(sec=0.5, density=60, bright=1.0):
    """Ice / glass / plaster cracking: sharp resonant grains."""
    x = np.zeros(n(sec))
    for _ in range(int(density * sec)):
        i = int((_rng.random() ** 1.6) * (len(x) - n(0.03)))
        f = _rng.uniform(2200, 9000) * bright
        g = tt(0.02)
        grain = (np.sin(2 * np.pi * f * g) + hp(white(0.02), 4000) * 0.6) * np.exp(-g * 420) * _rng.uniform(0.2, 1)
        x[i : i + len(grain)] += grain
    return x


def glide(sec=0.6, f0=660, f1=110, v=1.0):
    """Falling tone that follows a chart line down."""
    u = np.linspace(0, 1, n(sec))
    f = f0 * (f1 / f0) ** (u ** 1.3)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = signal.sawtooth(ph, 0.5) * 0.6 + np.sin(ph * 0.5) * 0.6
    x = lp(x, 2400) * (0.35 + 0.65 * u) * (1 + 0.12 * np.sin(2 * np.pi * 17 * tt(sec)))
    return fade(x * v, 0.01, 0.02)


def rise_tone(sec=0.6, f0=180, f1=720, v=1.0):
    u = np.linspace(0, 1, n(sec))
    ph = 2 * np.pi * np.cumsum(f0 * (f1 / f0) ** u) / SR
    return fade(lp(signal.sawtooth(ph, 0.5), 2600) * hann_env(sec, 0.8) * v, 0.01, 0.02)


def power_down(sec=1.1):
    """Lights out: a mains hum sagging to nothing."""
    u = np.linspace(0, 1, n(sec))
    f = 118 * (0.18 ** u)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = signal.sawtooth(ph) * 0.5 + np.sin(ph) + 0.4 * np.sin(ph * 2)
    return fade(lp(x, 900) * (1 - u) ** 0.7, 0.004, 0.08)


def shimmer(sec=0.9, base=880):
    t = tt(sec)
    x = sum(np.sin(2 * np.pi * base * r * t + i) * (0.6 ** i) for i, r in enumerate([1, 1.5, 2, 3, 4.02]))
    x *= hann_env(sec, 0.45, 1.4) * (0.75 + 0.25 * np.sin(2 * np.pi * 7 * t))
    return fade(x + hp(white(sec), 7000) * hann_env(sec, 0.5, 2) * 0.4, 0.02, 0.05)


def drone(sec, f=36.7, bright=0.25, seed=3):
    """Low-frequency tension bed: detuned saws under a slowly breathing filter."""
    rng = np.random.default_rng(seed)
    t = tt(sec)
    x = np.zeros(len(t))
    for det in (-0.31, -0.11, 0.0, 0.13, 0.29):
        for mult, amp in ((1, 1.0), (2, 0.5), (3, 0.22)):
            x += signal.sawtooth(2 * np.pi * f * mult * (1 + det * 0.012) * t + rng.random() * 6) * amp
    sub = np.sin(2 * np.pi * f * t) * 3.0
    breath = 0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * t + 1.3)
    lo = lp(x, 130, 2)
    mid = bp(x, 180, 900) * bright * (0.4 + 0.6 * breath)
    return (lo + mid + sub) / 9.0


def tock(v=1.0, pitch=1.0):
    """Wooden block set down."""
    sec = 0.16
    t = tt(sec)
    x = np.sin(2 * np.pi * 300 * pitch * t) * np.exp(-t * 45) + 0.5 * np.sin(2 * np.pi * 770 * pitch * t) * np.exp(-t * 80)
    return (x + bp(white(sec), 400, 4000) * np.exp(-t * 130) * 0.6) * v


def pop(v=1.0, f=520):
    t = tt(0.07)
    return np.sin(2 * np.pi * (f + 500 * np.exp(-t * 60)) * t) * np.exp(-t * 55) * v


def tape_bed(sec):
    """Room tone for the archive footage: mains hum, hiss and an indistinct murmur."""
    t = tt(sec)
    hum = np.sin(2 * np.pi * 60 * t) * 0.5 + np.sin(2 * np.pi * 120 * t) * 0.25 + np.sin(2 * np.pi * 180 * t) * 0.12
    hiss = hp(white(sec), 4500) * 0.16
    murmur = bp(white(sec), 220, 900) * (0.4 + 0.6 * np.abs(lp(white(sec), 3.5))) * 2.2
    return hum * 0.25 + hiss + murmur * 0.6
