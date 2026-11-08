#!/usr/bin/env python3
"""OpenJarvis HUD: talk to your local OpenJarvis assistant through a voice-first dashboard.

Everything runs on your own machine:
  ears   faster-whisper speech recognition (OpenJarvis's voice extras)
  brain  the Ollama model from your OpenJarvis config (qwen3.5:2b by default)
  voice  Kokoro text-to-speech (British "bm_george" voice by default)

Start it with the Python that OpenJarvis installed:

    ~/.openjarvis/.venv/bin/python jarvis_hud.py

It opens http://localhost:8765 in your browser. Press Ctrl+C here to stop it.

Optional environment variables:
  JARVIS_HUD_PORT=8765        port to serve on
  JARVIS_HUD_MODEL=qwen3.5:4b use a different Ollama model
  JARVIS_HUD_NO_BROWSER=1     don't open the browser automatically
"""

from __future__ import annotations

import io
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import wave
import webbrowser
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    from openjarvis.core.config import load_config
except ImportError:
    sys.exit(
        "jarvis_hud.py needs the Python that OpenJarvis installed. Run it like this:\n"
        f"  ~/.openjarvis/.venv/bin/python {sys.argv[0]}"
    )

PORT = int(os.environ.get("JARVIS_HUD_PORT", "8765"))
CONFIG = load_config()
MODEL = (
    os.environ.get("JARVIS_HUD_MODEL")
    or CONFIG.intelligence.default_model
    or "qwen3.5:2b"
)
LANGUAGE = (CONFIG.speech.language or "en").strip()
VOICE_SPEED = float(CONFIG.speech.voice_speed or 1.0)
HISTORY_TURNS = 20
MAX_BODY_BYTES = 25 * 1024 * 1024

PERSONA = (
    "You are JARVIS, a personal AI assistant running privately on the user's own "
    "computer through OpenJarvis. You have the calm, dry wit of a polished British "
    "assistant. Always reply in English, whatever language the user uses. Everything "
    "you say is read aloud, so keep replies brief and conversational, usually one to "
    "three sentences, and never use markdown, lists, emoji, code blocks or stage "
    "directions unless the user asks for them. You know nothing about the user except "
    "what they tell you in this conversation, so never invent details about their life "
    "and never use pet names. You have no internet access and no control over devices, "
    "so if a request needs live information such as weather or news, or needs you to "
    "control something, say so plainly instead of pretending."
)


def _ollama_url() -> str:
    host = CONFIG.engine.ollama.host or os.environ.get("OLLAMA_HOST") or "localhost:11434"
    if "://" not in host:
        host = "http://" + host
    return host.replace("://0.0.0.0", "://127.0.0.1").rstrip("/")


OLLAMA = _ollama_url()
STARTED = time.time()
STATUS: dict = {"brain": "starting", "ears": "starting", "voice": "starting", "notes": {}}

_ears = None
_ears_lock = threading.Lock()
_voice = None
_voice_id = ""
_brain_thread: threading.Thread | None = None
_last_brain_check = 0.0


# --------------------------------------------------------------------------- brain


def _ollama_up() -> bool:
    try:
        with urllib.request.urlopen(OLLAMA + "/api/version", timeout=1.5):
            return True
    except Exception:
        return False


def _ollama_models() -> set[str]:
    with urllib.request.urlopen(OLLAMA + "/api/tags", timeout=5) as resp:
        return {m.get("name", "") for m in json.loads(resp.read()).get("models", [])}


