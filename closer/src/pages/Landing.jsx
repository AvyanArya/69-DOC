// Marketing landing page with animated hero + 3D phone.
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { PhoneFrame, Waveform } from '../components/phone/PhoneSim.jsx'
import { CHARACTERS } from '../data/characters.js'
import { SectionTitle } from '../components/ui.jsx'
import { PricingCards } from './Pricing.jsx'

const FEATURES = [
  { ic: '📞', title: 'AI Phone Simulator', desc: 'A real phone, a real conversation. Dial AI prospects who interrupt, push back, and hang up — just like the street.' },
  { ic: '🧠', title: 'Instant Call Coaching', desc: 'Every call is scored across 15+ dimensions — confidence, tonality, objection handling — with a full mistake timeline.' },
  { ic: '🎭', title: 'Legendary Opponents', desc: 'Train against the Wolf, a 10X titan, a visionary CEO, sharks, cold CFOs, and 20+ ruthless buyer archetypes.' },
  { ic: '🧪', title: 'Infinite Scenarios', desc: '"Sell accounting software to a dentist." Type it — the Scenario Lab builds the roleplay instantly.' },
  { ic: '🎧', title: 'Whisper Mode', desc: 'A coach in your ear during live calls: "Mirror their last sentence." "They\'re losing interest." "Slow down."' },
  { ic: '🏆', title: 'Ranked Progression', desc: 'XP, streaks, leaderboards and seven ranks from Beginner to Legend. Training you\'ll actually come back for.' },
]

const STEPS = [
  { title: 'Pick your opponent', desc: 'Choose a legendary closer, a hostile prospect, or generate a custom scenario for your exact industry.' },
  { title: 'Take the call', desc: 'Speak naturally. The AI responds in real time with emotion, objections, interruptions — and zero mercy.' },
  { title: 'Read the tape', desc: 'Get your score, mistake timeline, better lines you could have said, and a training plan that adapts to you.' },
]

const MARQUEE = ['SDRs', 'Founders', 'Real Estate Agents', 'Recruiters', 'Account Executives', 'Consultants', 'Insurance Agents', 'Car Sales', 'Loan Officers', 'Agency Owners']

