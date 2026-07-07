// Skill Academy: module catalog.
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { ACADEMY, ACADEMY_CATEGORIES } from '../data/academy.js'
import { Meter } from '../components/ui.jsx'
import { useProfile } from '../components/AppShell.jsx'

export default function Academy() {
  const profile = useProfile()
  const [cat, setCat] = useState('All')
  const list = ACADEMY.filter((m) => cat === 'All' || m.category === cat)

  const progressOf = (m) => {
    const p = profile.academy[m.id]
    if (!p) return 0
    const total = m.lessons.length + 1 + 1 // lessons + drill + quiz
    const done = (p.lessonsDone?.length || 0) + (p.drillDone ? 1 : 0) + (p.quizBest != null ? 1 : 0)
    return Math.round((done / total) * 100)
  }

  const completed = ACADEMY.filter((m) => progressOf(m) === 100).length

  return (
    <div className="page-enter">
      <div className="main-header row between wrap">
        <div>
          <h1>Skill Academy</h1>
          <p>{ACADEMY.length} interactive modules · lessons, drills, AI practice, and quizzes.</p>
        </div>
        <span className="chip gold">🎓 {completed}/{ACADEMY.length} mastered</span>
      </div>

      <div className="row wrap" style={{ marginBottom: 20 }}>
        {['All', ...ACADEMY_CATEGORIES].map((c) => (
          <button key={c} className={`chip ${cat === c ? 'gold' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      <div className="grid grid-3">
        {list.map((m, i) => {
          const pct = progressOf(m)
          return (
            <Link key={m.id} to={`/app/academy/${m.id}`} className={`card module-card card-hover anim-up d${(i % 3) + 1}`}>
              <span className="module-emoji">{m.emoji}</span>
              <h3>{m.name}</h3>
              <div className="module-meta">
                <span className="chip">{m.category}</span>
                <span>{m.level}</span>
                <span>·</span>
                <span>~{m.minutes} min</span>
              </div>
              <p className="char-desc">{m.description}</p>
              <div style={{ marginTop: 'auto' }}>
                <div className="row between" style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 5 }}>
                  <span>{pct === 100 ? '✓ Mastered' : pct > 0 ? 'In progress' : 'Not started'}</span>
                  <span className="mono">{pct}%</span>
                </div>
                <Meter value={pct} thin tone={pct === 100 ? '' : 'blue'} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