def warm_brain() -> None:
    """Make sure Ollama is running and the model is loaded into memory."""
    STATUS["brain"] = "loading"
    if not _ollama_up() and shutil.which("ollama"):
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        for _ in range(40):
            if _ollama_up():
                break
            time.sleep(0.5)
    if not _ollama_up():
        STATUS["brain"] = "offline"
        STATUS["notes"]["brain"] = "Ollama isn't running. Open the Ollama app, or run: ollama serve"
        return
    if MODEL not in _ollama_models() and f"{MODEL}:latest" not in _ollama_models():
        STATUS["brain"] = "offline"
        STATUS["notes"]["brain"] = f"The model {MODEL} isn't downloaded yet. Run: ollama pull {MODEL}"
        return
    try:
        request = urllib.request.Request(
            OLLAMA + "/api/generate",
            data=json.dumps({"model": MODEL, "prompt": "", "keep_alive": "30m"}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=300) as resp:
            resp.read()
    except Exception as exc:  # the model still loads on the first real request
        STATUS["notes"]["brain"] = f"Model warm-up failed ({exc}); it will load on first use."
    STATUS["brain"] = "online"
    STATUS["notes"].pop("brain", None)


def start_brain() -> None:
    global _brain_thread
    if _brain_thread is None or not _brain_thread.is_alive():
        _brain_thread = threading.Thread(target=warm_brain, daemon=True)
        _brain_thread.start()


def stream_chat(payload: dict):
    """Yield text deltas from Ollama's streaming chat API."""
    request = urllib.request.Request(
        OLLAMA + "/api/chat",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        resp = urllib.request.urlopen(request, timeout=300)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace").strip()
        if "think" in detail and "think" in payload:  # model without a thinking switch
            yield from stream_chat({k: v for k, v in payload.items() if k != "think"})
            return
        raise RuntimeError(f"Ollama error: {detail[:300]}") from None
    except urllib.error.URLError:
        raise RuntimeError(
            f"I can't reach Ollama at {OLLAMA}. Open the Ollama app, or run: ollama serve"
        ) from None
    with resp:
        for raw in resp:
            if not raw.strip():
                continue
            chunk = json.loads(raw)
            if chunk.get("error"):
                raise RuntimeError(chunk["error"])
            delta = (chunk.get("message") or {}).get("content") or ""
            if delta:
                yield delta
            if chunk.get("done"):
                return


# --------------------------------------------------------------------------- senses


def _silent_wav(seconds: float = 0.5, rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\0\0" * int(seconds * rate))
    return buf.getvalue()


def warm_ears() -> None:
    """Load speech recognition (downloads the Whisper model on first launch)."""
    global _ears
    STATUS["ears"] = "loading"
    try:
        from openjarvis.speech._discovery import get_speech_backend

        backend = get_speech_backend(CONFIG)
        if backend is None:
            raise RuntimeError("speech recognition isn't installed")
        backend.transcribe(_silent_wav(), format="wav", language=LANGUAGE)
        _ears = backend
        STATUS["ears"] = "online"
    except Exception as exc:
        STATUS["ears"] = "offline"
        STATUS["notes"]["ears"] = (
            f"Speech recognition unavailable ({exc}). Install OpenJarvis's voice extras."
        )


def warm_voice() -> None:
    """Load text-to-speech (downloads the Kokoro voice on first launch)."""
    global _voice, _voice_id
    STATUS["voice"] = "loading"
    try:
        from openjarvis.speech._tts_discovery import (
            default_voice_for,
            get_tts_backend,
            voice_preferences,
        )

        preferred, voice_id, _speed = voice_preferences(CONFIG)
        backend = get_tts_backend(preferred)
        if backend is None:
            raise RuntimeError("text-to-speech isn't installed")
        active = getattr(backend, "backend_id", "") or preferred
        _voice_id = (voice_id if active == preferred else "") or default_voice_for(active)
        _synthesize(backend, "Online.")
        _voice = backend
        STATUS["voice"] = "online"
    except Exception as exc:
        STATUS["voice"] = "offline"
        STATUS["notes"]["voice"] = (
            f"Local voice unavailable ({exc}); using your browser's voice instead."
        )


def _synthesize(backend, text: str):
    kwargs = {"speed": VOICE_SPEED}
    if _voice_id:
        kwargs["voice_id"] = _voice_id
    return backend.synthesize(text, **kwargs)


_NOT_SPEECH = re.compile(
    r"[\W_]*(?:you|thanks? for watching|thank you (?:so much )?for watching|"
    r"subtitles? by.*|\[[^\]]*\]|\([^)]*\))?[\W_]*",
    re.IGNORECASE,
)
_EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿️]")


def speakable(text: str) -> str:
    """Strip markup that sounds wrong when read aloud."""
    text = re.sub(r"<think>.*?(?:</think>|$)", " ", text, flags=re.S)
    text = re.sub(r"```.*?(?:```|$)", " ", text, flags=re.S)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = _EMOJI.sub("", text)
    text = re.sub(r"[*_#`>|~]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


# --------------------------------------------------------------------------- status


def status_payload() -> dict:
    global _last_brain_check
    if STATUS["brain"] in ("online", "offline") and time.time() - _last_brain_check > 5:
        _last_brain_check = time.time()
        up = _ollama_up()
        if STATUS["brain"] == "online" and not up:
            STATUS["brain"] = "offline"
            STATUS["notes"]["brain"] = "Lost contact with Ollama. Open the Ollama app, or run: ollama serve"
        elif STATUS["brain"] == "offline" and up:
            start_brain()
    cpu = mem = battery = plugged = None
    try:
        import psutil

        cpu = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory().percent
        bat = psutil.sensors_battery()
        if bat is not None:
            battery, plugged = round(bat.percent), bat.power_plugged
    except Exception:
        pass
    return {
        "brain": STATUS["brain"],
        "ears": STATUS["ears"],
        "voice": STATUS["voice"],
        "notes": list(STATUS["notes"].values()),
        "model": MODEL,
        "voice_id": _voice_id,
        "host": socket.gethostname().split(".")[0],
        "cpu": cpu,
        "mem": mem,
        "battery": battery,
        "plugged": plugged,
        "uptime": round(time.time() - STARTED),
    }


# --------------------------------------------------------------------------- http


class Handler(BaseHTTPRequestHandler):
    server_version = "OpenJarvisHUD/1.0"

    def log_message(self, *_args) -> None:  # keep the terminal quiet
        pass

    def _allowed(self) -> bool:
        """Only answer this machine's own browser tab (blocks other websites)."""
        local = {f"localhost:{PORT}", f"127.0.0.1:{PORT}"}
        if self.headers.get("Host") not in local:
            return False
        origin = self.headers.get("Origin")
        return origin is None or origin.split("://", 1)[-1] in local

    def _send(self, code: int, body: bytes, ctype: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code: int, data: dict) -> None:
        self._send(code, json.dumps(data).encode(), "application/json")

    def _line(self, data: dict) -> None:
        self.wfile.write(json.dumps(data).encode() + b"\n")
        self.wfile.flush()

    def do_GET(self) -> None:
        if not self._allowed():
            return self._json(403, {"error": "forbidden"})
        if self.path in ("/", "/index.html"):
            return self._send(200, PAGE.encode(), "text/html; charset=utf-8")
        if self.path == "/api/status":
            return self._json(200, status_payload())
        self._json(404, {"error": "not found"})

    def do_POST(self) -> None:
        if not self._allowed():
            return self._json(403, {"error": "forbidden"})
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY_BYTES:
            return self._json(413, {"error": "too large"})
        body = self.rfile.read(length) if length else b""
        try:
            if self.path == "/api/chat":
                return self._chat(json.loads(body or b"{}"))
            if self.path == "/api/stt":
                return self._stt(body)
            if self.path == "/api/tts":
                return self._tts(json.loads(body or b"{}"))
            self._json(404, {"error": "not found"})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as exc:
            self._json(500, {"error": str(exc)})

    def _chat(self, body: dict) -> None:
        turns = [
            {"role": m.get("role"), "content": str(m.get("content", ""))[:4000]}
            for m in body.get("messages", [])
            if m.get("role") in ("user", "assistant") and str(m.get("content", "")).strip()
        ][-HISTORY_TURNS:]
        system = f"{PERSONA} The current local date and time is {datetime.now():%A %d %B %Y, %H:%M}."
        payload = {
            "model": MODEL,
            "stream": True,
            "think": False,
            "keep_alive": "30m",
            "options": {"num_ctx": 8192, "temperature": 0.5},
            "messages": [{"role": "system", "content": system}, *turns],
        }
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        try:
            for delta in stream_chat(payload):
                self._line({"delta": delta})
            self._line({"done": True})
        except (BrokenPipeError, ConnectionResetError):
            raise
        except Exception as exc:
            self._line({"error": str(exc)})

    def _stt(self, audio: bytes) -> None:
        if _ears is None:
            note = STATUS["notes"].get("ears") or "My ears are still warming up. One moment."
            return self._json(503, {"error": note})
        with _ears_lock:
            result = _ears.transcribe(audio, format="wav", language=LANGUAGE)
        text = (result.text or "").strip()
        if _NOT_SPEECH.fullmatch(text):
            text = ""
        self._json(200, {"text": text})

    def _tts(self, body: dict) -> None:
        text = speakable(str(body.get("text", "")))[:800]
        if not text:
            return self._send(204, b"", "text/plain")
        if _voice is None:
            note = STATUS["notes"].get("voice") or "My voice is still warming up."
            return self._json(503, {"error": note})
        result = _synthesize(_voice, text)
        fmt = (getattr(result, "format", "") or "wav").lower()
        mime = {"wav": "audio/wav", "mp3": "audio/mpeg", "ogg": "audio/ogg", "opus": "audio/ogg"}
        self._send(200, result.audio, mime.get(fmt, "application/octet-stream"))


def main() -> None:
    url = f"http://localhost:{PORT}"
    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        print(f"Port {PORT} is busy. The HUD may already be running at {url}")
        print("To use another port: JARVIS_HUD_PORT=8766 ~/.openjarvis/.venv/bin/python jarvis_hud.py")
        if not os.environ.get("JARVIS_HUD_NO_BROWSER"):
            webbrowser.open(url)
        return
    start_brain()
    threading.Thread(target=warm_ears, daemon=True).start()
    threading.Thread(target=warm_voice, daemon=True).start()
    print(f"OpenJarvis HUD running at {url}")
    print(f"  model: {MODEL} via {OLLAMA}")
    print("  The first launch downloads the speech models, so give it a few minutes.")
    print("  Press Ctrl+C to stop.")
    if not os.environ.get("JARVIS_HUD_NO_BROWSER"):
        threading.Timer(1.0, webbrowser.open, [url]).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nGoodbye.")
    finally:
        server.server_close()


# --------------------------------------------------------------------------- page

PAGE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OpenJarvis HUD</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#02070d; --cyan:#3fe6ff; --cyan-rgb:63,230,255; --amber:#ffb547; --red:#ff5468; --green:#5dffb0;
  --text:#d6f6ff; --muted:#6c95aa; --line:rgba(63,230,255,.22); --panel:rgba(6,22,34,.62);
  --mono:"Share Tech Mono",ui-monospace,Menlo,monospace;
  --sans:"Rajdhani","Avenir Next","Helvetica Neue",Arial,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:radial-gradient(ellipse at 50% 45%,#082031 0%,var(--bg) 62%) fixed,var(--bg);color:var(--text);
  font-family:var(--sans);letter-spacing:.04em;overflow:hidden}
body::before{content:"";position:fixed;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(var(--cyan-rgb),.045) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--cyan-rgb),.045) 1px,transparent 1px);
  background-size:44px 44px;-webkit-mask-image:radial-gradient(ellipse at center,#000 30%,transparent 80%);mask-image:radial-gradient(ellipse at center,#000 30%,transparent 80%)}
body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:5;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px)}
button,input{font:inherit;color:inherit}
.app{position:relative;z-index:1;height:100%;display:grid;grid-template-rows:auto 1fr auto;padding:18px 22px;gap:14px}

