// Shared UI primitives.
import { useEffect, useState } from 'react'

export function Card({ children, className = '', hover = false, pad = true, ...rest }) {
  return (
    <div className={`card ${pad ? 'pad' : ''} ${hover ? 'card-hover' : ''} ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function SectionTitle({ eyebrow, title, sub, center = false, className = '' }) {
  return (
    <div className={`section-title ${center ? 'center' : ''} ${className}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="display">{title}</h2>
      {sub && <p className="sub">{sub}</p>}
    </div>
  )
}

export function Stat({ label, value, sub, icon, accent = false }) {
  return (
    <Card className="stat-tile" hover>
      <div className="row between">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className={`stat-value ${accent ? 'gold-text' : ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </Card>
  )
}

export function Meter({ value, max = 100, tone = '', thin = false }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={`meter ${thin ? 'thin' : ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
      <i className={tone} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Ring({ value, size = 120, stroke = 9, label, sublabel, color = 'var(--series-1)' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(value))
    return () => cancelAnimationFrame(t)
  }, [value])
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ?? value} out of 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--grid-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (animated / 100) * c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.1s var(--ease-out)' }}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-value mono">{label ?? Math.round(value)}</span>
        {sublabel && <span className="ring-sub">{sublabel}</span>}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      className="toggle" role="switch" aria-checked={checked} aria-label={label}
      onClick={() => onChange(!checked)}
    />
  )
}

export function Modal({ open, onClose, children, width }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={width ? { maxWidth: width } : undefined} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  )
}

export function Difficulty({ level, showLabel = false }) {
  const labels = { 1: 'Warm-up', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Brutal' }
  return (
    <span className="difficulty" title={`Difficulty: ${labels[level]}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= level ? 'on' : ''} />
      ))}
      {showLabel && <em>{labels[level]}</em>}
    </span>
  )
}

export function Skeleton({ w = '100%', h = 16, r, style }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />
}

export function EmptyState({ icon = '📂', title, sub, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {sub && <p className="muted">{sub}</p>}
      {action}
    </div>
  )
}
