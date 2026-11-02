import React, { useMemo, useState } from 'react';
import { price } from '../format.js';
import { Icon, Change, LoadingCards, ErrorBox, scoreColor, go } from '../components/ui.jsx';
import { Sparkline } from '../components/charts.jsx';

const GROUPS = ['All', 'Sectors', 'Themes', 'Commodities & Crypto'];

export function HeatBadge({ heat }) {
  if (!heat) return null;
  return <span className={`badge ${heat.tone === 'up' ? 'up' : heat.tone === 'down' ? 'down' : 'neutral'}`}><span className="dot" />{heat.label}</span>;
}

/** Topics index: every area of the market, ranked by growth. */
export default function Topics({ briefing }) {
  const { data: b, error, loading, reload } = briefing;
  const [group, setGroup] = useState('All');
  const list = useMemo(() => (b?.topics || []).filter((t) => group === 'All' || t.group === group).sort((x, y) => x.rank - y.rank), [b, group]);
  if (!b && loading) return <LoadingCards />;
  if (!b && error) return <ErrorBox error={error} onRetry={reload} />;
  if (!b) return null;
  const hot = [...b.topics].sort((x, y) => x.rank - y.rank).slice(0, 3);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Topics</h1>
          <p>Every area of the market has its own page: how it's doing, the best pick inside it, why, and the news driving it.</p>
        </div>
      </div>

      <div className="notice up">
        <Icon name="fire" />
        <div><b>Hottest right now:</b>{' '}
          {hot.map((t, i) => (
            <span key={t.key}>{i > 0 && ', '}<a href={`#/topic/${t.key}`} className="bold" style={{ textDecoration: 'underline' }}>{t.name}</a> <Change value={t.ret21} /> (1M)</span>
          ))}
        </div>
      </div>

      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <div className="chip-group">
          {GROUPS.map((g) => <button key={g} className={group === g ? 'active' : ''} onClick={() => setGroup(g)}>{g}</button>)}
        </div>
        <span className="faint small">{list.length} topics · ranked by growth (1 week, 1 month and 3 months)</span>
      </div>

      <div className="topic-grid">
        {list.map((t) => (
          <a key={t.key} className="topic-card" href={`#/topic/${t.key}`}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="tiny faint bold" style={{ letterSpacing: '0.05em' }}>#{t.rank} · {t.group.toUpperCase()}</span>
              <HeatBadge heat={t.heat} />
            </div>
            <div className="topic-name">{t.name}</div>
            <p className="topic-blurb">{t.blurb}</p>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
              <div className="row" style={{ gap: 14 }}>
                <div><div className="tiny faint bold">1W</div><Change value={t.ret5} className="small bold" /></div>
                <div><div className="tiny faint bold">1M</div><Change value={t.ret21} className="small bold" /></div>
                <div><div className="tiny faint bold">3M</div><Change value={t.ret63} className="small bold" /></div>
              </div>
              <Sparkline values={t.etf.spark} width={84} height={30} />
            </div>
            <div className="topic-pick">
              <span className="faint small">Best pick</span>
              <b>{t.topPick.symbol}</b>
              <span className="small faint num">${price(t.topPick.price)}</span>
              <span className="num bold small" style={{ marginLeft: 'auto', color: scoreColor(t.topPick.score) }}>{t.topPick.score}</span>
              <span className="small muted">{t.topPick.signal.label}</span>
            </div>
          </a>
        ))}
      </div>
      <p className="tiny faint" style={{ margin: 0 }}>Each topic is tracked through an ETF (shown on its page). <span className="bold">Hot</span> = top 20% by growth · <span className="bold">Warming</span> = growing · <span className="bold">Cooling</span> = slipping but up over 3 months · <span className="bold">Cold</span> = money flowing out.</p>
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => go('markets')}>See the sector tables<Icon name="arrow" size={14} /></button>
    </div>
  );
}
