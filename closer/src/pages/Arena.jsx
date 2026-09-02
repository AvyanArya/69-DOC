// Live Arena: pitch to "live" peers and get a rating + written review.
import { useMemo, useRef, useState } from 'react'
import { Card, Modal } from '../components/ui.jsx'
import { LIVE_PEERS, PEER_REVIEWS } from '../data/arena.js'
import { analyzeUtterance } from '../lib/conversation.js'
import { updateProfile } from '../lib/storage.js'
import { speechSupport, listenOnce } from '../lib/speech.js'

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// Rate a pitch from its content — the same signals the call scorer uses.
function ratePitch(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const a = analyzeUtterance(text)
  let score = 42
  if (a.openQuestion) score += 14
  else if (a.isQuestion) score += 8
  if (a.intents.has('valueProp')) score += 12
  if (a.intents.has('social')) score += 8
  if (a.intents.has('empathy')) score += 8
  if (a.intents.has('close')) score += 12
  if (a.echo && /\d/.test(a.echo)) score += 6
  if (a.fillers >= 3) score -= 12
  else if (a.fillers >= 1) score -= 5
  if (words < 12) score -= 14
  if (words > 90) score -= 10
  if (words >= 25 && words <= 70) score += 6
  score = Math.max(8, Math.min(98, score))
  const tier = score >= 82 ? 'great' : score >= 65 ? 'good' : score >= 45 ? 'mid' : 'weak'
  return { score, stars: Math.max(1, Math.round(score / 20)), review: pick(PEER_REVIEWS[tier]), tier }
}

export default function Arena() {
  const [matching, setMatching] = useState(false)
  const [peer, setPeer] = useState(null)
  const [pitch, setPitch] = useState('')
  const [result, setResult] = useState(null)
  const [listening, setListening] = useState(false)
  const listenRef = useRef(null)

  // A gently shuffling "live" count so the lobby feels alive.
  const onlineCount = useMemo(() => 40 + Math.floor(Math.random() * 60), [])

  const startMatch = (p) => {
    setMatching(true)
    setResult(null)
    setPitch('')
    setTimeout(() => { setMatching(false); setPeer(p) }, 1400 + Math.random() * 900)
  }

  const submitPitch = () => {
    if (!pitch.trim()) return
    const r = ratePitch(pitch)
    setResult(r)
    updateProfile((prof) => {
      prof.xp += 30 + r.score
      prof.arena = prof.arena || { pitches: 0, best: 0 }
      prof.arena.pitches += 1
      prof.arena.best = Math.max(prof.arena.best, r.score)
    })
  }

  const voicePitch = async () => {
    if (!speechSupport.recognition) return
    setListening(true)
    try {
      listenRef.current = listenOnce({ onInterim: (t) => setPitch(t) })
      const res = await listenRef.current.promise
      if (res.text) setPitch(res.text)
    } catch { /* ignore */ } finally { setListening(false) }
  }

  return (
    <div className="page-enter">
      <div className="main-header row between wrap">
        <div>
          <h1>Live Arena 🎙️</h1>
          <p>Pitch a live person on the platform. They rate you and leave a review.</p>
        </div>
        <span className="chip good">● {onlineCount} online now</span>
      </div>

      <div className="arena-banner">
        <span>🌐</span>
        <div>
          <b>Practice on real humans.</b> Pick someone who's online, deliver your pitch, and get an honest
          rating back. <span className="muted">(In this build peers are simulated so it works instantly and offline; connect a presence server to match with real users.)</span>
        </div>
      </div>

      <h3 className="arena-h">Who's online</h3>
      <div className="arena-grid">
        {LIVE_PEERS.map((p) => (
          <Card key={p.id} className="pad arena-peer card-hover">
            <div className="row" style={{ gap: 12 }}>
              <span className="arena-avatar">{p.avatar}<i className="arena-live" /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14.5 }}>{p.name}</b>
                <div className="muted" style={{ fontSize: 12 }}>{p.role}</div>
              </div>
              <span className="chip">★ {p.rating}</span>
            </div>
            <div className="arena-wants">“{p.wants}”</div>
            <div className="row between">
              <span className="chip gold" style={{ fontSize: 11 }}>{p.mood}</span>
              <button className="btn btn-gold btn-sm" onClick={() => startMatch(p)}>Pitch them →</button>
            </div>
          </Card>
        ))}
      </div>

      {/* Matchmaking overlay */}
      <Modal open={matching} onClose={() => setMatching(false)}>
        <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 14, padding: '10px 0' }}>
          <div className="arena-radar"><span /><span /><span /></div>
          <h3 className="display" style={{ fontSize: 20 }}>Connecting you…</h3>
          <p className="muted" style={{ fontSize: 13 }}>Finding a live partner and opening the line.</p>
        </div>
      </Modal>

      {/* Pitch panel */}
      <Modal open={!!peer && !matching} onClose={() => { setPeer(null); setResult(null) }} width={560}>
        {peer && !result && (
          <div className="col" style={{ gap: 14 }}>
            <div className="row" style={{ gap: 12 }}>
              <span className="arena-avatar lg">{peer.avatar}<i className="arena-live" /></span>
              <div>
                <b style={{ fontSize: 16 }}>{peer.name}</b>
                <div className="muted" style={{ fontSize: 12.5 }}>{peer.role} · {peer.mood}</div>
              </div>
            </div>
            <div className="arena-ask">🎯 {peer.wants}</div>
            <textarea
              className="textarea" style={{ minHeight: 120 }} autoFocus
              placeholder="Deliver your pitch… (aim for 30–45 seconds)"
              value={pitch} onChange={(e) => setPitch(e.target.value)}
            />
            <div className="row" style={{ gap: 8 }}>
              {speechSupport.recognition && (
                <button className={`btn btn-dark btn-sm ${listening ? 'listening' : ''}`} onClick={voicePitch} disabled={listening}>
                  {listening ? '● Listening…' : '🎙️ Speak it'}
                </button>
              )}
              <span className="spacer" />
              <button className="btn btn-gold" onClick={submitPitch} disabled={!pitch.trim()}>Send pitch →</button>
            </div>
          </div>
        )}
        {peer && result && (
          <div className="col anim-scale" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
            <span className="arena-avatar lg">{peer.avatar}</span>
            <div style={{ fontSize: 26, letterSpacing: 3 }}>
              {'★'.repeat(result.stars)}<span style={{ opacity: .25 }}>{'★'.repeat(5 - result.stars)}</span>
            </div>
            <div className="display" style={{ fontSize: 30 }} >{result.score}<span className="muted" style={{ fontSize: 15 }}> / 100</span></div>
            <div className="arena-review">“{result.review}”<div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>— {peer.name}</div></div>
            <div className="chip gold">+{30 + result.score} XP</div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setPitch('') }}>Pitch again</button>
              <button className="btn btn-gold btn-sm" onClick={() => { setPeer(null); setResult(null) }}>Back to lobby</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