header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-bottom:1px solid var(--line);padding-bottom:10px}
.brand b{font-size:26px;font-weight:700;letter-spacing:.32em;color:var(--cyan);text-shadow:0 0 14px rgba(var(--cyan-rgb),.7)}
.brand span,.clock span{display:block;font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.28em;margin-top:2px}
.clock{text-align:right;font-family:var(--mono)}
.clock b{font-size:28px;font-weight:400;text-shadow:0 0 10px rgba(var(--cyan-rgb),.5)}

main{display:grid;grid-template-columns:minmax(220px,280px) 1fr minmax(260px,340px);gap:18px;min-height:0}
.panel{position:relative;background:var(--panel);border:1px solid var(--line);padding:16px;min-height:0;display:flex;flex-direction:column;
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);
  clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))}
.panel::before{content:"";position:absolute;left:0;top:0;width:28px;height:28px;border-left:2px solid var(--cyan);border-top:2px solid var(--cyan);opacity:.8}
.panel h2{font:400 12px var(--mono);letter-spacing:.3em;color:var(--cyan);margin-bottom:14px;display:flex;align-items:center;gap:10px}
.panel h2::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--line),transparent)}

.sysrow{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px dashed rgba(var(--cyan-rgb),.12);font-size:15px;font-weight:600}
.sysrow .k{font:400 11px var(--mono);color:var(--muted);letter-spacing:.2em}
.sysrow .v{font:400 12px var(--mono);letter-spacing:.12em}
.dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--muted);margin-right:8px;vertical-align:1px}
.online .dot{background:var(--green);box-shadow:0 0 8px var(--green)}
.loading .dot,.starting .dot{background:var(--amber);box-shadow:0 0 8px var(--amber);animation:blink 1s steps(2) infinite}
.offline .dot{background:var(--red);box-shadow:0 0 8px var(--red)}
.online{color:var(--green)} .loading,.starting{color:var(--amber)} .offline{color:var(--red)}
@keyframes blink{50%{opacity:.25}}

