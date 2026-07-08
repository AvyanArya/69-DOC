// Progress dashboard: streak, XP, trend, radar, activity, goals.
import { Link } from 'react-router-dom'
import { useProfile } from '../components/AppShell.jsx'
import { Card, Stat, Meter, Ring } from '../components/ui.jsx'
import { TrendChart, RadarChart, ActivityHeatmap } from '../components/charts.jsx'
import { levelFromXp, rankForLevel, nextRank, RANKS } from '../lib/xp.js'
import { fmtHours, fmtDuration, fmtDate, dayKey } from '../lib/format.js'
import { getCharacter } from '../data/characters.js'
import { updateProfile } from '../lib/storage.js'

const SKILL_AXES = [
  ['confidence', 'Confidence'], ['tonality', 'Tonality'], ['listening', 'Listening'],
  ['questionQuality', 'Questions'], ['objectionHandling', 'Objections'],
  ['closingAbility', 'Closing'], ['rapport', 'Rapport'], ['control', 'Control'],
]

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
  const last30 = calls.filter((c) => Date.now() - c.ts < 30 * 86400000)
  const prev30 = calls.filter((c) => Date.now() - c.ts >= 30 * 86400000 && Date.now() - c.ts < 60 * 86400000)
  const monthlyDelta = prev30.length ? Math.round(wAvg(last30) - wAvg(prev30)) : weeklyDelta

  const longest = calls.reduce((m, c) => Math.max(m, c.durationSec), 0)
  const hardestBeaten = calls
    .filter((c) => c.overall >= 70 || c.outcome === 'closed')
    .map((c) => getCharacter(c.characterId))
    .sort((a, b) => b.difficulty - a.difficulty)[0]

  const trendData = calls.slice(-14).map((c) => ({ label: fmtDate(c.ts), y: c.overall }))
  const radarAxes = SKILL_AXES.map(([key, label]) => {
    const recent = calls.slice(-6)
    const v = recent.length ? Math.round(recent.reduce((s, c) => s + (c.scores?.[key] ?? 50), 0) / recent.length) : 50
    return { label, value: v }
  })

  const dayCounts = new Map()
  for (const c of calls) {
    const k = dayKey(c.ts)
    dayCounts.set(k, (dayCounts.get(k) || 0) + 1)
  }

  const lastCall = calls[calls.length - 1]
  const trainedToday = profile.streak.lastDay === dayKey(Date.now())

  return (
    <div className="page-enter">
      <div className="main-header row between wrap">
        <div>
          <h1>Welcome back, {profile.user.name.split(' ')[0]}.</h1>
          <p>{trainedToday ? 'Session logged today, keep the streak alive tomorrow.' : 'Your streak is on the line. One call keeps it alive.'}</p>
        </div>
        <Link to="/app/simulator" className="btn btn-gold">📞 Start a Call</Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Stat label="Current streak" value={<span><span className="streak-flame">🔥</span> {profile.streak.current} days</span>} sub={`Best: ${profile.streak.best} days`} />
        <Stat label="Hours trained" value={fmtHours(totalSec) + 'h'} sub={`${calls.length} calls completed`} icon="⏱️" />
        <Stat label="Average score" value={avgScore} sub={weeklyDelta >= 0 ? `↑ +${weeklyDelta} this week` : `↓ ${weeklyDelta} this week`} icon="🎯" accent />
        <Stat label="Monthly improvement" value={(monthlyDelta >= 0 ? '+' : '') + monthlyDelta} sub="avg score vs last month" icon="📈" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: 16 }}>
        <Card className="pad">
          <div className="row between" style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 15.5 }}>Score trend, last {trendData.length} calls</h3>
            <Link to="/app/analytics" className="btn btn-ghost btn-sm">Full analytics →</Link>
          </div>
          <TrendChart series={[{ name: 'Overall score', data: trendData }]} height={210} />
        </Card>
        <Card className="pad">
          <h3 style={{ fontSize: 15.5, marginBottom: 8 }}>Rank progress</h3>
          <div className="col" style={{ alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <Ring value={(into / next) * 100} label={`Lv ${level}`} sublabel={rank.name} size={130} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13.5 }}>{rank.icon} <b>{rank.name}</b></div>
              <div className="muted" style={{ fontSize: 12 }}>
                {into.toLocaleString()} / {next.toLocaleString()} XP
                {nRank && <> · next: {nRank.icon} {nRank.name} at Lv {nRank.minLevel}</>}
              </div>
            </div>
            <div style={{ width: '100%' }}>
              <div className="row between" style={{ fontSize: 11, color: 'var(--ink-2)', marginBottom: 4 }}>
                <span>Rank ladder</span><span>{RANKS.findIndex((r) => r.name === rank.name) + 1}/{RANKS.length}</span>
              </div>
              <Meter value={((RANKS.findIndex((r) => r.name === rank.name) + 1) / RANKS.length) * 100} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', marginBottom: 16 }}>
        <Card className="pad">
          <h3 style={{ fontSize: 15.5, marginBottom: 4 }}>Skills radar</h3>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Average of your last 6 calls</p>
          <RadarChart axes={radarAxes} size={320} />
        </Card>
        <div className="col">
          <Card className="pad">
            <h3 style={{ fontSize: 15.5, marginBottom: 12 }}>Training activity</h3>
            <ActivityHeatmap days={dayCounts} />
          </Card>
          <div className="grid grid-3">
            <Stat label="Longest call" value={fmtDuration(longest)} icon="🗣️" />
            <Stat label="Toughest win" value={hardestBeaten ? hardestBeaten.emoji : ', '} sub={hardestBeaten ? hardestBeaten.name : 'No wins yet'} icon="⚔️" />
            <Stat label="Fastest gain" value="Objections" sub="+11 in 2 weeks" icon="🚀" />
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <Card className="pad">
          <div className="row between" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 15.5 }}>Weekly goals</h3>
            <span className="chip gold">{profile.goals.filter((g) => g.done).length}/{profile.goals.length} done</span>
          </div>
          {profile.goals.map((g) => (
            <button
              key={g.id} className="goal-row" style={{ width: '100%', textAlign: 'left' }}
              onClick={() => updateProfile((p) => { const goal = p.goals.find((x) => x.id === g.id); if (goal) goal.done = !goal.done })}
            >
              <span className={`goal-check ${g.done ? 'done' : ''}`}>✓</span>
              <span className={g.done ? 'done-text' : ''}>{g.text}</span>
            </button>
          ))}
          <div style={{ marginTop: 14 }}>
            <h4 style={{ fontSize: 13, marginBottom: 10, color: 'var(--ink-1)' }}>Habit tracker · this week</h4>
            {Object.entries(profile.habits).map(([habit, days]) => (
              <div key={habit} className="row between" style={{ padding: '6px 0' }}>
                <span style={{ fontSize: 13 }}>{habit === 'daily-call' ? '📞 One call a day' : '⚡ 5-minute drill'}</span>
                <span className="habit-dots">{days.map((d, i) => <i key={i} className={d ? 'on' : ''} />)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="pad">
          <div className="row between" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 15.5 }}>Last call</h3>
            {lastCall && <Link to={`/app/review/${lastCall.id}`} className="btn btn-ghost btn-sm">Open review →</Link>}
          </div>
          {lastCall ? (
            <div className="col" style={{ gap: 12 }}>
              <div className="row" style={{ gap: 14 }}>
                <span className="char-emoji">{getCharacter(lastCall.characterId).emoji}</span>
                <div>
                  <b style={{ fontSize: 15 }}>{getCharacter(lastCall.characterId).name}</b>
                  <div className="muted" style={{ fontSize: 12.5 }}>{fmtDate(lastCall.ts)} · {fmtDuration(lastCall.durationSec)}</div>
                </div>
                <span className="spacer" />
                <Ring value={lastCall.overall} size={64} stroke={6} />
              </div>
              <div className="col" style={{ gap: 8 }}>
                {Object.entries(lastCall.scores).slice(0, 4).map(([k, v]) => (
                  <div key={k} className="row" style={{ gap: 10 }}>
                    <span style={{ fontSize: 12, width: 110, color: 'var(--ink-1)', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                    <div style={{ flex: 1 }}><Meter value={v} thin /></div>
                    <span className="mono" style={{ fontSize: 12, width: 26, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
              <Link to="/app/simulator" className="btn btn-dark btn-block btn-sm">Rematch {getCharacter(lastCall.characterId).name} →</Link>
            </div>
          ) : (
            <p className="muted">No calls yet, hit the simulator.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
