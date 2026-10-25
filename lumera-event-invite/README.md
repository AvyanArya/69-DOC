# Lumera × Dubai College — launch invitation

A 29-second vertical (1080×1920, 30 fps) invitation video for the Lumera launch event,
made for Instagram (@finance.with.lumera). Deliberately a different world from the
launch film: tactile paper, wax and letterpress on a plum linen table, with a warm
bossa nova score.

**Watch:** [`lumera-invite.mp4`](lumera-invite.mp4)
**Scrub it live:** open [`index.html`](index.html) in Chrome (space = play/pause).

## The story

| Time | Beat |
| --- | --- |
| 0 – 3.6s | A cream envelope slides onto the table. Its violet wax seal, embossed with the gold Lumera mark, catches the light. |
| 3.6 – 7s | The seal cracks, the star-lined flap opens and the card slides out to the camera. The band comes in. |
| 7 – 11s | Letterpress and gold foil: *You're invited* is written in script, *to the launch of Lumera*, *Money talks. We translate.* |
| 11 – 15.5s | The card turns over: Friday 4 September 2026, 3:30 – 7:30 PM, Jafar Center, Ground Floor, Dubai College. A semi-formal mixer (school uniform welcome), hosted by Avyan Arya. A postmark is stamped in the corner. |
| 15.5 – 21.5s | *What the evening holds*: six cards are dealt, one per character — team finance Kahoot, startup showcase, raffle (5 AED, Lumera merch), drinks and snacks on us, try Lumera first, and the meet-five-new-people challenge. |
| 21.5 – 25s | A ticket: *7:25 PM, the moment Lumera goes live.* The stub tears off: *Be in the room when Lumera goes live.* |
| 25 – 29s | The seal is stamped onto the cloth, *See you there.*, the date, venue and @finance.with.lumera, with the whole family waving goodbye. |

Speakers are intentionally left out until they are confirmed. The proposal marks the venue
"on approval"; confirm it before posting.

## Rebuilding

```bash
python audio/fetch_samples.py          # instruments and foley (not committed)
node render.js --events-only           # sound timings from the page
python audio/build_soundtrack.py       # music + foley -> audio/soundtrack.wav
node render.js --workers 4             # -> lumera-invite.mp4
```

Event details live as plain text in `index.html` (card front/back, the dealt cards, the
ticket and the closing card), so they are quick to change.

## Credits

Typography: Cormorant Garamond, Pinyon Script, Instrument Serif and Manrope (SIL Open Font
License). Artwork (logo and the five characters) from Lumera. Paper, linen, wax and stamp
textures are procedural. Instrument samples: Salamander Grand Piano by Alexander Holm
(CC-BY 3.0); nylon guitar, flute, harp and electric bass from nbrosowsky/tonejs-instruments
(CC-BY 3.0). Foley: Kenney "Casino Audio", "RPG Audio" and "Impact Sounds" (CC0).
