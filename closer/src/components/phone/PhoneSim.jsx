// The AI phone simulator — lock screen → home → prospects list → live call.
// Voice in/out runs on the Web Speech API with a type-to-speak fallback.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CHARACTERS, DIFFICULTY_LABELS, getCharacter } from '../../data/characters.js'
import { createConversation } from '../../lib/conversation.js'
import { scoreCall } from '../../lib/scoring.js'
import { speechSupport, stopSpeaking, listenOnce, speakAs, voicesReady } from '../../lib/speech.js'
import { getProfile } from '../../lib/storage.js'
import { fmtDuration } from '../../lib/format.js'
import { Difficulty } from '../ui.jsx'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function PhoneFrame({ children, statusTint = '#fff', threeD = false }) {
  const now = useClock()
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '')
  const body = (
    <div className="phone-frame">
      <div className="phone-screen">
        <div className="phone-island" />
        <div className="phone-statusbar" style={{ color: statusTint }}>
          <span className="mono" style={{ fontSize: 13 }}>{time}</span>
          <span className="icons" aria-hidden="true">
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg>
            <svg width="16" height="11" viewBox="0 0 16 12" fill="currentColor"><path d="M8 9.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM8 5c-1.9 0-3.6.8-4.8 2l1.4 1.4A4.8 4.8 0 018 7c1.3 0 2.5.5 3.4 1.4L12.8 7A6.8 6.8 0 008 5zM8 .8C5 .8 2.2 2 .2 4l1.4 1.4A9 9 0 018 2.8c2.5 0 4.7 1 6.4 2.6L15.8 4A11 11 0 008 .8z"/></svg>
            <svg width="23" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="15" height="8" rx="2" fill="currentColor"/><path d="M23.5 4v4a2.2 2.2 0 000-4z" fill="currentColor" opacity=".5"/></svg>
          </span>
        </div>
        {children}
        <div className="phone-homebar" />
      </div>
    </div>
  )
  if (threeD) return <div className="phone-3d-stage"><div className="phone-3d">{body}</div></div>
  return body
}

function Waveform({ active, user = false, bars = 24 }) {
  const heights = useMemo(
    () => Array.from({ length: bars }, () => ({
      min: 4 + Math.random() * 6,
      max: 12 + Math.random() * 26,
      delay: Math.random() * 0.7,
    })),
    [bars],
  )
  return (
    <div className={`waveform ${user ? 'user' : ''} ${active ? 'active' : 'idle'}`} aria-hidden="true">
      {heights.map((h, i) => (
        <i key={i} style={{ '--min': `${h.min}px`, '--max': `${h.max}px`, animationDelay: `${h.delay}s` }} />
      ))}
    </div>
  )
}

/* ── Lock screen ──────────────────────────────────────────── */
function LockScreen({ onUnlock }) {
  const [unlocking, setUnlocking] = useState(false)
  const now = useClock()
  const unlock = () => {
    if (unlocking) return
    setUnlocking(true)
    setTimeout(onUnlock, 480)
  }
  return (
    <div className={`pscreen lock-screen ${unlocking ? 'unlocking' : ''}`} onClick={unlock} role="button" aria-label="Unlock phone" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && unlock()}>
      <div className="lock-time">{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, '')}</div>
      <div className="lock-date">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <div className="lock-notif">
        <div className="app-ic">📞</div>
        <div>
          <b>Closer Training</b>
          <span>Your prospects are waiting. Time to dial.</span>
        </div>
      </div>
      <div className="lock-hint">Tap to unlock ↑</div>
    </div>
  )
}

