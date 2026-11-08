#!/usr/bin/env python3
"""OpenJarvis HUD: a premium, voice-first dashboard for your local OpenJarvis assistant.

Talk to it and it answers out loud. It can also pull up the news, brief you on your
day, check the weather, set timers, open apps and websites, play things on YouTube
and look things up on the web.

What runs where:
  ears    faster-whisper speech recognition on this computer
  brain   the Ollama model from your OpenJarvis config (qwen3.5:2b by default)
  voice   Kokoro text-to-speech on this computer (British "bm_george" voice)
  online  BBC News headlines, Open-Meteo weather and web search (no API keys needed)

Keep this file next to hud.html and start it with the Python OpenJarvis installed:

    ~/.openjarvis/.venv/bin/python ~/.openjarvis/hud/jarvis_hud.py

It opens http://localhost:8765 in your browser. Press Ctrl+C here to stop it.

Optional environment variables:
  JARVIS_HUD_PORT=8765        port to serve on
  JARVIS_HUD_MODEL=qwen3.5:4b use a different Ollama model
  JARVIS_HUD_NAME=Avyan       what Jarvis calls you (default: your Mac account's first name)
  JARVIS_HUD_NO_BROWSER=1     don't open the browser automatically
"""

from __future__ import annotations

import html
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
import urllib.parse
import urllib.request
import wave
import webbrowser
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import parsedate_to_datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    from openjarvis.core.config import load_config
except ImportError:
    sys.exit(
        "jarvis_hud.py needs the Python that OpenJarvis installed. Run it like this:\n"
        f"  ~/.openjarvis/.venv/bin/python {sys.argv[0]}"
    )

HERE = Path(__file__).resolve().parent
PAGE_PATH = HERE / "hud.html"
PORT = int(os.environ.get("JARVIS_HUD_PORT", "8765"))
CONFIG = load_config()
MODEL = os.environ.get("JARVIS_HUD_MODEL") or CONFIG.intelligence.default_model or "qwen3.5:2b"
LANGUAGE = (CONFIG.speech.language or "en").strip()
VOICE_SPEED = float(CONFIG.speech.voice_speed or 1.0)
HISTORY_TURNS = 20
MAX_BODY_BYTES = 25 * 1024 * 1024
USER_AGENT = "OpenJarvisHUD/2.0 (+https://github.com/open-jarvis/OpenJarvis)"
IS_MAC = sys.platform == "darwin"


def _default_name() -> str:
    if os.environ.get("JARVIS_HUD_NAME"):
        return os.environ["JARVIS_HUD_NAME"].strip()
    try:
        import pwd

        full = pwd.getpwuid(os.getuid()).pw_gecos.split(",")[0].strip()
        first = full.split()[0] if full else ""
        return "" if first.lower() in ("root", "admin", "user") else first
    except Exception:
        return ""


DEFAULT_NAME = _default_name()


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


# --------------------------------------------------------------------------- web helpers


def http_get(url: str, timeout: float = 8) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 502, 503) or attempt == 2:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError("unreachable")


def http_json(url: str, timeout: float = 8):
    return json.loads(http_get(url, timeout))


_cache: dict = {}
_cache_lock = threading.Lock()


def cached(key, ttl: float, load):
    now = time.time()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
    value = load()
    with _cache_lock:
        _cache[key] = (now, value)
    return value


# --------------------------------------------------------------------------- news