.meter{margin:12px 0 2px}
.meter .lbl{display:flex;justify-content:space-between;font:400 11px var(--mono);color:var(--muted);letter-spacing:.18em}
.meter .lbl b{color:var(--text);font-weight:400}
.meter .bar{height:6px;margin-top:6px;background:rgba(var(--cyan-rgb),.1);position:relative;overflow:hidden}
.meter .bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,rgba(var(--cyan-rgb),.35),var(--cyan));box-shadow:0 0 10px var(--cyan);transition:width .8s ease}
.meter .bar::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 5px,rgba(2,7,13,.9) 5px 7px)}
.facts{margin-top:16px;display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font:400 11px var(--mono);letter-spacing:.12em}
.facts dt{color:var(--muted)} .facts dd{text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.notes{margin-top:auto;padding-top:14px;font-size:14px;line-height:1.35;color:var(--amber)}
.notes p+p{margin-top:8px}

.core{position:relative;min-height:0;display:flex;flex-direction:column}
#reactor{flex:1;width:100%;min-height:260px;cursor:pointer;outline:none}
.readout{text-align:center;padding:0 12px 6px}
.state{font:700 20px var(--sans);letter-spacing:.55em;color:var(--cyan);text-shadow:0 0 14px rgba(var(--cyan-rgb),.8);padding-left:.55em}
body[data-state=listening] .state{color:var(--green);text-shadow:0 0 14px var(--green)}
body[data-state=thinking] .state{color:var(--amber);text-shadow:0 0 14px var(--amber)}
body[data-state=error] .state{color:var(--red);text-shadow:0 0 14px var(--red)}
.caption{margin:8px auto 0;max-width:640px;min-height:2.7em;font-size:19px;font-weight:500;line-height:1.35;color:var(--text)}
.hint{font:400 11px var(--mono);color:var(--muted);letter-spacing:.22em;margin-top:6px}

.log ol{list-style:none;overflow-y:auto;flex:1;min-height:0;padding-right:6px;scrollbar-width:thin;scrollbar-color:rgba(var(--cyan-rgb),.3) transparent}
.log li{margin-bottom:14px;animation:in .35s ease}
.log .who{font:400 10px var(--mono);letter-spacing:.24em;color:var(--muted);margin-bottom:3px}
.log .jarvis .who{color:var(--cyan)}
.log li p{font-size:16px;font-weight:500;line-height:1.38;white-space:pre-wrap;word-wrap:break-word}
.log .you p{color:#f2fbff}
.log .jarvis p{color:var(--text);border-left:2px solid rgba(var(--cyan-rgb),.5);padding-left:10px}
.log .sys p{color:var(--muted);font-size:14px;font-style:italic}
.log .err p{color:var(--red);border-color:var(--red)}
.log .empty{color:var(--muted);font-size:14px}
@keyframes in{from{opacity:0;transform:translateY(6px)}}

footer{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
#ask{flex:1;display:flex;min-width:260px;border:1px solid var(--line);background:var(--panel)}
#ask input{flex:1;background:transparent;border:0;outline:0;padding:12px 14px;font-size:17px;font-weight:500;min-width:0}
#ask input::placeholder{color:var(--muted)}
#ask button,.tog{background:transparent;border:0;border-left:1px solid var(--line);padding:0 18px;font:400 12px var(--mono);letter-spacing:.22em;color:var(--cyan);cursor:pointer}
#ask button:hover{background:rgba(var(--cyan-rgb),.1)}
.toggles{display:flex;gap:8px;flex-wrap:wrap}
.tog{border:1px solid var(--line);padding:12px 14px;color:var(--muted);background:var(--panel)}
.tog[aria-pressed=true]{color:var(--cyan);border-color:rgba(var(--cyan-rgb),.6);box-shadow:inset 0 0 14px rgba(var(--cyan-rgb),.15)}
.tog::before{content:"";display:inline-block;width:6px;height:6px;margin-right:8px;background:currentColor;vertical-align:1px}

#boot{position:fixed;inset:0;z-index:10;display:grid;place-items:center;background:radial-gradient(circle at center,#06192a 0%,#010409 70%);cursor:pointer;transition:opacity .8s}
#boot.gone{opacity:0;pointer-events:none}
.boot-inner{text-align:center;padding:24px}
.boot-ring{width:150px;height:150px;margin:0 auto 26px;border-radius:50%;border:2px solid rgba(var(--cyan-rgb),.15);border-top-color:var(--cyan);border-right-color:var(--cyan);animation:spin 1.6s linear infinite;box-shadow:0 0 30px rgba(var(--cyan-rgb),.25),inset 0 0 30px rgba(var(--cyan-rgb),.2)}
@keyframes spin{to{transform:rotate(360deg)}}
#boot h1{font-size:40px;font-weight:700;letter-spacing:.45em;padding-left:.45em;color:var(--cyan);text-shadow:0 0 22px rgba(var(--cyan-rgb),.8)}
#boot p{font:400 12px var(--mono);letter-spacing:.35em;color:var(--muted);margin-top:8px}
#boot button{margin-top:30px;padding:14px 34px;background:rgba(var(--cyan-rgb),.08);border:1px solid var(--cyan);color:var(--cyan);font:400 14px var(--mono);letter-spacing:.35em;cursor:pointer;box-shadow:0 0 18px rgba(var(--cyan-rgb),.35)}
#boot button:hover{background:rgba(var(--cyan-rgb),.18)}
#boot small{display:block;margin-top:18px;font-size:15px;color:var(--muted);max-width:420px;margin-left:auto;margin-right:auto;line-height:1.4}

@media (max-width:980px){
  body{overflow:auto}
  .app{height:auto;min-height:100%}
  main{grid-template-columns:1fr}
  .core{order:-1;min-height:62vh}
  .log{max-height:50vh}
}
@media (prefers-reduced-motion:reduce){.boot-ring{animation-duration:6s}}
</style>
</head>
<body data-state="boot">
<div id="boot" role="button" tabindex="0" aria-label="Initialise OpenJarvis">
  <div class="boot-inner">
    <div class="boot-ring"></div>
    <h1>OPENJARVIS</h1>
    <p>LOCAL INTELLIGENCE INTERFACE</p>
    <button id="boot-btn" type="button">INITIALISE</button>
    <small>Your browser will ask to use the microphone so you can talk to me. Nothing leaves this computer.</small>
  </div>
</div>

<div class="app">
  <header>
    <div class="brand"><b>OPENJARVIS</b><span>LOCAL INTELLIGENCE INTERFACE</span></div>
    <div class="clock"><b id="clock">--:--:--</b><span id="date">&nbsp;</span></div>
  </header>

  <main>
    <aside class="panel">
      <h2>SYSTEMS</h2>
      <div class="sysrow"><span class="k">CORE · LLM</span><span class="v starting" id="s-brain"><i class="dot"></i>STARTING</span></div>
      <div class="sysrow"><span class="k">EARS · STT</span><span class="v starting" id="s-ears"><i class="dot"></i>STARTING</span></div>
      <div class="sysrow"><span class="k">VOICE · TTS</span><span class="v starting" id="s-voice"><i class="dot"></i>STARTING</span></div>
      <div class="meter"><div class="lbl">CPU<b id="m-cpu">--</b></div><div class="bar"><i id="b-cpu"></i></div></div>
      <div class="meter"><div class="lbl">MEMORY<b id="m-mem">--</b></div><div class="bar"><i id="b-mem"></i></div></div>
      <div class="meter"><div class="lbl" id="l-bat">POWER<b id="m-bat">--</b></div><div class="bar"><i id="b-bat"></i></div></div>
      <dl class="facts">
        <dt>MODEL</dt><dd id="f-model">--</dd>
        <dt>VOICE</dt><dd id="f-voice">--</dd>
        <dt>HOST</dt><dd id="f-host">--</dd>
        <dt>UPTIME</dt><dd id="f-up">--</dd>
        <dt>RESPONSE</dt><dd id="f-lat">--</dd>
      </dl>
      <div class="notes" id="notes"></div>
    </aside>

    <section class="core">
      <canvas id="reactor" tabindex="0" aria-label="Jarvis core. Click or press Space to talk."></canvas>
      <div class="readout">
        <div class="state" id="state">INITIALISING</div>
        <div class="caption" id="caption" aria-live="polite"></div>
        <div class="hint" id="hint">SPACE OR TAP THE CORE TO TALK · ESC TO STOP</div>
      </div>
    </section>

    <aside class="panel log">
      <h2>COMMS LOG</h2>
      <ol id="log"><li class="empty">No messages yet.</li></ol>
    </aside>
  </main>

  <footer>
    <form id="ask" autocomplete="off">
      <input id="text" placeholder="Type a message, or press Space to talk" aria-label="Message">
      <button type="submit">SEND</button>
    </form>
    <div class="toggles">
      <button class="tog" type="button" data-key="convo" title="Keep listening after each reply">CONVERSATION</button>
      <button class="tog" type="button" data-key="clap" title="Clap twice to make Jarvis listen">CLAP ×2 TO WAKE</button>
      <button class="tog" type="button" data-key="voice" title="Speak replies out loud">VOICE</button>
    </div>
  </footer>
</div>

<script>
"use strict";
const $ = (q) => document.querySelector(q);
const store = {
  get(k, d) { try { const v = localStorage.getItem("hud." + k); return v === null ? d : v === "true"; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("hud." + k, String(v)); } catch {} },
};
const S = {
  state: "boot", history: [], status: null, micOk: false,
  convo: store.get("convo", true), clap: store.get("clap", true), voice: store.get("voice", true),
  chatCtrl: null, speaker: null, greeted: false,
};
const LABELS = { boot: "INITIALISING", idle: "STANDBY", listening: "LISTENING", thinking: "PROCESSING", speaking: "SPEAKING", error: "FAULT" };
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

function setState(s, caption) {
  S.state = s;
  document.body.dataset.state = s;
  $("#state").textContent = LABELS[s] || s.toUpperCase();
  if (caption !== undefined) setCaption(caption);
}
function setCaption(t) { $("#caption").textContent = t; }

// ------------------------------------------------------------------ comms log
function addLog(kind, text) {
  const list = $("#log");
  const empty = list.querySelector(".empty");
  if (empty) empty.remove();
  const li = document.createElement("li");
  li.className = kind;
  const who = document.createElement("div");
  who.className = "who";
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  who.textContent = ({ you: "YOU", jarvis: "JARVIS", sys: "SYSTEM" }[kind] || kind) + " · " + time;
  const p = document.createElement("p");
  p.textContent = text;
  li.append(who, p);
  list.append(li);
  list.scrollTop = list.scrollHeight;
  return p;
}
function scrollLog() { const l = $("#log"); l.scrollTop = l.scrollHeight; }

// ------------------------------------------------------------------ audio engine
let ctx = null, outGain = null, outAnalyser = null, micAnalyser = null, micLevel = 0;
let rec = null, noiseFloor = 0.006;

async function boot() {
  if (S.state !== "boot") return;
  $("#boot").classList.add("gone");
  setState("idle", "Bringing systems online…");
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  try { await ctx.resume(); } catch {}
  outGain = ctx.createGain();
  outAnalyser = ctx.createAnalyser();
  outAnalyser.fftSize = 256;
  outGain.connect(outAnalyser);
  outAnalyser.connect(ctx.destination);
  try {
    if (!navigator.mediaDevices) throw new Error("Open this page at http://localhost so the microphone can be used.");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    });
    const src = ctx.createMediaStreamSource(stream);
    micAnalyser = ctx.createAnalyser();
    micAnalyser.fftSize = 256;
    src.connect(micAnalyser);
    const proc = ctx.createScriptProcessor(1024, 1, 1);
    const silent = ctx.createGain();
    silent.gain.value = 0;
    src.connect(proc);
    proc.connect(silent);
    silent.connect(ctx.destination);
    proc.onaudioprocess = (e) => onMic(e.inputBuffer.getChannelData(0));
    S.micOk = true;
  } catch (err) {
    S.micOk = false;
    addLog("sys", "Microphone unavailable (" + (err.message || err.name) + "). You can still type. To fix it, allow microphone access for this page in your browser settings and reload.");
  }
  greet();
}

function onMic(samples) {
  let sum = 0, peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sum += v * v;
    const a = v < 0 ? -v : v;
    if (a > peak) peak = a;
  }
  const rms = Math.sqrt(sum / samples.length);
  const dt = samples.length / ctx.sampleRate;
  micLevel = rms;
  if (S.state === "listening" && rec) {
    rec.chunks.push(new Float32Array(samples));
    rec.total += dt;
    if (!rec.speech) {
      const keep = Math.ceil(0.4 / dt);
      if (rec.chunks.length > keep) rec.chunks.splice(0, rec.chunks.length - keep);
    }
    if (rec.total < 0.2) return; // ignore the start chime
    const threshold = Math.max(0.01, noiseFloor * 3.5);
    if (rms > threshold) { rec.speech = true; rec.silent = 0; rec.voiced += dt; }
    else if (rec.speech) rec.silent += dt;
    else rec.waited += dt;
    if (rec.speech && rec.silent > 1.1) {
      if (rec.voiced >= 0.25) finishListening();
      else { rec.speech = false; rec.silent = 0; rec.voiced = 0; }
    } else if (!rec.speech && rec.waited > 6) {
      cancelListening("I didn't hear anything. Press Space when you're ready.");
    } else if (rec.total > 30) finishListening();
    return;
  }
  if (S.state === "idle") {
    noiseFloor = noiseFloor * 0.985 + Math.min(rms, 0.04) * 0.015;
    if (S.clap && S.micOk) detectClap(rms, peak);
  }
}

