#!/usr/bin/env python3
"""Soundtrack for the 16:9 cut: original score (dark classical piano and strings over a hip-hop beat,
in the spirit of prestige-drama finance shows, written from scratch), cut effects and the narration.
Writes public/audio/mix2.wav. Reuses the toolbox in build_audio.py / audio_lib.py."""
import json, os, sys
import numpy as np, soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audio_lib as A
import build_audio as BA
from audio_lib import SR, n

ROOT = BA.ROOT
TL = json.load(open(os.path.join(ROOT, "src", "data", "timeline2.json")))
SC, CUE = TL["scenes"], TL["cues"]
DUR = TL["duration"]
BA.DUR, BA.NS = DUR, n(DUR + 0.5)
NS = BA.NS
tok = {}
for x in TL["tokens"]:
    tok.setdefault(x["scene"], []).append(x)
W = lambda sc, i: tok[sc][i]["s"]
rng = np.random.default_rng(2008)

BPM = 88
BEAT = 60 / BPM
BAR = 4 * BEAT
N = BA.N

# C minor, classical-leaning: Cm  Ab  Fm  G   /  Cm  Ab  Eb  G
PROG = [("C", ["C3", "Eb3", "G3"], "C2"), ("Ab", ["C3", "Eb3", "Ab3"], "Ab1"), ("F", ["C3", "F3", "Ab3"], "F1"), ("G", ["B2", "D3", "G3"], "G1"),
        ("C", ["C3", "Eb3", "G3"], "C2"), ("Ab", ["C3", "Eb3", "Ab3"], "Ab1"), ("Eb", ["Bb2", "Eb3", "G3"], "Eb2"), ("G", ["B2", "D3", "F3"], "G1")]
MOTIF = {"C": ["G4", "Eb5", "D5", "C5"], "Ab": ["Ab4", "Eb5", "C5", "Bb4"], "F": ["Ab4", "F5", "Eb5", "C5"], "G": ["G4", "D5", "B4", "F5"], "Eb": ["G4", "Eb5", "Bb4", "G4"]}


