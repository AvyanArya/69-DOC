// Character roster — visual, minimal text, quick to scan.
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { CHARACTERS } from '../data/characters.js'
import { Difficulty, Modal } from '../components/ui.jsx'

const FILTERS = ['All', 'Legends', 'Brutal', 'Hard', 'Medium', 'Easy']
const LEGENDS = ['jordan-belfort', 'grant-cardone', 'steve-jobs', 'elon-musk', 'warren-buffett', 'mark-cuban', 'barbara-corcoran']

export default function Characters() {
  const nav = useNavigate()
  const [filter, setFilter] = useState('All')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [custom, setCustom] = useState({ name: '', industry: 'SaaS', difficulty: 3, style: 'skeptical' })

  const list = CHARACTERS.filter((c) => {
    if (filter === 'All') return true
    if (filter === 'Legends') return LEGENDS.includes(c.id)
    return { Brutal: 5, Hard: 4, Medium: 3, Easy: 2 }[filter] === c.difficulty
  })

  const startCustom = () => {
    const archetype = { skeptical: 'skeptical-customer', aggressive: 'angry-prospect', analytical: 'cold-cfo', warm: 'budget-buyer' }[custom.style]
    setBuilderOpen(false)
    nav('/app/simulator', { state: { characterId: archetype, scenario: {
      title: `Custom: ${custom.name || 'Unnamed prospect'}`,
      topic: `selling to a ${custom.style} ${custom.industry} buyer`,
      openingContext: `You built this prospect: ${custom.name || 'Unnamed'}, a ${custom.style} buyer in ${custom.industry}, difficulty ${custom.difficulty}/5.`,
    } } })
  }

  return (
    <div className="page-enter">
      <div className="main-header row between wrap">
        <div>
          <h1>Characters</h1>
          <p>{CHARACTERS.length} AI opponents. Tap one to call.</p>
        </div>
        <button className="btn btn-gold" onClick={() => setBuilderOpen(true)}>＋ Build your own</button>
      </div>

      <div className="row wrap" style={{ marginBottom: 18 }}>
        {FILTERS.map((f) => (
          <button key={f} className={`chip ${filter === f ? 'gold' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="roster-grid">
        {list.map((c) => (
          <button
            key={c.id} className="roster-card card card-hover"
            onClick={() => nav('/app/simulator', { state: { characterId: c.id } })}
          >
            <span className="roster-emoji">{c.emoji}</span>
            <b className="roster-name">{c.name}</b>
            <span className="roster-title">{c.title}</span>
            <Difficulty level={c.difficulty} />
            <span className="chip" style={{ fontSize: 10.5, marginTop: 2 }}>{c.industry}</span>
          </button>
        ))}
      </div>

      <Modal open={builderOpen} onClose={() => setBuilderOpen(false)}>
        <h2 style={{ fontSize: 20, marginBottom: 4 }} className="display">Build a character</h2>
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
