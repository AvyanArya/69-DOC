# Lumera launch event reel

A 31-second vertical (1080×1920, 30 fps) Instagram Reel inviting everyone to the Lumera
launch event at Dubai College (@finance.with.lumera). **Nine panels, one poster:** the
camera flies over a 3×3 poster, one panel per line of the voiceover. Each panel floods
with colour as we arrive and builds its frame word by word, and at the end the camera pulls
back to the finished poster, which carries every detail. The look is loud colour blocks,
slam typography, gold serif, stickers and confetti, on a 128 BPM house groove. The narrator
is the launch film's voice. Entry is capped: **the first 60 people to sign up get in**,
through the link in the post's caption.

**Watch:** [`lumera-invite.mp4`](lumera-invite.mp4)
**Scrub it live:** open [`index.html`](index.html) in Chrome (space = play/pause).

## The story

| Time | Voiceover | Panel |
| --- | --- | --- |
| 0 – 2.2s | *Hey everyone, you're invited!* | **1, violet.** HEY EVERYONE slams in, *invited!* in gold, an ONLY 60 SPOTS sticker. |
| 2.2 – 5.6s | *Lumera is launching, and we want you in the room.* | **2, cream.** The logo spins in, *Lumera*, a marker under LAUNCHING; Lumi and Blaze pop up beside a big *you*. |
| 5.6 – 9.9s | *Friday, September the fourth. Three thirty, at Dubai College.* | **3, gold.** FRIDAY, a calendar rolling to 4, a clock spinning to 3:30 PM, a pin dropping onto a map: DUBAI COLLEGE, Jafar Center. |
| 9.9 – 14.3s | *A finance Kahoot with prizes. A startup showcase. A raffle.* | **4, green.** The plan: three cards slide in (Kahoot with a trophy, startup showcase with Nova, raffle with Blaze). |
| 14.3 – 17.0s | *And yes, the drinks and snacks are on us.* | **5, pink.** A receipt prints line by line (drinks 0.00, snacks 0.00, total 0.00 AED) and gets stamped ON US! |
| 17.0 – 20.5s | *Then at seven twenty five, we go live. Together.* | **6, night.** Split flaps roll to 7:25 PM; a switch flips from OFF to LIVE and the lights come on, the dashboard pops up, *together.* The beat drops. |
| 20.5 – 22.7s | *But there are only sixty spots.* | **7, blue.** ONLY *60* SPOTS, a velvet rope with a FULL AT 60 sign, and Sentinel on the door. |
| 22.7 – 26.8s | *The first sixty to sign up get in. The link is in our caption!* | **8, violet.** A phone: 60 spots left; Sign up is tapped, "You're in ✓", 59 left. A LINK IN CAPTION banner slams on. |
| 26.8 – 31.4s | *Tag a friend, and see you at Dubai College.* | **9, cream.** @your.bestie types itself into a tag, two tickets (YOU and +1), *see you at* DUBAI COLLEGE. Then the camera pulls back to the whole poster and a LINK IN CAPTION badge lands on the last chord. |

Speakers are intentionally left out until they are confirmed. The proposal marks the venue
"on approval", so confirm it before posting. Put the sign-up link in the caption (or in the
bio, if the caption link isn't clickable) and close the form at 60 responses.

Content stays within about y 220–1560 so Instagram's header, caption and buttons don't cover it.

## Rebuilding

```bash
pip install kokoro-onnx faster-whisper soundfile scipy numpy
#    model files: github.com/thewh1teagle/kokoro-onnx/releases (kokoro-v1.0.onnx, voices-v1.0.bin)
python audio/fetch_samples.py          # instruments and foley (not committed)
python audio/make_vo.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin   # voiceover -> audio/vo/
python audio/timing.py                 # lays the lines out, finds the key words -> timing.js
node render.js --events-only           # sound cues from the page -> audio/events.json
python audio/build_soundtrack.py       # music, foley and voice -> audio/soundtrack.wav
node render.js --workers 4             # -> lumera-invite.mp4
```

The edit follows the voice. The script and the words the picture cuts on ("marks") live in
`audio/vo_lines.json`. `timing.py` finds each mark with Whisper and writes `timing.js`, and
`index.html` hangs every camera move, slam and sticker off those times. The page also lists
the sounds its picture needs (`events.json` "sfx"), which the soundtrack plays. To change a
line or the voice (`make_vo.py --voice bf_emma`, for example), re-run the steps above and
everything re-times itself. The on-screen event details are plain text in `index.html`.

## Credits

Typography: Instrument Serif and Manrope (SIL Open Font License). Artwork (logo, characters
and the dashboard) from Lumera. Voiceover generated with Kokoro-82M (Apache 2.0);
word timings from Whisper via faster-whisper (MIT). Instrument samples: Salamander Grand
Piano by Alexander Holm (CC-BY 3.0); nylon guitar, flute, harp and electric bass from
nbrosowsky/tonejs-instruments (CC-BY 3.0). Foley and UI sounds: Kenney "Casino Audio",
"RPG Audio", "Impact Sounds" and "Interface Sounds" (CC0). Drums, whooshes and risers are
synthesised.