def score(t_end):
    pno, st = BA.Midi(), BA.Midi()
    pno.program(0, 0)
    st.program(0, 48); st.program(1, 42); st.program(2, 44)
    hook_end = SC["b_houses"]["start"]
    panic, weekend, bank, cost, end = SC["g_panic"]["start"], SC["h_weekend"]["start"], SC["i_bankrupt"]["start"], SC["k_cost"]["start"], SC["l_end"]["start"]
    wrong = CUE["wrong"]
    # sections: (start, end, intensity 0..3)
    secs = [(0.0, hook_end, 1), (hook_end, panic, 2), (panic, weekend, 3), (weekend, bank, 1), (bank, cost, 3), (cost, end, 1), (end, wrong - 0.2, 0)]
    t, k = 0.0, 0
    while t < wrong - 0.25:
        lvl = next(l for a, b, l in secs if a <= t < b) if any(a <= t < b for a, b, _ in secs) else 0
        name, chord, root = PROG[k % len(PROG)]
        mot = MOTIF[name]
        # left hand
        pno.note(0, t, BAR * 0.98, root, 60 + 12 * min(lvl, 2))
        pno.note(0, t, BAR * 0.98, BA.N(root) + 12, 46 + 10 * min(lvl, 2))
        # right hand: the restless eighth-note figure
        for j in range(8):
            if lvl == 0 and j % 2:
                continue
            p = chord[j % 3] if j % 4 != 3 else mot[(j // 2) % 4]
            pno.note(0, t + j * BEAT / 2, BEAT * 0.45, BA.N(p) + 12, 52 + 8 * lvl + (8 if j % 4 == 0 else 0) + rng.integers(-4, 5))
        # melody on top in the bigger sections
        if lvl >= 2:
            for j, p in enumerate(mot):
                pno.note(0, t + j * BEAT, BEAT * 0.9, p, 66 + 6 * lvl)
        # strings
        if lvl >= 1:
            st.chord(0, t, BAR, [BA.N(x) for x in chord] + [BA.N(chord[0]) + 12], 40 + 18 * lvl)
            st.note(1, t, BAR, root, 50 + 15 * lvl)
        if lvl == 3:
            st.chord(2, t, BAR, [BA.N(chord[0]) + 12, BA.N(chord[2]) + 12], 70)
        t += BAR
        k += 1
    # the verdict
    pno.chord(0, wrong, 3.0, ["C1", "C2", "G2", "C3", "Eb3"], 120)
    st.chord(0, wrong, 2.6, ["C3", "G3", "C4", "Eb4"], 100)
    return pno.render(args.soundfont, 0.9), st.render(args.soundfont, 0.7)


def drums():
    """Hip-hop kit, synthesised: kick, snare (with clap), hats; patterns change with the story."""
    b = BA.Bus()
    kick = lambda: A.hit(0.5, 110, 45, 0.25)
    def snare():
        x = A.bp(A.white(0.25), 180, 6000) * A.env(0.25, 0.001, 0.12, 4) + np.sin(2 * np.pi * 190 * A.tt(0.25)) * A.env(0.25, 0.001, 0.06) * 0.6
        return x * 0.9
    hat = lambda o=False: A.hp(A.white(0.2 if o else 0.05), 7500) * A.env(0.2 if o else 0.05, 0.001, 0.12 if o else 0.03, 4) * 0.45
    hook_end = SC["b_houses"]["start"]
    on = [(hook_end, SC["g_panic"]["start"], "main"), (SC["i_bankrupt"]["start"] + 0.0, SC["k_cost"]["start"], "hard")]
    for a, z, style in on:
        t, step = a, 0
        while t < z - 0.05:
            bb = step % 16
            if bb in (0, 7, 10) or (style == "hard" and bb in (3,)):
                b.add(kick(), t, 0.9)
            if bb in (4, 12):
                b.add(snare(), t, 0.55)
            b.add(hat(bb == 14), t, 0.32 if bb % 2 == 0 else 0.2, 0.25)
            if style == "hard" and bb % 2 == 1:
                b.add(hat(), t + BEAT / 8, 0.12, -0.25)
            t += BEAT / 4
            step += 1
    return b.b


def effects(hall):
    fx = BA.Bus()
    # a soft whoosh or click on cuts (taken from the film's shot list timing = word starts)
    hits = [x for x in TL["tokens"] if x["hit"]]
    for i, h in enumerate(hits):
        fx.add(A.pan_sweep(A.whoosh(0.28, 600, 4800, 0.8, 1.2, 0.25), -0.3, 0.3), h["s"] - 0.24, 0.35)
        fx.add(A.hit(0.35, 160 + 40 * (i % 3), 70, 0.6), h["s"], 0.28)
    for sc in ("a_hook", "f_fall", "h_weekend"):
        pass
    # signature moments
    fx.add(A.shutter(), W("a_hook", 3), 0.6)
    for k in range(int((W("a_hook", 13) - 0.5) / 0.5)):
        fx.add(A.tick(), 0.5 + k * 0.5, 0.35)
    fx.add(A.stamp(), W("c_subprime", 15), 1.0)
    fx.add(A.stamp(), W("d_mbs", 19), 1.0)
    for i in range(0, 70, 3):
        fx.add(A.paper_slap(0.07), W("d_mbs", 6) + i * 0.022 + 0.25, 0.25, rng.uniform(-0.5, 0.5))
    fx.add(A.pan(A.glide(0.6, 620, 90), 0), W("f_fall", 3), 0.3)
    for k in range(int((SC["i_bankrupt"]["start"] - SC["h_weekend"]["start"]) / 0.5)):
        fx.add(A.tick(0.9), SC["h_weekend"]["start"] + k * 0.5, 0.45)
    bk = W("i_bankrupt", 6)
    fx.add(A.reverse_swell(0.5, 65.4, hall), bk - 0.5, 0.9)
    fx.add(A.boom(2.6, 110, 36, drive=3.0), bk, 1.3)
    fx.add(A.pan(A.crack(0.5, 160, 1.2), 0), W("j_contagion", 19), 0.6)
    wrong = CUE["wrong"]
    fx.add(A.reverse_swell(0.4, 65.4, hall), wrong - 0.4, 0.9)
    fx.add(A.boom(3.0, 108, 34, drive=3.2), wrong, 1.4)
    o = CUE["outro.start"]
    fx.add(A.pan_sweep(A.whoosh(0.5, 300, 4000, 0.7), -0.3, 0.3), o - 0.2, 0.5)
    for k, f in enumerate((261.6, 392.0, 523.3, 622.3)):
        fx.add(A.ping(f, 2.6, 0.9), o + 0.12 + k * 0.03, 0.22, [-0.3, 0.3, -0.1, 0.1][k])
    return fx.b


def main():
    import pyloudnorm as pyln
    hall = A.reverb_ir(2.4, seed=3)
    m_pno, m_st = score(DUR)
    music = m_pno * 1.0 + A.hp(m_st, 40) * 0.75
    music = music + A.convolve(m_pno * 0.35 + m_st * 0.5, hall)[:NS] * 0.45
    music = A.hp(music, 30) + A.hp(music, 3200, 1) * 0.6
    dr = drums()
    sfx = effects(hall)
    sfx = sfx + A.convolve(sfx, hall)[:NS] * 0.15
    vo = np.zeros(NS)
    for k, s in SC.items():
        x, sr = sf.read(os.path.join(ROOT, "public", s["voFile"]))
        i = int(round(s["voStart"] * SR)); vo[i:i + len(x)] += x[: NS - i]
    room = A.reverb_ir(0.45, bright=7000, dark=2500, seed=5, predelay=0.004)
    vo_st = A.pan(vo, 0) * 1.41 + A.convolve(vo, room)[:NS] * 0.06
    speaking = np.clip(BA.follow(vo, 0.04, 0.45) / 0.05, 0, 1)[:, None]
    gate = np.ones(NS)
    a, b = int((CUE["wrong"] - 0.7) * SR), int((CUE["wrong"] - 0.02) * SR)
    gate[a:b] = 0
    bank = W("i_bankrupt", 6)
    gate[int((bank - 0.55) * SR):int((bank - 0.02) * SR)] = 0.15
    mix = vo_st + (music * 0.5 + dr * 0.42) * (1 - 0.55 * speaking) * gate[:, None] + sfx * 0.35 * (1 - 0.4 * speaking)
    o = int(CUE["outro.start"] * SR)
    mix[o - n(0.6):o] *= np.linspace(1, 0.3, n(0.6))[:, None]
    e0 = int((DUR - 0.5) * SR); mix[e0:] *= np.linspace(1, 0, NS - e0)[:, None]
    mix = A.hp(mix, 22)[: n(DUR)]
    mix = np.tanh(mix * 1.1) / 1.1
    meter = pyln.Meter(SR)
    for _ in range(4):
        mix = BA.limiter(mix * 10 ** ((-14.0 - meter.integrated_loudness(mix)) / 20), ceiling=0.86)
    print(f"loudness {meter.integrated_loudness(mix):.1f} LUFS, true peak {20 * np.log10(BA.true_peak(mix)):.2f} dBTP")
    sf.write(os.path.join(ROOT, "public", "audio", "mix2.wav"), mix, SR, subtype="PCM_16")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--soundfont", default="/usr/share/sounds/sf2/FluidR3_GM.sf2")
    args = ap.parse_args()
    main()
