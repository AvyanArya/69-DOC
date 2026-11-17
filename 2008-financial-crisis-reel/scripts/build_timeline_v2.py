#!/usr/bin/env python3
"""Timeline for the 16:9 cut (src/data/timeline2.json).

Captions are the on-screen words: DISPLAY holds them as they should read, and each display word is
aligned to Whisper's word timings for the narration (difflib), interpolating any word Whisper misheard.
Words wrapped in *asterisks* are "hits": big type instead of the small running caption.
"""
import difflib, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
vo = json.load(open(os.path.join(ROOT, "src", "data", "vo2.json")))["scenes"]

DISPLAY = {
    "a_hook": "September 15, 2008. A *158-year-old* bank just died overnight. And it was only the *beginning.*",
    "b_houses": "To understand why, go back a few years. America was obsessed with one thing: *houses.*",
    "c_subprime": "Banks were handing out mortgages to almost anyone. No income? No problem. No down payment? *Approved.* These were called *subprime* mortgages.",
    "d_mbs": "But the banks didn't keep them. They bundled thousands together into products called *mortgage-backed* *securities.* Rating agencies stamped them *AAA,* the safest grade there is. And they were sold to pension funds, banks and governments *around* *the* *world.*",
    "e_leverage": "To buy more, Wall Street borrowed. Lehman Brothers was betting *$30* for every *one* it actually had.",
    "f_fall": "Then house prices *fell.* Homeowners stopped paying. Those AAA bundles were suddenly worth almost *nothing.* And nobody knew who was holding them.",
    "g_panic": "*Panic.* Bear Stearns, *gone.* Fannie Mae and Freddie Mac, *seized* by the government.",
    "h_weekend": "Then *Lehman.* One weekend. America's top bankers, locked inside the New York Fed. No buyer. No *rescue.*",
    "i_bankrupt": "Monday morning, Lehman Brothers filed for *bankruptcy.* *$639* *billion.* The biggest in American *history.*",
    "j_contagion": "The next day, AIG needed *$85* *billion* just to survive. Banks stopped lending to each other. Markets *crashed.* Credit *froze.*",
    "k_cost": "Nearly *9* *million* Americans lost their jobs. Millions more lost their homes. Governments spent *trillions* to stop the whole system from collapsing.",
    "l_end": "And all of it was built on one assumption: that house prices would *never* *fall.*",
}
ORDER = list(DISPLAY)
GAP = {"g_panic": 0.4, "h_weekend": 0.45, "i_bankrupt": 0.5, "l_end": 0.45}


def norm(w):
    w = w.lower().replace("$", "").replace(",", "").replace("-", "").replace("'", "").replace("’", "")
    return re.sub(r"[^a-z0-9]", "", w)


def align(disp, words, t0):
    a = [norm(d.strip("*")) for d in disp]
    b = [norm(w["w"]) for w in words]
    times = [None] * len(disp)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal" or (tag == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                times[i1 + k] = (t0 + words[j1 + k]["s"], t0 + words[j1 + k]["e"])
        elif tag == "replace" and j2 > j1:          # spread the display words over the heard span
            s, e = t0 + words[j1]["s"], t0 + words[j2 - 1]["e"]
            for k in range(i2 - i1):
                times[i1 + k] = (s + (e - s) * k / (i2 - i1), s + (e - s) * (k + 1) / (i2 - i1))
    # interpolate anything still missing
    for i, tm in enumerate(times):
        if tm is None:
            prev = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), t0)
            nxt = next((times[j][0] for j in range(i + 1, len(times)) if times[j]), prev + 0.3)
            times[i] = (prev, max(prev + 0.05, nxt))
    return times


t = 0.35
scenes, tokens = {}, []
for k in ORDER:
    t += GAP.get(k, 0.12) if scenes else 0
    d = vo[k]["duration"]
    scenes[k] = {"start": round(t, 3), "voStart": round(t, 3), "voEnd": round(t + d, 3), "voFile": vo[k]["file"]}
    disp = DISPLAY[k].split()
    for w, (s, e) in zip(disp, align(disp, vo[k]["words"], t)):
        tokens.append({"w": w.strip("*"), "hit": w.startswith("*"), "s": round(s, 3), "e": round(e, 3), "scene": k})
    t += d
for a, b in zip(ORDER, ORDER[1:]):
    scenes[a]["end"] = scenes[b]["start"]
wrong = t + 0.75
scenes["l_end"]["end"] = round(wrong, 3)
outro = wrong + 2.6
total = outro + 3.6
cues = {"wrong": round(wrong, 3), "outro.start": round(outro, 3), "outro.end": round(total, 3)}
json.dump({"fps": FPS, "duration": round(total, 3), "durationInFrames": int(round(total * FPS)), "scenes": scenes, "tokens": tokens, "cues": cues},
          open(os.path.join(ROOT, "src", "data", "timeline2.json"), "w"), indent=1)
print(f"duration {total:.2f}s, {len(tokens)} caption words, hits: {sum(x['hit'] for x in tokens)}")
for k, v in scenes.items():
    print(f"  {k:12s} {v['start']:6.2f} – {v['end']:6.2f}")
