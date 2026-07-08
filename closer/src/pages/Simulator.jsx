// Phone simulator page: the phone + mission brief sidebar.
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import PhoneSim from '../components/phone/PhoneSim.jsx'
import { Card, Difficulty } from '../components/ui.jsx'
import { CHARACTERS, getCharacter } from '../data/characters.js'
import { CHALLENGES, getChallenge } from '../data/challenges.js'
import { recordCall, getProfile, updateProfile } from '../lib/storage.js'
import { xpForCall } from '../lib/xp.js'
import { speechSupport, voiceTier, voicesReady, probeTtsProxy } from '../lib/speech.js'

function VoiceQualityCard() {
  const [tier, setTier] = useState(null)
  const [key, setKey] = useState('')
  useEffect(() => {
    let alive = true
    Promise.all([voicesReady(), probeTtsProxy()]).then(() => { if (alive) setTier(voiceTier(getProfile().settings)) })
    return () => { alive = false }
  }, [])
  if (!tier) return null

  const saveKey = () => {
    updateProfile((p) => { p.settings.elevenLabsKey = key.trim() })
    setTier(voiceTier(getProfile().settings))
  }

  if (tier.tier === 'premium') {
    return (
      <Card className="pad" style={{ borderColor: 'rgba(12,163,12,.35)' }}>
        <h3 style={{ fontSize: 14, marginBottom: 6 }}>🎙️ Studio voices active</h3>
        <p className="muted" style={{ fontSize: 12.5 }}>{tier.label === 'Studio voices (site-wide)' ? 'This deployment ships studio voices to every visitor, on any browser. Nothing to configure.' : 'Characters speak with ElevenLabs voices, persona-tuned. This is as human as it gets.'}</p>
      </Card>
    )
  }
  if (tier.tier === 'neural') {
    return (
      <Card className="pad">
        <h3 style={{ fontSize: 14, marginBottom: 6 }}>🎙️ Neural browser voice</h3>
        <p className="muted" style={{ fontSize: 12.5 }}>
          Using <b>{tier.label}</b>, one of your browser's better voices. For truly
          studio-grade audio, add an ElevenLabs key in Settings.
        </p>
      </Card>
    )
  }
  return (
    <Card className="pad" style={{ borderColor: 'rgba(250,178,25,.4)' }}>
      <h3 style={{ fontSize: 14, marginBottom: 6 }}>⚠️ Your browser's voices sound robotic</h3>
      <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
        {tier.tier === 'good'
          ? <>You're on <b>{tier.label}</b>, passable, but not human. Two ways to fix that:</>
          : <>This browser only ships basic system voices ({tier.label}). Two ways to get genuinely human voices:</>}
      </p>
      <ol style={{ fontSize: 12.5, color: 'var(--ink-1)', paddingLeft: 18, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <li><b>Free:</b> open Closer in <b>Microsoft Edge</b>, its built-in "Natural" voices are neural and sound like real people. Closer picks them up automatically.</li>
        <li><b>Best:</b> paste an <a href="https://elevenlabs.io" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>ElevenLabs</a> API key (free tier available), every character gets a distinct studio voice:</li>
      </ol>
      <div className="row" style={{ gap: 8 }}>
        <input
          type="password" className="input" placeholder="xi-api-key…" style={{ fontSize: 12.5, padding: '8px 12px' }}
          value={key} onChange={(e) => setKey(e.target.value)} aria-label="ElevenLabs API key"
        />
        <button className="btn btn-gold btn-sm" disabled={!key.trim()} onClick={saveKey}>Save</button>
      </div>
    </Card>
  )
}

export default function Simulator() {
  const location = useLocation()
  const nav = useNavigate()
  const preset = location.state || {}

  const [characterId, setCharacterId] = useState(preset.characterId || '')
  const [challengeId, setChallengeId] = useState(preset.challengeId || '')
  const [incoming, setIncoming] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const scenario = preset.scenario || null

  const character = characterId ? getCharacter(characterId) : null
  const challenge = challengeId ? getChallenge(challengeId) : null
  const whisper = getProfile().settings.whisperCoach

  const startTarget = useMemo(
    () => (character ? { ...character } : null),
    [characterId, sessionKey], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const handleComplete = ({ report, transcript, durationSec, character: c }) => {
    const xp = xpForCall({ overall: report.overall, durationSec, difficulty: c.difficulty })
    const call = {
      id: `call-${Date.now()}`,
      ts: Date.now(),
      characterId: c.id,
      challengeId: challenge?.id || (scenario ? 'scenario' : 'freestyle'),
      scenarioTitle: scenario?.title,
      durationSec,
      overall: report.overall,
      scores: report.scores,
      talkRatio: report.talkRatio,
      fillerWords: report.fillerWords,
      interruptions: report.interruptions,
      outcome: report.outcome,
      transcript,
      report,
      xpEarned: xp,
    }
    recordCall(call)
    updateProfile((p) => {
      if (report.overall >= 80 && !p.achievements.includes('score-80')) p.achievements.push('score-80')
      if (report.overall >= 90 && !p.achievements.includes('score-90')) p.achievements.push('score-90')
      if (report.fillerWords === 0 && !p.achievements.includes('no-filler')) p.achievements.push('no-filler')
      if (durationSec > 600 && !p.achievements.includes('marathon')) p.achievements.push('marathon')
      if (report.outcome === 'closed' && c.id === 'jordan-belfort' && !p.achievements.includes('beat-wolf')) p.achievements.push('beat-wolf')
      if (report.outcome === 'closed' && c.difficulty === 5 && !p.achievements.includes('beat-brutal')) p.achievements.push('beat-brutal')
    })
    nav(`/app/review/${call.id}`)
  }

  return (
    <div className="page-enter">
      <div className="main-header">
        <h1>Phone Simulator</h1>
        <p>Unlock the phone, pick a contact, and take the call. {speechSupport.recognition ? 'Speak naturally, the AI hears you.' : 'Voice input unavailable in this browser, use the keypad ⌨️ to type your lines.'}</p>
      </div>

      <div className="sim-layout">
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
          <PhoneSim
            key={sessionKey}
            startCharacter={startTarget}
            challenge={challenge}
            scenario={scenario}
            incoming={incoming}
            onCallComplete={handleComplete}
          />
        </div>

        <div className="sim-side sim-brief">
          <Card className="pad">
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Mission setup</h3>
            <div className="col" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="sim-char">Opponent</label>
                <select id="sim-char" className="select" value={characterId} onChange={(e) => { setCharacterId(e.target.value); setSessionKey((k) => k + 1) }}>
                  <option value="">Pick from phone contacts…</option>
                  {CHARACTERS.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}, {['', 'Warm-up', 'Easy', 'Medium', 'Hard', 'Brutal'][c.difficulty]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="sim-chal">Challenge mode</label>
                <select id="sim-chal" className="select" value={challengeId} onChange={(e) => setChallengeId(e.target.value)}>
                  <option value="">Freestyle call</option>
                  {CHALLENGES.map((c) => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>
              <label className="row" style={{ fontSize: 13, gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={incoming} onChange={(e) => setIncoming(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
                They call you (incoming call)
              </label>
            </div>
          </Card>

          {scenario && (
            <Card className="pad" style={{ borderColor: 'rgba(211,169,78,.4)' }}>
              <span className="chip gold" style={{ marginBottom: 10 }}>🧪 Custom scenario</span>
              <h3 style={{ fontSize: 14.5, marginBottom: 6 }}>{scenario.title}</h3>
              <p className="sub" style={{ fontSize: 13 }}>{scenario.openingContext}</p>
            </Card>
          )}

          {character && (
            <Card className="pad">
              <div className="char-top" style={{ marginBottom: 10 }}>
                <span className="char-emoji">{character.emoji}</span>
                <div>
                  <h3 style={{ fontSize: 15.5 }}>{character.name}</h3>
                  <span className="char-title">{character.title}</span>
                </div>
              </div>
              <Difficulty level={character.difficulty} showLabel />
              <p className="char-desc" style={{ margin: '10px 0' }}>{character.personality}</p>
              <div className="trait-bars">
                <div className="trait"><b>Objection style</b>{character.objectionStyle}</div>
                <div className="trait"><b>Sales style</b>{character.salesStyle}</div>
                <div className="trait"><b>Speaking speed</b>{character.speakingSpeed > 1.1 ? 'Fast' : character.speakingSpeed < 0.95 ? 'Measured' : 'Normal'}</div>
                <div className="trait"><b>Interrupts</b>{character.interruptiveness > 0.7 ? 'Constantly' : character.interruptiveness > 0.4 ? 'Sometimes' : 'Rarely'}</div>
              </div>
            </Card>
          )}

          {challenge && (
            <Card className="pad">
              <span className="chip blue" style={{ marginBottom: 8 }}>{challenge.emoji} {challenge.name}</span>
              <p className="sub" style={{ fontSize: 13, marginBottom: 8 }}>{challenge.brief}</p>
              <div style={{ fontSize: 12.5, color: 'var(--gold-bright)' }}>🎯 {challenge.objective}</div>
            </Card>
          )}

          <VoiceQualityCard />

          <Card className="pad">
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>🎧 Whisper coach</h3>
            <p className="muted" style={{ fontSize: 12.5 }}>
              {whisper
                ? 'ON, live tips will appear at the top of the phone during the call. Toggle in Settings.'
                : 'OFF, the coach stays silent and saves everything for the debrief. Toggle in Settings.'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