function HeroPhone() {
  return (
    <div className="hero-phone">
      <PhoneFrame threeD>
        <div className="pscreen call-screen" style={{ pointerEvents: 'none' }}>
          <div className="call-avatar ringing">🐺</div>
          <div className="call-name">Jordan Belfort</div>
          <div className="call-sub">The Wolf · incoming call</div>
          <Waveform active />
          <div className="call-caption">
            <span className="speaker">Jordan Belfort</span>
            You've got exactly ten seconds to tell me why this call is worth my time. Go.
          </div>
          <div className="incoming-actions">
            <span className="call-end" aria-hidden="true">✕</span>
            <span className="call-end call-answer" aria-hidden="true">📞</span>
          </div>
        </div>
      </PhoneFrame>
    </div>
  )
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing">
      <header className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="row" style={{ gap: 9 }}>
          <span className="logo-mark">C</span>
          <b style={{ fontSize: 17 }}>Closer</b>
        </Link>
        <nav className="links">
          <a href="#features">Features</a>
          <a href="#characters">Characters</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="row" style={{ gap: 10 }}>
          <Link to="/auth" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link to="/auth" className="btn btn-gold btn-sm">Start Training</Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-glow g1" /><div className="hero-glow g2" /><div className="hero-glow g3" />
        <div className="hero-grid-lines" />
        <div className="hero-copy">
          <div className="hero-badge anim-up"><span className="dot" />2,800+ closers training right now</div>
          <h1 className="anim-up d1">Become <em className="gold-text" style={{ fontStyle: 'italic' }}>Impossible</em> to Hang Up On.</h1>
          <p className="sub anim-up d2">
            Train against AI versions of legendary salespeople, CEOs, difficult prospects, and
            real-world buyers. Get instant coaching after every call.
          </p>
          <div className="hero-ctas anim-up d3">
            <Link to="/auth" className="btn btn-gold btn-lg">Start Training <span aria-hidden="true">→</span></Link>
            <Link to="/app/simulator" className="btn btn-ghost btn-lg">▶ Watch Demo</Link>
          </div>
          <div className="hero-proof anim-up d4">
            <div><b className="gold-text">21+</b><small>AI opponents</small></div>
            <div><b className="gold-text">15</b><small>skills scored per call</small></div>
            <div><b className="gold-text">∞</b><small>custom scenarios</small></div>
            <div><b className="gold-text">29</b><small>academy modules</small></div>
          </div>
        </div>
        <div className="anim-in d3"><HeroPhone /></div>
      </section>

      <div className="marquee-section" aria-hidden="true">
        <div className="marquee">
          {[...MARQUEE, ...MARQUEE].map((m, i) => <span key={i}>◆ &nbsp;{m}</span>)}
        </div>
      </div>

      <section className="land-section" id="features">
        <SectionTitle
          center eyebrow="The Platform"
          title={<>Everything between you and <span className="gold-text">elite</span>.</>}
          sub="Not a course. A training ground — live reps, brutal feedback, measurable improvement."
        />
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`card feature-card card-hover anim-up d${(i % 3) + 1}`}>
              <span className="feature-ic">{f.ic}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section" id="characters" style={{ paddingTop: 0 }}>
        <SectionTitle
          eyebrow="The Roster"
          title="Pick your opponent."
          sub="From patient mentors to prospects who hang up in eight seconds. Every character has a temperament, an objection style, and a breaking point."
        />
        <div className="char-strip">
          {CHARACTERS.slice(0, 12).map((c) => (
            <Link to="/app/characters" key={c.id} className="card char-tile card-hover">
              <span className="big">{c.emoji}</span>
              <b>{c.name}</b>
              <small>{c.title} · {c.industry}</small>
              <span className={`chip ${c.difficulty >= 5 ? 'crit' : c.difficulty >= 4 ? 'warn' : 'gold'}`} style={{ marginTop: 4 }}>
                {['', 'Warm-up', 'Easy', 'Medium', 'Hard', 'Brutal'][c.difficulty]}
              </span>
            </Link>
          ))}
          <Link to="/app/characters" className="card char-tile card-hover" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <span className="big">＋</span>
            <b>{CHARACTERS.length - 12} more</b>
            <small>plus custom builder</small>
          </Link>
        </div>
      </section>

      <section className="land-section" id="how" style={{ paddingTop: 0 }}>
        <SectionTitle center eyebrow="How it works" title="Three minutes to your first rep." />
        <div className="steps">
          {STEPS.map((s) => (
            <div key={s.title} className="card step-card card-hover">
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section" style={{ paddingTop: 0 }}>
        <p className="quote-band">
          “Amateurs practice on <em>prospects</em>.<br />Professionals practice on <em>machines that never forget</em>.”
        </p>
      </section>

      <section className="land-section" id="pricing" style={{ paddingTop: 0 }}>
        <SectionTitle center eyebrow="Pricing" title="Start free. Go elite." />
        <PricingCards />
      </section>

      <section className="land-section" style={{ paddingTop: 0 }}>
        <div className="cta-panel">
          <h2>Your next call is <span className="gold-text">watching</span>.</h2>
          <p>Five minutes a day. Measurable improvement every week.</p>
          <Link to="/auth" className="btn btn-gold btn-lg">Start Training Free</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <div className="row" style={{ gap: 9, marginBottom: 12 }}>
            <span className="logo-mark" style={{ width: 28, height: 28, fontSize: 14 }}>C</span>
            <b style={{ color: 'var(--ink-0)' }}>Closer</b>
          </div>
          <p style={{ maxWidth: 260 }}>The training ground for elite communicators. Where closers are made, one call at a time.</p>
        </div>
        <div className="cols">
          <div>
            <h5>Product</h5>
            <a href="#features">Simulator</a><a href="#characters">Characters</a>
            <Link to="/app/academy">Academy</Link><Link to="/pricing">Pricing</Link>
          </div>
          <div>
            <h5>Train</h5>
            <Link to="/app/challenges">Challenges</Link><Link to="/app/scenarios">Scenario Lab</Link>
            <Link to="/app/daily">Daily Drills</Link><Link to="/app/community">Leaderboard</Link>
          </div>
          <div>
            <h5>Company</h5>
            <a href="#how">About</a><a href="#pricing">Careers</a><a href="#features">Press</a><a href="#characters">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
