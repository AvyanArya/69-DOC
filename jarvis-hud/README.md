# Jarvis HUD for OpenJarvis

A premium, voice-first dashboard for [OpenJarvis](https://github.com/open-jarvis/OpenJarvis). Unlock it, watch it boot, then talk to it. It answers out loud and carries out what you ask.

- **Lock screen and opening sequence.** Press and hold to unlock. A light line draws into rings, the core ignites with a power-up sound, and live system checks tick off. Then it greets you by name, with the weather.
- **Dashboard.** Frosted-glass cards on a drifting nebula: greeting, live weather with an hourly curve, system gauges, timers, headlines with photos, and the conversation. A fluid orb in the middle reacts to your voice and to Jarvis's.
- **Full-page views that morph.** "Pull up the news" makes the headlines card expand into a full page while the orb flies up into its corner and keeps talking from there, with subtitles. Each story lights up as Jarvis reads it. "Pull up the weather" does the same with a full forecast view. Esc or "close" morphs everything back.
- **Choose the voice.** Connect ElevenLabs for natural, human-sounding voices, or use the 11 free on-device voices. Each voice plays a sample when you tap it.

## Natural voice with ElevenLabs

1. Create an account at [elevenlabs.io](https://elevenlabs.io). There's a free plan with a monthly allowance.
2. Go to **Developers → API Keys**, create a key, and copy it.
3. In Jarvis, open **Settings** (the sliders button, top right). Paste the key under **Voice** and press **Connect**.

Choose a voice from the list. George, a warm British voice, is the default. Then pick a quality: **Fastest replies** or **Most natural**.

- **Where the key is stored:** only on your computer, in `settings.json` next to the script, readable only by your account.
- **What's sent to ElevenLabs:** only the text Jarvis is about to say. Listening and thinking stay on your Mac.
- **If ElevenLabs can't be used** (offline or out of credits), Jarvis says so and switches to the on-device voice.
- **Setting the key another way:** you can set `ELEVENLABS_API_KEY` in the environment instead.

## What you can say

| Say | What happens |
|---|---|
| "Hey Jarvis…" | Wakes it up and it starts listening, no button needed |
| "Brief me" / "Catch me up" | Time, weather and the top three headlines |
| "Good morning" / "Thank you" / "How are you?" | Answered instantly, without waiting for the model |
| "Pull up the news" / "tech news" / "business news" | Opens the news deck and reads the headlines (top, world, tech, business, science, sport) |
| "Open the second one" | Opens that story in your browser |
| "Pull up the weather" / "Will it rain tomorrow in London?" | Opens the full weather view for your city or any city |
| "Close" | Closes the news or weather view |
| "Set a timer for 10 minutes" / "Remind me to check the oven in 15 minutes" | Countdown card, chime and a spoken alert |
| "Open YouTube" / "Open Spotify" / "Go to apple.com" | Opens Mac apps and websites |
| "Play lo-fi beats" | Opens it on YouTube |
| "Google best pizza near me" | Opens a Google search |
| "Look up the tallest building in the world" | Searches the web and answers, with source links |
| "What can you do?" | Lists all of this |
| Anything else | Normal conversation with your local model |

Say **"Hey Jarvis"**, press **Space**, tap the orb, or **clap twice** to talk. To **interrupt**, just start talking while Jarvis is speaking (or press Space). It stops and listens. Headphones make interrupting most reliable, because then Jarvis can't hear itself. Press **Esc** to stop or close the deck. **Conversation mode** keeps listening after each reply.

"Hey Jarvis" is heard on your Mac in two ways: the openWakeWord detector, which installs itself on first start, plus a quick double-check with speech recognition for anything short that might be the name. So it works even when the detector misses your voice. The **Wake** row in the Systems panel shows whether it's listening, and Settings → Behaviour shows what it last heard.

## Preview without installing

Open `preview.html` in Chrome or Safari. It's a single file that runs with no server: press **Watch the demo** for a guided tour, or hold to unlock and try it yourself.

- **What's real:** a snapshot of the latest BBC headlines and photos, live weather when you're online, look-ups from Wikipedia, and all the commands above.
- **What's different from the Mac version:** Jarvis speaks in your browser's built-in voice. Talking to it needs Chrome or Safari, and asks for the microphone. There's no language model, so open conversation is replaced by a short note.

To refresh the headlines in it, rebuild it with `~/.openjarvis/.venv/bin/python build_preview.py`.

## Install on a Mac

You need OpenJarvis with its voice extras installed:

```bash
uv pip install --python ~/.openjarvis/.venv/bin/python -e "$HOME/.openjarvis/src[desktop,voice]"
```

Download the two files:

```bash
mkdir -p ~/.openjarvis/hud && cd ~/.openjarvis/hud && for f in jarvis_hud.py hud.html; do curl -fsSLO "https://raw.githubusercontent.com/AvyanArya/69-DOC/claude/loving-ride-txfkm0/jarvis-hud/$f"; done
```

Start it:

```bash
~/.openjarvis/.venv/bin/python ~/.openjarvis/hud/jarvis_hud.py
```

Your browser opens http://localhost:8765. The first launch downloads the speech models, so give it a few minutes. Run the download command again any time to update.

## Settings

The sliders button in the top-right corner holds:
- **Profile:** your name, your weather city (leave it blank to detect automatically), and °C, °F or automatic units.
- **Voice:** the voice (tap one to hear a sample) and speaking speed.
- **Behaviour:** switches for conversation mode, "Hey Jarvis", interrupt by talking, clap to wake, spoken replies, sound effects and the opening animation.

If Safari or another browser blocks sound, Jarvis says so with a notice. Click anywhere on the page once and it can speak.

| Environment variable | Effect |
|---|---|
| `JARVIS_HUD_MODEL=qwen3.5:4b` | Use a different (smarter) Ollama model. `ollama list` shows what you have |
| `JARVIS_HUD_NAME=Avyan` | What Jarvis calls you by default |
| `JARVIS_HUD_PORT=8766` | Serve on another port |
| `JARVIS_HUD_NO_BROWSER=1` | Don't open the browser automatically |

## Privacy

Speech recognition, the language model and the voice all run on your computer. Only three things go online, and none needs an account or key: BBC News headlines, Open-Meteo weather (with ipwho.is to find your city if you haven't set one), and web search when you say "look up". The server only listens on `127.0.0.1` and refuses requests from other websites.