/* ── Home screen ──────────────────────────────────────────── */
function HomeScreen({ onOpen }) {
  // The green Phone app opens your prospect list — every call starts from a
  // contact you can see, never a number you're expected to know.
  const apps = [
    { id: 'contacts', name: 'Prospects', ic: '📞', tint: 'green' },
    { id: 'recents', name: 'Recents', ic: '🕘', tint: '' },
    { id: 'coach', name: 'Coach', ic: '🎯', tint: 'gold' },
    { name: 'Messages', ic: '💬' }, { name: 'Mail', ic: '✉️' },
    { name: 'Calendar', ic: '📅' }, { name: 'Notes', ic: '📝' },
    { name: 'CRM', ic: '📊' }, { name: 'Music', ic: '🎵' },
    { name: 'Photos', ic: '🌄' }, { name: 'Settings', ic: '⚙️' },
  ]
  return (
    <div className="pscreen home-screen">
      <div className="home-grid">
        {apps.map((a) => (
          <button key={a.name} className="home-app" onClick={() => a.id && onOpen(a.id)} aria-label={a.name} style={!a.id ? { opacity: 0.75, cursor: 'default' } : undefined}>
            <span className={`ic ${a.tint || ''}`}>{a.ic}</span>
            <span>{a.name}</span>
          </button>
        ))}
      </div>
      <div className="home-dock">
        {[{ id: 'contacts', ic: '📞', tint: 'green' }, { id: 'recents', ic: '🕘' }, { id: 'coach', ic: '🎯', tint: 'gold' }].map((a) => (
          <button key={a.id} className="home-app" onClick={() => onOpen(a.id)} aria-label={a.id}>
            <span className={`ic ${a.tint || ''}`}>{a.ic}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Contacts ─────────────────────────────────────────────── */
function ContactsScreen({ onBack, onCall }) {
  return (
    <div className="pscreen contacts-screen">
      <div className="papp-header">
        <button className="papp-back" onClick={onBack}>‹ Home</button>
        <h4>Contacts</h4>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>{CHARACTERS.length}</span>
      </div>
      <div className="contacts-list">
        {CHARACTERS.map((c) => (
          <button key={c.id} className="contact-row" onClick={() => onCall(c)}>
            <span className="contact-avatar">{c.emoji}</span>
            <span>
              <b>{c.name}</b>
              <small>{c.title} · {c.industry}</small>
            </span>
            <span className="contact-diff"><Difficulty level={c.difficulty} /></span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Recents ──────────────────────────────────────────────── */
function RecentsScreen({ onBack, onCall }) {
  const calls = [...getProfile().calls].reverse().slice(0, 12)
  return (
    <div className="pscreen contacts-screen">
      <div className="papp-header">
        <button className="papp-back" onClick={onBack}>‹ Home</button>
        <h4>Recents</h4>
      </div>
      <div className="contacts-list">
        {calls.map((call) => {
          const c = getCharacter(call.characterId)
          return (
            <button key={call.id} className="contact-row" onClick={() => onCall(c)}>
              <span className="contact-avatar">{c.emoji}</span>
              <span>
                <b>{c.name}</b>
                <small>{call.outcome === 'hangup' ? '📵 Hung up on you' : `✓ Scored ${call.overall}`} · {fmtDuration(call.durationSec)}</small>
              </span>
              <span style={{ marginLeft: 'auto', color: 'var(--gold-bright)', fontSize: 16 }}>📞</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Active call ──────────────────────────────────────────── */
const EMOTION_LABEL = {
  neutral: 'listening', curious: 'curious', warm: 'warming up', skeptical: 'skeptical',
  irritated: 'irritated', angry: 'furious', flat: 'unimpressed',
}

function CallScreen({ character, challenge, scenario, incoming, whisperEnabled, onDone, onCancel }) {
  const [stage, setStage] = useState(incoming ? 'incoming' : 'ringing') // ringing|incoming|active|ended
  const [seconds, setSeconds] = useState(0)
  const [turn, setTurn] = useState('idle')          // ai | user | processing
  const [caption, setCaption] = useState(null)      // { speaker, text }
  const [emotion, setEmotion] = useState('neutral')
  const [muted, setMuted] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [whisper, setWhisper] = useState(null)
  const [micState, setMicState] = useState('')
  const [typed, setTyped] = useState('')
  const [needsTyping, setNeedsTyping] = useState(!speechSupport.recognition)
  const [outcome, setOutcome] = useState(null)

  const convRef = useRef(null)
  const transcriptRef = useRef([])
  const startRef = useRef(null)
  const speakingRef = useRef(null)
  const listenRef = useRef(null)
  const mutedRef = useRef(false)
  const doneRef = useRef(false)
  mutedRef.current = muted

  const settings = getProfile().settings

  // timer
  useEffect(() => {
    if (stage !== 'active') return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [stage])

  const finishCall = useCallback((finalOutcome) => {
    if (doneRef.current) return
    doneRef.current = true
    stopSpeaking()
    listenRef.current?.stop()
    speakingRef.current?.cancel()
    const conv = convRef.current
    if (conv && !conv.state.outcome) conv.endedByUser()
    const durationSec = startRef.current ? Math.round((Date.now() - startRef.current) / 1000) : 0
    const report = scoreCall({
      transcript: transcriptRef.current,
      engineState: conv?.state || { log: [], outcome: finalOutcome, objectionsRaised: 0, objectionsSurvived: 0, interest: 0 },
      durationSec,
      character, challenge,
    })
    setOutcome(report.outcome || finalOutcome)
    setStage('ended')
    setTimeout(() => onDone({ report, transcript: transcriptRef.current, durationSec }), 1600)
  }, [character, challenge, onDone])

  const aiSay = useCallback(async (text, emo) => {
    if (doneRef.current) return
    setTurn('ai')
    setEmotion(emo || 'neutral')
    setCaption({ speaker: character.name, text })
    transcriptRef.current.push({ speaker: 'ai', text, t: startRef.current ? (Date.now() - startRef.current) / 1000 : 0 })
    // speakAs: premium ElevenLabs voice when a key is configured, otherwise a
    // pinned browser voice — either way persona-tuned per character.
    speakingRef.current = speakAs(text, character, settings)
    await speakingRef.current.promise
  }, [character, settings])

  const userTurn = useCallback(async () => {
    if (doneRef.current) return
    setTurn('user')
    setMicState(speechSupport.recognition ? 'Listening… speak now' : 'Type your response below')
    let text = null
    if (speechSupport.recognition && !needsTyping) {
      try {
        listenRef.current = listenOnce({ onInterim: (t) => setCaption({ speaker: 'You', text: t, user: true }) })
        const res = await listenRef.current.promise
        text = res.text
      } catch {
        // Mic denied or no speech — fall back to typing, stay in user turn.
        setNeedsTyping(true)
        setMicState('Mic unavailable — type your response')
        return
      }
    } else {
      return // wait for typed submit
    }
    if (text) handleUserText(text)
  }, [needsTyping]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUserText = useCallback(async (text) => {
    if (doneRef.current || !text.trim()) return
    if (mutedRef.current) {
      setMicState('You are muted — unmute to speak')
      return
    }
    setMicState('')
    setCaption({ speaker: 'You', text, user: true })
    transcriptRef.current.push({ speaker: 'user', text, t: startRef.current ? (Date.now() - startRef.current) / 1000 : 0 })
    setTurn('processing')
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 500)) // natural beat
    const conv = convRef.current
    const res = conv.reply(text)
    if (whisperEnabled && res.coach) {
      setWhisper(res.coach)
      setTimeout(() => setWhisper(null), 4200)
    }
    await aiSay(res.text, res.emotion)
    if (res.done) {
      finishCall(res.outcome)
    } else {
      userTurn()
    }
  }, [aiSay, finishCall, userTurn, whisperEnabled])

  const beginCall = useCallback(async () => {
    setStage('active')
    startRef.current = Date.now()
    convRef.current = createConversation({ character, challenge, scenario })
    const open = convRef.current.opener()
    // Let the browser's voice list finish loading so the character keeps
    // one consistent voice from the very first word.
    await Promise.all([voicesReady(), new Promise((r) => setTimeout(r, 600))])
    await aiSay(open.text, open.emotion)
    userTurn()
  }, [aiSay, character, challenge, scenario, userTurn])

  // Outgoing: ring then connect
  useEffect(() => {
    if (stage !== 'ringing') return
    const t = setTimeout(beginCall, 2200 + Math.random() * 1200)
    return () => clearTimeout(t)
  }, [stage, beginCall])

  // Cleanup on unmount
  useEffect(() => () => {
    doneRef.current = true
    stopSpeaking()
    listenRef.current?.stop()
  }, [])

  const submitTyped = (e) => {
    e.preventDefault()
    if (!typed.trim() || turn !== 'user') return
    const t = typed
    setTyped('')
    handleUserText(t)
  }

  if (stage === 'incoming') {
    return (
      <div className="pscreen call-screen">
        <div className="call-avatar ringing">{character.emoji}</div>
        <div className="call-name">{character.name}</div>
        <div className="call-sub">{character.title} · incoming call</div>
        <div className="incoming-actions">
          <div className="col" style={{ alignItems: 'center', gap: 8 }}>
            <button className="call-end" onClick={onCancel} aria-label="Decline">✕</button>
            <small style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>Decline</small>
          </div>
          <div className="col" style={{ alignItems: 'center', gap: 8 }}>
            <button className="call-end call-answer" onClick={beginCall} aria-label="Accept">📞</button>
            <small style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>Accept</small>
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'ringing') {
    return (
      <div className="pscreen call-screen">
        <div className="call-avatar ringing">{character.emoji}</div>
        <div className="call-name">{character.name}</div>
        <div className="call-sub">calling {character.title.toLowerCase()}…</div>
        <Waveform active={false} />
        <div className="call-controls">
          <button className="call-end" onClick={onCancel} aria-label="Cancel call">📞</button>
        </div>
      </div>
    )
  }

  if (stage === 'ended') {
    return (
      <div className="pscreen call-screen">
        <div className="call-ended-card anim-scale">
          <div className="outcome-badge">{outcome === 'closed' ? '🏆' : outcome === 'hangup' ? '📵' : '✅'}</div>
          <div className="call-name">
            {outcome === 'closed' ? 'Deal closed!' : outcome === 'hangup' ? 'They hung up' : 'Call complete'}
          </div>
          <div className="call-sub">{fmtDuration(seconds)} · analyzing your performance…</div>
          <div className="waveform active" style={{ margin: 0 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <i key={i} style={{ '--min': '4px', '--max': '18px', animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pscreen call-screen">
      {whisper && (
        <div className="whisper" role="status">
          <span aria-hidden="true">🎧</span>
          <span><b>Coach:</b> {whisper}</span>
        </div>
      )}
      <div className="call-avatar">{character.emoji}</div>
      <div className="call-name" style={{ fontSize: 20 }}>{character.name}</div>
      <div className="call-timer">{fmtDuration(seconds)}</div>
      <div className="call-emotion">{turn === 'ai' ? 'speaking' : EMOTION_LABEL[emotion] || 'listening'}</div>
      <Waveform active={turn === 'ai' || (turn === 'user' && !needsTyping)} user={turn === 'user'} />
      {caption && (
        <div className={`call-caption ${caption.user ? 'user' : ''}`}>
          <span className="speaker">{caption.speaker}</span>
          {caption.text}
        </div>
      )}
      <div className={`mic-state ${turn === 'user' ? 'live' : ''}`}>{turn === 'user' ? micState : turn === 'processing' ? '…' : ''}</div>
      {needsTyping && turn === 'user' && (
        <form className="type-bar" onSubmit={submitTyped}>
          <input
            value={typed} onChange={(e) => setTyped(e.target.value)}
            placeholder="Say something…" autoFocus aria-label="Your response"
          />
          <button type="submit" aria-label="Send">➤</button>
        </form>
      )}
      <div className="call-controls">
        <div className="call-ctl-grid">
          <button className={`call-ctl ${muted ? 'on' : ''}`} onClick={() => setMuted((m) => !m)} aria-pressed={muted} aria-label="Mute">
            {muted ? '🔇' : '🎙️'}<span>mute</span>
          </button>
          <button className={`call-ctl ${speakerOn ? 'on' : ''}`} onClick={() => setSpeakerOn((s) => !s)} aria-pressed={speakerOn} aria-label="Speaker">
            🔊<span>speaker</span>
          </button>
          <button className={`call-ctl ${needsTyping ? 'on' : ''}`} onClick={() => setNeedsTyping((t) => !t)} aria-pressed={needsTyping} aria-label="Keyboard input">
            ⌨️<span>keypad</span>
          </button>
        </div>
        <button className="call-end" onClick={() => finishCall('ended')} aria-label="End call">📞</button>
      </div>
    </div>
  )
}

/* ── Root simulator ───────────────────────────────────────── */
export default function PhoneSim({ startCharacter, challenge, scenario, incoming = false, skipLock = false, onCallComplete }) {
  const [screen, setScreen] = useState(skipLock ? 'home' : 'locked')
  const [callTarget, setCallTarget] = useState(startCharacter || null)
  const [callIncoming, setCallIncoming] = useState(incoming)

  useEffect(() => {
    if (startCharacter) {
      setCallTarget(startCharacter)
      setCallIncoming(incoming)
      setScreen((s) => (s === 'locked' ? 'locked' : 'call'))
    }
  }, [startCharacter, incoming])

  const startCall = (c, asIncoming = false) => {
    setCallTarget(c)
    setCallIncoming(asIncoming)
    setScreen('call')
  }

  const handleDone = (result) => {
    setScreen('home')
    onCallComplete?.({ ...result, character: callTarget, challenge, scenario })
  }

  return (
    <PhoneFrame>
      {screen === 'locked' && <LockScreen onUnlock={() => setScreen(callTarget ? 'call' : 'home')} />}
      {screen === 'home' && <HomeScreen onOpen={(id) => {
        if (id === 'coach') startCall(getCharacter('grant-cardone'))
        else setScreen(id)
      }} />}
      {screen === 'contacts' && <ContactsScreen onBack={() => setScreen('home')} onCall={startCall} />}
      {screen === 'recents' && <RecentsScreen onBack={() => setScreen('home')} onCall={startCall} />}
      {screen === 'call' && callTarget && (
        <CallScreen
          character={callTarget}
          challenge={challenge}
          scenario={scenario}
          incoming={callIncoming}
          whisperEnabled={getProfile().settings.whisperCoach}
          onDone={handleDone}
          onCancel={() => setScreen('home')}
        />
      )}
    </PhoneFrame>
  )
}

export { Waveform }