// Double-clap wake: a sharp, loud onset that dies away within ~60 ms, twice.
const clap = { pending: 0, pendingRms: 0, frames: 0, last: 0, prev: 0, cool: 0 };
function detectClap(rms, peak) {
  const now = performance.now();
  if (clap.pending) {
    clap.frames++;
    if (rms < clap.pendingRms * 0.4) {
      const at = clap.pending;
      clap.pending = 0;
      const gap = at - clap.last;
      if (gap > 150 && gap < 900 && now > clap.cool) {
        clap.last = 0;
        clap.cool = now + 2000;
        wake();
      } else clap.last = at;
    } else if (clap.frames > 3) clap.pending = 0; // sustained sound, not a clap
  } else if (peak > 0.3 && rms > Math.max(0.04, noiseFloor * 10) && rms > clap.prev * 3) {
    clap.pending = now;
    clap.pendingRms = rms;
    clap.frames = 0;
  }
  clap.prev = rms;
}
function wake() { if (S.state === "idle") startListening(); }

function chirp(up) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = "sine";
  o.frequency.setValueAtTime(up ? 880 : 1320, t);
  o.frequency.exponentialRampToValueAtTime(up ? 1320 : 660, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g); g.connect(outGain);
  o.start(t); o.stop(t + 0.18);
}