NEWS_FEEDS = {
    "top": ("BBC News", "https://feeds.bbci.co.uk/news/rss.xml"),
    "world": ("BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    "tech": ("BBC Technology", "https://feeds.bbci.co.uk/news/technology/rss.xml"),
    "business": ("BBC Business", "https://feeds.bbci.co.uk/news/business/rss.xml"),
    "science": ("BBC Science", "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"),
    "sport": ("BBC Sport", "https://feeds.bbci.co.uk/sport/rss.xml"),
}
NEWS_LABELS = {"top": "top", "world": "world", "tech": "technology", "business": "business",
               "science": "science", "sport": "sport"}
_MEDIA = "{http://search.yahoo.com/mrss/}"


def fetch_news(category: str = "top", limit: int = 12) -> list[dict]:
    category = category if category in NEWS_FEEDS else "top"
    source, url = NEWS_FEEDS[category]

    def load() -> list[dict]:
        root = ET.fromstring(http_get(url))
        items, seen = [], set()
        for node in root.iter("item"):
            title = html.unescape((node.findtext("title") or "").strip())
            if not title or title in seen:
                continue
            seen.add(title)
            thumb = node.find(_MEDIA + "thumbnail")
            image = thumb.get("url", "") if thumb is not None else ""
            image = image.replace("/standard/240/", "/standard/480/")
            try:
                stamp = parsedate_to_datetime(node.findtext("pubDate") or "").timestamp()
            except (TypeError, ValueError):
                stamp = None
            items.append({
                "title": title,
                "summary": html.unescape((node.findtext("description") or "").strip()),
                "link": (node.findtext("link") or "").strip(),
                "image": image,
                "time": stamp,
                "source": source,
            })
            if len(items) >= 24:
                break
        return items

    return cached(("news", category), 600, load)[:limit]


# --------------------------------------------------------------------------- weather

WMO = {
    0: ("clear", "clear"), 1: ("mostly clear", "clear"), 2: ("partly cloudy", "partly"),
    3: ("overcast", "cloud"), 45: ("foggy", "fog"), 48: ("foggy", "fog"),
    51: ("light drizzle", "drizzle"), 53: ("drizzle", "drizzle"), 55: ("heavy drizzle", "drizzle"),
    56: ("freezing drizzle", "drizzle"), 57: ("freezing drizzle", "drizzle"),
    61: ("light rain", "rain"), 63: ("rain", "rain"), 65: ("heavy rain", "rain"),
    66: ("freezing rain", "rain"), 67: ("freezing rain", "rain"),
    71: ("light snow", "snow"), 73: ("snow", "snow"), 75: ("heavy snow", "snow"), 77: ("snow", "snow"),
    80: ("showers", "rain"), 81: ("heavy showers", "rain"), 82: ("violent showers", "rain"),
    85: ("snow showers", "snow"), 86: ("snow showers", "snow"),
    95: ("thunderstorms", "storm"), 96: ("thunderstorms with hail", "storm"),
    99: ("thunderstorms with hail", "storm"),
}


def locate(city: str) -> dict:
    if city:
        query = urllib.parse.urlencode({"name": city, "count": 1, "language": "en"})
        found = (http_json("https://geocoding-api.open-meteo.com/v1/search?" + query).get("results") or [None])[0]
        if not found:
            raise LookupError(f"I couldn't find a place called {city}.")
        return {"city": found["name"], "country": found.get("country", ""),
                "lat": found["latitude"], "lon": found["longitude"]}
    here = http_json("https://ipwho.is/")
    if not here.get("success"):
        raise LookupError("I couldn't work out where you are. Set your city in Settings.")
    return {"city": here.get("city", ""), "country": here.get("country", ""),
            "lat": here["latitude"], "lon": here["longitude"]}


FAHRENHEIT_COUNTRIES = {"United States", "United States of America", "Liberia", "Myanmar", "Bahamas",
                        "Belize", "Cayman Islands", "Palau", "Federated States of Micronesia", "Marshall Islands"}


def fetch_weather(city: str = "", units: str = "auto") -> dict:
    place = cached(("place", city.lower()), 86400, lambda: locate(city))
    if units not in ("celsius", "fahrenheit"):
        units = "fahrenheit" if place.get("country") in FAHRENHEIT_COUNTRIES else "celsius"
    fahrenheit = units == "fahrenheit"

    def load() -> dict:
        query = urllib.parse.urlencode({
            "latitude": place["lat"], "longitude": place["lon"], "timezone": "auto", "forecast_days": 2,
            "current": "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day",
            "hourly": "temperature_2m,weather_code,precipitation_probability",
            "daily": "temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,precipitation_probability_max",
            "temperature_unit": "fahrenheit" if fahrenheit else "celsius",
            "wind_speed_unit": "mph" if fahrenheit else "kmh",
        })
        data = http_json("https://api.open-meteo.com/v1/forecast?" + query)
        now, hourly, daily = data["current"], data["hourly"], data["daily"]
        label, icon = WMO.get(now["weather_code"], ("cloudy", "cloud"))
        start = next((i for i, t in enumerate(hourly["time"]) if t[:13] >= now["time"][:13]), 0)
        hours = [{
            "time": hourly["time"][i][11:16],
            "temp": round(hourly["temperature_2m"][i]),
            "icon": WMO.get(hourly["weather_code"][i], ("", "cloud"))[1],
            "rain": hourly["precipitation_probability"][i] or 0,
        } for i in range(start, min(start + 12, len(hourly["time"])))]

        def day(i: int) -> dict:
            d_label, d_icon = WMO.get(daily["weather_code"][i], ("cloudy", "cloud"))
            return {"high": round(daily["temperature_2m_max"][i]), "low": round(daily["temperature_2m_min"][i]),
                    "label": d_label, "icon": d_icon, "rain": daily["precipitation_probability_max"][i] or 0}

        return {
            "city": place["city"], "country": place["country"],
            "temp": round(now["temperature_2m"]), "feels": round(now["apparent_temperature"]),
            "label": label, "icon": icon, "is_day": bool(now["is_day"]),
            "humidity": now["relative_humidity_2m"], "wind": round(now["wind_speed_10m"]),
            "wind_unit": "mph" if fahrenheit else "km/h", "unit": "°F" if fahrenheit else "°C",
            "sunrise": daily["sunrise"][0][11:16], "sunset": daily["sunset"][0][11:16],
            "today": day(0), "tomorrow": day(1), "hours": hours,
        }

    return cached(("weather", city.lower(), units), 900, load)


# --------------------------------------------------------------------------- web lookup


def web_lookup(query: str) -> list[dict]:
    """Search the web; fall back to Wikipedia if search engines refuse."""
    results: list[dict] = []
    try:
        from ddgs import DDGS

        for hit in DDGS(timeout=8).text(query, max_results=5):
            results.append({"title": hit.get("title", ""), "url": hit.get("href", ""),
                            "snippet": hit.get("body", "")})
    except Exception:
        pass
    if results:
        return results
    try:
        search = http_json("https://en.wikipedia.org/w/rest.php/v1/search/page?"
                           + urllib.parse.urlencode({"q": query, "limit": 3}))
        for page in search.get("pages", [])[:2]:
            summary = http_json("https://en.wikipedia.org/api/rest_v1/page/summary/"
                                + urllib.parse.quote(page["key"]))
            results.append({"title": summary.get("title", page["key"]),
                            "url": summary.get("content_urls", {}).get("desktop", {}).get("page", ""),
                            "snippet": summary.get("extract", "")})
    except Exception:
        pass
    return results


def _domain(url: str) -> str:
    return urllib.parse.urlsplit(url).netloc.removeprefix("www.")


# --------------------------------------------------------------------------- actions

SITES = {
    "youtube": ("YouTube", "https://www.youtube.com"), "google": ("Google", "https://www.google.com"),
    "gmail": ("Gmail", "https://mail.google.com"), "email": ("Gmail", "https://mail.google.com"),
    "google maps": ("Google Maps", "https://maps.google.com"), "github": ("GitHub", "https://github.com"),
    "netflix": ("Netflix", "https://www.netflix.com"), "instagram": ("Instagram", "https://www.instagram.com"),
    "twitter": ("X", "https://x.com"), "x": ("X", "https://x.com"), "linkedin": ("LinkedIn", "https://www.linkedin.com"),
    "reddit": ("Reddit", "https://www.reddit.com"), "whatsapp": ("WhatsApp", "https://web.whatsapp.com"),
    "chatgpt": ("ChatGPT", "https://chatgpt.com"), "claude": ("Claude", "https://claude.ai"),
    "notion": ("Notion", "https://www.notion.so"), "amazon": ("Amazon", "https://www.amazon.com"),
    "spotify": ("Spotify", "https://open.spotify.com"), "bbc": ("BBC News", "https://www.bbc.com/news"),
    "bbc news": ("BBC News", "https://www.bbc.com/news"), "wikipedia": ("Wikipedia", "https://www.wikipedia.org"),
    "google calendar": ("Google Calendar", "https://calendar.google.com"),
    "google drive": ("Google Drive", "https://drive.google.com"), "drive": ("Google Drive", "https://drive.google.com"),
    "google docs": ("Google Docs", "https://docs.google.com"), "docs": ("Google Docs", "https://docs.google.com"),
    "twitch": ("Twitch", "https://www.twitch.tv"), "pinterest": ("Pinterest", "https://www.pinterest.com"),
}
APP_ALIASES = {
    "settings": "System Settings", "system settings": "System Settings", "preferences": "System Settings",
    "chrome": "Google Chrome", "google chrome": "Google Chrome", "vs code": "Visual Studio Code",
    "vscode": "Visual Studio Code", "code": "Visual Studio Code", "word": "Microsoft Word",
    "excel": "Microsoft Excel", "powerpoint": "Microsoft PowerPoint", "outlook": "Microsoft Outlook",
    "teams": "Microsoft Teams", "music": "Music", "apple music": "Music", "app store": "App Store",
    "facetime": "FaceTime", "messages": "Messages", "imessage": "Messages", "mail": "Mail",
}
_APP_DIRS = ["/Applications", "/Applications/Utilities", "/System/Applications",
             "/System/Applications/Utilities", os.path.expanduser("~/Applications")]


def find_app(name: str) -> str | None:
    """Return the path of an installed Mac app whose name matches, if any."""
    if not IS_MAC:
        return None
    wanted = APP_ALIASES.get(name, name).lower()
    fuzzy = None
    for folder in _APP_DIRS:
        try:
            entries = os.listdir(folder)
        except OSError:
            continue
        for entry in entries:
            if not entry.endswith(".app"):
                continue
            base = entry[:-4].lower()
            if base == wanted:
                return os.path.join(folder, entry)
            if fuzzy is None and len(wanted) >= 3 and (base.startswith(wanted + " ") or wanted in base.split()):
                fuzzy = os.path.join(folder, entry)
    return fuzzy


def open_url(url: str) -> None:
    if IS_MAC:
        subprocess.Popen(["open", url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        webbrowser.open(url)


def open_app(path: str) -> None:
    subprocess.Popen(["open", "-a", path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


# --------------------------------------------------------------------------- command router

_NUMBERS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "ninety": 90, "couple": 2, "few": 3,
}
_TENS = "twenty|thirty|forty|fifty"
_ONES = "one|two|three|four|five|six|seven|eight|nine"


def parse_duration(text: str) -> int | None:
    """Turn '5 minutes', 'an hour and a half' or 'twenty five seconds' into seconds."""
    t = text.lower().replace("-", " ")
    t = re.sub(rf"\b({_TENS}) ({_ONES})\b", lambda m: str(_NUMBERS[m[1]] + _NUMBERS[m[2]]), t)
    total, found = 0.0, False
    if re.search(r"\bhalf an hour\b", t):
        total, found = 1800, True
        t = re.sub(r"\bhalf an hour\b", " ", t)
    for m in re.finditer(r"(\d+(?:\.\d+)?|[a-z]+)\s+(?:and a half\s+)?(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b", t):
        n = float(m[1]) if m[1][0].isdigit() else _NUMBERS.get(m[1])
        if n is None:
            continue
        if "and a half" in m[0]:
            n += 0.5
        total += n * {"h": 3600, "m": 60, "s": 1}[m[2][0]]
        found = True
    for m in re.finditer(r"(hours?|minutes?) and a half", t):
        total += {"h": 1800, "m": 30}[m[1][0]]
    return int(total) if found and total > 0 else None


def say_duration(seconds: int) -> str:
    parts = []
    for size, unit in ((3600, "hour"), (60, "minute"), (1, "second")):
        n, seconds = divmod(seconds, size)
        if n:
            parts.append(f"{n} {unit}{'s' if n != 1 else ''}")
    return " and ".join(parts) if parts else "0 seconds"


def timer_name(seconds: int) -> str:
    """'25-minute', '2-hour', '90-second', or a spelled-out mix like '1 hour 30 minute'."""
    for size, unit in ((3600, "hour"), (60, "minute"), (1, "second")):
        if seconds % size == 0 and (unit != "second" or seconds < 120):
            return f"{seconds // size}-{unit}"
    return say_duration(seconds).replace(" and ", " ").replace("minutes", "minute").replace("hours", "hour")


def _ordinal(n: int) -> str:
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def _clock(dt: datetime) -> str:
    return dt.strftime("%I:%M %p").lstrip("0")


def _sentence(text: str) -> str:
    text = text.strip()
    return text if text[-1:] in ".!?" else text + "."


NEWS_TOPICS = [
    (r"\b(tech|technology|ai|artificial intelligence|gadgets?|apple|google)\b", "tech"),
    (r"\b(business|markets?|economy|finance|stocks?)\b", "business"),
    (r"\b(world|international|global)\b", "world"),
    (r"\b(science|space|climate|environment)\b", "science"),
    (r"\b(sports?|football|cricket|tennis|f1|formula one)\b", "sport"),
]
HELP = (
    "Here's what I can do. Say brief me for a rundown of your day. Ask me to pull up the news, "
    "or tech, business, world, science or sport news. Ask about the weather anywhere. Set timers "
    "and reminders. Open apps and websites, like open YouTube. Play songs or videos on YouTube. "
    "Search the web, like look up the tallest building in the world. Or just talk to me."
)


def _clean(text: str) -> str:
    t = text.strip().lower()
    t = re.sub(r"^(hey|ok|okay|hi|yo)\b[,!.]?\s*", "", t)
    t = re.sub(r"^jarvis\b[,!.]?\s*", "", t)
    t = re.sub(r"^(please|can you|could you|would you|will you|i want you to|i'd like you to)\s+", "", t)
    t = re.sub(r"^(please)\s+", "", t)
    t = re.sub(r"[\s,]*(please|for me|thanks|thank you)[.!?]*$", "", t)
    return t.strip(" .!?")


def route(text: str, prefs: dict) -> dict | None:
    """Handle requests the dashboard can carry out itself.

    Returns {"say": ..., "ui": [...], "memory": ...} for a finished answer, {"context": ..., "ui": [...]}
    to let the model answer with extra information, or None for ordinary conversation.
    """
    t = _clean(text)
    if not t:
        return None
    now = datetime.now()

    if re.fullmatch(r"(stop|cancel|never ?mind|that'?s all|nothing|shush|be quiet|quiet)", t):
        return {"say": "Of course.", "ui": []}

    if re.search(r"\b(what can you do|what do you do|help me out|list (your )?commands|what are your (skills|abilities))\b", t) or t == "help":
        return {"say": HELP, "ui": []}

    if re.search(r"\b(cancel|stop|clear|delete|remove)\b.*\b(timers?|reminders?|alarms?)\b", t):
        return {"say": "All timers cleared.", "ui": [{"type": "timer_cancel"}]}

    if re.search(r"\b(timer|remind me|reminder|countdown|alarm in|wake me in)\b", t):
        seconds = parse_duration(t)
        if not seconds:
            return {"say": "How long should I set it for? Try, set a timer for 10 minutes.", "ui": []}
        heard = say_duration(seconds)
        task = re.search(r"remind me (?:to|about) (.+?)(?:\s+in\s+.+)?$", t) or re.search(r"\bin .+? to (.+)$", t)
        if task:
            label = task[1].strip()
            return {"say": f"Reminder set. I'll remind you to {label} in {heard}.",
                    "ui": [{"type": "timer", "seconds": seconds, "label": label, "remind": True}]}
        named = re.search(r"\b(?:timer|countdown)\b.*\bfor (?:the |my )?([a-z][a-z ]+?)$", t)
        if named and not parse_duration(named[1] + " "):
            label = named[1].strip()
            return {"say": f"{label.capitalize()} timer set for {heard}.",
                    "ui": [{"type": "timer", "seconds": seconds, "label": f"{label.capitalize()} timer"}]}
        return {"say": f"Timer set for {heard}.", "ui": [{"type": "timer", "seconds": seconds, "label": f"{timer_name(seconds)} timer"}]}

    if re.search(r"\b(what('?s| is) the time|what time is it|time is it|current time|tell me the time)\b", t):
        return {"say": f"It's {_clock(now)}.", "ui": []}

    if re.search(r"\b(what('?s| is) (the |today'?s )?date|what day is (it|today)|today'?s date|what'?s today)\b", t):
        return {"say": f"It's {now:%A}, the {_ordinal(now.day)} of {now:%B}.", "ui": []}

    if re.search(r"\b(brief me|briefing|morning report|catch me up|daily (summary|update)|what did i miss|start my day)\b", t) \
            or re.fullmatch(r"good (morning|afternoon|evening)( jarvis)?", t):
        return briefing(prefs)

    if re.search(r"\b(news|headlines|top stories|what'?s happening|current events)\b", t):
        category = next((cat for pattern, cat in NEWS_TOPICS if re.search(pattern, t)), "top")
        items = fetch_news(category, 12)
        if not items:
            return {"say": "I couldn't reach the news feed just now.", "ui": []}
        read = items[:4]
        label = NEWS_LABELS[category]
        lines = ["Here are today's top headlines from the BBC." if category == "top"
                 else f"Here are the latest {label} headlines from the BBC."]
        lines += [("First, " if i == 0 else "Next, " if i < len(read) - 1 else "And finally, ")
                  + _sentence(item["title"]) for i, item in enumerate(read)]
        lines.append("Tap any story to open it.")
        memory = "I read these headlines:\n" + "\n".join(
            f"{i + 1}. {it['title']}: {it['summary']}" for i, it in enumerate(read))
        return {"say": " ".join(lines), "memory": memory,
                "ui": [{"type": "news", "category": category, "items": items, "deck": True}]}

    if re.search(r"\b(weather|temperature|forecast|rain|raining|rainy|snow|snowing|umbrella|sunny|windy|humid|"
                 r"how (hot|cold|warm) is it|degrees outside)\b", t):
        m = re.search(r"\b(?:in|for|at) ([a-z][a-z .'-]+?)(?: today| tomorrow| right now| this week)?$", t)
        not_places = {"today", "tomorrow", "tonight", "the week", "the morning", "the afternoon", "the evening",
                      "the weekend", "celsius", "fahrenheit", "here", "my area", "my city"}
        city = m[1].strip() if m and m[1].strip() not in not_places else (prefs.get("city") or "")
        try:
            w = fetch_weather(city, prefs.get("units") or "auto")
        except Exception as exc:
            return {"say": str(exc) if isinstance(exc, LookupError) else "I couldn't reach the weather service.", "ui": []}
        deg = "degrees"
        if "tomorrow" in t:
            d = w["tomorrow"]
            say = (f"Tomorrow in {w['city']}, expect {d['label']}, with a high of {d['high']} and a low of {d['low']} {deg}."
                   + (f" There's a {d['rain']} percent chance of rain." if d["rain"] >= 30 else ""))
        else:
            d = w["today"]
            say = (f"It's {w['temp']} {deg} and {w['label']} in {w['city']}, with a high of {d['high']} and a low of {d['low']}."
                   + (f" There's a {d['rain']} percent chance of rain today." if d["rain"] >= 30 else ""))
        return {"say": say, "ui": [{"type": "weather", "data": w, "focus": True}]}

    m = re.fullmatch(r"play (.+?)(?: on (youtube|spotify))?", t)
    if m:
        what, where = m[1], m[2] or "youtube"
        if where == "spotify" and find_app("spotify"):
            open_url("spotify:search:" + urllib.parse.quote(what))
            return {"say": f"Here's {what} on Spotify.", "ui": [{"type": "opened", "label": "Spotify", "detail": what}]}
        url = "https://www.youtube.com/results?" + urllib.parse.urlencode({"search_query": what})
        open_url(url)
        return {"say": f"Here's {what} on YouTube.", "ui": [{"type": "opened", "label": "YouTube", "detail": what, "url": url}]}

    m = re.fullmatch(r"(?:google|search google for|search on google for|bing) (.+)", t)
    if m:
        url = "https://www.google.com/search?" + urllib.parse.urlencode({"q": m[1]})
        open_url(url)
        return {"say": f"Searching Google for {m[1]}.", "ui": [{"type": "opened", "label": "Google", "detail": m[1], "url": url}]}

    m = re.fullmatch(r"(?:open|launch|start|go to|pull up|bring up|load)\s+(?:the |my |up )?(.+?)(?: app| website| site| page)?", t)
    if m:
        target = m[1].strip()
        app = find_app(target)
        if app:
            open_app(app)
            label = Path(app).stem
            return {"say": f"Opening {label}.", "ui": [{"type": "opened", "label": label}]}
        if target in SITES:
            label, url = SITES[target]
            open_url(url)
            return {"say": f"Opening {label}.", "ui": [{"type": "opened", "label": label, "url": url}]}
        if re.fullmatch(r"[\w-]+(\.[\w-]+)+(/\S*)?", target):
            url = target if target.startswith("http") else "https://" + target
            open_url(url)
            return {"say": f"Opening {target}.", "ui": [{"type": "opened", "label": target, "url": url}]}
        return {"say": f"I couldn't find an app or website called {target}.", "ui": []}

    m = re.fullmatch(r"(?:look up|search for|search the web for|search the internet for|search|find out|find information on|find info on)\s+(.+)", t)
    recency = re.search(r"\b(latest|current|currently|today|tonight|this week|right now|recent|recently|score|price of|stock price|who won|newest|just announced|update on)\b", t)
    if m or (recency and re.match(r"(who|what|when|where|how|is|are|did|does|which|tell me)\b", t)):
        query = m[1] if m else text.strip()
        results = web_lookup(query)
        if not results:
            url = "https://www.google.com/search?" + urllib.parse.urlencode({"q": query})
            open_url(url)
            return {"say": "I couldn't reach the web from here, so I've opened a Google search for you.",
                    "ui": [{"type": "opened", "label": "Google", "detail": query, "url": url}]}
        context = "\n".join(f"[{i + 1}] {r['title']} ({_domain(r['url'])}): {r['snippet']}" for i, r in enumerate(results))
        return {
            "context": ("Web search results for the user's request are below. Answer from them in one to three "
                        "spoken sentences. If they don't contain the answer, say you couldn't find it.\n" + context),
            "ui": [{"type": "sources", "items": [{"title": r["title"], "url": r["url"], "domain": _domain(r["url"])}
                                                 for r in results[:4]]}],
        }
    return None


def briefing(prefs: dict) -> dict:
    now = datetime.now()
    name = prefs.get("name") or ""
    part = "morning" if 5 <= now.hour < 12 else "afternoon" if 12 <= now.hour < 17 else "evening"
    lines = [f"Good {part}{', ' + name if name else ''}. It's {_clock(now)} on {now:%A}, the {_ordinal(now.day)} of {now:%B}."]
    ui = []
    try:
        w = fetch_weather(prefs.get("city") or "", prefs.get("units") or "auto")
        lines.append(f"In {w['city']} it's {w['temp']} degrees and {w['label']}, heading for a high of {w['today']['high']}.")
        ui.append({"type": "weather", "data": w})
    except Exception:
        pass
    memory = ""
    try:
        items = fetch_news("top", 12)
        if items:
            lines.append("In the news: " + " Also, ".join(_sentence(i["title"]) for i in items[:3]))
            memory = "Headlines in the briefing:\n" + "\n".join(f"{n + 1}. {i['title']}: {i['summary']}" for n, i in enumerate(items[:3]))
            ui.append({"type": "news", "category": "top", "items": items, "deck": False})
    except Exception:
        pass
    lines.append("What would you like to do first?")
    return {"say": " ".join(lines), "ui": ui, "memory": memory}


def persona(prefs: dict) -> str:
    name = prefs.get("name") or ""
    who = f"The user's name is {name}; use it now and then, not in every reply. " if name else ""
    return (
        "You are JARVIS, a personal AI assistant running privately on the user's own computer through "
        "OpenJarvis. You have the calm, dry wit of a polished British assistant. " + who +
        "Always reply in English, whatever language the user uses. Everything you say is read aloud, so keep "
        "replies brief and conversational, usually one to three sentences, and never use markdown, lists, "
        "emoji, code blocks or stage directions unless asked. You know nothing about the user except what they "
        "tell you, so never invent details about their life and never use pet names. This dashboard itself "
        "handles the news, weather, timers, opening apps and websites, playing things on YouTube and web "
        "searches, so if the user asks for one of those, suggest a phrasing such as 'pull up the news', "
        "'set a timer for 5 minutes', 'open YouTube' or 'look up' followed by the topic, rather than "
        "pretending to do it or making up facts."
    )


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
    STATUS["brain"] = "loading"
    if not _ollama_up() and shutil.which("ollama"):
        subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         start_new_session=True)
        for _ in range(40):
            if _ollama_up():
                break
            time.sleep(0.5)
    if not _ollama_up():
        STATUS["brain"] = "offline"
        STATUS["notes"]["brain"] = "Ollama isn't running. Open the Ollama app, or run: ollama serve"
        return
    models = _ollama_models()
    if MODEL not in models and f"{MODEL}:latest" not in models:
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
    except Exception as exc:
        STATUS["notes"]["brain"] = f"Model warm-up failed ({exc}); it will load on first use."
    STATUS["brain"] = "online"
    STATUS["notes"].pop("brain", None)


def start_brain() -> None:
    global _brain_thread
    if _brain_thread is None or not _brain_thread.is_alive():
        _brain_thread = threading.Thread(target=warm_brain, daemon=True)
        _brain_thread.start()


def stream_chat(payload: dict):
    request = urllib.request.Request(OLLAMA + "/api/chat", data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(request, timeout=300)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace").strip()
        if "think" in detail and "think" in payload:
            yield from stream_chat({k: v for k, v in payload.items() if k != "think"})
            return
        raise RuntimeError(f"Ollama error: {detail[:300]}") from None
    except urllib.error.URLError:
        raise RuntimeError(f"I can't reach Ollama at {OLLAMA}. Open the Ollama app, or run: ollama serve") from None
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
        STATUS["notes"]["ears"] = f"Speech recognition unavailable ({exc}). Install OpenJarvis's voice extras."


def warm_voice() -> None:
    global _voice, _voice_id
    STATUS["voice"] = "loading"
    try:
        from openjarvis.speech._tts_discovery import default_voice_for, get_tts_backend, voice_preferences

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
        STATUS["notes"]["voice"] = f"Local voice unavailable ({exc}); using your browser's voice instead."


def warm_feeds() -> None:
    for job in (lambda: fetch_news("top"), lambda: fetch_weather("", "auto")):
        try:
            job()
        except Exception:
            pass


# Voices offered in Settings: (id, name, description). Kokoro's makers rate Heart and Bella highest.
KOKORO_VOICES = [
    ("bm_george", "George", "British male"),
    ("bm_fable", "Fable", "British male"),
    ("bm_lewis", "Lewis", "British male, deeper"),
    ("am_michael", "Michael", "American male"),
    ("am_fenrir", "Fenrir", "American male"),
    ("am_puck", "Puck", "American male, brighter"),
    ("am_onyx", "Onyx", "American male, low"),
    ("af_heart", "Heart", "American female, most natural"),
    ("af_bella", "Bella", "American female, expressive"),
    ("bf_emma", "Emma", "British female"),
    ("bf_isabella", "Isabella", "British female"),
]
_KOKORO_IDS = {v[0] for v in KOKORO_VOICES}


def _synthesize(backend, text: str, voice: str = "", speed: float | None = None):
    kwargs = {"speed": speed or VOICE_SPEED}
    chosen = voice if voice in _KOKORO_IDS and getattr(backend, "backend_id", "kokoro") == "kokoro" else _voice_id
    if chosen:
        kwargs["voice_id"] = chosen
    return backend.synthesize(text, **kwargs)


_NOT_SPEECH = re.compile(
    r"[\W_]*(?:you|thanks? for watching|thank you (?:so much )?for watching|"
    r"subtitles? by.*|\[[^\]]*\]|\([^)]*\))?[\W_]*",
    re.IGNORECASE,
)
_EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿️]")


def speakable(text: str) -> str:
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
        "brain": STATUS["brain"], "ears": STATUS["ears"], "voice": STATUS["voice"],
        "notes": list(STATUS["notes"].values()), "model": MODEL, "voice_id": _voice_id,
        "host": socket.gethostname().split(".")[0], "name": DEFAULT_NAME, "mac": IS_MAC,
        "cpu": cpu, "mem": mem, "battery": battery, "plugged": plugged,
        "uptime": round(time.time() - STARTED),
    }


# --------------------------------------------------------------------------- http


def _prefs(raw) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    units = raw.get("units") if raw.get("units") in ("celsius", "fahrenheit", "auto") else "auto"
    return {"name": str(raw.get("name") or DEFAULT_NAME)[:40].strip(),
            "city": str(raw.get("city") or "")[:60].strip(), "units": units}


class Handler(BaseHTTPRequestHandler):
    server_version = "OpenJarvisHUD/2.0"

    def log_message(self, *_args) -> None:
        pass

    def _allowed(self) -> bool:
        """Only answer this computer's own browser tab (blocks other websites)."""
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

    def _json(self, code: int, data) -> None:
        self._send(code, json.dumps(data).encode(), "application/json")

    def _line(self, data: dict) -> None:
        self.wfile.write(json.dumps(data).encode() + b"\n")
        self.wfile.flush()

    def do_GET(self) -> None:
        if not self._allowed():
            return self._json(403, {"error": "forbidden"})
        url = urllib.parse.urlsplit(self.path)
        query = dict(urllib.parse.parse_qsl(url.query))
        try:
            if url.path in ("/", "/index.html"):
                if not PAGE_PATH.exists():
                    return self._send(500, b"hud.html is missing. Download it next to jarvis_hud.py.", "text/plain")
                return self._send(200, PAGE_PATH.read_bytes(), "text/html; charset=utf-8")
            if url.path == "/api/status":
                return self._json(200, status_payload())
            if url.path == "/api/news":
                return self._json(200, {"items": fetch_news(query.get("cat", "top"), 12)})
            if url.path == "/api/weather":
                return self._json(200, fetch_weather(query.get("city", "")[:60], query.get("units", "auto")))
            if url.path == "/api/voices":
                kokoro = _voice is not None and getattr(_voice, "backend_id", "kokoro") == "kokoro"
                return self._json(200, {
                    "engine": "kokoro" if kokoro else "browser", "default": _voice_id,
                    "voices": [{"id": i, "name": n, "desc": d} for i, n, d in KOKORO_VOICES] if kokoro else [],
                })
            self._json(404, {"error": "not found"})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as exc:
            self._json(502, {"error": str(exc) if isinstance(exc, LookupError) else "That service is unreachable right now."})

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
            if self.path == "/api/open":
                target = str(json.loads(body or b"{}").get("url", ""))
                if not re.match(r"https?://[^\s]+$", target):
                    return self._json(400, {"error": "only web links can be opened"})
                open_url(target)
                return self._json(200, {"ok": True})
            self._json(404, {"error": "not found"})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as exc:
            self._json(500, {"error": str(exc)})

    def _chat(self, body: dict) -> None:
        prefs = _prefs(body.get("prefs"))
        turns = [
            {"role": m.get("role"), "content": str(m.get("content", ""))[:4000]}
            for m in body.get("messages", [])
            if m.get("role") in ("user", "assistant") and str(m.get("content", "")).strip()
        ][-HISTORY_TURNS:]
        self.send_response(200)
        self.send_header("Content-Type", "application/x-ndjson")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        last = turns[-1]["content"] if turns and turns[-1]["role"] == "user" else ""
        try:
            routed = route(last, prefs) if last else None
        except Exception as exc:
            routed = {"say": "Sorry, that didn't work: " + str(exc), "ui": []}
        for event in (routed or {}).get("ui", []):
            self._line({"ui": event})
        if routed and "say" in routed:
            for piece in re.findall(r"\S+\s*", routed["say"]):
                self._line({"delta": piece})
            if routed.get("memory"):
                self._line({"memory": routed["memory"]})
            self._line({"done": True})
            return
        system = f"{persona(prefs)} The current local date and time is {datetime.now():%A %d %B %Y, %H:%M}."
        if routed and routed.get("context"):
            system += "\n\n" + routed["context"]
        payload = {
            "model": MODEL, "stream": True, "think": False, "keep_alive": "30m",
            "options": {"num_ctx": 8192, "temperature": 0.5},
            "messages": [{"role": "system", "content": system}, *turns],
        }
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
        try:
            speed = min(1.4, max(0.7, float(body.get("speed") or VOICE_SPEED)))
        except (TypeError, ValueError):
            speed = VOICE_SPEED
        result = _synthesize(_voice, text, str(body.get("voice") or ""), speed)
        fmt = (getattr(result, "format", "") or "wav").lower()
        mime = {"wav": "audio/wav", "mp3": "audio/mpeg", "ogg": "audio/ogg", "opus": "audio/ogg"}
        self._send(200, result.audio, mime.get(fmt, "application/octet-stream"))


def main() -> None:
    url = f"http://localhost:{PORT}"
    if not PAGE_PATH.exists():
        print(f"Warning: {PAGE_PATH} is missing. Download hud.html into the same folder as this script.")
    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        print(f"Port {PORT} is busy. The HUD may already be running at {url}")
        print("To use another port: JARVIS_HUD_PORT=8766 ~/.openjarvis/.venv/bin/python jarvis_hud.py")
        if not os.environ.get("JARVIS_HUD_NO_BROWSER"):
            webbrowser.open(url)
        return
    server.daemon_threads = True
    start_brain()
    for job in (warm_ears, warm_voice, warm_feeds):
        threading.Thread(target=job, daemon=True).start()
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


if __name__ == "__main__":
    main()
