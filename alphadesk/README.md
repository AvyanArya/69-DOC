# AlphaDesk: 6-Week Challenge Copilot

A personal stock research site for a **6-week, $100,000 stock market challenge**. Every day it scans
the market and tells you:

- **Today's top pick**, with a 0–100 score, a one-line "why", short reasons for and against, a buy zone, a stop-loss, a 6-week target and how many shares to buy.
- **The area with the most growth** (sector or theme), the best stocks inside it, and the news driving it.
- **Top-ranked stocks** across about 90 large and popular names. Click any of them for the full breakdown.
- **Commodities and crypto** (gold, silver, oil, copper, natural gas, bitcoin and more), with the ETF you'd actually buy for each.
- **Game plans**: Conservative, Balanced or Aggressive splits of your $100k across asset classes (core ETFs, momentum stocks, sector ETFs, commodities, swing trades, day trading, leveraged ETFs, crypto, cash). Each plan is filled with today's best tickers and comes with a week-by-week playbook.
- **Search** for any ticker or company name (stocks, ETFs, futures, crypto). You get a chart, key numbers, the score breakdown, news with sentiment, and a trade plan sized to your account.
- **My Portfolio**: log your trades and track your value, P&L and return against the S&P 500. Data is saved in your browser.
- **AI agent** (optional): a Claude-powered research agent. Each day it runs the scan, digs into the best names, checks live news and earnings dates on the web, and writes a briefing. It also does deep-dives on single stocks and has an "Ask AI" chat that knows your portfolio.

Everything except the AI works with **no API keys**. Market data comes from Yahoo Finance's public chart endpoints, and news comes from Yahoo Finance and Google News RSS.

---

## Just want to see it? Open `preview.html`

[`preview.html`](preview.html) is a single self-contained file. **Double-click it and it opens in your
browser.** No install, no terminal, no internet needed. It contains the whole app plus a snapshot of real
market data (about 100 tickers: the top-ranked stocks, every sector and theme ETF, and all commodities),
so you can click through every page: today's pick, stock pages, sectors, game plans and the portfolio tracker.

The preview's prices are frozen at the moment it was built, search only covers the tickers in the
snapshot, and the AI agent is off. To regenerate it with today's data, run `npm run build:preview`.

---

## Run it (2 minutes)

You need [Node.js 18+](https://nodejs.org).

```bash
cd alphadesk
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173). That's it.

### Turn on the AI agent (optional)

1. Get an API key at https://console.anthropic.com/
2. Copy `.env.example` to `.env` and fill it in:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart `npm run dev`.

The AI briefing then runs automatically once a day the first time you open the site, and is cached for the rest of the day. Use **Re-run research** to refresh it. Each run takes 1–3 minutes and makes several model calls plus a few web searches, so it costs a little each time. The default model is `claude-opus-5-5`. You can change it with `ALPHADESK_MODEL`.

## Deploy it (free) on Vercel

1. Push this repo to GitHub and import it at https://vercel.com/new.
2. Set **Root Directory** to `alphadesk`. The Vite framework preset is detected automatically.
3. (Optional) Add `ANTHROPIC_API_KEY` under **Settings → Environment Variables**.
4. Deploy. The `/api/*` routes run as serverless functions (`api/[...path].js`). `vercel.json` gives the AI route up to 300 seconds.

Alternatively, run it on any Node host with `npm run build && npm start` (serves on `PORT`, default 3000).

---

## How the score works

The AlphaDesk score is built for a **~6-week holding window**, where trend and momentum matter most. Every point is explained on the stock page:

| Part | Max | What it rewards |
|---|---|---|
| Trend | 25 | Price above its 20/50/200-day averages, and the averages stacked in the right order |
| Momentum | 30 | 1- and 3-month returns, and beating the S&P 500 over 3 months |
| RSI setup | 15 | RSI 50–68: strong but not overheated |
| Near highs | 15 | Within a few % of the 52-week high (leaders make new highs) |
| Volume | 8 | Rising volume on up days (big buyers stepping in) |
| Risk control | 7 | Volatility low enough to hold for 6 weeks |

**75+ = Strong Buy · 62+ = Buy · 48+ = Hold / Watch · 35+ = Weak · below = Avoid**

Trade levels use ATR (the stock's normal daily range):

- **Stop** = price − 2×ATR
- **Target** = 2.5× the risk above the price
- **Position size** is set so that hitting the stop costs 0.5% / 1% / 2% of your account (Conservative / Balanced / Aggressive), capped at 10% / 15% / 25% per position.

The "hottest area" ranks 11 sector ETFs and 12 theme ETFs (semiconductors, software, defense, uranium, gold miners…) by a blend of 1-week, 1-month and 3-month growth. The "market mood" (risk-on / cautious / risk-off) comes from the S&P 500's trend and the VIX. On risk-off days the plans automatically move 10% into cash.

## Project layout

```
alphadesk/
  lib/            server: data, scoring, plans, AI agent (shared by dev, npm start and Vercel)
    yahoo.js      price history, batch quotes, search (cached)
    news.js       RSS headlines + keyword sentiment + earnings-soon detection
    analyze.js    indicators -> score, signal, reasons, levels, position size
    market.js     daily briefing (top pick, hottest area, rankings, commodities)
    plans.js      allocation plans, 6-week playbook, rules
    agent.js      Claude agent: tools over the data + web search, structured reports
    universe.js   the stocks / ETFs / commodities that get scanned - edit freely
    routes.js     /api router
  api/[...path].js  Vercel serverless entry
  server.js       production server (npm start)
  src/            React app (Today, Stock, Sectors & Commodities, Game Plan, Portfolio, Ask AI)
  scripts/smoke-test.js     npm run check - exercises every API route
  scripts/build-preview.js  npm run build:preview - writes the offline preview.html
```

**Customise the watchlist:** add tickers to `STOCKS` in `lib/universe.js`.
**Offline / demo mode:** set `DEMO_DATA=1` to use clearly-labelled fake prices, for example when you have no internet.

## Notes

- Data from the free sources can be delayed and may occasionally be rate-limited. AlphaDesk caches aggressively and retries automatically. If a load fails, hit **Refresh** a minute later.
- Scores and AI calls are research signals for a virtual-money game, not financial advice. Always check earnings dates before holding a stock through a report.
