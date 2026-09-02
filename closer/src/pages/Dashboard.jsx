// Compact dashboard: everything important in one dense, scannable view.
import { Link } from 'react-router-dom'
import { useProfile } from '../components/AppShell.jsx'
import { Card, Ring, Meter } from '../components/ui.jsx'
import { TrendChart, RadarChart } from '../components/charts.jsx'
import { levelFromXp, rankForLevel, nextRank } from '../lib/xp.js'
import { fmtHours, fmtDuration, fmtDate, dayKey } from '../lib/format.js'
import { getCharacter } from '../data/characters.js'
import { updateProfile } from '../lib/storage.js'

const SKILL_AXES = [
  ['confidence', 'Confidence'], ['tonality', 'Tonality'], ['listening', 'Listening'],
  ['questionQuality', 'Questions'], ['objectionHandling', 'Objections'],
  ['closingAbility', 'Closing'], ['rapport', 'Rapport'], ['control', 'Control'],
]

function MiniStat({ label, value, sub, tone }) {
  return (
    <div className="mini-stat">
      <span className="mini-label">{label}</span>
      <span className={`mini-value ${tone || ''}`}>{value}</span>
      {sub && <span className="mini-sub">{sub}</span>}
    </div>
  )
}

export default function Dashboard() {
  const profile = useProfile()
  const calls = profile.calls
  const { level, into, next } = levelFromXp(profile.xp)
  const rank = rankForLevel(level)
  const nRank = nextRank(level)

  const totalSec = calls.reduce((s, c) => s + c.durationSec, 0)
  const avgScore = calls.length ? Math.round(calls.reduce((s, c) => s + c.overall, 0) / calls.length) : 0
  const last7 = calls.filter((c) => Date.now() - c.ts < 7 * 86400000)
  const prev7 = calls.filter((c) => Date.now() - c.ts >= 7 * 86400000 && Date.now() - c.ts < 14 * 86400000)
  const wAvg = (arr) => (arr.length ? arr.reduce((s, c) => s + c.overall, 0) / arr.length : 0)
  const weeklyDelta = Math.round(wAvg(last7) - wAvg(prev7))

  const trendData = calls.slice(-14).map((c) => ({ label: fmtDate(c.ts), y: c.overall }))
  const radarAxes = SKILL_AXES.map(([key, label]) => {
    const recent = calls.slice(-6)
    const v = recent.length ? Math.round(recent.reduce((s, c) => s + (c.scores?.[key] ?? 50), 0) / recent.length) : 50
    return { label, value: v }
  })

  const lastCall = calls[calls.length - 1]
  const trainedToday = profile.streak.lastDay === dayKey(Date.now())
  const goalsDone = profile.goals.filter((g) => g.done).length

  return (
    <div className="page-enter dash">
      <div className="dash-head">
        <div>
          <h1>Welcome back, {profile.user.name.split(' ')[0]}.</h1>
          <p>{trainedToday ? 'Session logged today. Keep the streak alive tomorrow.' : 'Your streak is on the line. One call keeps it alive.'}</p>
        </div>
        <Link to="/app/simulator" className="btn btn-gold">📞 Start a Call</Link>
      </div>

      {/* One dense stat strip */}
      <div className="stat-strip">
        <MiniStat label="Streak" value={<span>🔥 {profile.streak.current}</span>} sub={`best ${profile.streak.best}`} />
        <MiniStat label="Hours" value={fmtHours(totalSec) + 'h'} sub={`${calls.length} calls`} />
        <MiniStat label="Avg score" value={avgScore} sub={weeklyDelta >= 0 ? `↑ +${weeklyDelta} wk` : `↓ ${weeklyDelta} wk`} tone="gold-text" />
        <MiniStat label="This week" value={last7.length} sub="calls" />
        <MiniStat label="Goals" value={`${goalsDone}/${profile.goals.length}`} sub="done" />
        <MiniStat label="Rank" value={<span>{rank.icon}</span>} sub={rank.name} />
      </div>

      <div className="dash-grid">
        {/* Left: trend + radar */}
        <div className="dash-col">
          <Card className="pad">
            <div className="row between" style={{ marginBottom: 10 }}>
              <h3 className="card-title">Score trend</h3>
              <Link to="/app/analytics" className="btn btn-ghost btn-sm">Analytics →</Link>
            </div>
            <TrendChart series={[{ name: 'Overall score', data: trendData }]} height={168} />
          </Card>
          <Card className="pad">
            <div className="row between" style={{ marginBottom: 4 }}>
              <h3 className="card-title">Skills radar</h3>
              <span className="muted" style={{ fontSize: 11.5 }}>last 6 calls</span>
            </div>
            <RadarChart axes={radarAxes} size={300} />
          </Card>
        </div>

        {/* Right rail */}
        <div className="dash-col">
          <Card className="pad rank-card">
            <div className="row" style={{ gap: 16 }}>
              <Ring value={(into / next) * 100} label={`Lv ${level}`} sublabel={rank.name} size={104} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14 }}>{rank.icon} <b>{rank.name}</b></div>
                <div className="muted" style={{ fontSize: 12, margin: '2px 0 8px' }}>
                  {into.toLocaleString()} / {next.toLocaleString()} XP
                </div>
                {nRank && <div className="muted" style={{ fontSize: 11.5 }}>Next: {nRank.icon} {nRank.name} · Lv {nRank.minLevel}</div>}
                <div style={{ marginTop: 8 }}><Meter value={(into / next) * 100} thin /></div>
              </div>
            </div>
          </Card>

          {lastCall && (
            <Card className="pad">
              <h3 className="card-title" style={{ marginBottom: 10 }}>Last call</h3>
              <div className="row" style={{ gap: 12, marginBottom: 10 }}>
                <span className="char-emoji" style={{ width: 44, height: 44, fontSize: 22 }}>{getCharacter(lastCall.characterId).emoji}</span>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 14 }}>{getCharacter(lastCall.characterId).name}</b>
                  <div className="muted" style={{ fontSize: 12 }}>{fmtDate(lastCall.ts)} · {fmtDuration(lastCall.durationSec)}</div>
                </div>
                <Ring value={lastCall.overall} size={52} stroke={5} />
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Link to={`/app/review/${lastCall.id}`} className="btn btn-dark btn-sm" style={{ flex: 1 }}>Review</Link>
                <Link to="/app/simulator" className="btn btn-gold btn-sm" style={{ flex: 1 }}>Rematch</Link>
              </div>
            </Card>
          )}

          <Card className="pad">
            <div className="row between" style={{ marginBottom: 10 }}>
              <h3 className="card-title">Weekly goals</h3>
              <span className="chip gold" style={{ fontSize: 11 }}>{goalsDone}/{profile.goals.length}</span>
            </div>
            {profile.goals.map((g) => (
              <button
                key={g.id} className="goal-row" style={{ width: '100%', textAlign: 'left', padding: '7px 0' }}
                onClick={() => updateProfile((p) => { const goal = p.goals.find((x) => x.id === g.id); if (goal) goal.done = !goal.done })}
              >
                <span className={`goal-check ${g.done ? 'done' : ''}`}>✓</span>
                <span className={g.done ? 'done-text' : ''} style={{ fontSize: 13 }}>{g.text}</span>
              </button>
            ))}
          </Card>

          <div className="quick-actions">
            <Link to="/app/daily" className="quick-action"><span>⚡</span>Daily drills</Link>
            <Link to="/app/arena" className="quick-action"><span>🎙️</span>Live Arena</Link>
            <Link to="/app/coach" className="quick-action"><span>🧠</span>Ask coach</Link>
            <Link to="/app/academy" className="quick-action"><span>🎓</span>Academy</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
