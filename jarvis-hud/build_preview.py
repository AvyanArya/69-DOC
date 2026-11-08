#!/usr/bin/env python3
"""Build preview.html: a standalone demo of the Jarvis HUD that needs no server.

    ~/.openjarvis/.venv/bin/python build_preview.py

The preview is hud.html plus two scripts. The first answers the page's /api calls inside
the browser, using a snapshot of the current BBC headlines, live Open-Meteo weather (with a
snapshot fallback) and Wikipedia for look-ups. The second swaps in the browser's own speech
recognition and voice, and adds a "Watch the demo" tour to the lock screen. There's no
language model in the preview, so free conversation is replaced by a short explanation.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import jarvis_hud as hud  # noqa: E402

FALLBACK_WEATHER = {
    "city": "London", "country": "United Kingdom", "temp": 10, "feels": 8, "label": "overcast", "icon": "cloud",
    "is_day": True, "humidity": 82, "wind": 7, "wind_unit": "km/h", "unit": "°C", "sunrise": "07:06", "sunset": "16:21",
    "today": {"high": 11, "low": 7, "label": "light drizzle", "icon": "drizzle", "rain": 40},
    "tomorrow": {"high": 12, "low": 6, "label": "partly cloudy", "icon": "partly", "rain": 10},
    "hours": [{"time": f"{h:02d}:00", "temp": t, "icon": i, "rain": 10}
              for h, t, i in [(13, 10, "cloud"), (14, 10, "cloud"), (15, 11, "partly"), (16, 11, "cloud"),
                              (17, 10, "cloud"), (18, 9, "cloud"), (19, 9, "cloud"), (20, 8, "cloud")]],
}

# Answers the demo tour needs, saved at build time so the tour works offline.
DEMO_LOOKUPS = {"burj khalifa": "Burj_Khalifa", "eiffel tower": "Eiffel_Tower"}

HEAD = r"""
/* Jarvis HUD preview: answers the page's /api calls in the browser, so no server is needed. */
window.JARVIS_PREVIEW = true;
const PREVIEW_DATA = __DATA__;
try { if (!localStorage.getItem("jarvis.prefs")) localStorage.setItem("jarvis.prefs", JSON.stringify({ convo: false, clap: false })); } catch {}
if (window.speechSynthesis) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }

