// Web Speech wrappers: browser TTS + speech recognition with graceful fallback.
// Everything runs locally in the browser — no keys, no server.

const SR = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null

export const speechSupport = {
  recognition: Boolean(SR),
  synthesis: typeof window !== 'undefined' && 'speechSynthesis' in window,
}

let voicesCache = []
function loadVoices() {
  if (!speechSupport.synthesis) return []
  voicesCache = window.speechSynthesis.getVoices()
  return voicesCache
}
if (speechSupport.synthesis) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

const ACCENT_LANGS = {
  us: ['en-US'], uk: ['en-GB'], au: ['en-AU'], in: ['en-IN'], neutral: ['en-US', 'en-GB', 'en'],
}

export function pickVoice({ gender = 'any', accent = 'us' } = {}) {
  const voices = voicesCache.length ? voicesCache : loadVoices()
  if (!voices.length) return null
  const langs = ACCENT_LANGS[accent] || ACCENT_LANGS.us
  const pool = voices.filter((v) => langs.some((l) => v.lang.startsWith(l)))
  const list = pool.length ? pool : voices.filter((v) => v.lang.startsWith('en'))
  if (gender !== 'any') {
    const female = /female|samantha|victoria|karen|moira|tessa|fiona|zira|susan|hazel|veena|serena/i
    const male = /male|daniel|alex|fred|tom|oliver|david|mark|james|rishi|lee|gordon/i
    const rx = gender === 'female' ? female : male
    const hit = list.find((v) => rx.test(v.name))
    if (hit) return hit
  }
  return list[0] || voices[0]
}

/**
 * Speak a line. Returns a handle: { promise, cancel }.
 * onBoundary fires per word so the UI can animate a waveform in sync.
 */
export function speak(text, { rate = 1, pitch = 1, voice = null, onBoundary } = {}) {
  if (!speechSupport.synthesis) {
    // Fallback: resolve on an estimated reading time so the flow still works.
    let t
    const promise = new Promise((res) => { t = setTimeout(res, Math.max(900, text.length * 55)) })
    return { promise, cancel: () => clearTimeout(t) }
  }
  const u = new SpeechSynthesisUtterance(text)
  u.rate = rate
  u.pitch = pitch
  if (voice) u.voice = voice
  if (onBoundary) u.onboundary = onBoundary
  let cancelled = false
  const promise = new Promise((res) => {
    u.onend = () => res()
    u.onerror = () => res()
    // Safety net: some engines drop onend
    setTimeout(() => { if (!cancelled) res() }, Math.max(2000, text.length * 110))
  })
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
  return {
    promise,
    cancel: () => { cancelled = true; window.speechSynthesis.cancel() },
  }
}

export function stopSpeaking() {
  if (speechSupport.synthesis) window.speechSynthesis.cancel()
}

/**
 * Listen for one user utterance. Returns { promise, stop }.
 * promise resolves { text, interim:false } or rejects on unavailability.
 */
export function listenOnce({ lang = 'en-US', onInterim } = {}) {
  if (!SR) return { promise: Promise.reject(new Error('no-recognition')), stop: () => {} }
  const rec = new SR()
  rec.lang = lang
  rec.interimResults = true
  rec.continuous = false
  rec.maxAlternatives = 1
  let finalText = ''
  let settled = false
  const promise = new Promise((resolve, reject) => {
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t
        else interim += t
      }
      if (interim && onInterim) onInterim(finalText + interim)
    }
    rec.onerror = (e) => {
      if (settled) return
      settled = true
      if (finalText.trim()) resolve({ text: finalText.trim() })
      else reject(new Error(e.error || 'recognition-error'))
    }
    rec.onend = () => {
      if (settled) return
      settled = true
      if (finalText.trim()) resolve({ text: finalText.trim() })
      else reject(new Error('no-speech'))
    }
    try { rec.start() } catch (err) { if (!settled) { settled = true; reject(err) } }
  })
  return { promise, stop: () => { try { rec.stop() } catch { /* already stopped */ } } }
}
