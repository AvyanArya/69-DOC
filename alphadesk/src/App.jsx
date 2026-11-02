import React, { useEffect } from 'react';
import { useApi } from './api.js';
import { useStored } from './store.js';
import { Icon, useRoute, Change } from './components/ui.jsx';
import SearchBox from './components/SearchBox.jsx';
import Today from './pages/Today.jsx';
import Stock from './pages/Stock.jsx';
import Markets from './pages/Markets.jsx';
import Topics from './pages/Topics.jsx';
import Topic from './pages/Topic.jsx';
import Plan from './pages/Plan.jsx';
import Portfolio from './pages/Portfolio.jsx';
import Ask from './pages/Ask.jsx';
import { price } from './format.js';

const NAV = [
  { path: '', label: 'Today', icon: 'today' },
  { path: 'topics', label: 'Topics', icon: 'gem' },
  { path: 'markets', label: 'Markets', icon: 'markets' },
  { path: 'plan', label: 'Game Plan', short: 'Plan', icon: 'plan' },
  { path: 'portfolio', label: 'My Portfolio', short: 'Portfolio', icon: 'portfolio' },
  { path: 'ask', label: 'Ask AI', short: 'Ask AI', icon: 'ai' },
];

export default function App() {
  const route = useRoute();
  const [theme, setTheme] = useStored('themeChoice', null);
  const status = useApi('/api/status', { ttl: 60 * 1000 });
  const briefing = useApi('/api/briefing', { ttl: 10 * 60 * 1000 });

  useEffect(() => {
    if (theme) {
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem('alphadesk:theme', theme); } catch { /* ignore */ }
    }
  }, [theme]);
  const isLight = (theme || document.documentElement.dataset.theme) === 'light';

  const [page, arg] = route.parts;
  let view;
  if (page === 'stock' && arg) view = <Stock symbol={arg.toUpperCase()} status={status.data} />;
  else if (page === 'topic' && arg) view = <Topic topicKey={arg} />;
  else if (page === 'topics') view = <Topics briefing={briefing} />;
  else if (page === 'markets') view = <Markets briefing={briefing} />;
  else if (page === 'plan') view = <Plan briefing={briefing} />;
  else if (page === 'portfolio') view = <Portfolio query={route.query} />;
  else if (page === 'ask') view = <Ask status={status.data} query={route.query} />;
  else view = <Today briefing={briefing} status={status.data} />;

  const active = page === 'stock' ? null : page === 'topic' ? 'topics' : page || '';
  return (
    <div className="shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <a className="brand" href="#/">
            <span className="brand-mark"><Icon name="today" size={17} stroke={2.6} /></span>
            <span className="word">AlphaDesk <small>6-week challenge copilot</small></span>
          </a>
          <SearchBox />
          <nav className="nav">
            {NAV.map((n) => (
              <a key={n.path} href={`#/${n.path}`} className={active === n.path ? 'active' : ''}>{n.label}</a>
            ))}
          </nav>
          <div className="topbar-right">
            <button className="icon-btn" title="Toggle theme" onClick={() => setTheme(isLight ? 'dark' : 'light')}>
              <Icon name={isLight ? 'moon' : 'sun'} size={17} />
            </button>
          </div>
        </div>
      </header>
      <TickerStrip indices={briefing.data?.indices} />
      {status.data?.preview && (
        <div className="container" style={{ paddingTop: 14 }}>
          <div className="notice info"><Icon name="info" /><div><b>Offline preview.</b> Real market data captured {new Date(status.data.generatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. Prices are frozen, search covers the {Object.keys(window.__ALPHADESK_SNAPSHOT__.stocks).length} tickers in the snapshot, and the AI agent is off. Run the full app for live data.</div></div>
        </div>
      )}
      {status.data?.demo && (
        <div className="container" style={{ paddingTop: 14 }}>
          <div className="notice warn"><Icon name="info" /><div><b>Demo data.</b> DEMO_DATA is on, so all prices are randomly generated samples. Turn it off to see the real market.</div></div>
        </div>
      )}
      <main className="container">{view}</main>
      <footer className="footer">
        <div className="container">
          AlphaDesk is a personal research tool for a virtual-money challenge. Scores and AI picks are educational signals, not financial advice. Data: Yahoo Finance &amp; Google News (may be delayed).
        </div>
      </footer>
      <nav className="bottom-nav">
        {NAV.map((n) => (
          <a key={n.path} href={`#/${n.path}`} className={active === n.path ? 'active' : ''}><Icon name={n.icon} size={20} />{n.short || n.label}</a>
        ))}
      </nav>
    </div>
  );
}

function TickerStrip({ indices }) {
  if (!indices) return <div className="ticker-strip"><div className="container" /></div>;
  return (
    <div className="ticker-strip">
      <div className="container">
        {indices.map((i) => (
          <a className="tick" key={i.symbol} href={`#/stock/${encodeURIComponent(i.symbol)}`}>
            <span className="tname">{i.name}</span>
            <span className="tprice">{price(i.price)}</span>
            <Change value={i.changePct} raw />
          </a>
        ))}
      </div>
    </div>
  );
}