function startListening() {
  if (!S.micOk) { setCaption("The microphone isn't available, so type below instead."); return; }
  if (S.status && S.status.ears !== "online") {
    setCaption(S.status.ears === "offline" ? "Speech recognition isn't working. See the Systems panel." : "My ears are still warming up. Try again in a moment.");
    return;
  }
  interrupt();
  rec = { chunks: [], speech: false, silent: 0, waited: 0, total: 0, voiced: 0 };
  setState("listening", "Listening…");
  chirp(true);
}

function cancelListening(msg) {
  rec = null;
  setState("idle", msg);
}

async function finishListening() {
  const r = rec;
  rec = null;
  if (!r) return;
  chirp(false);
  setState("thinking", "Transcribing…");
  try {
    const res = await fetch("/api/stt", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: encodeWav(r.chunks, ctx.sampleRate) });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!data.text) { afterTurn("I didn't catch that. Press Space to try again.", false); return; }
    send(data.text);
  } catch (err) {
    fault(err);
  }
}

function encodeWav(chunks, inRate, outRate = 16000) {
  let len = 0;
  for (const c of chunks) len += c.length;
  const all = new Float32Array(len);
  let off = 0;
  for (const c of chunks) { all.set(c, off); off += c.length; }
  const ratio = inRate / outRate, outLen = Math.floor(len / ratio);
  const buf = new ArrayBuffer(44 + outLen * 2), dv = new DataView(buf);
  const tag = (p, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(p + i, s.charCodeAt(i)); };
  tag(0, "RIFF"); dv.setUint32(4, 36 + outLen * 2, true); tag(8, "WAVE"); tag(12, "fmt ");
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, outRate, true); dv.setUint32(28, outRate * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); tag(36, "data"); dv.setUint32(40, outLen * 2, true);
  for (let i = 0; i < outLen; i++) {
    const s = Math.floor(i * ratio), e = Math.min(len, Math.floor((i + 1) * ratio));
    let acc = 0;
    for (let j = s; j < e; j++) acc += all[j];
    const v = Math.max(-1, Math.min(1, acc / Math.max(1, e - s)));
    dv.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

// ------------------------------------------------------------------ speaking
function browserSay(text) {
  return new Promise((done) => {
    if (!window.speechSynthesis) return done();
    const u = new SpeechSynthesisUtterance(text);
    const v = speechSynthesis.getVoices().find((x) => /en[-_]GB/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    u.onend = u.onerror = () => done();
    speechSynthesis.speak(u);
  });
}

class Speaker {
  constructor(onDone) { this.items = []; this.busy = false; this.ended = false; this.cancelled = false; this.src = null; this.onDone = onDone; }
  say(text) {
    text = text.replace(/\s+/g, " ").trim();
    if (!text || this.cancelled) return;
    const useLocal = S.status && S.status.voice === "online";
    const audio = useLocal
      ? fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })
          .then((r) => { if (!r.ok) throw new Error("tts " + r.status); return r.arrayBuffer(); })
          .then((b) => ctx.decodeAudioData(b))
      : Promise.reject(new Error("local voice offline"));
    audio.catch(() => {});
    this.items.push({ text, audio });
    this.next();
  }
  end() { this.ended = true; this.next(); }
  async next() {
    if (this.busy || this.cancelled) return;
    const item = this.items.shift();
    if (!item) { if (this.ended && this.onDone) this.onDone(); return; }
    this.busy = true;
    setState("speaking", item.text);
    try {
      const buf = await item.audio;
      if (!this.cancelled) await this.play(buf);
    } catch {
      if (!this.cancelled) await browserSay(item.text);
    }
    this.busy = false;
    this.next();
  }
  play(buf) {
    return new Promise((done) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(outGain);
      s.onended = done;
      this.src = s;
      s.start();
    });
  }
  cancel() {
    this.cancelled = true;
    this.items = [];
    try { if (this.src) this.src.stop(); } catch {}
    if (window.speechSynthesis) speechSynthesis.cancel();
  }
}

function interrupt() {
  if (S.chatCtrl) { S.chatCtrl.abort(); S.chatCtrl = null; }
  if (S.speaker) { S.speaker.cancel(); S.speaker = null; }
  rec = null;
}

function afterTurn(caption, relisten = true) {
  if (relisten && S.convo && S.micOk) {
    setState("idle", caption);
    setTimeout(() => { if (S.state === "idle") startListening(); }, 450);
  } else {
    setState("idle", caption);
  }
}

function fault(err) {
  const msg = String((err && err.message) || err);
  addLog("sys", msg).parentElement.classList.add("err");
  setState("error", "Something went wrong. Details are in the comms log.");
  setTimeout(() => { if (S.state === "error") setState("idle", "Standing by."); }, 4000);
}

const visible = (t) => t.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, "");

async function send(text) {
  text = text.trim();
  if (!text) return;
  interrupt();
  addLog("you", text);
  S.history.push({ role: "user", content: text });
  S.history = S.history.slice(-20);
  setState("thinking", "Processing…");
  const ctrl = new AbortController();
  S.chatCtrl = ctrl;
  const speaker = S.voice ? new Speaker(() => { if (S.speaker === speaker) { S.speaker = null; afterTurn("Standing by."); } }) : null;
  S.speaker = speaker;
  const entry = addLog("jarvis", "…");
  let full = "", spoken = 0, first = 0;
  const t0 = performance.now();
  const pump = (final) => {
    const vis = visible(full);
    entry.textContent = vis.trim() || "…";
    scrollLog();
    if (!speaker) return;
    const rest = vis.slice(spoken);
    const boundary = /[.!?…]+["'”’)\]]*\s+|\n+/g;
    let m, cut = 0;
    while ((m = boundary.exec(rest))) {
      speaker.say(rest.slice(cut, m.index + m[0].length));
      cut = m.index + m[0].length;
    }
    if (final && rest.slice(cut).trim()) { speaker.say(rest.slice(cut)); cut = rest.length; }
    spoken += cut;
  };
  try {
    const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: S.history }), signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error("The HUD server returned " + res.status + ".");
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const msg = JSON.parse(line);
        if (msg.error) throw new Error(msg.error);
        if (msg.delta) { if (!first) first = performance.now(); full += msg.delta; pump(false); }
      }
    }
    pump(true);
    const reply = visible(full).trim();
    if (!reply) throw new Error("The model sent back an empty reply.");
    S.history.push({ role: "assistant", content: reply });
    $("#f-lat").textContent = (((first || performance.now()) - t0) / 1000).toFixed(2) + " S";
    if (speaker) speaker.end();
    else afterTurn(reply);
  } catch (err) {
    if (err.name === "AbortError") return;
    if (entry.textContent === "…") entry.parentElement.remove();
    if (speaker) speaker.cancel();
    if (S.speaker === speaker) S.speaker = null;
    fault(err);
  } finally {
    if (S.chatCtrl === ctrl) S.chatCtrl = null;
  }
}

