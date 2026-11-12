#!/usr/bin/env python3
"""Build src/data/timeline.json — the single source of truth for the edit.

The cut is driven by the narration: scene boundaries and every sync point ("cue") are
derived from the word timings in src/data/vo.json. Both the Remotion scenes and the
audio builder (scripts/build_audio.py) read this file, so picture and sound cannot drift.

Re-run after changing the voiceover:   python3 scripts/build_timeline.py
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
vo = json.load(open(os.path.join(ROOT, "src", "data", "vo.json")))["scenes"]

# (scene key, vo key, lead-in before narration, tail after narration)
PLAN = [
    ("s1", "s1_hook", 4.00, 0.28),
    ("s2", "s2_problem", 0.30, 0.34),
    ("s3", "s3_bigger_problem", 0.25, 0.35),
    ("s4", "s4_collapse", 0.25, 0.41),
    ("s5", "s5_lehman", 0.35, 0.39),
    ("s6", "s6_aftermath", 0.25, 0.50),
    ("s7", "s7_final", 0.45, 0.0),
]
WRONG_PAUSE = 0.90     # silence between the last word and "THEY WERE WRONG."
WRONG_HOLD = 2.95      # card + fade to black
OUTRO = 3.6            # Capital Decoded brand card

scenes, words, t = {}, {}, 0.0
for key, vkey, lead, tail in PLAN:
    d = vo[vkey]["duration"]
    scenes[key] = {"start": round(t, 3), "voStart": round(t + lead, 3), "voEnd": round(t + lead + d, 3),
                   "voFile": vo[vkey]["file"]}
    words[key] = [{"w": w["w"], "s": round(t + lead + w["s"], 3), "e": round(t + lead + w["e"], 3)} for w in vo[vkey]["words"]]
    t = t + lead + d + tail
    scenes[key]["end"] = round(t, 3)

wrong_t = scenes["s7"]["voEnd"] + WRONG_PAUSE
total = wrong_t + WRONG_HOLD
scenes["s7"]["end"] = round(total, 3)

def W(scene, word, nth=1):
    """Global start time of the nth occurrence of a spoken word in a scene."""
    n = 0
    for w in words[scene]:
        if w["w"].lower().strip(".,?:;").lstrip("-") == word.lower():
            n += 1
            if n == nth: return w["s"]
    raise KeyError(f"{scene}: word {word!r} (#{nth}) not found in {[w['w'] for w in words[scene]]}")

def WE(scene, word, nth=1):
    n = 0
    for w in words[scene]:
        if w["w"].lower().strip(".,?:;").lstrip("-") == word.lower():
            n += 1
            if n == nth: return w["e"]
    raise KeyError(word)

S = {k: v["start"] for k, v in scenes.items()}
cues = {
    # ── Scene 1 · the newspaper explosion ────────────────────────────────────────────────
    "s1.explosion": 0.12,
    "s1.settle": 2.00,            # motion slows, camera finds the headline
    "s1.circleStart": 2.92,
    "s1.circleEnd": 3.66,
    "s1.zoomStart": 4.00,         # narration starts here
    "s1.zoomEnd": 5.30,           # we are "inside" Wall Street
    "s1.cutLehman": W("s1", "banks") + 0.25,
    "s1.title": WE("s1", "collapsed") + 0.02,
    "s1.titleOut": scenes["s1"]["end"] - 0.22,
    # ── Scene 2 · subprime ───────────────────────────────────────────────────────────────
    "s2.rewind": W("s2", "we") - 0.10,
    "s2.rewindEnd": WE("s2", "years") + 0.25,
    "s2.banks": W("s2", "American") - 0.12,
    "s2.contracts": W("s2", "mortgages") - 0.20,
    "s2.stamp1": W("s2", "mortgages") + 0.18,
    "s2.stamp2": W("s2", "people") - 0.10,
    "s2.stamp3": W("s2", "barely") - 0.05,
    "s2.barely": W("s2", "barely"),
    "s2.term": W("s2", "These") - 0.10,
    "s2.subprime": W("s2", "subprime") - 0.04,
    "s2.mortgagesWord": W("s2", "mortgages", 2) - 0.04,
    # ── Scene 3 · securitisation ─────────────────────────────────────────────────────────
    "s3.keep": W("s3", "keep"),
    "s3.bundled": W("s3", "bundled") - 0.10,
    "s3.together": W("s3", "together"),
    "s3.products": W("s3", "financial") - 0.05,
    "s3.mbs": W("s3", "mortgage") - 0.06,
    "s3.securities": W("s3", "securities") if any(w["w"].lower().startswith("securities") for w in words["s3"]) else W("s3", "mortgage") + 1.0,
    "s3.sold": W("s3", "sold") - 0.12,
    "s3.world": W("s3", "world"),
    # ── Scene 4 · the collapse ───────────────────────────────────────────────────────────
    "s4.defaulting": W("s4", "defaulting") - 0.05,
    "s4.house": W("s4", "House") - 0.25,
    "s4.fell": W("s4", "fell"),
    "s4.suddenly": W("s4", "Suddenly") - 0.12,
    "s4.worth": W("s4", "worth") - 0.05,
    "s4.expected": W("s4", "expected"),
    "s4.losses": W("s4", "and") - 0.15,
    "s4.spread": W("s4", "spread"),
    "s4.system": W("s4", "system"),
    # ── Scene 5 · Lehman ─────────────────────────────────────────────────────────────────
    "s5.date": W("s5", "September") - 0.05,
    "s5.lehman": W("s5", "Lehman") - 0.08,
    "s5.bankruptcy": W("s5", "bankruptcy") + 0.02,
    "s5.old": W("s5", "A") - 0.25,
    "s5.158": W("s5", "158"),
    "s5.gone": W("s5", "gone"),
    "s5.largest": W("s5", "It") - 0.20,
    "s5.largestWord": W("s5", "largest"),
    "s5.history": W("s5", "history"),
    # ── Scene 6 · aftermath ──────────────────────────────────────────────────────────────
    "s6.markets": S["s6"] + 0.02,
    "s6.crashed": W("s6", "crashed"),
    "s6.credit": W("s6", "Credit") - 0.22,
    "s6.froze": W("s6", "Credit") + 0.42,
    "s6.millions": W("s6", "Millions") - 0.22,
    "s6.jobs": W("s6", "jobs") - 0.04,
    "s6.homes": W("s6", "homes") - 0.04,
    "s6.governments": W("s6", "Governments") - 0.30,
    "s6.stepIn": W("s6", "step"),
    "s6.stop": W("s6", "stop") - 0.05,
    "s6.collapsing": W("s6", "collapsing"),
    # ── Scene 7 · final thought ──────────────────────────────────────────────────────────
    "s7.part": WE("s7", "part"),
    "s7.entire": W("s7", "the", 2) - 0.10,
    "s7.built": W("s7", "built"),
    "s7.assumption": W("s7", "assumption"),
    "s7.that": W("s7", "that") - 0.08,
    "s7.never": W("s7", "never"),
    "s7.fall": W("s7", "fall"),
    "s7.silence": scenes["s7"]["voEnd"] + 0.12,
    "s7.wrong": wrong_t,
    "s7.fadeOut": total - 1.05,
    "outro.start": total,
    "outro.end": total + OUTRO,
}
cues = {k: round(v, 3) for k, v in cues.items()}

# Subtitles: hand-broken phrases (display text, number of spoken tokens it covers).
CAPTIONS = {
    "s1": [("In September 2008,", 3), ("one of the biggest", 4), ("investment banks", 2), ("in the world collapsed.", 4),
           ("And it was only", 4), ("the beginning.", 2)],
    "s2": [("To understand why,", 3), ("we need to go back", 5), ("a few years.", 3), ("American banks", 2),
           ("were handing out mortgages", 4), ("to people who could", 4), ("barely afford them.", 3),
           ("These were called", 3), ("subprime mortgages.", 2)],
    "s3": [("But banks didn't just keep", 5), ("these mortgages.", 2), ("They bundled thousands", 3), ("of them together", 3),
           ("into financial products", 3), ("called mortgage-backed securities,", 4), ("then sold them", 3),
           ("to investors", 2), ("around the world.", 3)],
    "s4": [("Then homeowners", 2), ("started defaulting.", 2), ("House prices fell.", 3), ("Suddenly, those supposedly", 3),
           ("valuable investments", 2), ("were worth far less", 4), ("than anyone expected.", 3), ("And the losses spread", 4),
           ("throughout the global", 3), ("financial system.", 2)],
    "s5": [("On September 15, 2008,", 4), ("Lehman Brothers", 2), ("filed for bankruptcy.", 3), ("A 158-year-old", 4),
           ("financial institution", 2), ("was gone.", 2), ("It was the largest bankruptcy", 5), ("in American history", 3),
           ("at the time.", 3)],
    "s6": [("Markets crashed.", 2), ("Credit froze.", 2), ("Millions lost", 2), ("their jobs and homes.", 4),
           ("Governments had to step in", 5), ("to stop the", 3), ("financial system", 2), ("from collapsing completely.", 3)],
    "s7": [("But perhaps", 2), ("the most frightening part?", 4), ("The entire crisis", 3), ("was built on", 3),
           ("one assumption:", 2), ("that house prices", 3), ("would never fall.", 3)],
}

def phrases(key):
    ws, out, i = words[key], [], 0
    for text, n in CAPTIONS[key]:
        grp = ws[i:i + n]; i += n
        out.append({"text": text, "s": grp[0]["s"], "e": grp[-1]["e"]})
    assert i == len(ws), f"{key}: captions cover {i} tokens but narration has {len(ws)}"
    # hold each phrase until the next one starts (but never longer than 0.9 s after its last word)
    for a, b in zip(out, out[1:]):
        a["e"] = round(min(b["s"], a["e"] + 0.9), 3)
    out[-1]["e"] = round(out[-1]["e"] + 0.45, 3)
    return out

out = {
    "fps": FPS,
    "duration": round(total + OUTRO, 3),
    "durationInFrames": int(round((total + OUTRO) * FPS)),
    "scenes": scenes,
    "words": words,
    "captions": {k: phrases(k) for k in words},
    "cues": cues,
}
json.dump(out, open(os.path.join(ROOT, "src", "data", "timeline.json"), "w"), indent=1)
print(f"duration {total:.2f}s  ({out['durationInFrames']} frames)")
for k, v in scenes.items():
    print(f"  {k}: {v['start']:6.2f} – {v['end']:6.2f}   narration {v['voStart']:6.2f} – {v['voEnd']:6.2f}")
