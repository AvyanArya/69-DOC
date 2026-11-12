#!/usr/bin/env python3
"""Compose the score, place every sound effect and mix the final soundtrack.

Everything is positioned from src/data/timeline.json, the same file the picture is cut to.
  • score      – written here as note events, performed by FluidSynth with the FluidR3 GM
                 SoundFont (MIT licence), plus synthesised sub / drone layers
  • effects    – synthesised in scripts/audio_lib.py (paper, marker, shutter, typewriter, impacts …)
  • narration  – the Kokoro WAVs from scripts/generate_vo.py
Outputs:
  public/audio/mix.wav                 final master (48 kHz, 16-bit) – muxed into the MP4
  public/audio/mix.m4a                 small copy for Remotion Studio preview
  assets_src/audio_stems/*.flac        narration / music / effects stems for re-mixing

usage: python3 scripts/build_audio.py [--soundfont PATH]
"""
import argparse, json, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audio_lib as A
from audio_lib import SR, n

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, "src", "data", "timeline.json")))
CUE, SC = TL["cues"], TL["scenes"]
DUR = TL["duration"]
NS = n(DUR + 0.5)
rng = np.random.default_rng(15092008)
EIGHTH = 0.3125          # 96 bpm


class Bus:
    def __init__(self):
        self.b = np.zeros((NS, 2))

    def add(self, x, t, gain=1.0, pan=0.0):
        if x.ndim == 1:
            x = A.pan(x, pan)
        i = int(round(t * SR))
        if i < 0:
            x, i = x[-i:], 0
        j = min(NS, i + len(x))
        if j > i:
            self.b[i:j] += x[: j - i] * gain


# ═════════════════════════════════ score ═════════════════════════════════

NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11}


def N(name):
    return 12 * (int(name[-1]) + 1) + NOTE[name[:-1]]


