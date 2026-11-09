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
| "What's the latest news about Tesla?" | Live headlines on any topic, from Google News |
| "Give me a recipe for chocolate chip cookies" | Opens a page with a photo, ingredients you can tick off, and numbered steps |
| "How do I tie a tie?" / "Make me a workout plan" / "Write an email to…" | A step-by-step guide, plan or draft on its own page |
| "Next step" / "Step 3" / "Read the ingredients" | Reads the page aloud, one step at a time |
| "Focus on the timer" / "Make the news full screen" / "Make it bigger" | Expands the timer, news, weather, page or music to fill the screen |
| "Put the timer in the top right" / "Move the music to the bottom left" | Moves the floating timer or music player. You can also drag them. The timer floats over full-screen views |
| "Open the questions from chapter 6 from Physics and Maths Tutor" | Opens that topic's questions with the mark scheme alongside. It asks your course once (say "GCSE AQA physics") and remembers it |
| "Next set" / "Hide the mark scheme" / "Show the mark scheme" | Moves through the question sets, or hides the answers while you work |
| "Give me study tips for physics" / "Teach me electromagnetic induction" | A study plan or a lesson page with key ideas, a worked example and questions to try |
| "Quiz me on waves" | Jarvis asks one question at a time and tells you how you did |
| "Make a London trip itinerary" / "Plan a 3-day trip to Paris" | Searches the web, reads the top pages in the background, and builds a day-by-day page with times, photos, prices, a budget table and its sources |
| "Research the best laptops for students" / "Compare the iPhone 16 and Pixel 9" | A briefing page written from live web pages, with sources you can read inside Jarvis |
| "Open the first source" (or tap a source) | Reads that web page inside Jarvis as a clean page, no browser tab |
| "Minimise" / "Open my London itinerary again" | Puts a page away on the shelf above the message bar and brings it back later. Pages are kept between sessions |
| "Give me an overview of my day" / "What's on my calendar tomorrow?" | Your calendar events, due reminders and unread Mail count, on a page (Mac Calendar and Reminders) |
| "Move the weather to the right" / "Put the news at the top" | Rearranges the dashboard. You can also drag any card by its title |
| "Conversation mode on" / "Stop listening" | Keeps listening after each reply, so you don't need to say "Jarvis" each time. Also the Conversation switch next to the message bar |
| "Open the second one" | Opens that story in your browser |
| "Pull up the weather" / "Will it rain tomorrow in London?" | Opens the full weather view for your city or any city |
| "Close" | Closes the news or weather view |
| "Set a timer for 10 minutes" / "Remind me to check the oven in 15 minutes" | Countdown card, chime and a spoken alert |
| "Open YouTube" / "Open Spotify" / "Go to apple.com" | Opens Mac apps and websites |
| "Play lo-fi beats" | Plays it from YouTube in a small player in the corner. If the browser blocks it from starting, tap **▶ Tap to play**. With **Settings → Music from → Spotify app**, it plays in the Spotify app on your Mac instead and the corner card controls it |
| "Pause" / "Next song" / "Turn it up" / "Stop the music" | Controls the player. Music quietens while you and Jarvis talk |
| "Google best pizza near me" | Opens a Google search |
| "Look up the tallest building in the world" | Searches the web and answers, with source links |
| "What can you do?" | Lists all of this |
| Anything else | Normal conversation with your local model |

Say **"Hey Jarvis"**, press **Space**, tap the orb, or **clap twice** to talk. To **interrupt**, just start talking while Jarvis is speaking (or press Space). It stops and listens. Headphones make interrupting most reliable, because then Jarvis can't hear itself. Press **Esc** to stop or close a full-screen view. **Conversation mode** keeps listening after each reply.

Interrupting works on laptop speakers too: Jarvis learns how loudly its own voice comes back into the microphone and treats anything clearly above that as you. Under the Systems panel, the **Interrupt** line says what it heard each time it checked.

**Your calendar:** the first time you ask about your day, macOS asks whether Terminal may access Calendars and Reminders; allow it. To check it from Terminal: `~/.openjarvis/.venv/bin/python ~/.openjarvis/hud/jarvis_hud.py --check-calendar`. If you said no, turn it on in System Settings → Privacy & Security → Calendars (and Reminders).

"Hey Jarvis" is heard on your Mac in two ways: the openWakeWord detector, which installs itself on first start, plus a quick double-check with speech recognition for anything short that might be the name. So it works even when the detector misses your voice. The **Wake** row in the Systems panel shows whether it's listening, and Settings → Behaviour shows what it last heard.

## Studying with Preppr

Jarvis can use Preppr, your revision hub, for tutoring: your subjects and exam boards, every topic's specification points and resources, your exam dates and your revision plan.

1. Copy `Preppr.html` into `~/.openjarvis/hud/`, next to `jarvis_hud.py`, and restart Jarvis. (Jarvis serves it at http://localhost:8765/preppr. Your copy stays on your Mac and is never uploaded.)
2. To bring your saved data across: in the Preppr you normally use, export a JSON backup from its settings. Then say "open Preppr" in Jarvis and import that backup there.

Then you can say:

| Say | What happens |
|---|---|
| "When's my next exam?" / "When is my next physics exam?" | From your Preppr exam timetable, with how many days are left |
| "What should I revise today?" | Today's sessions from your Preppr revision plan (they also appear in "overview of my day") |
| "Give me some questions on circular motion" | Opens the Physics & Maths Tutor questions for that topic, for your course, beside the mark scheme |
| "Walk me through question 1" / "I'm stuck on 2b" | Jarvis reads the question paper and mark scheme on screen and tutors you through it, hint first |
| "Teach me circular motion" / "Explain how a transformer works" | A lesson page that covers your specification points, taught aloud section by section |
| "Open my revision plan" / "Open my flashcards" / "Open Preppr" | Opens that part of Preppr inside Jarvis |
| "Make me a revision timetable for today and tomorrow for my test on Wednesday on chapters 6, 7 and 8 of Further Maths" | A timed revision timetable built around the real Physics & Maths Tutor question files for those chapters, talked through as it's made, and added to your Preppr plan with the test |
| "Open the questions" | Opens those chapters' questions; when a file has its mark scheme at the back, the mark-scheme side opens at that page |

Only one Jarvis tab listens and talks at a time; if you open another, the first goes quiet and offers **Use Jarvis here**. Over full-screen views, a pill at the top left shows whether Jarvis is listening (with your voice level), thinking or speaking. Music dips a little while Jarvis talks, and more only while you're talking.

Any long answer opens as a page instead of a block of text, and while Jarvis builds a page it talks you through it as it goes. You can close or minimise a page that's still being written and come back to it from the shelf.

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

Say "Hey Jarvis" and pause, and he answers "At your service" (or similar) and listens. With a TV, music or a fan on, he still notices when you've finished: you count as talking when you're clearly louder than the room, and anything quieter before and after your words is trimmed off.

After you log in, Jarvis starts listening straight away. It waits for you to finish: a pause after something unfinished ("set a timer for…") doesn't count as the end, and **Settings → Wait for me to finish** makes it quicker or more patient.

Replies are written out word by word as Jarvis says them. Under the Systems panel, **Last reply** shows how long each step took (transcribing, thinking, voice), so you can see what's slow.

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
