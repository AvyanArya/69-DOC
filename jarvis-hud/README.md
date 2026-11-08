# OpenJarvis HUD

A voice-first dashboard for [OpenJarvis](https://github.com/open-jarvis/OpenJarvis), styled as a holographic Iron Man–style HUD. You talk, it listens, thinks and answers out loud, all on your own computer.

- **Ears:** faster-whisper speech recognition, locked to English
- **Brain:** the Ollama model from your OpenJarvis config (`qwen3.5:2b` by default)
- **Voice:** Kokoro text-to-speech with the British `bm_george` voice

## Run it

This needs OpenJarvis with its voice extras installed (`uv pip install --python ~/.openjarvis/.venv/bin/python -e "$HOME/.openjarvis/src[desktop,voice]"`).

```bash
curl -fsSL -o ~/.openjarvis/jarvis_hud.py https://raw.githubusercontent.com/AvyanArya/69-DOC/claude/loving-ride-txfkm0/jarvis-hud/jarvis_hud.py
```

```bash
~/.openjarvis/.venv/bin/python ~/.openjarvis/jarvis_hud.py
```

Your browser opens at http://localhost:8765. Click **INITIALISE** and allow the microphone. The first launch downloads the speech models, so wait until all three systems read **ONLINE**.

## Talking to it

| Action | How |
|---|---|
| Talk | Press **Space**, tap the glowing core, or **clap twice** |
| Stop talking | Just pause. It sends after about a second of silence |
| Interrupt a reply | Press **Space** to cut in, or **Esc** to stop |
| Type instead | Use the message box at the bottom |

The **CONVERSATION** toggle makes it listen again after every reply, so you can keep talking without touching anything. **CLAP ×2 TO WAKE** and **VOICE** switch those features on and off.

## Options

| Variable | Effect |
|---|---|
| `JARVIS_HUD_MODEL=qwen3.5:4b` | Use a different (smarter) Ollama model. Check `ollama list` for what you have |
| `JARVIS_HUD_PORT=8766` | Serve on another port |
| `JARVIS_HUD_NO_BROWSER=1` | Don't open the browser automatically |

The server only listens on `127.0.0.1` and refuses requests from other websites.