class Midi:
    """Minimal note list → Standard MIDI File → FluidSynth."""

    def __init__(self):
        self.ev, self.programs = [], {}

    def program(self, ch, prog):
        self.programs[ch] = prog

    def note(self, ch, t, dur, pitch, vel):
        p = N(pitch) if isinstance(pitch, str) else pitch
        self.ev.append((t, 1, "on", ch, p, int(np.clip(vel, 1, 127))))
        self.ev.append((t + dur, 0, "off", ch, p, 0))

    def chord(self, ch, t, dur, pitches, vel):
        for p in pitches:
            self.note(ch, t, dur, p, vel)

    def cc(self, ch, t, num, val):
        self.ev.append((t, 0.5, "cc", ch, num, int(np.clip(val, 0, 127))))

    def ramp(self, ch, t0, t1, v0, v1, num=11):
        for k in range(int(max(2, (t1 - t0) * 30)) + 1):
            u = k / max(1, int(max(2, (t1 - t0) * 30)))
            self.cc(ch, t0 + (t1 - t0) * u, num, v0 + (v1 - v0) * u)

    def render(self, soundfont, gain=0.9):
        import mido
        mid = mido.MidiFile(type=1, ticks_per_beat=480)       # 120 bpm → 960 ticks per second
        tracks = {}
        for ch, prog in self.programs.items():
            tr = mido.MidiTrack(); mid.tracks.append(tr); tracks[ch] = [tr, 0]
            tr.append(mido.Message("program_change", channel=ch, program=prog, time=0))
            tr.append(mido.Message("control_change", channel=ch, control=7, value=110, time=0))
        for t, _, kind, ch, a, b in sorted(self.ev, key=lambda e: (e[0], e[1])):
            tr, last = tracks[ch]
            tick = int(round(max(t, 0) * 960))
            if kind == "on":
                msg = mido.Message("note_on", channel=ch, note=a, velocity=b, time=tick - last)
            elif kind == "off":
                msg = mido.Message("note_off", channel=ch, note=a, velocity=0, time=tick - last)
            else:
                msg = mido.Message("control_change", channel=ch, control=a, value=b, time=tick - last)
            tr.append(msg); tracks[ch][1] = tick
        end = int(round((DUR + 3.0) * 960))                     # keep the renderer running past the last note
        for ch, (tr, last) in tracks.items():
            tr.append(mido.Message("control_change", channel=ch, control=123, value=0, time=max(0, end - last)))
        with tempfile.TemporaryDirectory() as d:
            mpath, wpath = os.path.join(d, "s.mid"), os.path.join(d, "s.wav")
            mid.save(mpath)
            subprocess.run(["fluidsynth", "-ni", "-g", str(gain), "-R", "0", "-C", "0", "-r", str(SR), "-o", "synth.polyphony=512",
                            "-F", wpath, soundfont, mpath], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            x, sr = sf.read(wpath)
        assert sr == SR
        out = np.zeros((NS, 2)); m = min(NS, len(x)); out[:m] = x[:m]
        return out


# channels                               GM program
PIZZ, CELLO, CELESTA, TIMP, TAIKO = 0, 1, 2, 3, 4        # rhythm stem
STR, TREM, HORN, BRASS, BASS, CHOIR = 0, 1, 2, 3, 4, 5   # pad stem
PIANO = 0                                                 # piano stem

OST = {  # eighth-note ostinato cells
    "Dm": ["D2", "D2", "A2", "D2", "F2", "D2", "A2", "C3"],
    "Dm*": ["D2", "D2", "A2", "D2", "F2", "D2", "Bb2", "A2"],
    "Bb": ["Bb1", "Bb1", "F2", "Bb1", "D2", "Bb1", "F2", "A2"],
    "Gm": ["G1", "G1", "D2", "G1", "Bb1", "G1", "D2", "F2"],
    "A": ["A1", "A1", "E2", "A1", "C#2", "A1", "E2", "G2"],
}


def compose():
    rh, pad, pno = Midi(), Midi(), Midi()
    KEY = [CUE["s1.title"], CUE["s4.worth"], CUE["s5.bankruptcy"], CUE["s7.wrong"]]
    near_key = lambda t: any(abs(t - k) < 0.06 for k in KEY)
    for ch, prog in ((PIZZ, 45), (CELLO, 42), (CELESTA, 8), (TIMP, 47), (TAIKO, 116)):
        rh.program(ch, prog)
    for ch, prog in ((STR, 48), (TREM, 44), (HORN, 60), (BRASS, 61), (BASS, 43), (CHOIR, 52)):
        pad.program(ch, prog)
    pno.program(PIANO, 0)
    _chord = pno.chord

    def pchord(ch, t, dur, pitches, vel):
        # low piano "stabs" become a soft held note away from the turning points (they read as repeated booms)
        low = min(N(p) if isinstance(p, str) else p for p in pitches) <= N("A1")
        if low and vel >= 90 and not near_key(t):
            return _chord(ch, t, dur, [p for p in pitches if (N(p) if isinstance(p, str) else p) > N("A1")] or ["D2"], vel * 0.55)
        return _chord(ch, t, dur, pitches, vel)

    pno.chord = pchord

    def ost(t0, t1, cell, v0, v1, ch=CELLO, up=0, dur=0.17):
        k, t = 0, t0
        while t < t1 - 0.02:
            v = v0 + (v1 - v0) * (t - t0) / max(t1 - t0, 1e-3) + (12 if k % 4 == 0 else 0)
            rh.note(ch, t, dur, N(cell[k % len(cell)]) + up, v)
            t += EIGHTH; k += 1

    _note = rh.note

    def rnote(ch, t, dur, pitch, vel):
        if ch == TIMP and dur >= 0.55 and not near_key(t):
            vel *= 0.5
        return _note(ch, t, dur, pitch, vel)

    rh.note = rnote

    def roll(t0, t1, pitch, v0, v1, ch=TIMP, step=0.052):
        t = t0
        while t < t1:
            rh.note(ch, t, 0.08, pitch, v0 + (v1 - v0) * ((t - t0) / (t1 - t0)) ** 1.6)
            t += step

    KEY = [CUE["s1.title"], CUE["s4.worth"], CUE["s5.bankruptcy"], CUE["s7.wrong"]]
    near_key = lambda t: any(abs(t - k) < 0.06 for k in KEY)

    def taiko(t, v):
        # big drums only on the four turning points; elsewhere a light, varied frame-drum tap
        if near_key(t):
            rh.note(TAIKO, t, 0.5, "A2", v); rh.note(TAIKO, t + 0.004, 0.5, "D3", v * 0.85)
        else:
            rh.note(TAIKO, t, 0.3, ["E3", "F3", "G3"][int(t * 7) % 3], v * 0.42)

    def hold(ch, t0, t1, pitches, vel, e0=None, e1=None):
        pad.chord(ch, t0, t1 - t0, pitches, vel)
        if e0 is not None:
            pad.ramp(ch, t0, t1, e0, e1 if e1 is not None else e0)

    c = CUE
    # ── 1 · hook ───────────────────────────────────────────────────────────────────────────
    land, cut, title, s2 = c["s1.zoomEnd"], c["s1.cutLehman"], c["s1.title"], SC["s2"]["start"]
    hold(STR, land, title, ["D3", "A3", "D4", "F4"], 78, 38, 112)
    hold(BASS, land, s2 - 0.1, ["D1"], 76, 70, 96)
    ost(land, title - 0.1, ["D4", "A3", "F4", "A3", "D4", "A3", "G4", "A3"], 44, 82, ch=PIZZ)
    pno.chord(PIANO, land, 2.2, ["D1", "D2"], 92)
    pno.chord(PIANO, cut, 1.4, ["D1", "D2"], 82)
    roll(title - 0.55, title, "D2", 42, 112)
    rh.note(TIMP, title, 1.6, "D2", 127); taiko(title, 127); taiko(land, 92)
    hold(STR, title, s2 - 0.12, ["D2", "A2", "D3", "F3", "A3", "D4"], 112, 122, 58)
    hold(HORN, title, title + 2.0, ["D3", "A3"], 102, 118, 64)
    pno.chord(PIANO, title, 2.4, ["D1", "A1", "D2"], 120)

    # ── 2 · rewind / easy money / subprime ────────────────────────────────────────────────
    rw, banks, term, sub = c["s2.rewind"], c["s2.banks"], c["s2.term"], c["s2.subprime"]
    hold(STR, s2 + 0.05, banks - 0.1, ["A3", "E4"], 52, 52, 40)
    rh.note(CELESTA, s2 + 0.25, 0.8, "A5", 52); rh.note(CELESTA, s2 + 1.0, 0.8, "F5", 48)
    for k, p in enumerate(["D6", "C6", "Bb5", "A5", "G5", "F5", "E5", "D5", "C5", "Bb4", "A4", "G4"]):
        rh.note(PIZZ, rw + 0.05 + k * 0.135, 0.12, p, 64 - k * 2)
    pno.chord(PIANO, c["s2.rewindEnd"] - 0.25, 1.2, ["D3", "A3"], 72)
    # "easy money": brighter, F major, pizzicato and celesta
    prog = [("F", ["F3", "C4", "A4", "C4"], ["A5", "C6"], "F2"), ("C", ["E3", "C4", "G4", "C4"], ["G5", "E6"], "C2"),
            ("Dm", ["D3", "A3", "F4", "A3"], ["F5", "A5"], "D2"), ("Bb", ["Bb2", "F3", "D4", "F3"], ["D5", "F5"], "Bb1")]
    t = banks
    while t < term - 0.2:
        for name, cell, spark, root in prog:
            if t >= term - 0.2: break
            for k in range(4):
                rh.note(PIZZ, t + k * EIGHTH, 0.15, cell[k], 66 + (8 if k == 0 else 0))
            rh.note(CELESTA, t + EIGHTH, 0.5, spark[0], 50); rh.note(CELESTA, t + 3 * EIGHTH, 0.5, spark[1], 46)
            rh.note(CELLO, t, 0.22, root, 72); rh.note(CELLO, t + 2 * EIGHTH, 0.2, root, 60)
            hold(STR, t, t + 1.24, [N(cell[0]) + 12, N(cell[1]) + 12, N(cell[2])], 46)
            t += 4 * EIGHTH
    hold(TREM, term, s3 := SC["s3"]["start"], ["D3", "F3", "A3"], 70, 50, 96)
    hold(BASS, term, s3, ["D1"], 80)
    pno.chord(PIANO, sub, 1.6, ["D1", "D2", "A2"], 114); rh.note(TIMP, sub, 1.2, "D2", 116); taiko(sub, 112)
    hold(HORN, sub, sub + 1.2, ["D3", "F3"], 96, 110, 60)

    # ── 3 · the machine ───────────────────────────────────────────────────────────────────
    bund, prod, mbs, sec, sold = c["s3.bundled"], c["s3.products"], c["s3.mbs"], c["s3.securities"], c["s3.sold"]
    seq = ["Dm", "Dm", "Bb", "Gm"]
    for k, name in enumerate(seq):
        a, b = s3 + k * 2.5, min(s3 + (k + 1) * 2.5, sold)
        ost(a, b, OST[name], 56 + k * 9, 64 + k * 9)
        if a >= bund - 0.4:
            ost(max(a, bund), b, OST[name], 46 + k * 8, 56 + k * 8, ch=PIZZ, up=24, dur=0.13)
    ost(s3 + 10.0, sold, OST["Gm"], 86, 92)
    hold(STR, prod, s3 + 7.5, ["Bb2", "F3", "Bb3", "D4"], 74, 58, 96)
    hold(STR, s3 + 7.5, sold, ["G2", "D3", "G3", "Bb3"], 80, 92, 104)
    hold(HORN, mbs, mbs + 1.6, ["D3", "F3", "Bb3"], 92, 110, 70)
    taiko(c["s3.together"] + 0.4, 96); taiko(mbs, 106); taiko(sec, 102); rh.note(TIMP, mbs, 1.2, "D2", 102)
    # sold around the world: the harmony opens up
    s4 = SC["s4"]["start"]
    third = (s4 - sold) / 3
    world = [(["Bb2", "F3", "Bb3", "D4", "F4"], ["Bb3", "D4", "F4", "D4"], "Bb1"), (["F2", "C3", "F3", "A3", "C4"], ["A3", "C4", "F4", "C4"], "F1"),
             (["C3", "G3", "C4", "E4", "G4"], ["G3", "C4", "E4", "C4"], "C2")]
    for k, (ch_, cell, root) in enumerate(world):
        a = sold + k * third
        hold(STR, a, a + third - 0.02, ch_, 84, 88 + k * 8, 100 + k * 8)
        pno.chord(PIANO, a, third, [root, N(root) + 12], 84)
        j = 0
        while a + j * EIGHTH < a + third - 0.05:
            rh.note(PIZZ, a + j * EIGHTH, 0.14, N(cell[j % 4]) + 12, 70)
            j += 1
    taiko(sold, 92)

    # ── 4 · collapse ──────────────────────────────────────────────────────────────────────
    dflt, fellI, sud, worth, loss, s5 = c["s4.defaulting"], c["s4.fell"] + 0.62, c["s4.suddenly"], c["s4.worth"], c["s4.losses"], SC["s5"]["start"]
    hold(TREM, s4, sud, ["D2", "A2", "D3"], 66, 40, 84)
    hold(BASS, s4, loss, ["D1"], 78, 70, 100)
    pno.chord(PIANO, s4, 1.5, ["D1"], 72)
    pno.chord(PIANO, dflt, 1.6, ["D1", "D2"], 106); rh.note(TIMP, dflt, 1.2, "D2", 112); taiko(dflt, 106)
    pno.chord(PIANO, fellI, 1.6, ["D1", "A1"], 102); rh.note(TIMP, fellI, 1.2, "D2", 106)
    ost(sud, worth - 0.1, OST["Dm*"], 60, 96)
    ost(sud + 1.25, worth - 0.1, OST["Dm*"], 50, 82, ch=PIZZ, up=24, dur=0.13)
    hold(TREM, sud, worth, ["D3", "F3", "A3", "Eb4"], 78, 60, 110)
    flips = [sud + 0.55 + k * (worth - 0.12 - sud - 0.55) / 6 for k in range(1, 7)]
    for k, ft in enumerate(flips):
        rh.note(TIMP, ft, 0.6, ["D2", "C2", "Bb1", "A1", "G1", "F1"][k], 72 + k * 5)
    pno.chord(PIANO, worth, 2.2, ["D1", "D2", "F2", "A2"], 126); rh.note(TIMP, worth, 1.6, "D2", 127); taiko(worth, 127)
    hold(BRASS, worth, worth + 1.6, ["D2", "A2", "D3", "F3"], 116, 124, 62)
    hold(TREM, worth, loss, ["D3", "Eb3", "A3"], 82, 96, 72)
    # contagion: a semitone pulse that keeps getting louder, then stops dead
    stop = s5 - 0.03
    k, t = 0, loss
    while t < stop - 0.1:
        u = (t - loss) / (stop - loss)
        pad.note(BRASS, t, 0.26, "D2" if k % 2 == 0 else "Eb2", 68 + 52 * u)
        rh.note(CELLO, t, 0.16, "D2" if k % 2 == 0 else "Eb2", 70 + 50 * u)
        if k % 2 == 0:
            taiko(t, 78 + 46 * u)
        t += EIGHTH; k += 1
    hold(TREM, loss, stop, ["D3", "F3", "Ab3", "B3"], 96, 78, 127)
    hold(BASS, loss, stop, ["D1"], 96)
    roll(stop - 1.25, stop, "D2", 50, 124)
    n3 = (s5 - 0.25 - loss - 0.5) / 3
    for k, v in enumerate((100, 108, 118)):
        pno.chord(PIANO, loss + 0.5 + k * n3, 1.2, ["D1", "D2"], v)

    # ── 5 · Lehman ────────────────────────────────────────────────────────────────────────
    leh, bk, old, gone, larg, lw, s6 = c["s5.lehman"], c["s5.bankruptcy"], c["s5.old"], c["s5.gone"], c["s5.largest"], c["s5.largestWord"], SC["s6"]["start"]
    hold(BASS, s5 + 0.3, bk, ["D1"], 70, 28, 96)
    hold(STR, s5 + 0.3, bk, ["D2", "A2"], 62, 24, 100)
    pno.chord(PIANO, c["s5.date"], 2.0, ["D2"], 60); pno.chord(PIANO, c["s5.date"] + 1.5, 2.0, ["A1"], 62)
    pno.chord(PIANO, leh, 1.4, ["D1", "D2"], 102); taiko(leh, 102); rh.note(TIMP, leh, 0.9, "D2", 96)
    pno.chord(PIANO, leh + 0.18, 1.4, ["A1", "A2"], 94); taiko(leh + 0.18, 92)
    roll(bk - 0.62, bk, "D2", 44, 122)
    pno.chord(PIANO, bk, 3.0, ["D1", "D2", "A2", "D3"], 127); rh.note(TIMP, bk, 2.0, "D2", 127); taiko(bk, 127); taiko(bk + 0.012, 120)
    hold(BRASS, bk, bk + 2.1, ["D2", "A2", "D3", "F3", "A3"], 124, 127, 52)
    hold(STR, bk, old - 0.05, ["D2", "A2", "D3", "F3", "A3", "D4"], 116, 124, 46)
    hold(CHOIR, bk, bk + 2.2, ["D3", "A3"], 78, 110, 40)
    # elegy
    hold(STR, old, old + 2.1, ["D3", "A3", "F4"], 56, 56, 62)
    hold(STR, old + 2.1, gone, ["Bb2", "F3", "D4"], 56, 62, 56)
    hold(STR, gone, larg, ["G2", "D3", "Bb3"], 54, 56, 30)
    for dt, p, v, d in ((0.16, "A4", 74, 1.1), (1.16, "G4", 66, 1.0), (2.1, "F4", 72, 1.0), (3.05, "E4", 62, 0.9)):
        pno.note(PIANO, old + dt, d, p, v)
    pno.note(PIANO, old + 2.1, 1.6, "Bb2", 54)
    pno.chord(PIANO, gone, 2.4, ["D4"], 80); pno.chord(PIANO, gone, 2.4, ["D2", "A2"], 70)
    # the scale of it
    ost(larg, s6 - 0.05, OST["Dm"], 60, 104)
    ost(lw, s6 - 0.05, OST["Dm"], 52, 88, ch=PIZZ, up=24, dur=0.13)
    hold(STR, larg, s6, ["D3", "A3", "D4"], 76, 48, 118)
    slam = lw + 0.7
    rh.note(TIMP, slam, 1.2, "D2", 114); taiko(slam, 112); pno.chord(PIANO, slam, 1.6, ["D1", "D2"], 108)
    hold(HORN, s6 - 1.6, s6, ["D3", "F3", "A3"], 92, 40, 116)
    roll(s6 - 0.8, s6, "D2", 46, 118)

    # ── 6 · aftermath ─────────────────────────────────────────────────────────────────────
    crashI, froze, mil, jobs, homes, gov, step, stopW, coll, s7 = (c["s6.crashed"] + 0.42, c["s6.froze"], c["s6.millions"], c["s6.jobs"],
                                                                   c["s6.homes"], c["s6.governments"], c["s6.stepIn"], c["s6.stop"], c["s6.collapsing"], SC["s7"]["start"])
    ost(s6, froze - 0.02, OST["Dm"], 96, 110); ost(s6, froze - 0.02, OST["Dm"], 78, 92, ch=PIZZ, up=24, dur=0.13)
    hold(BRASS, s6, froze - 0.02, ["D2", "A2", "D3"], 104, 112, 116)
    hold(STR, s6, froze - 0.02, ["D3", "A3", "D4", "F4"], 96, 104, 116)
    # (the freeze: half a second in which almost everything stops)
    hold(STR, froze, mil, ["A5"], 46, 70, 40)
    ost(mil, homes, OST["Bb"], 98, 108); ost(mil, homes, OST["Bb"], 80, 90, ch=PIZZ, up=24, dur=0.13)
    hold(BRASS, mil, homes, ["Bb1", "F2", "Bb2"], 104, 112, 116); hold(STR, mil, homes, ["Bb2", "F3", "Bb3", "D4"], 96, 108, 116)
    ost(homes, gov, OST["A"], 102, 112); ost(homes, gov, OST["A"], 84, 94, ch=PIZZ, up=24, dur=0.13)
    hold(BRASS, homes, gov, ["A1", "E2", "A2", "C#3"], 108, 114, 120); hold(STR, homes, gov, ["A2", "E3", "A3", "C#4"], 100, 110, 120)
    for tt_, v in ((s6 + 0.02, 120), (crashI, 116), (froze, 104), (mil, 114), (jobs, 114), (homes, 116)):
        taiko(tt_, v)
    rh.note(TIMP, s6 + 0.02, 1.0, "D2", 112); rh.note(TIMP, crashI, 1.0, "D2", 112); rh.note(TIMP, homes, 1.0, "A1", 108)
    pno.chord(PIANO, s6 + 0.02, 1.4, ["D1", "D2"], 110); pno.chord(PIANO, crashI, 1.4, ["D1", "D2"], 108)
    # governments step in: the first major chords of the film
    g1, g2 = stopW - 0.1, coll - 0.12
    res = [(gov, g1, ["Bb2", "F3", "Bb3", "D4", "F4"], ["Bb3", "D4", "F4", "D4"], "Bb1"), (g1, g2, ["F2", "C3", "F3", "A3", "C4"], ["A3", "C4", "F4", "C4"], "F1"),
           (g2, s7 - 0.2, ["D2", "A2", "D3", "F3", "A3"], ["D4", "F4", "A4", "F4"], "D1")]
    for k, (a, b, ch_, cell, root) in enumerate(res):
        hold(STR, a, b, ch_, 86, [100, 104, 92][k], [104, 96, 0][k])
        hold(HORN, a, b, [N(ch_[2]) + 12, N(ch_[3]) + 12], 70, [84, 88, 70][k], [88, 76, 0][k])
        pno.chord(PIANO, a, min(b - a, 2.4), [root, N(root) + 12], [92, 86, 72][k])
        j = 0
        while a + j * EIGHTH < b - 0.05 and k < 2:
            rh.note(PIZZ, a + j * EIGHTH, 0.14, N(cell[j % 4]) + 12, 62)
            j += 1
    taiko(step, 106); rh.note(TIMP, step, 1.2, "Bb1", 102)
    for k, p in enumerate(["F5", "Bb5", "D6", "F6"]):
        rh.note(CELESTA, step + k * 0.07, 1.0, p, 62)

    # ── 7 · final thought ─────────────────────────────────────────────────────────────────
    sil, wrong = c["s7.silence"], c["s7.wrong"]
    hold(BASS, s7 + 0.2, sil, ["D1"], 62, 36, 52)
    hold(STR, s7 + 0.3, sil, ["D5", "A5"], 44, 22, 46)
    pad.ramp(STR, c["s7.that"], sil - 0.05, 46, 104)
    for t_, p, v in ((SC["s7"]["voStart"] + 0.1, "D4", 50), (SC["s7"]["voStart"] + 1.3, "A3", 46), (c["s7.entire"] + 0.05, "F3", 52), (c["s7.that"] + 0.4, "A4", 48), (c["s7.never"] + 0.3, "D5", 44)):
        pno.note(PIANO, t_, 2.0, p, v)
    pno.chord(PIANO, c["s7.assumption"], 2.4, ["D2", "A2", "D3"], 86)
    # the verdict
    pno.chord(PIANO, wrong, 3.4, ["D1", "D2", "A2", "D3", "F3"], 127); rh.note(TIMP, wrong, 2.4, "D2", 127); taiko(wrong, 127); taiko(wrong + 0.012, 122)
    hold(BRASS, wrong, wrong + 2.6, ["D2", "A2", "D3"], 112, 120, 30)
    hold(STR, wrong, DUR - 0.05, ["D2", "A2", "D3", "F3", "A3", "D4"], 112, 122, 0)
    hold(CHOIR, wrong, DUR - 0.1, ["D3", "A3"], 72, 100, 0)
    hold(BASS, wrong, DUR - 0.1, ["D1"], 100, 110, 0)
    pno.note(PIANO, wrong + 1.35, 2.0, "D5", 40)
    return rh, pad, pno


# ═════════════════════════════════ sound effects ═════════════════════════════════

def effects(hall_ir):
    fx, imp, amb = Bus(), Bus(), Bus()        # dry-ish foley · big impacts · beds (drones, ticks)
    c = CUE
    S = {k: v["start"] for k, v in SC.items()}

    def tickrun(t0, t1, step, v=0.5, pitch=1.0, alt=True, bus=amb):
        k, t = 0, t0
        while t < t1:
            bus.add(A.tick(pitch * (0.84 if alt and k % 2 else 1.0)), t, v, 0.12 if k % 2 else -0.12)
            t += step; k += 1

    def typing(t0, t1, chars, v=0.5, bell=False):
        for k in range(chars):
            fx.add(A.typekey(), t0 + (t1 - t0) * k / max(chars - 1, 1) + rng.uniform(-0.008, 0.008), v, rng.uniform(-0.25, 0.25))
        if bell:
            fx.add(A.typebell(), t1 + 0.05, v * 0.5)

    KEYS = [CUE["s1.title"], CUE["s4.worth"]]

    def big(t, level=1.0, sec=1.8, f0=104, f1=40, pre=0.45):
        if not any(abs(t - k) < 0.06 for k in KEYS):
            # a lighter accent instead of another sub boom: varied pitch so it never repeats exactly
            f = 150 + 60 * ((t * 13.7) % 1)
            imp.add(A.hit(0.45, f, f * 0.5, 0.6), t, 0.231 * level)
            fx.add(A.pan_sweep(A.whoosh(0.35, 700, 3800, 0.85, 1.2, 0.2), -0.2, 0.2), t - 0.3, 0.3 * level)
            return
        if pre:
            imp.add(A.reverse_swell(pre, ir=hall_ir), t - pre, 0.8 * level)
        imp.add(A.boom(sec, f0, f1), t, 1.25 * level)
        imp.add(A.pan(A.hit(0.5, 150, 60, 0.9), 0.0), t, 0.5 * level)

    # ── 1 · explosion of newspapers ──────────────────────────────────────────────
    imp.add(A.boom(1.4, 96, 40, noise_amt=0.9), 0.08, 0.85)
    amb.add(A.pan(A.lp(A.white(2.2), 90, 4) * A.hann_env(2.2, 0.12, 0.7), 0), 0.08, 1.6)
    nsheets = 19
    for i in range(nsheets):
        hero = i == nsheets - 1
        t0 = 1.1 if hero else 0.1 + (i / (nsheets - 1)) ** 1.55 * 0.98
        dur = 0.82 if hero else rng.uniform(0.6, 0.92)
        p = rng.uniform(-0.9, 0.9)
        fx.add(A.pan_sweep(A.whoosh(dur * 0.9, 500, 5200, 0.42, 0.9, 0.5), p, -p * 0.3), t0 - 0.02, 0.62 if not hero else 0.95)
        fx.add(A.paper_flap(0.2, rng.uniform(0.8, 1.3)), t0 + 0.06, 0.55, p)
        fx.add(A.paper_flap(0.16, rng.uniform(0.8, 1.3)), t0 + dur * 0.38, 0.42, p * 0.5)
        fx.add(A.paper_slap(), t0 + dur * 0.7, 0.5 if not hero else 1.0, p * 0.3)
    imp.add(A.hit(0.7, 110, 46, 0.5), 1.1 + 0.82 * 0.72, 0.341)             # the hero sheet lands
    fx.add(A.pan(A.rustle(1.2, 70), 0), 1.85, 0.4)
    amb.add(A.pan(A.drone(2.4, 36.7, 0.2) * A.hann_env(2.4, 0.75, 0.8), 0), 1.75, 0.9)
    tickrun(2.1, 3.95, 0.5, 0.42)
    fx.add(A.marker(c["s1.circleEnd"] - c["s1.circleStart"] + 0.06, 1.0), c["s1.circleStart"], 1.0, -0.05)
    fx.add(A.tick(0.6), c["s1.circleEnd"] + 0.1, 0.35)
    # the dive through the page
    z0, z1 = c["s1.zoomStart"], c["s1.zoomEnd"]
    zl = z1 - z0
    fx.add(A.pan(A.riser(zl * 0.55, 140, 6000), 0), z0, 0.9)
    fx.add(A.pan_sweep(A.whoosh(zl * 0.5, 250, 7000, 0.78, 0.8, 0.6), -0.4, 0.4), z0 + zl * 0.12, 1.1)
    fx.add(A.pan(A.sweep_bp(A.white(0.22), 6000, 500, 0.9) * A.env(0.22, 0.004, 0.09), 0), z0 + zl * 0.4, 1.25)   # paper tears
    fx.add(A.pan(A.rustle(0.5, 160), 0), z0 + zl * 0.36, 0.6)
    imp.add(A.reverse_swell(0.3, ir=hall_ir), z0 + zl * 0.74 - 0.3, 0.6)
    imp.add(A.boom(1.5, 100, 40), z0 + zl * 0.74, 0.95)
    fx.add(A.pan_sweep(A.whoosh(0.7, 4000, 300, 0.2, 0.9, 0.3), 0.3, -0.3), z0 + zl * 0.72, 0.5)                 # air settling
    fx.add(A.shutter(), c["s1.cutLehman"], 0.9); imp.add(A.hit(0.6, 100, 44, 0.3), c["s1.cutLehman"], 0.275)
    big(c["s1.title"], 1.0, 2.0)
    fx.add(A.pan_sweep(A.whoosh(0.3, 600, 5000, 0.7), -0.3, 0.3), c["s1.titleOut"], 0.6)

    # ── 2 ────────────────────────────────────────────────────────────────────────
    s2 = S["s2"]
    fx.add(A.pan(A.pop(1.0, 300), 0), s2, 0.5)
    tickrun(s2 + 0.3, c["s2.rewind"] - 0.05, 0.5, 0.4)
    r0, r1 = c["s2.rewind"], c["s2.rewindEnd"] - 0.25
    step = (r1 - r0) / 3
    wow = A.sweep_bp(A.white(r1 - r0 + 0.1), 900, 2600, 2.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * A.tt(r1 - r0 + 0.1)))
    fx.add(A.pan_sweep(A.fade(wow, 0.05, 0.1), 0.4, -0.4), r0, 0.5)                                              # tape spooling back
    tickrun(r0, r1, 0.09, 0.26, 1.5, alt=False, bus=fx)
    for k in range(3):
        fx.add(A.clack(1.0 - k * 0.08), r0 + (k + 1) * step - 0.03, 0.85)
        imp.add(A.hit(0.35, 90, 50, 0.2), r0 + (k + 1) * step - 0.03, 0.165 + 0.12 * k)
    b0 = c["s2.banks"] - 0.32
    fx.add(A.pan_sweep(A.whoosh(0.45, 300, 4200, 0.5), 0, 0), b0, 0.7)
    for k in range(9):
        fx.add(A.paper_flap(0.12, 1.5), b0 + 0.42 + k * 0.16, 0.2, -0.5 + k * 0.12)
    fx.add(A.ping(1568, 0.7), b0 + 0.45, 0.14)
    for k, (key, pn) in enumerate((("s2.contracts", -0.3), (None, 0.3), (None, 0.0))):
        at = [c["s2.contracts"], c["s2.contracts"] + 0.55, c["s2.stamp2"] + 0.2][k]
        fx.add(A.pan_sweep(A.paper_slide(0.36), pn * 2, pn), at, 0.6)
        fx.add(A.paper_slap(), at + 0.3, 0.75, pn)
    for k, key in enumerate(("s2.stamp1", "s2.stamp2", "s2.stamp3")):
        fx.add(A.stamp(), c[key], 1.15, [-0.25, 0.25, 0.0][k]); imp.add(A.hit(0.4, 95, 48, 0.2), c[key], 0.231)
    fx.add(A.marker(0.4, 0.9), c["s2.barely"] + 0.22, 0.75, 0.2); fx.add(A.marker(0.34, 0.9), c["s2.barely"] + 0.72, 0.75, 0.25)
    fx.add(A.pan_sweep(A.whoosh(0.4, 500, 5200, 0.6), -0.2, 0.2), c["s2.term"] - 0.14, 0.75)
    big(c["s2.subprime"], 0.8, 1.4, pre=0.3)
    fx.add(A.pan_sweep(A.whoosh(0.28, 900, 6000, 0.5, 1.4), -0.6, 0.6), c["s2.subprime"] - 0.03, 0.6)             # highlighter swipe
    for k in range(9):
        fx.add(A.pop(0.5, 420 + k * 28), c["s2.mortgagesWord"] + k * 0.028 + 0.05, 0.25, -0.4 + k * 0.1)
    typing(c["s2.mortgagesWord"] + 0.44, S["s3"] - 0.26, 15, 0.42, bell=False)

    # ── 3 ────────────────────────────────────────────────────────────────────────
    s3 = S["s3"]
    fx.add(A.pan_sweep(A.whoosh(0.35, 400, 3600, 0.5), 0.3, -0.3), s3 - 0.05, 0.45)
    for k in range(9):
        fx.add(A.pop(0.4, 640 + k * 20), s3 + 0.45 + k * 0.05, 0.22, -0.5 + k * 0.12)
    fx.add(A.pan_sweep(A.whoosh(0.3, 300, 3000, 0.6), 0, 0), c["s3.keep"] - 0.12, 0.45)
    fx.add(A.marker(0.3, 1.2), c["s3.keep"] + 0.4, 1.0); imp.add(A.hit(0.45, 100, 50, 0.3), c["s3.keep"] + 0.66, 0.275)
    bund = c["s3.bundled"]
    fx.add(A.pan_sweep(A.whoosh(0.55, 500, 5000, 0.5), -0.5, 0.5), bund - 0.5, 0.5)
    for i in range(0, 150, 2):                                                       # 150 sheets raining onto the pile
        at = bund + (i / 150) ** 0.82 * 1.28
        fx.add(A.paper_flap(0.1, rng.uniform(1.0, 1.8)), at + 0.12, 0.2, rng.uniform(-0.7, 0.7))
        fx.add(A.paper_slap(0.07), at + 0.4, 0.22, rng.uniform(-0.2, 0.2))
    tickrun(bund + 0.15, bund + 1.75, 0.045, 0.13, 1.9, alt=False, bus=fx)          # the counter spinning
    fx.add(A.pan(A.rise_tone(1.6, 200, 520, 0.16), 0), bund + 0.15, 1.0)
    imp.add(A.hit(0.6, 100, 44, 0.4), c["s3.together"] + 0.4, 0.413)
    fx.add(A.pan(A.shimmer(0.7, 740), 0), c["s3.products"] - 0.02, 0.22)
    fx.add(A.clack(0.7), c["s3.products"] + 0.48, 0.8)
    fx.add(A.pan(A.shimmer(0.9, 1175), 0), c["s3.products"] + 0.55, 0.1)
    big(c["s3.mbs"], 0.62, 1.3, pre=0.25)
    fx.add(A.stamp(), c["s3.securities"], 1.2, 0.2); imp.add(A.hit(0.4, 95, 48, 0.25), c["s3.securities"], 0.264)
    sold = c["s3.sold"]
    fx.add(A.pan_sweep(A.whoosh(0.6, 300, 4500, 0.55), 0.5, -0.5), sold - 0.1, 0.7)
    penta = [587.3, 698.5, 784.0, 880.0, 1046.5, 1174.7, 1396.9]
    for k, d in enumerate([0.0, 0.08, 0.16, 0.22, 0.3, 0.36, 0.42, 0.52, 0.58, 0.66, 0.76, 0.84, 0.92, 1.0]):
        fx.add(A.ping(penta[k % len(penta)], 0.8), sold + 0.32 + d * 1.25 + 0.62, 0.2, rng.uniform(-0.6, 0.6))
    for k in range(4):
        fx.add(A.pop(0.5, 500 + 60 * k), sold + 1.05 + k * 0.16, 0.25, -0.3 + k * 0.2)

    # ── 4 ────────────────────────────────────────────────────────────────────────
    s4 = S["s4"]
    fx.add(A.shutter(), s4 - 0.02, 0.7); imp.add(A.hit(0.7, 90, 40, 0.2), s4, 0.275)
    amb.add(A.pan(A.drone(4.4, 36.7, 0.3, 5) * A.hann_env(4.4, 0.6, 0.6), 0), s4, 0.8)
    fx.add(A.stamp(1.3), c["s4.defaulting"], 1.5); big(c["s4.defaulting"], 0.7, 1.3, pre=0.25)
    fx.add(A.pan_sweep(A.paper_slide(0.45), -0.5, 0.5), c["s4.house"] - 0.02, 0.8)
    fx.add(A.pan(A.rise_tone(c["s4.fell"] - c["s4.house"] - 0.22, 220, 620, 0.2), 0), c["s4.house"] + 0.12, 1.0)
    fx.add(A.pan(A.glide(0.62, 620, 92), 0), c["s4.fell"], 0.42)
    big(c["s4.fell"] + 0.62, 0.72, 1.4, pre=0.0)
    sud, worth = c["s4.suddenly"], c["s4.worth"]
    fx.add(A.pan_sweep(A.whoosh(0.4, 400, 4200, 0.6), 0.4, -0.4), sud - 0.16, 0.7); imp.add(A.hit(0.7, 100, 42, 0.4), sud, 0.385)
    for k in range(1, 7):
        ft = sud + 0.55 + k * (worth - 0.12 - sud - 0.55) / 6
        fx.add(A.clack(1.0 - k * 0.07), ft - 0.03, 0.9, 0.3); fx.add(A.ping(520 * (0.89 ** k), 0.5, dark=True), ft, 0.2, 0.3)
    fx.add(A.pan(A.crack(0.32, 90, 0.7), 0), worth - 0.32, 0.5)
    big(worth, 1.0, 1.9, pre=0.3)
    fx.add(A.pan(A.crack(0.5, 140, 0.8), 0), worth, 0.7)
    for k in range(42):
        fx.add(A.paper_flap(0.14, rng.uniform(0.8, 1.6)), worth + 0.05 + rng.uniform(0, 1.5) ** 1.2, 0.3, rng.uniform(-0.9, 0.9))
    imp.add(A.hit(0.5, 100, 46, 0.4), worth + 0.3, 0.275)
    loss, s5 = c["s4.losses"], S["s5"]
    fx.add(A.pan_sweep(A.whoosh(0.6, 250, 3600, 0.6), -0.4, 0.4), loss - 0.1, 0.7)
    amb.add(A.pan(A.drone(s5 - loss, 36.7, 0.55, 9) * np.linspace(0.3, 1.0, n(s5 - loss)) ** 1.5, 0), loss, 1.25)
    for k, d in enumerate([0.0, 0.05, 0.12, 0.2, 0.26, 0.36, 0.44, 0.5, 0.55, 0.58, 0.66, 0.74, 0.8, 0.88, 0.92, 0.96, 1.0]):
        fx.add(A.ping([311.1, 293.7, 329.6, 277.2][k % 4] * (2 if k % 3 == 0 else 1), 0.7, dark=True), loss + 0.25 + d * 1.9 + 0.5, 0.26, rng.uniform(-0.7, 0.7))
    n3 = (s5 - 0.25 - loss - 0.5) / 3
    for k in range(3):
        imp.add(A.hit(0.7, 110, 44, 0.5), loss + 0.5 + k * n3, 0.303 + 0.15 * k); fx.add(A.clack(1.0 + 0.1 * k), loss + 0.5 + k * n3, 0.7)
    fx.add(A.pan(A.riser(1.7, 180, 7000), 0), s5 - 1.72, 0.85)

    # ── 5 ────────────────────────────────────────────────────────────────────────
    amb.add(A.pan(A.drone(c["s5.lehman"] - s5, 36.7, 0.18, 11) * A.hann_env(c["s5.lehman"] - s5, 0.8, 0.7), 0), s5 + 0.1, 0.8)
    tickrun(s5 + 0.42, c["s5.lehman"] - 0.2, 1.0, 0.55, 0.9)
    typing(s5 + 0.45, s5 + 0.95, 13, 0.5); typing(s5 + 1.0, s5 + 1.9, 25, 0.5, bell=True)
    fx.add(A.tick(1.8), s5 + 0.58, 0.3, 0.3); fx.add(A.tick(1.8), s5 + 0.72, 0.3, 0.3)          # viewfinder locks on
    big(c["s5.lehman"], 0.72, 1.3, pre=0.25); imp.add(A.hit(0.8, 105, 42, 0.4), c["s5.lehman"] + 0.18, 0.385)
    typing(c["s5.lehman"] + 0.54, c["s5.bankruptcy"] - 0.22, 17, 0.5)
    bk = c["s5.bankruptcy"]
    imp.add(A.reverse_swell(0.6, 73.4, hall_ir), bk - 0.6, 1.0)
    imp.add(A.boom(3.0, 118, 38, drive=3.2, click=0.8, noise_amt=0.8), bk, 1.7)                     # the big one
    imp.add(A.boom(1.2, 180, 55, drive=3.0), bk, 0.7); imp.add(A.pan(A.crack(0.25, 80, 0.5), 0), bk, 0.35)
    amb.add(A.pan(A.lp(A.white(2.6), 70, 4) * A.env(2.6, 0.01, 1.4, 3), 0), bk, 2.4)                # rumble tail
    old = c["s5.old"]
    fx.add(A.shutter(), old - 0.01, 0.5)
    n158 = c["s5.158"]
    tickrun(n158 - 0.05, n158 + 0.85, 0.05, 0.16, 1.6, alt=False, bus=fx); fx.add(A.ping(1174.7, 0.9), n158 + 0.86, 0.16)
    fx.add(A.pan_sweep(A.paper_slide(0.45), 0.0, 0.0), n158 + 1.33, 0.75); fx.add(A.paper_slap(), n158 + 1.78, 0.7)
    fx.add(A.marker(0.3, 1.0), n158 + 1.9, 0.8, -0.2); fx.add(A.marker(0.22, 1.0), n158 + 2.22, 0.8, -0.3)
    gone = c["s5.gone"]
    fx.add(A.pan(A.power_down(1.2), 0), gone, 0.8); imp.add(A.boom(1.8, 62, 26, noise_amt=0.3, click=0.1), gone + 0.02, 0.8)
    larg, lw = c["s5.largest"], c["s5.largestWord"]
    fx.add(A.pan_sweep(A.whoosh(0.4, 400, 4200, 0.6), -0.3, 0.3), larg - 0.1, 0.55)
    fx.add(A.pan_sweep(A.whoosh(0.4, 500, 2600, 0.7), -0.6, -0.2), larg + 0.25, 0.3)
    fx.add(A.pan_sweep(A.riser(0.74, 200, 5200), -0.7, 0.7), lw - 0.02, 0.6)
    tickrun(lw, lw + 0.72, 0.04, 0.14, 1.7, alt=False, bus=fx)
    big(lw + 0.7, 0.85, 1.6, pre=0.0)
    for k in range(2):
        fx.add(A.pop(0.6, 480 + 80 * k), lw + 1.12 + k * 0.22, 0.3)
    s6 = S["s6"]
    fx.add(A.pan(A.riser(0.9, 300, 6000), 0), s6 - 0.92, 0.5)

    # ── 6 ────────────────────────────────────────────────────────────────────────
    big(s6 + 0.02, 0.8, 1.3, pre=0.0)
    cr = c["s6.crashed"] + 0.42
    fx.add(A.pan(A.glide(cr - s6 - 0.4, 700, 80), 0), s6 + 0.4, 0.45); big(cr, 0.85, 1.4, pre=0.0)
    fx.add(A.pan_sweep(A.paper_slide(0.4), -0.4, 0.2), c["s6.credit"], 0.7); fx.add(A.paper_slap(), c["s6.credit"] + 0.34, 0.7)
    fz = c["s6.froze"]
    fx.add(A.pan(A.crack(0.6, 170, 1.25), 0), fz, 0.75); fx.add(A.pan(A.shimmer(1.0, 2093), 0), fz, 0.16)
    imp.add(A.hit(0.5, 130, 60, 0.9), fz, 0.330)
    fx.add(A.pan(A.crack(0.5, 40, 1.4), 0), fz + 0.35, 0.3)
    for key in ("s6.millions", "s6.jobs", "s6.homes"):
        fx.add(A.shutter(), c[key] - 0.01, 0.95); imp.add(A.hit(0.8, 100, 42, 0.5), c[key], 0.440)
    gov = c["s6.governments"]
    fx.add(A.pan_sweep(A.paper_slide(0.4), 0.4, -0.1), gov, 0.7); fx.add(A.paper_slap(), gov + 0.34, 0.7)
    big(c["s6.stepIn"], 0.7, 1.4, pre=0.25); fx.add(A.pan(A.shimmer(1.2, 932.3), 0), c["s6.stepIn"], 0.14)
    g0 = c["s6.stop"] - 0.1
    fx.add(A.pan_sweep(A.whoosh(0.55, 300, 4200, 0.6), 0.4, -0.4), g0 - 0.05, 0.6)
    for k, d in enumerate((0.1, 0.42, 0.7, 0.98)):
        fx.add(A.ping([932.3, 1174.7, 1396.9, 1864.7][k], 1.0), g0 + 0.42 + d, 0.26, [-0.5, -0.1, 0.4, 0.2][k])
        imp.add(A.hit(0.35, 90, 50, 0.2), g0 + 0.42 + d, 0.143)
    v0 = c["s6.collapsing"] - 0.12
    s7 = S["s7"]
    fx.add(A.clack(0.6), v0, 0.8); fx.add(A.pan_sweep(A.whoosh(0.3, 800, 3000, 0.5), 0, 0), v0 - 0.12, 0.4)
    bed = A.tape_bed(s7 - v0)
    amb.add(A.pan(A.fade(bed, 0.08, 0.35), 0), v0, 0.5)

    # ── 7 ────────────────────────────────────────────────────────────────────────
    sil, wrong = c["s7.silence"], c["s7.wrong"]
    amb.add(A.pan(A.fade(A.drone(sil - s7, 36.7, 0.12, 13), 1.2, 0.03), 0), s7, 0.75)
    tickrun(s7 + 0.45, sil - 0.2, 1.0, 0.62, 0.85)
    built = c["s7.entire"]
    fx.add(A.tock(0.7, 0.8), built - 0.05, 0.6)
    for k in range(4):
        fx.add(A.tock(1.0, 1.0 + 0.09 * k), built + 0.42 + k * 0.36 + 0.14, 0.7, [-0.1, 0.1, -0.05, 0.05][k])
    imp.add(A.boom(1.6, 70, 30, noise_amt=0.3, click=0.2), c["s7.assumption"], 0.75)
    fx.add(A.marker(0.75, 0.6), c["s7.that"] - 0.08, 0.4)
    for k in range(8):
        fx.add(A.tick(1.2 + 0.11 * k), c["s7.that"] + 0.62 + k * 0.1, 0.2, -0.2 + 0.08 * k)
    # silence … then the verdict
    imp.add(A.reverse_swell(0.3, 73.4, hall_ir), wrong - 0.3, 0.9)
    imp.add(A.boom(3.2, 116, 37, drive=3.2, click=0.8, noise_amt=0.8), wrong, 1.7)
    imp.add(A.boom(1.2, 170, 52, drive=3.0), wrong, 0.6)
    amb.add(A.pan(A.lp(A.white(2.8), 65, 4) * A.env(2.8, 0.01, 1.6, 3), 0), wrong, 2.2)
    for k in range(9):                                                                # the tower coming down, far away
        imp.add(A.hit(0.5, 80, 40, 0.1), wrong + 0.25 + k * 0.13 + rng.uniform(0, 0.028), 0.2 * (1 - k / 11), rng.uniform(-0.5, 0.5))
    return fx, imp, amb