(() => {
  const realFetch = window.fetch.bind(window);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const started = Date.now();
  let cpu = 18, mem = 46;
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
  const walk = (v, step, lo, hi) => Math.max(lo, Math.min(hi, v + (Math.random() * 2 - 1) * step));
  const openTab = (url) => { try { window.open(url, "_blank", "noopener"); } catch {} };

  async function getJSON(url, ms = 4500) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    try { const r = await realFetch(url, { signal: c.signal }); if (!r.ok) throw new Error(String(r.status)); return await r.json(); }
    finally { clearTimeout(t); }
  }

  /* ---------------- weather: live when online, snapshot otherwise */
  const WMO = { 0: ["clear", "clear"], 1: ["mostly clear", "clear"], 2: ["partly cloudy", "partly"], 3: ["overcast", "cloud"], 45: ["foggy", "fog"], 48: ["foggy", "fog"],
    51: ["light drizzle", "drizzle"], 53: ["drizzle", "drizzle"], 55: ["heavy drizzle", "drizzle"], 61: ["light rain", "rain"], 63: ["rain", "rain"], 65: ["heavy rain", "rain"],
    71: ["light snow", "snow"], 73: ["snow", "snow"], 75: ["heavy snow", "snow"], 80: ["showers", "rain"], 81: ["heavy showers", "rain"], 82: ["violent showers", "rain"],
    95: ["thunderstorms", "storm"], 96: ["thunderstorms with hail", "storm"], 99: ["thunderstorms with hail", "storm"] };
  const wmo = (c) => WMO[c] || ["cloudy", "cloud"];
  const weatherCache = {};
  async function liveWeather(city, units) {
    try {
      let place;
      if (city) {
        const g = await getJSON("https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=" + encodeURIComponent(city));
        const f = (g.results || [])[0];
        if (!f) return null;
        place = { city: f.name, country: f.country || "", lat: f.latitude, lon: f.longitude };
      } else {
        const h = await getJSON("https://ipwho.is/");
        if (!h.success) return null;
        place = { city: h.city, country: h.country, lat: h.latitude, lon: h.longitude };
      }
      const F = units === "fahrenheit" || (units !== "celsius" && /^United States/.test(place.country));
      const q = new URLSearchParams({ latitude: place.lat, longitude: place.lon, timezone: "auto", forecast_days: 2,
        current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day",
        hourly: "temperature_2m,weather_code,precipitation_probability",
        daily: "temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,precipitation_probability_max",
        temperature_unit: F ? "fahrenheit" : "celsius", wind_speed_unit: F ? "mph" : "kmh" });
      const d = await getJSON("https://api.open-meteo.com/v1/forecast?" + q);
      const now = d.current, H = d.hourly, D = d.daily;
      const start = Math.max(0, H.time.findIndex((t) => t.slice(0, 13) >= now.time.slice(0, 13)));
      const hours = H.time.slice(start, start + 12).map((t, k) => ({ time: t.slice(11, 16), temp: Math.round(H.temperature_2m[start + k]), icon: wmo(H.weather_code[start + k])[1], rain: H.precipitation_probability[start + k] || 0 }));
      const day = (i) => ({ high: Math.round(D.temperature_2m_max[i]), low: Math.round(D.temperature_2m_min[i]), label: wmo(D.weather_code[i])[0], icon: wmo(D.weather_code[i])[1], rain: D.precipitation_probability_max[i] || 0 });
      return { city: place.city, country: place.country, temp: Math.round(now.temperature_2m), feels: Math.round(now.apparent_temperature),
        label: wmo(now.weather_code)[0], icon: wmo(now.weather_code)[1], is_day: !!now.is_day, humidity: now.relative_humidity_2m,
        wind: Math.round(now.wind_speed_10m), wind_unit: F ? "mph" : "km/h", unit: F ? "°F" : "°C",
        sunrise: D.sunrise[0].slice(11, 16), sunset: D.sunset[0].slice(11, 16), today: day(0), tomorrow: day(1), hours };
    } catch { return null; }
  }
  async function weather(city = "", units = "auto") {
    const key = city.toLowerCase() + "|" + units, hit = weatherCache[key];
    if (hit && Date.now() - hit.at < 15 * 60 * 1000) return hit.data;
    const data = (await liveWeather(city, units)) || PREVIEW_DATA.weather;
    weatherCache[key] = { at: Date.now(), data };
    return data;
  }

  /* ---------------- web look-ups through Wikipedia */
  const topicKey = (t) => t.toLowerCase().replace(/^(the|a|an)\s+/, "").replace(/[^a-z0-9 ]+/g, "").trim();
  const summarise = (sum) => {
    const text = (sum.extract || "").split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
    return text && sum.type !== "disambiguation" ? { text, title: sum.title, url: (sum.content_urls && sum.content_urls.desktop && sum.content_urls.desktop.page) || "" } : null;
  };
  async function lookup(topic) {
    const key = topicKey(topic);
    if (PREVIEW_DATA.lookups[key]) return PREVIEW_DATA.lookups[key];
    const title = key.replace(/\b\w/g, (c) => c.toUpperCase());
    try { const r = summarise(await getJSON("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title))); if (r) return r; } catch {}
    try {
      const s = await getJSON("https://en.wikipedia.org/w/rest.php/v1/search/page?limit=1&q=" + encodeURIComponent(topic));
      const page = (s.pages || [])[0];
      return page ? summarise(await getJSON("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(page.key))) : null;
    } catch { return null; }
  }

  /* ---------------- the command router, mirrored from jarvis_hud.py */
  const NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
    fifty: 50, sixty: 60, ninety: 90, couple: 2, few: 3 };
  function parseDuration(text) {
    let t = text.toLowerCase().replace(/-/g, " ");
    t = t.replace(/\b(twenty|thirty|forty|fifty) (one|two|three|four|five|six|seven|eight|nine)\b/g, (_, a, b) => String(NUM[a] + NUM[b]));
    let total = 0, found = false;
    if (/\bhalf an hour\b/.test(t)) { total = 1800; found = true; t = t.replace(/\bhalf an hour\b/g, " "); }
    for (const m of t.matchAll(/(\d+(?:\.\d+)?|[a-z]+)\s+(?:and a half\s+)?(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/g)) {
      let n = /^\d/.test(m[1]) ? parseFloat(m[1]) : NUM[m[1]];
      if (n == null) continue;
      if (m[0].includes("and a half")) n += 0.5;
      total += n * { h: 3600, m: 60, s: 1 }[m[2][0]];
      found = true;
    }
    for (const m of t.matchAll(/(hours?|minutes?) and a half/g)) total += m[1][0] === "h" ? 1800 : 30;
    return found && total > 0 ? Math.round(total) : null;
  }
  function sayDuration(s) {
    const parts = [];
    for (const [size, unit] of [[3600, "hour"], [60, "minute"], [1, "second"]]) { const n = Math.floor(s / size); s %= size; if (n) parts.push(`${n} ${unit}${n === 1 ? "" : "s"}`); }
    return parts.join(" and ") || "0 seconds";
  }
  const timerName = (s) => (s % 3600 === 0 ? `${s / 3600}-hour` : s % 60 === 0 ? `${s / 60}-minute` : s < 120 ? `${s}-second` : sayDuration(s).replace(" and ", " "));
  const ordinal = (n) => n + (n % 100 >= 10 && n % 100 <= 20 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
  const clock = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const sentence = (t) => (/[.!?]$/.test(t.trim()) ? t.trim() : t.trim() + ".");
  const part = () => { const h = new Date().getHours(); return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 18 ? "afternoon" : "evening"; };
  const SITES = { youtube: ["YouTube", "https://www.youtube.com"], google: ["Google", "https://www.google.com"], gmail: ["Gmail", "https://mail.google.com"],
    github: ["GitHub", "https://github.com"], netflix: ["Netflix", "https://www.netflix.com"], instagram: ["Instagram", "https://www.instagram.com"],
    twitter: ["X", "https://x.com"], x: ["X", "https://x.com"], linkedin: ["LinkedIn", "https://www.linkedin.com"], reddit: ["Reddit", "https://www.reddit.com"],
    whatsapp: ["WhatsApp", "https://web.whatsapp.com"], chatgpt: ["ChatGPT", "https://chatgpt.com"], claude: ["Claude", "https://claude.ai"],
    notion: ["Notion", "https://www.notion.so"], amazon: ["Amazon", "https://www.amazon.com"], spotify: ["Spotify", "https://open.spotify.com"],
    bbc: ["BBC News", "https://www.bbc.com/news"], wikipedia: ["Wikipedia", "https://www.wikipedia.org"], maps: ["Google Maps", "https://maps.google.com"] };
  const TOPICS = [[/\b(tech|technology|ai|gadgets?|apple|google)\b/, "tech"], [/\b(business|markets?|economy|finance|stocks?)\b/, "business"],
    [/\b(world|international|global)\b/, "world"], [/\b(science|space|climate|environment)\b/, "science"], [/\b(sports?|football|cricket|tennis|f1)\b/, "sport"]];
  const LABEL = { top: "top", world: "world", tech: "technology", business: "business", science: "science", sport: "sport" };
  const HELP = "Here's what I can do. Say brief me for a rundown of your day. Ask me to pull up the news, or tech, business, world, science or sport news. " +
    "Ask about the weather anywhere. Set timers and reminders. Open websites, like open YouTube. Play songs or videos on YouTube. " +
    "Look things up, like tell me about the Burj Khalifa. On your Mac I can also open apps and talk about anything.";
  const JOKES = ["I told my computer I needed a break. It said, no problem, I'll go to sleep.",
    "Why did the AI go to therapy? Too many unresolved dependencies.",
    "I'd tell you a UDP joke, but you might not get it."];
  function clean(text) {
    let t = text.trim().toLowerCase();
    t = t.replace(/^(hey|ok|okay|hi|yo)\b[,!.]?\s*/, "").replace(/^jarvis\b[,!.]?\s*/, "");
    t = t.replace(/^(please|can you|could you|would you|will you|i want you to|i'd like you to)\s+/, "").replace(/^please\s+/, "");
    t = t.replace(/[\s,]*(please|for me|thanks|thank you)[.!?]*$/, "");
    return t.replace(/^[\s.!?]+|[\s.!?]+$/g, "");
  }
  async function briefing(prefs) {
    const now = new Date(), name = prefs.name || "";
    const lines = [`Good ${part()}${name ? ", " + name : ""}. It's ${clock(now)} on ${now.toLocaleDateString("en-GB", { weekday: "long" })}, the ${ordinal(now.getDate())} of ${now.toLocaleDateString("en-GB", { month: "long" })}.`];
    const ui = [];
    const w = await weather(prefs.city, prefs.units);
    lines.push(`In ${w.city} it's ${w.temp} degrees and ${w.label}, heading for a high of ${w.today.high}.`);
    ui.push({ type: "weather", data: w });
    const items = PREVIEW_DATA.news.top || [];
    if (items.length) {
      lines.push("In the news: " + items.slice(0, 3).map((i) => sentence(i.title)).join(" Also, "));
      ui.push({ type: "news", category: "top", items, deck: false });
    }
    lines.push("What would you like to do first?");
    return { say: lines.join(" "), ui, memory: "Headlines in the briefing:\n" + items.slice(0, 3).map((i, n) => `${n + 1}. ${i.title}: ${i.summary}`).join("\n") };
  }
  async function route(text, prefs) {
    const t = clean(text), now = new Date(), name = prefs.name || "";
    if (!t) return { say: "Sorry, I didn't catch that." };
    if (/^(stop|cancel|never ?mind|that'?s all|nothing|quiet|be quiet)$/.test(t)) return { say: "Of course." };
    if (/\b(what can you do|what do you do|help me out|list (your )?commands)\b/.test(t) || t === "help") return { say: HELP };
    if (/\b(cancel|stop|clear|delete|remove)\b.*\b(timers?|reminders?|alarms?)\b/.test(t)) return { say: "All timers cleared.", ui: [{ type: "timer_cancel" }] };
    if (/\b(timer|remind me|reminder|countdown|alarm in|wake me in)\b/.test(t)) {
      const sec = parseDuration(t);
      if (!sec) return { say: "How long should I set it for? Try, set a timer for 10 minutes." };
      const heard = sayDuration(sec);
      const task = t.match(/remind me (?:to|about) (.+?)(?:\s+in\s+.+)?$/) || t.match(/\bin .+? to (.+)$/);
      if (task) return { say: `Reminder set. I'll remind you to ${task[1]} in ${heard}.`, ui: [{ type: "timer", seconds: sec, label: task[1], remind: true }] };
      const named = t.match(/\b(?:timer|countdown)\b.*\bfor (?:the |my )?([a-z][a-z ]+?)$/);
      if (named && !parseDuration(named[1] + " ")) {
        const l = named[1][0].toUpperCase() + named[1].slice(1);
        return { say: `${l} timer set for ${heard}.`, ui: [{ type: "timer", seconds: sec, label: `${l} timer` }] };
      }
      return { say: `Timer set for ${heard}.`, ui: [{ type: "timer", seconds: sec, label: `${timerName(sec)} timer` }] };
    }
    if (/\b(what('?s| is) the time|what time is it|time is it|current time|tell me the time)\b/.test(t)) return { say: `It's ${clock(now)}.` };
    if (/\b(what('?s| is) (the |today'?s )?date|what day is (it|today)|today'?s date)\b/.test(t))
      return { say: `It's ${now.toLocaleDateString("en-GB", { weekday: "long" })}, the ${ordinal(now.getDate())} of ${now.toLocaleDateString("en-GB", { month: "long" })}.` };
    if (/\b(brief me|briefing|morning report|catch me up|daily (summary|update)|what did i miss|start my day)\b/.test(t) || /^good (morning|afternoon|evening)( jarvis)?$/.test(t)) return briefing(prefs);
    if (/\b(news|headlines|top stories|what'?s happening|current events)\b/.test(t)) {
      const cat = (TOPICS.find(([re]) => re.test(t)) || [0, "top"])[1], items = PREVIEW_DATA.news[cat] || [], read = items.slice(0, 4);
      if (!items.length) return { say: "I couldn't load the headlines just now." };
      const lines = [cat === "top" ? "Here are today's top headlines from the BBC." : `Here are the latest ${LABEL[cat]} headlines from the BBC.`];
      read.forEach((it, i) => lines.push((i === 0 ? "First, " : i < read.length - 1 ? "Next, " : "And finally, ") + sentence(it.title)));
      lines.push("Tap any story to open it.");
      return { say: lines.join(" "), memory: "I read these headlines:\n" + read.map((it, i) => `${i + 1}. ${it.title}: ${it.summary}`).join("\n"),
        ui: [{ type: "news", category: cat, items, deck: true }] };
    }
    if (/\b(weather|temperature|forecast|rain|raining|rainy|snow|snowing|umbrella|sunny|windy|humid|how (hot|cold|warm) is it|degrees outside)\b/.test(t)) {
      const m = t.match(/\b(?:in|for|at) ([a-z][a-z .'-]+?)(?: today| tomorrow| right now| this week)?$/);
      const skip = ["today", "tomorrow", "tonight", "the week", "the morning", "the afternoon", "the evening", "the weekend", "here", "my area", "my city"];
      const city = m && !skip.includes(m[1].trim()) ? m[1].trim() : prefs.city || "";
      const w = await weather(city, prefs.units);
      const d = /tomorrow/.test(t) ? w.tomorrow : w.today;
      const say = /tomorrow/.test(t)
        ? `Tomorrow in ${w.city}, expect ${d.label}, with a high of ${d.high} and a low of ${d.low} degrees.` + (d.rain >= 30 ? ` There's a ${d.rain} percent chance of rain.` : "")
        : `It's ${w.temp} degrees and ${w.label} in ${w.city}, with a high of ${d.high} and a low of ${d.low}.` + (d.rain >= 30 ? ` There's a ${d.rain} percent chance of rain today.` : "");
      return { say, ui: [{ type: "weather", data: w }] };
    }
    let m = t.match(/^play (.+?)(?: on (youtube|spotify))?$/);
    if (m) { const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(m[1]); openTab(url); return { say: `Here's ${m[1]} on YouTube.`, ui: [{ type: "opened", label: "YouTube", detail: m[1], url }] }; }
    m = t.match(/^(?:google|search google for|search on google for) (.+)$/);
    if (m) { const url = "https://www.google.com/search?q=" + encodeURIComponent(m[1]); openTab(url); return { say: `Searching Google for ${m[1]}.`, ui: [{ type: "opened", label: "Google", detail: m[1], url }] }; }
    m = t.match(/^(?:open|launch|start|go to|pull up|bring up|load)\s+(?:the |my |up )?(.+?)(?: app| website| site| page)?$/);
    if (m) {
      const target = m[1].trim();
      if (SITES[target]) { const [label, url] = SITES[target]; openTab(url); return { say: `Opening ${label}.`, ui: [{ type: "opened", label, url }] }; }
      if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(target)) { const url = /^http/.test(target) ? target : "https://" + target; openTab(url); return { say: `Opening ${target}.`, ui: [{ type: "opened", label: target, url }] }; }
      return { say: `In this preview I can open websites like YouTube. On your Mac I can open apps like ${target} too.` };
    }
    m = t.match(/^(?:look up|search for|search the web for|search the internet for|search|tell me about|who is|who was|what is (?:a |an |the )?|what are)\s*(.+)$/);
    if (m && m[1].length > 2) {
      const r = await lookup(m[1]);
      if (r) return { say: r.text, ui: [{ type: "sources", items: [{ title: r.title, url: r.url, domain: "wikipedia.org" }] }] };
      return { say: "I couldn't reach the web from this preview. On your Mac I search the web and answer with sources." };
    }
    if (/^(hi|hello|hey|yo|hiya)\b/.test(text.trim().toLowerCase()) || /^(hello|hi|hey)$/.test(t)) return { say: `Hello${name ? ", " + name : ""}. What can I do for you?` };
    if (/\b(who are you|what are you|your name)\b/.test(t)) return { say: "I'm Jarvis, your personal assistant, built on OpenJarvis. In the full version my brain runs privately on your Mac." };
    if (/\bhow are you\b/.test(t)) return { say: "All systems nominal, thank you. Rather pleasant, actually." };
    if (/\bjoke\b/.test(t)) return { say: JOKES[Math.floor(Math.random() * JOKES.length)] };
    if (/^(thanks|thank you|cheers|nice|great|awesome|perfect)\b/.test(text.trim().toLowerCase())) return { say: "Always a pleasure." };
    return { say: "This preview doesn't have my language model, so open conversation is switched off. Try brief me, pull up the tech news, what's the weather, set a timer, or tell me about something. On your Mac I can talk about anything." };
  }

  function streamReply(body, signal) {
    const msgs = body.messages || [], last = (msgs[msgs.length - 1] || {}).content || "", enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(c) {
        try {
          await pause(380);
          const r = await route(last, body.prefs || {});
          const lines = [...(r.ui || []).map((ui) => ({ ui })), ...(r.say.match(/\S+\s*/g) || []).map((delta) => ({ delta }))];
          if (r.memory) lines.push({ memory: r.memory });
          lines.push({ done: true });
          for (const line of lines) {
            if (signal && signal.aborted) return c.error(new DOMException("Aborted", "AbortError"));
            c.enqueue(enc.encode(JSON.stringify(line) + "\n"));
            if (line.delta) await pause(26);
          }
          c.close();
        } catch (err) { c.error(err); }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
  }

  window.fetch = async (input, init = {}) => {
    if (typeof input !== "string" || !input.startsWith("/api/")) return realFetch(input, init);
    const [path, query] = input.split("?"), q = new URLSearchParams(query || "");
    if (path === "/api/status") {
      cpu = walk(cpu, 7, 6, 62); mem = walk(mem, 1.2, 38, 62);
      return json({ brain: "online", ears: SR ? "online" : "offline", voice: "online", model: "preview mode", voice_id: "system voice",
        notes: SR ? [] : ["Talking needs Chrome or Safari in this preview. You can still type."], host: "preview", name: PREVIEW_DATA.name,
        mac: true, cpu, mem, battery: 87, plugged: false, uptime: Math.round((Date.now() - started) / 1000) });
    }
    if (path === "/api/news") return json({ items: PREVIEW_DATA.news[q.get("cat")] || PREVIEW_DATA.news.top });
    if (path === "/api/weather") return json(await weather(q.get("city") || "", q.get("units") || "auto"));
    if (path === "/api/chat") return streamReply(JSON.parse(init.body || "{}"), init.signal);
    if (path === "/api/open") { openTab(JSON.parse(init.body || "{}").url); return json({ ok: true }); }
    return json({ error: "not available in the preview" }, 503);
  };
})();
"""

TAIL = r"""
/* Jarvis HUD preview: browser speech recognition, a demo tour, and preview labels. */
(() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const css = document.createElement("style");
  css.textContent = `
    .demo-btn{margin-top:28px;display:inline-flex;align-items:center;gap:10px;padding:12px 22px;border-radius:999px;font:500 11px var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--t1);background:rgba(255,255,255,.05);border:1px solid var(--stroke-2);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);transition:all .45s var(--ease);animation:fadeUp 1.2s .6s var(--ease) both}
    .demo-btn:hover{border-color:rgba(var(--ice-rgb),.55);box-shadow:0 0 28px -4px rgba(var(--ice-rgb),.55);transform:translateY(-2px)}
    .demo-btn svg{width:14px;height:14px;color:var(--ice)}`;
  document.head.append(css);
  $(".brand span").textContent = "OpenJarvis · Preview";

  /* Listen with the browser's speech recognition instead of the Mac's Whisper. */
  let recog = null;
  const stopRecog = () => { if (recog) { recog.onend = null; recog.onresult = null; try { recog.abort(); } catch {} recog = null; } };
  initMic = async () => { S.micOk = !!SR; if (!SR) S.micError = "talking needs Chrome or Safari"; };
  const baseInterrupt = interrupt;
  interrupt = () => { stopRecog(); baseInterrupt(); };
  cancelListening = (msg) => { stopRecog(); rec = null; setState("idle", msg); };
  startListening = () => {
    if (!SR) { setCaption("Talking needs Chrome or Safari in this preview. Type below, or watch the demo."); return; }
    interrupt();
    setState("listening", "Listening…");
    SFX.listen();
    const r = new SR();
    recog = r;
    r.lang = "en-GB"; r.interimResults = true; r.maxAlternatives = 1;
    let heard = "";
    r.onresult = (e) => { heard = [...e.results].map((x) => x[0].transcript).join(""); setCaption(heard); };
    r.onerror = (e) => { if (recog === r) { recog = null; setState("idle", e.error === "not-allowed" ? "The microphone is blocked. Allow it in the address bar, or type below." : "I didn't catch that. Press Space to try again."); } };
    r.onend = () => { if (recog !== r) return; recog = null; SFX.stop(); if (heard.trim()) send(heard); else setState("idle", "I didn't catch that. Press Space to try again."); };
    r.start();
  };
  const baseTalk = talk;
  talk = () => {
    if (S.state === "locked" || S.state === "booting") return;
    if (S.state === "listening") { if (recog) recog.stop(); else cancelListening("Standing by."); return; }
    startListening();
  };
  for (const id of ["#orb", "#mic"]) { $(id).removeEventListener("click", baseTalk); $(id).addEventListener("click", () => talk()); }

  /* "Watch the demo": unlock, then drive the dashboard by itself. */
  let touring = false;
  const waitFor = async (fn, ms = 60000) => { const t = Date.now(); while (!fn() && Date.now() - t < ms) await sleep(150); };
  const quiet = () => S.state === "idle" && !S.speaker && !S.chatCtrl;
  async function typeAndSend(text) {
    const input = $("#input");
    input.value = "";
    for (const ch of text) { if (!touring) return; input.value += ch; await sleep(40 + Math.random() * 45); }
    await sleep(380);
    if (touring) $("#command").requestSubmit();
  }
  async function tour() {
    if (touring || S.state !== "locked") return;
    touring = true;
    const keepConvo = prefs.convo;
    prefs.convo = false;
    await unlock();
    toast("Demo running", "Press Esc any time to take over", "i-play");
    await waitFor(() => S.greeted, 30000);
    await waitFor(quiet);
    await sleep(900);
    for (const step of ["Brief me", "Pull up the tech news", "#close", "Set a timer for 10 minutes", "Tell me about the Burj Khalifa", "What can you do?"]) {
      if (!touring) break;
      if (step === "#close") { await sleep(500); closeDeck(); await sleep(900); continue; }
      await typeAndSend(step);
      await sleep(500);
      await waitFor(quiet, 120000);
      await sleep(1100);
    }
    prefs.convo = keepConvo;
    if (touring) setState("idle", "Your turn. Press Space to talk, or type below.");
    touring = false;
  }
  addEventListener("keydown", (e) => { if (e.key === "Escape" && touring) touring = false; }, true);
  const demo = document.createElement("button");
  demo.type = "button";
  demo.className = "demo-btn";
  demo.innerHTML = '<svg class="i"><use href="#i-play"/></svg>Watch the demo';
  demo.addEventListener("click", tour);
  $("#lock").append(demo);
})();
"""


def snapshot() -> dict:
    news = {}
    for category in hud.NEWS_FEEDS:
        try:
            news[category] = [{k: item[k] for k in ("title", "summary", "link", "image", "time", "source")}
                              for item in hud.fetch_news(category, 12)]
        except Exception as exc:
            print(f"  {category} news unavailable ({exc})")
            news[category] = []
    try:
        weather = hud.fetch_weather("London", "celsius")
    except Exception as exc:
        print(f"  weather snapshot unavailable ({exc}); using a fixed example")
        weather = FALLBACK_WEATHER
    lookups = {}
    for key, title in DEMO_LOOKUPS.items():
        try:
            summary = hud.http_json("https://en.wikipedia.org/api/rest_v1/page/summary/" + title)
            sentences = re.split(r"(?<=[.!?])\s+", summary.get("extract", ""))
            lookups[key] = {"text": " ".join(sentences[:2]), "title": summary.get("title", title),
                            "url": summary.get("content_urls", {}).get("desktop", {}).get("page", "")}
        except Exception as exc:
            print(f"  look-up snapshot for {key} unavailable ({exc})")
    return {"news": news, "weather": weather, "lookups": lookups, "name": hud.DEFAULT_NAME or "Avyan"}


def main() -> None:
    page = (HERE / "hud.html").read_text(encoding="utf-8")
    if page.count("<script>") != 1:
        sys.exit("hud.html should contain exactly one <script> tag")
    data = json.dumps(snapshot(), ensure_ascii=False).replace("</", "<\\/")
    page = page.replace("<script>", "<script>" + HEAD.replace("__DATA__", data) + "</script>\n<script>", 1)
    page = page.replace("</body>", "<script>" + TAIL + "</script>\n</body>", 1)
    page = page.replace("<title>Jarvis</title>", "<title>Jarvis · Preview</title>", 1)
    out = HERE / "preview.html"
    out.write_text(page, encoding="utf-8")
    print(f"Wrote {out} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
