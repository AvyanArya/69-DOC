import React from 'react';
import { useApi } from '../api.js';
import { price, pct } from '../format.js';
import { useSettings } from '../store.js';
import { Icon, Change, NewsList, ErrorBox, Skeleton, go, stockPath } from '../components/ui.jsx';
import { Sparkline } from '../components/charts.jsx';
import { TopPick, TopTable } from './Today.jsx';
import { HeatBadge } from './Topics.jsx';

/** Plain-English "how to play it" based on how hot the topic is and how good its best pick is. */
function playbook(t) {
  const p = t.topPick, etf = t.etf.symbol;
  const pickName = p.symbol === etf ? etf : `${p.symbol}`;
  if (t.heat.label === 'Hot' && p.score >= 62) {
    return { tone: 'up', title: 'Lean in', text: `One of the strongest areas right now. A 10-15% slice of the account fits here: ${pickName} for the most upside${p.symbol !== etf ? `, or ${etf} to own the whole area with less single-stock risk` : ''}. Use the stop-loss shown below.` };
  }
  if ((t.heat.label === 'Hot' || t.heat.label === 'Warming') && p.score >= 55) {
    return { tone: 'up', title: 'Start small, add on strength', text: `Momentum is building. Start with a half position (5-8%) in ${pickName}${p.symbol !== etf ? ` or ${etf}` : ''} and add if it keeps rising over the next week.` };
  }
  if (t.heat.label === 'Cooling') {
    return { tone: 'neutral', title: 'Hold, don\'t add', text: `This area is losing steam. Keep what you own with tight stops, but don't put new money in until it turns "Warming" again.` };
  }
  if (p.score >= 70) {
    return { tone: 'neutral', title: 'Only the leader', text: `The area overall is weak, but ${p.symbol} is bucking the trend. If you want exposure, buy only that name - not the ${etf} ETF - and keep the position small.` };
  }
  return { tone: 'down', title: 'Avoid for now', text: `Money is flowing out of this area. Check back when it turns "Warming" - there are better places for your $100k today.` };
}