# ═════════════════════════════════ mix ═════════════════════════════════

def follow(x, attack=0.03, release=0.3):
    """Envelope follower (mono in, linear level out)."""
    e = np.abs(x)
    blk = n(0.005)
    m = np.array([e[i:i + blk].max() for i in range(0, len(e), blk)])
    out = np.empty_like(m); s = 0.0
    aa, ar = np.exp(-0.005 / attack), np.exp(-0.005 / release)
    for i, v in enumerate(m):
        s = (aa if v > s else ar) * s + (1 - (aa if v > s else ar)) * v
        out[i] = s
    return np.repeat(out, blk)[: len(e)]


def limiter(x, ceiling=0.89, look=0.004, release=0.12):
    """Look-ahead peak limiter."""
    peak = np.abs(x).max(1)
    k = n(look)
    ahead = np.array(signal.lfilter(np.ones(1), [1.0], peak))
    from scipy.ndimage import maximum_filter1d
    ahead = maximum_filter1d(peak, 2 * k + 1)
    gain = np.minimum(1.0, ceiling / np.maximum(ahead, 1e-9))
    ar = np.exp(-1 / (release * SR))
    g = gain.copy()
    for i in range(1, len(g)):                     # instant attack (already look-ahead), smooth release
        g[i] = min(gain[i], g[i - 1] * ar + (1 - ar))
    g = signal.filtfilt(np.ones(k) / k, [1.0], g)
    return x * np.minimum(g, gain)[:, None] if False else x * g[:, None]


