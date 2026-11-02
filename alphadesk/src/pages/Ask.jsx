import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { useStored, usePortfolio, positionsFrom, useSettings } from '../store.js';
import { Icon, Markdown } from '../components/ui.jsx';

const SUGGESTIONS = [
  'What is the single best stock to buy today for a 6-week challenge, and why?',
  'Which sector has the most momentum right now and how should I play it?',
  'Should I buy gold, oil, copper or bitcoin right now?',
  'I am behind by 5% after 3 weeks - how should I change my strategy?',
  'Review my portfolio: what should I sell, add to, or change today?',
  'Give me 3 swing trade ideas for this week with entries and stops.',
];

export default function Ask({ status, query = {} }) {
  const [chat, setChat] = useStored('chat', []);
  const [trades] = usePortfolio();
  const [settings] = useSettings();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const log = useRef(null);
  const sentPreset = useRef(false);

  const portfolio = useMemo(() => {
    const { open, cashFlow, realized } = positionsFrom(trades);
    return {
      startingCapital: settings.capital, challengeStart: settings.startDate, riskProfile: settings.profile,
      cash: Math.round(settings.capital + cashFlow), realizedPnL: Math.round(realized),
      positions: open.map((p) => ({ symbol: p.symbol, shares: p.shares, avgCost: Math.round(p.avg * 100) / 100 })),
    };
  }, [trades, settings]);

  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }); }, [chat, busy]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    setInput('');
    setErr(null);
    const history = chat.slice(-8);
    setChat((c) => [...c, { role: 'user', content: question }]);
    setBusy(true);
    try {
      const res = await api('/api/ai/ask', { method: 'POST', body: { question, history, portfolio } });
      setChat((c) => [...c, { role: 'assistant', content: res.answer }]);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  };

  useEffect(() => {
    if (query.q && status?.ai && !sentPreset.current) {
      sentPreset.current = true;
      send(query.q);
      window.history.replaceState(null, '', '#/ask');
    } else if (query.q && !input) {
      setInput(query.q);
    }
  }, [query.q, status?.ai]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Ask the AlphaDesk agent</h1>
          <p>It can run the market scan, analyse any ticker, read the news and search the web - and it knows your portfolio.</p>
        </div>
        {chat.length > 0 && <button className="btn ghost" onClick={() => setChat([])}><Icon name="trash" size={15} />Clear chat</button>}
      </div>

      {status && !status.ai && (
        <div className="notice info">
          <Icon name="info" />
          <div>
            <b>AI is off.</b> Add <code className="inline">ANTHROPIC_API_KEY</code> to a <code className="inline">.env</code> file (or your Vercel environment variables) and restart to chat with the agent. Every other page works without it.
          </div>
        </div>
      )}

      <div className="card chat">
        <div className="chat-log" ref={log}>
          {!chat.length && (
            <div className="empty" style={{ margin: 'auto 0' }}>
              <div className="big">✨</div>
              <div style={{ marginBottom: 16 }}>Ask anything about stocks, sectors, commodities or your strategy.</div>
              <div className="suggest" style={{ justifyContent: 'center' }}>
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} disabled={!status?.ai}>{s}</button>)}
              </div>
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>{m.role === 'assistant' ? <Markdown text={m.content} /> : m.content}</div>
          ))}
          {busy && <div className="msg assistant"><div className="thinking"><span className="pulse" />Researching… (checking data, news and the web)</div></div>}
          {err && <div className="notice down small"><Icon name="info" size={16} />{err}</div>}
        </div>
        <div className="chat-input">
          <textarea
            value={input}
            placeholder={status?.ai ? 'e.g. Is NVDA still a buy after its run?' : 'Add an API key to enable chat'}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={!status?.ai}
          />
          <button className="btn primary" style={{ height: 46 }} onClick={() => send()} disabled={busy || !input.trim() || !status?.ai}><Icon name="send" size={16} />Send</button>
        </div>
      </div>
    </div>
  );
}
