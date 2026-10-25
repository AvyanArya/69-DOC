# Lumera × Dubai College: launch event reel

A 27-second vertical (1080×1920, 30 fps) Instagram Reel inviting Dubai College to the
Lumera launch event (@finance.with.lumera). It is a different world from the launch film:
loud colour blocks, slam typography, stickers and confetti, set to a 125 BPM house groove
with a voiceover. Entry is capped: **the first 60 people to sign up get in**, through the
link in the post's caption.

**Watch:** [`lumera-invite.mp4`](lumera-invite.mp4)
**Scrub it live:** open [`index.html`](index.html) in Chrome (space = play/pause).

## The story

| Time | Voiceover | On screen |
| --- | --- | --- |
| 0 – 2.1s | *Dubai College, you're invited!* | DUBAI COLLEGE slams in, then *invited!* in gold with an ONLY 60 SPOTS sticker. |
| 2.1 – 5s | *Lumera is launching, and we want you in the room.* | The logo spins in; the five Lumera characters pop up as stickers. |
| 5 – 9.15s | *Friday, September the fourth. Three thirty, at the Jafar Center.* | FRIDAY, a calendar rolls to 4, a clock spins to 3:30 PM, a pin drops on the Jafar Center. |
| 9.15 – 13.25s | *A finance Kahoot with prizes. A startup showcase. A raffle.* | Three colour cuts: Kahoot tiles and a trophy, a pitch-deck showcase, a 5 AED raffle ticket. |
| 13.25 – 15.6s | *And yes, the drinks and snacks are on us.* | Drinks and snacks rain in, with a FREE sticker. |
| 15.6 – 18.9s | *Then at seven twenty five, we go live. Together.* | Night falls, split flaps roll to 7:25 PM, the real Lumera dashboard goes LIVE. The beat drops on "live". |
| 18.9 – 20.85s | *But there are only sixty spots.* | A giant gold 60, a LIMITED sticker, and a grid of 60 seats filling up. |
| 20.85 – 24.6s | *The first sixty to sign up get in. The link is in our caption!* | A Sign up button is tapped and turns into "Spot saved ✓"; LINK IN CAPTION with an arrow pointing down at the caption. |
| 24.6 – 27s | *Tag a friend, and see you there.* | Two characters high-five; the date, the venue, *See you there* and an ONLY 60 SPOTS · LINK IN CAPTION pill. |

Speakers are intentionally left out until they are confirmed. The proposal marks the venue
"on approval", so confirm it before posting. Put the sign-up link in the caption (or in the
bio, if the caption link isn't clickable) and close the form at 60 responses.

Content stays within about y 220–1560 so Instagram's header, caption and buttons don't cover it.

## Rebuilding

```bash
python audio/fetch_samples.py          # instruments and foley (not committed)
pip install kokoro-onnx soundfile scipy numpy
#    model files: github.com/thewh1teagle/kokoro-onnx/releases (kokoro-v1.0.onnx, voices-v1.0.bin)
python audio/make_vo.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin --speed 1.1
node render.js --events-only           # sound timings from the page
python audio/build_soundtrack.py       # music, foley and voice -> audio/soundtrack.wav
node render.js --workers 4             # -> lumera-invite.mp4
```

The voice lines and their start times live in `audio/vo_lines.json`. On screen, every
animation is keyed to the spoken words through the `Wd` table in `index.html`, so a
re-recorded line only needs its word times updated there. The event details are plain text
in `index.html`.

## Credits

Typography: Instrument Serif and Manrope (SIL Open Font License). Artwork (logo, the five
characters and the dashboard) from Lumera. Voiceover generated with Kokoro-82M (Apache 2.0).
Instrument samples: Salamander Grand Piano by Alexander Holm (CC-BY 3.0); nylon guitar,
flute, harp and electric bass from nbrosowsky/tonejs-instruments (CC-BY 3.0). Foley and UI
sounds: Kenney "Casino Audio", "RPG Audio", "Impact Sounds" and "Interface Sounds" (CC0).
Drums, whooshes and risers are synthesised.