def true_peak(x):
    return np.abs(signal.resample_poly(x, 4, 1, axis=0)).max()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--soundfont", default="/usr/share/sounds/sf2/FluidR3_GM.sf2")
    args = ap.parse_args()
    import pyloudnorm as pyln

    hall = A.reverb_ir(2.6, seed=3)
    room = A.reverb_ir(0.45, bright=7000, dark=2500, seed=5, predelay=0.004)

    print("score …")
    rh, pad, pno = compose()
    m_rh, m_pad, m_pno = rh.render(args.soundfont, 0.8), pad.render(args.soundfont, 0.7), pno.render(args.soundfont, 0.9)
    music = m_rh * 0.95 + A.hp(m_pad, 35) * 0.9 + m_pno * 1.05
    music = music + A.convolve(m_rh * 0.25 + m_pad * 0.5 + m_pno * 0.45, hall)[:NS] * 0.5
    music = A.hp(music, 30)
    # the SoundFont is dark: open the top end so strings and pizzicato read on small speakers
    air = A.hp(music, 3200, 1)
    music = music + air * 0.9

    print("effects …")
    fx, imp, amb = effects(hall)
    sfx = fx.b + A.convolve(fx.b, hall)[:NS] * 0.16 + A.convolve(fx.b, room)[:NS] * 0.12
    sfx = A.lp(A.hp(sfx, 110), 11500)
    # impacts: keep the weight but move it up where phone speakers can reproduce it (harmonics from saturation)
    impacts = A.hp(imp.b + A.convolve(imp.b, hall)[:NS] * 0.3, 34, 4)
    impacts = np.tanh(impacts * 1.5) / 1.5 + A.bp(np.tanh(impacts * 4.0), 90, 420) * 0.22
    beds = A.hp(amb.b + A.convolve(amb.b, hall)[:NS] * 0.2, 34, 4)

    print("narration …")
    vo = np.zeros(NS)
    for key, s in SC.items():
        x, sr = sf.read(os.path.join(ROOT, "public", s["voFile"]))
        assert sr == SR
        i = int(round(s["voStart"] * SR)); vo[i:i + len(x)] += x[: NS - i]
    vo_st = A.pan(vo, 0) * 1.41 + A.convolve(vo, room)[:NS] * 0.07

    # duck everything else under the voice
    env = follow(vo, 0.04, 0.45)
    speaking = np.clip(env / 0.05, 0, 1)
    duck_music = (1 - 0.62 * speaking)[:, None]
    duck_fx = (1 - 0.52 * speaking)[:, None]
    duck_imp = (1 - 0.52 * speaking)[:, None]

    # the two silences are absolute: before "On September fifteenth" and before "THEY WERE WRONG."
    gate = np.ones(NS)
    def mute(t0, t1, f_in=0.02, f_out=0.05):
        a, b = int(t0 * SR), int(t1 * SR)
        gate[a:b] = 0
        gate[max(a - n(f_in), 0):a] *= np.linspace(1, 0, min(n(f_in), a))
        e = min(b + n(f_out), NS)
        gate[b:e] = np.minimum(gate[b:e], np.linspace(0, 1, e - b))
    s5, wrong, sil = SC["s5"]["start"], CUE["s7.wrong"], CUE["s7.silence"]
    mute(s5 - 0.012, s5 + 0.2)
    music_gate = gate.copy()
    a, b = int(sil * SR), int((wrong - 0.02) * SR)
    music_gate[a:b] = 0; music_gate[a - n(0.05):a] *= np.linspace(1, 0, n(0.05))
    # "credit froze": the score drops out for half a second
    fz = CUE["s6.froze"]
    a, b = int(fz * SR), int((CUE["s6.millions"] - 0.03) * SR)
    dip = np.ones(NS); dip[a:b] = 0.12; dip = signal.filtfilt(np.ones(n(0.03)) / n(0.03), [1.0], dip)

    music_bus = music * duck_music * music_gate[:, None] * dip[:, None] * 0.62
    sfx_bus = sfx * duck_fx * gate[:, None] * 0.27
    imp_bus = impacts * duck_imp * gate[:, None] * 0.50
    bed_bus = beds * duck_fx * music_gate[:, None] * 0.24
    mix = vo_st * 1.0 + music_bus + sfx_bus + imp_bus + bed_bus

    # the film fades out before the brand card; the card has its own sting
    f0 = int(CUE["s7.fadeOut"] * SR); f1 = int(CUE["outro.start"] * SR)
    fadec = np.ones(NS); fadec[f0:f1] = np.cos(np.linspace(0, np.pi / 2, f1 - f0)) ** 2; fadec[f1:] = 0
    o = CUE["outro.start"]; ob = Bus()
    ob.add(A.pan_sweep(A.whoosh(0.5, 300, 4000, 0.7), -0.3, 0.3), o - 0.2, 0.5)
    ob.add(A.hit(0.9, 120, 55, 0.4), o + 0.1, 0.55)
    for k, f in enumerate((293.7, 440.0, 587.3, 698.5)):
        ob.add(A.ping(f, 2.6, 0.9), o + 0.12 + k * 0.03, 0.22, [-0.3, 0.3, -0.1, 0.1][k])
    ob.add(A.pan_sweep(A.whoosh(0.4, 900, 6000, 0.6, 1.4), -0.5, 0.5), o + 0.45, 0.35)
    ob.add(A.pan(A.shimmer(1.6, 587.3), 0), o + 0.5, 0.12)
    ob.add(A.pop(0.6, 640), o + 1.05, 0.3)
    outro = ob.b + A.convolve(ob.b, hall)[:NS] * 0.35
    e0 = int((DUR - 0.5) * SR); outro[e0:] *= np.linspace(1, 0, NS - e0)[:, None]
    stems = {"narration": vo_st * fadec[:, None], "music": music_bus * fadec[:, None], "effects": (sfx_bus + imp_bus + bed_bus) * fadec[:, None] + outro * 0.8}
    mix = mix * fadec[:, None] + outro * 0.8
    mix = mix[: n(DUR)]

    # master: glue, loudness to −14 LUFS (Instagram's target), true peak under −1 dBTP
    meter = pyln.Meter(SR)
    mix = A.hp(mix, 22)                      # no DC, no inaudible rumble eating headroom
    mix = np.tanh(mix * 1.15) / 1.15
    for _ in range(4):
        loud = meter.integrated_loudness(mix)
        mix = limiter(mix * 10 ** ((-14.0 - loud) / 20), ceiling=0.86)
    tp = true_peak(mix)
    if tp > 0.89:
        mix *= 0.89 / tp
    loud = meter.integrated_loudness(mix)
    print(f"integrated loudness {loud:.1f} LUFS · true peak {20 * np.log10(true_peak(mix)):.2f} dBTP · sample peak {np.abs(mix).max():.3f}")

    out = os.path.join(ROOT, "public", "audio")
    sf.write(os.path.join(out, "mix.wav"), mix, SR, subtype="PCM_16")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(out, "mix.wav"), "-c:a", "aac", "-b:a", "192k", os.path.join(out, "mix.m4a")], check=True)
    sd = os.path.join(ROOT, "assets_src", "audio_stems"); os.makedirs(sd, exist_ok=True)
    g = 10 ** ((-14.0 - meter.integrated_loudness(sum(stems.values())[: n(DUR)])) / 20)
    for name, x in stems.items():
        sf.write(os.path.join(sd, f"{name}.flac"), np.clip(x[: n(DUR)] * g, -1, 1), SR, subtype="PCM_16")
    print("written:", os.path.join(out, "mix.wav"))


if __name__ == "__main__":
    main()
