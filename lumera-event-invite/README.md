# Lumera launch event reel

A 31-second vertical (1080×1920, 30 fps) Instagram Reel inviting everyone to the Lumera
launch event at Dubai College (@finance.with.lumera). **The whole invitation happens on a
phone:** a notification, a group chat with the Lumera crew, the app going live, the sign-up
page and a share to a friend. The camera moves in to read the screen and pulls back for the
big moments. Lumera violet, cream and gold throughout, on a 128 BPM house groove, with the
launch film's narrator. Entry is capped: **the first 60 people to sign up get in**, through
the link in the post's caption.

**Watch:** [`lumera-invite.mp4`](lumera-invite.mp4)
**Scrub it live:** open [`index.html`](index.html) in Chrome (space = play/pause).

## The story

| Time | Voiceover | On the phone |
| --- | --- | --- |
| 0 – 2.2s | *Hey everyone, you're invited!* | The phone buzzes on the lock screen: a Lumera notification. HEY EVERYONE, *you're invited!* above it. A tap opens the chat. |
| 2.2 – 5.6s | *Lumera is launching, and we want you in the room.* | Group chat "Lumera Launch": Lumi types "Lumera is launching! 🚀", then "we want **YOU** in the room 💜", and the reactions pop on. |
| 5.6 – 9.9s | *Friday, September the fourth. Three thirty, at Dubai College.* | Nova sends an invite card; the date, 3:30 PM and Dubai College rows light up in turn and a pin drops on the map. |
| 9.9 – 14.3s | *A finance Kahoot with prizes. A startup showcase. A raffle.* | Blaze sends the plan: a Kahoot card whose answer bars fill in (prizes to win), a startup showcase post, a 5 AED raffle ticket. |
| 14.3 – 17.0s | *And yes, the drinks and snacks are on us.* | You ask "wait… is there food? 👀"; Lumi replies with a bill: drinks 0.00, snacks 0.00, stamped ON US ✓. |
| 17.0 – 20.4s | *Then at seven twenty five, we go live. Together.* | "then at…" with flip digits rolling to 7:25 PM. The camera pulls back, the phone turns sideways, and on "live" the Lumera app opens to the real dashboard with a LIVE badge, confetti and floating reactions. *together.* |
| 20.4 – 22.7s | *But there are only sixty spots.* | The sign-up page: ONLY 60 SPOTS LEFT, and sixty seats fill in. |
| 22.7 – 26.8s | *The first sixty to sign up get in. The link is in our caption!* | FIRST 60 SIGN-UPS GET IN; "Reserve my spot" is tapped, "You're in ✓", and the counter drops to 59. The camera pulls back as a LINK IN CAPTION sticker slams on. |
| 26.8 – 31.4s | *Tag a friend, and see you at Dubai College.* | The share sheet: @your.bestie types itself in and the invite is sent. Back on the lock screen: "See you at Dubai College 💜". *See you there.*, the date and an ONLY 60 SPOTS · LINK IN CAPTION sticker on the last chord. |

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
`index.html` hangs every camera move, message and tap off those times. The page also lists
the sounds its picture needs (`events.json` "sfx"), which the soundtrack plays. To change a
line or the voice (`make_vo.py --voice bf_emma`, for example), re-run the steps above and
everything re-times itself. The on-screen event details are plain text in `index.html`.

## Credits

Typography: Instrument Serif and Manrope (SIL Open Font License); emoji from Noto Color
Emoji (the system font, SIL OFL). Artwork (logo, characters and the dashboard) from Lumera.
Voiceover generated with Kokoro-82M (Apache 2.0); word timings from Whisper via
faster-whisper (MIT). Instrument samples: Salamander Grand Piano by Alexander Holm (CC-BY
3.0); nylon guitar, flute, harp and electric bass from nbrosowsky/tonejs-instruments
(CC-BY 3.0). Foley and UI sounds: Kenney "Casino Audio", "RPG Audio", "Impact Sounds" and
"Interface Sounds" (CC0). Drums, whooshes and risers are synthesised.
