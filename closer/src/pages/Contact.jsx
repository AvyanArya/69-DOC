// Closer — "Get in touch" hero. Adapted from the Mainframe contact spec into
// Closer's dark cinematic glass theme. The reference's static person/face is
// replaced with a "someone speaking" motif: a live coach-on-the-line card with
// an animated speaking waveform. Native mouse-scrub video on desktop.
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Waveform } from '../components/phone/PhoneSim.jsx'

// Same cinematic clip the landing uses, so the UI stays cohesive.
const BG_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260729_102822_0e6c87e8-c141-4744-bf32-ad30db296371.mp4'

const SERVICE_OPTIONS = ['Solo rep', 'Sales team', 'Enterprise', 'Just exploring']

function Check({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
function Arrow({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/* Typewriter: iteratively builds the string. Returns { displayed, done }. */
function useTypewriter(text, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setDisplayed(''); setDone(false)
    let i = 0
    let interval
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1
        setDisplayed(text.slice(0, i))
        if (i >= text.length) { clearInterval(interval); setDone(true) }
      }, speed)
    }, startDelay)
    return () => { clearTimeout(start); clearInterval(interval) }
  }, [text, speed, startDelay])
  return { displayed, done }
}

export default function Contact() {
  const nav = useNavigate()
  const videoRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [services, setServices] = useState([])
  const { displayed, done } = useTypewriter("we'd love to\nhear from you!")

  // Video: desktop = mouse-scrub, mobile = normal autoplay.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (window.innerWidth < 1024) {
      video.autoplay = true; video.loop = true
      video.play?.().catch(() => {})
      return
    }
    let prevX = null
    let seeking = false
    const onMove = (e) => {
      if (window.innerWidth < 1024) return
      if (prevX === null) { prevX = e.clientX; return }
      const delta = e.clientX - prevX
      prevX = e.clientX
      const d = video.duration
      if (!d || Number.isNaN(d)) return
      const target = Math.min(d, Math.max(0, (video.currentTime || 0) + (delta / window.innerWidth) * 0.8 * d))
      if (!seeking) { seeking = true; try { video.currentTime = target } catch { /* seeking */ } }
    }
    const onSeeked = () => { seeking = false }
    video.addEventListener('seeked', onSeeked)
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); video.removeEventListener('seeked', onSeeked) }
  }, [])

  const toggle = (o) => setServices((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]))

  const NavLinks = ({ onClick }) => (
    <>
      <a href="#" onClick={onClick}>Labs</a>
      <Link to="/app/academy" onClick={onClick}>Studio</Link>
      <Link to="/pricing" onClick={onClick}>Pricing</Link>
      <Link to="/app" onClick={onClick}>Enter app</Link>
    </>
  )

  return (
    <div className="ct">
      {/* Background video */}
      <div className="ct-bg" aria-hidden="true">
        <video ref={videoRef} className="ct-video" src={BG_VIDEO} muted playsInline preload="auto" />
        <div className="ct-scrim" />
      </div>

      {/* Navbar */}
      <header className="ct-nav">
        <Link to="/" className="ct-logo">
          <span className="logo-mark">C</span>
          <b>Closer</b>
          <span className="ct-ast" aria-hidden="true">✳</span>
        </Link>
        <nav className="ct-links"><NavLinks /></nav>
        <Link to="/app" className="ct-cta-link">Enter the app</Link>
        <button className="ct-burger" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
          <span className={menuOpen ? 'open' : ''} /><span className={menuOpen ? 'open' : ''} /><span className={menuOpen ? 'open' : ''} />
        </button>
      </header>

      {/* Mobile overlay */}
      <div className={`ct-mobile ${menuOpen ? 'show' : ''}`}>
        <NavLinks onClick={() => setMenuOpen(false)} />
      </div>

      {/* Content */}
      <main className="ct-main">
        <div className="ct-content anim-up">
          <h1 className="ct-h1">
            {displayed}
            {!done && <span className="ct-cursor animate-blink" />}
          </h1>

          <p className="ct-desc anim-up d1">
            Whether you have questions, feedback, or a team to train —<br />
            drop us a message and we'll get back to you as fast as we close.
          </p>

          <div className="ct-service anim-up d2">
            <h2 className="ct-service-title">Who's this for?</h2>
            <p className="ct-service-sub">Select all that apply</p>

            <div className="ct-pills">
              {SERVICE_OPTIONS.map((o) => {
                const on = services.includes(o)
                return (
                  <button key={o} className={`ct-pill ${on ? 'on' : ''}`} onClick={() => toggle(o)} aria-pressed={on}>
                    {on && <span className="ct-pill-check"><Check /></span>}
                    {o}
                  </button>
                )
              })}
            </div>

            {/* Contingent banner */}
            <div className="ct-banner-wrap">
              {services.length === 0 ? (
                <p className="ct-placeholder">Please click to select who you are above.</p>
              ) : (
                <div className="ct-banner">
                  <div className="ct-banner-text">
                    <span className="ct-banner-label">Ready to talk about</span>
                    <b>{services.join(', ')}</b>
                  </div>
                  <button className="ct-go" onClick={() => nav('/app')}>
                    Let's go <Arrow />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* "Someone speaking" — a live coach on the line, not a static face */}
        <aside className="ct-speaking anim-in d2" aria-hidden="true">
          <div className="ct-speaking-card">
            <div className="ct-speaking-head">
              <span className="ct-live-dot" />
              <span>A real coach, on the line</span>
            </div>
            <Waveform active bars={30} />
            <div className="ct-speaking-cap">
              <span className="ct-speaking-name">Mitha · Head coach</span>
              <span className="ct-speaking-sub">“Let's hear your opener…”</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}
