// Character roster + custom character builder.
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { CHARACTERS } from '../data/characters.js'
import { Card, Difficulty, Modal, Meter } from '../components/ui.jsx'

const FILTERS = ['All', 'Legends', 'Brutal', 'Hard', 'Medium', 'Easy']

export default function Characters() {
  const nav = useNavigate()
  const [filter, setFilter] = useState('All')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [custom, setCustom] = useState({ name: '', industry: 'SaaS', difficulty: 3, style: 'skeptical' })

  const legends = ['jordan-belfort', 'grant-cardone', 'steve-jobs', 'elon-musk', 'warren-buffett', 'mark-cuban', 'barbara-corcoran']
  const list = CHARACTERS.filter((c) => {
    if (filter === 'All') return true
    if (filter === 'Legends') return legends.includes(c.id)
    return { Brutal: 5, Hard: 4, Medium: 3, Easy: 2 }[filter] === c.difficulty
  })

  const startCustom = () => {
    // Custom builder maps to the closest archetype for the engine.
    const archetype = { skeptical: 'skeptical-customer', aggressive: 'angry-prospect', analytical: 'cold-cfo', warm: 'budget-buyer' }[custom.style]
    setBuilderOpen(false)
    nav('/app/simulator', { state: { characterId: archetype, scenario: {
      title: `Custom: ${custom.name || 'Unnamed prospect'}`,
      topic: `selling to a ${custom.style} ${custom.industry} buyer`,
      openingContext: `You built this prospect: ${custom.name || 'Unnamed'} — a ${custom.style} buyer in ${custom.industry}, difficulty ${custom.difficulty}/5.`,
    } } })
  }

  return (
    <div className="page-enter">
      <div className="main-header row between wrap">
        <div>
          <h1>Characters</h1>
          <p>{CHARACTERS.length} AI opponents, each with their own temperament, objection style, and breaking point.</p>
        </div>
        <button className="btn btn-gold" onClick={() => setBuilderOpen(true)}>＋ Build custom character</button>
      </div>

      <div className="row wrap" style={{ marginBottom: 20 }}>
        {FILTERS.map((f) => (
          <button key={f} className={`chip ${filter === f ? 'gold' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="grid grid-3">
        {list.map((c, i) => (
          <button
            key={c.id} className={`card char-card card-hover anim-up d${(i % 3) + 1}`}
            onClick={() => nav('/app/simulator', { state: { characterId: c.id } })}
          >
            <div className="char-top">
              <span className="char-emoji">{c.emoji}</span>
              <div>
                <h3>{c.name}</h3>
                <span className="char-title">{c.title}</span>
              </div>
            </div>
            <Difficulty level={c.difficulty} showLabel />
            <p className="char-desc">{c.personality}</p>
            <div className="trait-bars">
              <div className="trait"><b>Speed</b><Meter value={c.speakingSpeed * 60} thin /></div>
              <div className="trait"><b>Interrupts</b><Meter value={c.interruptiveness * 100} thin /></div>
            </div>
            <div className="char-meta">
              <span className="chip">{c.industry}</span>
              <span className="chip">{c.objectionStyle}</span>
            </div>
            <span className="btn btn-dark btn-sm btn-block" style={{ marginTop: 8 }}>📞 Call {c.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <Modal open={builderOpen} onClose={() => setBuilderOpen(false)}>
        <h2 style={{ fontSize: 20, marginBottom: 4 }} className="display">Custom character builder</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>Design the exact prospect you keep losing to.</p>
        <div className="col" style={{ gap: 14 }}>
          <div className="field">
            <label>Name</label>
            <input className="input" placeholder="e.g. Dr. Patel, skeptical dentist" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Industry</label>
            <select className="select" value={custom.industry} onChange={(e) => setCustom({ ...custom, industry: e.target.value })}>
              {['SaaS', 'Real Estate', 'Healthcare', 'Finance', 'Retail', 'Hospitality', 'Fitness', 'Automotive', 'Insurance'].map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Temperament</label>
            <select className="select" value={custom.style} onChange={(e) => setCustom({ ...custom, style: e.target.value })}>
              <option value="skeptical">Skeptical — demands proof</option>
              <option value="aggressive">Aggressive — hostile from hello</option>
              <option value="analytical">Analytical — only numbers matter</option>
              <option value="warm">Warm — friendly but price-sensitive</option>
            </select>
          </div>
          <div className="field">
            <label>Difficulty · {custom.difficulty}/5</label>
            <input type="range" min="1" max="5" value={custom.difficulty} onChange={(e) => setCustom({ ...custom, difficulty: Number(e.target.value) })} />
          </div>
          <button className="btn btn-gold btn-block" onClick={startCustom}>Create & call now →</button>
        </div>
      </Modal>
    </div>
  )
}
