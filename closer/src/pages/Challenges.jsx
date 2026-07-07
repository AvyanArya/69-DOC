// Challenge modes grid.
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { CHALLENGES } from '../data/challenges.js'
import { getCharacter } from '../data/characters.js'
import { Difficulty } from '../components/ui.jsx'
import { useProfile } from '../components/AppShell.jsx'

const CATS = ['All', 'Fundamentals', 'Core Skills', 'Advanced', 'Industry']

export default function Challenges() {
  const nav = useNavigate()
  const [cat, setCat] = useState('All')
  const profile = useProfile()
  const list = CHALLENGES.filter((c) => cat === 'All' || c.category === cat)

  const bestFor = (id) => {
    const attempts = profile.calls.filter((c) => c.challengeId === id)
    return attempts.length ? Math.max(...attempts.map((c) => c.overall)) : null
  }

  return (
    <div className="page-enter">
      <div className="main-header">
        <h1>Challenge Modes</h1>
        <p>Structured missions with a clear objective. Beat the objective, bank the XP.</p>
      </div>

      <div className="row wrap" style={{ marginBottom: 20 }}>
        {CATS.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'gold' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      <div className="grid grid-3">
        {list.map((c, i) => {
          const opp = getCharacter(c.characterId)
          const best = bestFor(c.id)
          return (
            <button
              key={c.id} className={`card char-card card-hover anim-up d${(i % 3) + 1}`}
              onClick={() => nav('/app/simulator', { state: { characterId: c.characterId, challengeId: c.id } })}
            >
              <div className="char-top">
                <span className="char-emoji">{c.emoji}</span>
                <div>
                  <h3>{c.name}</h3>
                  <span className="char-title">{c.category} · ~{c.minutes} min</span>
                </div>
              </div>
              <Difficulty level={c.difficulty} showLabel />
              <p className="char-desc">{c.brief}</p>
              <div style={{ fontSize: 12.5, color: 'var(--gold-bright)' }}>🎯 {c.objective}</div>
              <div className="char-meta">
                <span className="chip">vs {opp.emoji} {opp.name}</span>
                {best != null && <span className="chip good">Best: {best}</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