export default function Topic({ topicKey }) {
  const [settings] = useSettings();
  const { data: t, error, loading, reload } = useApi(`/api/topic?key=${encodeURIComponent(topicKey)}`, { ttl: 10 * 60 * 1000 });

  if (loading && !t) {
    return (
      <div className="stack">
        <Back />
        <div className="card"><Skeleton h={18} w="20%" /><Skeleton h={36} w="40%" style={{ marginTop: 10 }} /><Skeleton h={14} w="70%" style={{ marginTop: 12 }} /></div>
        <div className="grid"><div className="card span-8"><Skeleton h={300} /></div><div className="card span-4"><Skeleton h={300} /></div></div>
      </div>
    );
  }
  if (error && !t) return <div className="stack"><Back /><ErrorBox error={error} onRetry={reload} /></div>;
  if (!t) return null;

  const play = playbook(t);
  const noBuy = t.topPick.score < 55;

  return (
    <div className="stack">
      <Back />
      <div className="card hero">
        <div className="row wrap" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 }}>
          <div style={{ minWidth: 0, flex: '1 1 380px' }}>
            <div className="eyebrow"><Icon name="markets" size={15} />{t.group} · Topic</div>
            <div className="row wrap" style={{ gap: 12, marginTop: 8 }}>
              <h1 style={{ margin: 0, fontSize: 34, letterSpacing: '-0.03em' }}>{t.name}</h1>
              <HeatBadge heat={t.heat} />
              <span className="badge plain">#{t.rank} of {t.of} by growth</span>
            </div>
            <p className="muted" style={{ margin: '10px 0 0', fontSize: 15 }}>{t.blurb}</p>
          </div>
          <div className="topic-etf">
            <div className="tiny faint bold" style={{ letterSpacing: '0.05em' }}>TRACKED BY</div>
            <a href={`#/${stockPath(t.etf.symbol)}`} className="row" style={{ gap: 8 }}>
              <b style={{ fontSize: 18 }}>{t.etf.symbol}</b><span className="num">${price(t.etf.price)}</span><Change value={t.etf.changePct} raw className="small" />
            </a>
            <Sparkline values={t.etf.spark} width={190} height={44} />
            <div className="row" style={{ gap: 16 }}>
              <div><div className="tiny faint bold">1 WEEK</div><Change value={t.ret5} className="bold" /></div>
              <div><div className="tiny faint bold">1 MONTH</div><Change value={t.ret21} className="bold" /></div>
              <div><div className="tiny faint bold">3 MONTHS</div><Change value={t.ret63} className="bold" /></div>
            </div>
          </div>
        </div>
      </div>

      <div className={`notice ${play.tone === 'up' ? 'up' : play.tone === 'down' ? 'down' : 'warn'}`}>
        <Icon name="target" />
        <div><b>How to play it: {play.title}.</b> <span className="muted">{play.text}</span></div>
      </div>

      <div className="grid">
        <div className="span-8 stack">
          {noBuy && <div className="notice warn small"><Icon name="info" size={16} /><div>Nothing in {t.name} scores as a buy today. This is the strongest of the group - for reference, not a recommendation.</div></div>}
          <TopPick p={t.topPick} settings={settings} title={`Best pick in ${t.name}`} />
        </div>
        <div className="span-4 stack">
          <div className="card">
            <div className="card-head"><div className="card-title"><Icon name="fire" size={15} />What drives it</div></div>
            <ul className="reasons">{t.drivers.map((d) => <li key={d}><span className="ico up">↗</span>{d}</li>)}</ul>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title"><Icon name="shield" size={15} />What to watch</div></div>
            <ul className="reasons">{t.watch.map((d) => <li key={d}><span className="ico down">!</span>{d}</li>)}</ul>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-title">Topic scorecard</div></div>
            <div className="stats" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
              <div className="stat"><div className="lbl">ETF score</div><div className="val">{t.score}/100</div><div className="hint">{t.signal.label}</div></div>
              <div className="stat"><div className="lbl">Names that are buys</div><div className="val">{t.buyCount} of {t.members.length}</div><div className="hint">Score 62+</div></div>
              <div className="stat"><div className="lbl">News mood</div><div className={`val ${t.newsPulse.label === 'Positive' ? 'up' : t.newsPulse.label === 'Negative' ? 'down' : ''}`}>{t.newsPulse.label}</div><div className="hint">{t.newsPulse.bullish} up · {t.newsPulse.bearish} down</div></div>
              <div className="stat"><div className="lbl">Growth score</div><div className={`val ${t.growth >= 0 ? 'up' : 'down'}`}>{pct(t.growth)}</div><div className="hint">Blend of 1W/1M/3M</div></div>
            </div>
          </div>
        </div>

        {t.members.length > 0 && (
          <div className="span-12"><TopTable stocks={t.members} title={`Every pick in ${t.name}, ranked`} /></div>
        )}

        <div className={t.pickNews?.length ? 'span-6 card' : 'span-12 card'}>
          <div className="card-head"><div className="card-title"><Icon name="news" size={15} />News driving {t.name}</div><span className="badge plain">{t.newsPulse.label}</span></div>
          <NewsList items={t.news} limit={8} empty="No headlines in the last few days." />
        </div>
        {t.pickNews?.length > 0 && (
          <div className="span-6 card">
            <div className="card-head"><div className="card-title"><Icon name="news" size={15} />{t.topPick.symbol} news</div></div>
            <NewsList items={t.pickNews} limit={4} />
          </div>
        )}
      </div>
    </div>
  );
}

function Back() {
  return (
    <div className="row">
      <button className="btn sm ghost" onClick={() => go('topics')}><Icon name="back" size={15} />All topics</button>
    </div>
  );
}
