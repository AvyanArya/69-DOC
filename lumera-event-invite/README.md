# Lumera launch event reel

A 31-second vertical (1080×1920, 30 fps) Instagram Reel inviting everyone to the Lumera
launch event at Dubai College (@finance.with.lumera). The look is a dark, warm "launch
night": aurora light in Lumera violet and gold, glass cards, Instrument Serif type with
gold highlights, gold sparks, and a camera that pushes through each scene into the next.
It runs on a 128 BPM house groove, and the narrator is the launch film's voice: calm,
warm and unhurried. Entry is capped: **the first 60 people to sign up get in**, through
the link in the post's caption.

**Watch:** [`lumera-invite.mp4`](lumera-invite.mp4)
**Scrub it live:** open [`index.html`](index.html) in Chrome (space = play/pause).

## The story

| Time | Voiceover | On screen |
| --- | --- | --- |
| 0 – 2.2s | *Hey everyone, you're invited!* | A line of light draws across the dark; *invited.* rises out of it in gold, with an ONLY 60 SPOTS pill. |
| 2.2 – 5.5s | *Lumera is launching, and we want you in the room.* | The Lumera ribbon draws itself on inside a ring of light. Then a gold *you*, and a row of seats: four Lumera characters and an empty one marked "you". |
| 5.5 – 9.8s | *Friday, September the fourth. Three thirty, at Dubai College.* | Glass cards fold up out of the dark: the date rolls to 04, a clock spins to 3:30, a pin drops on Dubai College (Jafar Center). |
| 9.8 – 14.3s | *A finance Kahoot with prizes. A startup showcase. A raffle.* | The programme: three glass rows light up in turn as each line icon draws itself on. |
| 14.3 – 16.9s | *And yes, the drinks and snacks are on us.* | *on us.* in gold, with drink, cookie and popcorn icons. |
| 16.9 – 20.4s | *Then at seven twenty five, we go live. Together.* | 7:25 PM rolls in; a dark screen tilts up and lights with the real Lumera dashboard on "live", with a flash and a burst of sparks. The beat drops. |
| 20.4 – 22.6s | *But there are only sixty spots.* | A giant gold 60 inside a ring of 60 lights that turn gold one by one. |
| 22.6 – 26.6s | *The first sixty to sign up get in. The link is in our caption!* | A holographic glass pass (Spot 01 of 60); "Reserve my spot" is tapped and becomes "You're in ✓"; *Link in caption* with an arrow down to the caption. |
| 26.6 – 30.8s | *Tag a friend, and see you at Dubai College.* | An @ mention types itself out, then the close: *See you at Dubai College*, the date and time, ONLY 60 SPOTS · LINK IN CAPTION, @finance.with.lumera. |

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
`index.html` hangs every scene cut, slam and sticker off those times, as does the soundtrack.
To change a line or the voice (`make_vo.py --voice bf_emma`, for example), re-run the steps
above and everything re-times itself. The on-screen event details are plain text in `index.html`.

## Credits

Typography: Instrument Serif and Manrope (SIL Open Font License). Artwork (logo, characters
and the dashboard) from Lumera. Voiceover generated with Kokoro-82M (Apache 2.0);
word timings from Whisper via faster-whisper (MIT). Instrument samples: Salamander Grand
Piano by Alexander Holm (CC-BY 3.0); nylon guitar, flute, harp and electric bass from
nbrosowsky/tonejs-instruments (CC-BY 3.0). Foley and UI sounds: Kenney "Casino Audio",
"RPG Audio", "Impact Sounds" and "Interface Sounds" (CC0). Drums, whooshes and risers are
synthesised.