async function greet() {
  setCaption("Warming up systems. The first launch downloads the speech models, so this can take a few minutes.");
  const t0 = performance.now();
  while (performance.now() - t0 < 180000) {
    const st = S.status;
    if (st && st.brain !== "loading" && st.brain !== "starting" && st.ears !== "loading" && st.ears !== "starting" && st.voice !== "loading" && st.voice !== "starting") break;
    await new Promise((r) => setTimeout(r, 700));
  }
  if (S.greeted || S.state !== "idle") return;
  S.greeted = true;
  const h = new Date().getHours();
  const part = h < 5 ? "evening" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  const ready = S.status && S.status.brain === "online";
  const line = ready ? `Good ${part}. All systems are online. How can I help?` : `Good ${part}. I'm having trouble reaching my language model. Check the Systems panel.`;
  addLog("jarvis", line);
  if (S.voice) {
    const sp = new Speaker(() => { if (S.speaker === sp) { S.speaker = null; setState("idle", "Press Space, tap the core, or clap twice to talk."); } });
    S.speaker = sp;
    sp.say(line);
    sp.end();
  } else setState("idle", "Press Space, tap the core, or clap twice to talk.");
}

// ------------------------------------------------------------------ status panel
function fmtUptime(s) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}H ${m}M` : `${m}M ${s % 60}S`; }
function setMeter(id, pct, label) {
  $("#m-" + id).textContent = label;
  $("#b-" + id).style.width = (pct == null ? 0 : Math.max(0, Math.min(100, pct))) + "%";
}
function setSys(id, state) {
  const el = $("#s-" + id);
  el.className = "v " + state;
  el.innerHTML = '<i class="dot"></i>' + state.toUpperCase();
}
function render(st) {
  setSys("brain", st.brain); setSys("ears", st.ears); setSys("voice", st.voice);
  setMeter("cpu", st.cpu, st.cpu == null ? "--" : Math.round(st.cpu) + "%");
  setMeter("mem", st.mem, st.mem == null ? "--" : Math.round(st.mem) + "%");
  if (st.battery == null) setMeter("bat", 100, "MAINS");
  else setMeter("bat", st.battery, st.battery + "%" + (st.plugged ? " ⚡" : ""));
  $("#f-model").textContent = st.model; $("#f-model").title = st.model;
  $("#f-voice").textContent = (st.voice_id || "--").toUpperCase();
  $("#f-host").textContent = (st.host || "--").toUpperCase();
  $("#f-up").textContent = fmtUptime(st.uptime);
  const notes = $("#notes");
  notes.replaceChildren(...st.notes.map((n) => { const p = document.createElement("p"); p.textContent = n; return p; }));
}
async function poll() {
  try {
    const r = await fetch("/api/status", { cache: "no-store" });
    S.status = await r.json();
    render(S.status);
  } catch {
    S.status = null;
    ["brain", "ears", "voice"].forEach((k) => setSys(k, "offline"));
    $("#notes").textContent = "Lost contact with the HUD server. Is jarvis_hud.py still running?";
  }
  setTimeout(poll, 2000);
}
function tick() {
  const d = new Date();
  $("#clock").textContent = d.toLocaleTimeString([], { hour12: false });
  $("#date").textContent = d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();
}

// ------------------------------------------------------------------ reactor
const cv = $("#reactor"), g = cv.getContext("2d");
let W = 0, H = 0;
function resize() {
  const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  W = r.width; H = r.height;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(resize).observe(cv);
const freq = new Uint8Array(128);
const motes = Array.from({ length: 70 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), s: (Math.random() * 0.5 + 0.15) * (Math.random() < 0.5 ? -1 : 1), z: Math.random() }));
const COLORS = { boot: [63, 230, 255], idle: [63, 230, 255], listening: [93, 255, 196], thinking: [255, 181, 71], speaking: [140, 238, 255], error: [255, 84, 104] };
const col = [63, 230, 255];
let level = 0, spin = 0, last = performance.now();
const rgba = (a) => `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a})`;

function frame(now) {
  requestAnimationFrame(frame);
  const st = S.state;
  // 30 fps is plenty while idle; full rate only while listening, thinking or speaking.
  if ((st === "idle" || st === "boot") && now - last < 32) return;
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  let target = 0.06 + 0.04 * Math.sin(now / 700);
  let an = null;
  if (st === "listening" && micAnalyser) { an = micAnalyser; target = Math.min(1, micLevel * 12); }
  else if (st === "speaking" && outAnalyser) an = outAnalyser;
  else if (st === "thinking") target = 0.25 + 0.1 * Math.sin(now / 120);
  if (an) {
    an.getByteFrequencyData(freq);
    if (st === "speaking") { let s = 0; for (let i = 2; i < 40; i++) s += freq[i]; target = Math.min(1, (s / (38 * 255)) * 1.8); }
  } else freq.fill(0);
  level += (target - level) * Math.min(1, dt * 10);
  const tc = COLORS[st] || COLORS.idle;
  for (let i = 0; i < 3; i++) col[i] += (tc[i] - col[i]) * Math.min(1, dt * 4);
  spin += dt * (st === "thinking" ? 2.6 : st === "listening" ? 0.9 : 0.35) * (REDUCED ? 0.3 : 1);
  draw(now, st);
}

function ring(r, a, w) { g.strokeStyle = rgba(a); g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
function poly(n, r) { g.beginPath(); for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); }

function draw(now, st) {
  g.clearRect(0, 0, W, H);
  if (!W || !H) return;
  const R = Math.min(W, H) * 0.4, TAU = Math.PI * 2;
  g.save();
  g.translate(W / 2, H / 2);
  g.globalCompositeOperation = "lighter";

  const glow = g.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 1.3);
  glow.addColorStop(0, rgba(0.2 + level * 0.3));
  glow.addColorStop(0.45, rgba(0.05 + level * 0.08));
  glow.addColorStop(1, rgba(0));
  g.fillStyle = glow;
  g.beginPath(); g.arc(0, 0, R * 1.3, 0, TAU); g.fill();

  g.save();
  g.rotate(spin * 0.08);
  for (const major of [false, true]) {
    const len = major ? R * 0.06 : R * 0.025;
    g.beginPath();
    for (let i = 0; i < 180; i++) {
      if ((i % 15 === 0) !== major) continue;
      const a = (i / 180) * TAU, c = Math.cos(a), s = Math.sin(a);
      g.moveTo(c * R, s * R); g.lineTo(c * (R - len), s * (R - len));
    }
    g.strokeStyle = rgba(major ? 0.85 : 0.35);
    g.lineWidth = major ? 1.6 : 1;
    g.stroke();
  }
  g.restore();
  ring(R * 1.05, 0.22, 1);
  ring(R * 1.09, 0.1, 1);

  g.save();
  g.rotate(spin * 0.6);
  g.lineCap = "butt";
  g.beginPath();
  for (let k = 0; k < 3; k++) { const a0 = (k * TAU) / 3; g.moveTo(Math.cos(a0) * R * 0.86, Math.sin(a0) * R * 0.86); g.arc(0, 0, R * 0.86, a0, a0 + Math.PI * 0.42); }
  // Layered strokes fake a glow far more cheaply than shadowBlur.
  g.strokeStyle = rgba(0.12); g.lineWidth = R * 0.09; g.stroke();
  g.strokeStyle = rgba(0.8); g.lineWidth = R * 0.035; g.stroke();
  g.restore();

  g.save();
  g.rotate(-spin * 0.9);
  g.setLineDash([R * 0.05, R * 0.035]);
  ring(R * 0.76, 0.55, R * 0.012);
  g.restore();

  if (st === "thinking") {
    g.save();
    g.rotate(spin * 2.2);
    const sweep = g.createLinearGradient(0, 0, R * 0.7, 0);
    sweep.addColorStop(0, rgba(0)); sweep.addColorStop(1, rgba(0.5));
    g.strokeStyle = sweep; g.lineWidth = R * 0.08;
    g.beginPath(); g.arc(0, 0, R * 0.64, 0, Math.PI * 0.5); g.stroke();
    g.restore();
  }

  const bars = 96, base = R * 0.5;
  g.save();
  g.rotate(-Math.PI / 2);
  g.lineWidth = Math.max(1.5, R * 0.012); g.lineCap = "round";
  for (let i = 0; i < bars; i++) {
    const idx = i < bars / 2 ? i : bars - 1 - i;
    const v = freq[2 + idx] / 255;
    const h = R * (0.015 + 0.2 * v + 0.04 * level * (0.5 + 0.5 * Math.sin(now / 260 + i)));
    const a = (i / bars) * TAU;
    g.strokeStyle = rgba(0.3 + v * 0.7);
    g.beginPath(); g.moveTo(Math.cos(a) * base, Math.sin(a) * base); g.lineTo(Math.cos(a) * (base + h), Math.sin(a) * (base + h)); g.stroke();
  }
  g.restore();
  ring(R * 0.46, 0.65, 1.5);

  g.save();
  g.rotate(spin * 0.25);
  g.lineWidth = 6; g.strokeStyle = rgba(0.1);
  poly(6, R * 0.34);
  g.lineWidth = 1.5; g.strokeStyle = rgba(0.75);
  poly(6, R * 0.34);
  g.rotate(Math.PI / 6); g.strokeStyle = rgba(0.3);
  poly(6, R * 0.29);
  g.restore();

  const cr = R * (0.2 + level * 0.1);
  const core = g.createRadialGradient(0, 0, 0, 0, 0, cr * 1.6);
  core.addColorStop(0, "rgba(255,255,255,0.95)");
  core.addColorStop(0.25, rgba(0.95));
  core.addColorStop(0.6, rgba(0.3));
  core.addColorStop(1, rgba(0));
  g.fillStyle = core;
  g.beginPath(); g.arc(0, 0, cr * 1.6, 0, TAU); g.fill();

  const pace = (1 + level * 3) * (st === "thinking" ? 3 : 1) * (REDUCED ? 0.3 : 1);
  g.fillStyle = rgba(0.55);
  for (const p of motes) {
    p.a += p.s * 0.004 * pace;
    const pr = R * (0.42 + p.r * 0.75);
    g.globalAlpha = 0.35 + p.z * 0.65;
    g.fillRect(Math.cos(p.a) * pr, Math.sin(p.a) * pr, 1.7, 1.7);
  }
  g.globalAlpha = 1;
  g.restore();
}

// ------------------------------------------------------------------ controls
function talk() {
  if (S.state === "boot") return;
  if (S.state === "listening") {
    if (rec && rec.speech) finishListening();
    else cancelListening("Standing by.");
    return;
  }
  startListening();
}
cv.addEventListener("click", talk);
$("#boot").addEventListener("click", boot);
addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (S.state === "boot") {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); boot(); }
    return;
  }
  const typing = document.activeElement === $("#text");
  if (e.code === "Space" && !typing) { e.preventDefault(); talk(); }
  else if (e.key === "Escape") { interrupt(); setState("idle", "Standing by."); $("#text").blur(); }
});
$("#ask").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = $("#text").value;
  $("#text").value = "";
  if (S.state === "boot") boot().then(() => send(t));
  else send(t);
});
for (const b of document.querySelectorAll(".tog")) {
  const k = b.dataset.key;
  const sync = () => b.setAttribute("aria-pressed", String(S[k]));
  sync();
  b.addEventListener("click", () => {
    S[k] = !S[k];
    store.set(k, S[k]);
    sync();
    if (k === "voice" && !S[k] && S.speaker) { S.speaker.cancel(); S.speaker = null; setState("idle", "Voice off. Replies will appear as text."); }
    b.blur();
  });
}

tick(); setInterval(tick, 1000);
poll();
requestAnimationFrame(frame);
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
