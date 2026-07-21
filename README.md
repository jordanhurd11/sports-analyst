# SmartBet Analytics

A sports betting **research** dashboard — live scores, betting lines, team
analytics, injuries, an AI analyst, and a personal bet tracker, all in one
place. Final project by Jordan Hurd.

> For research & education only. Not betting advice.

## What does this project do?

SmartBet Analytics pulls live data for **MLB, NBA, NFL, NHL, and Premier
League** games into a single dashboard: real-time scores, sportsbook betting
lines (spread / moneyline / total), team records and 14-day form, injury
reports, and computed betting trends. A Gemini-powered **AI Analyst** answers
questions about any game using its live data as context, and a built-in
**Bet Tracker** logs straight bets and parlays with automatic payout, ROI,
and bankroll math — stored privately in your browser.

## How do I use it?

**Live site → https://sports-analyst-three.vercel.app**

1. **Pick a sport** from the tabs (MLB opens first — it's in season), and use
   the **date bar** (‹ › arrows or the calendar) to browse games up to two
   weeks back or ahead. Live games show a pulsing red indicator and refresh
   automatically every 60 seconds.
2. **Click a game** to open the research panel: betting lines, starting
   (pregame) odds once a game is underway, team records, last-10 form,
   home/road splits, injuries, a form chart, and market-implied win
   probabilities.
3. **Ask the AI Analyst** anything about the selected game — or use the
   quick buttons ("Explain the line", "Biggest risk"). It explains the
   numbers; it never picks winners.
4. **Track your bets:** click any odds button to pre-fill the bet slip, enter
   your units, and log it. Switch the slip to **Parlay** mode and odds clicks
   stack as legs with combined odds and payout calculated live.
5. **Open "My Bets ↗"** (top right) for the full Bet Journal: bankroll curve,
   results breakdown, per-sport record, filters, and CSV export.

Everything personal (bets, favorites) lives in your browser's localStorage —
nothing is sent to a server.

## Tech & architecture

Vanilla HTML, CSS, and JavaScript — no frameworks, no build step. Hosted on
**Vercel**: the static frontend and four serverless functions deploy together
from this repo.

```
sports-analyst/
├── index.html          # dashboard
├── tracker.html        # Bet Journal page
├── favicon.svg
├── css/style.css       # all styles
├── js/
│   ├── config.js       # public config (proxy location — no secrets)
│   ├── api.js          # data layer: fetchers, per-API adapters, caching, trends
│   ├── app.js          # dashboard wiring, charts, bet slip
│   ├── tracker.js      # bet storage + odds/parlay math (localStorage)
│   ├── favorites.js    # saved matchups (localStorage)
│   └── mybets.js       # Bet Journal page logic + SVG charts
└── api/                # Vercel serverless proxy (keys stay server-side)
    ├── games.js        # balldontlie: scores/schedules (nba/nfl/mlb/epl)
    ├── espn.js         # ESPN public endpoints: standings, injuries, NHL
    ├── odds.js         # The Odds API: betting lines
    └── ai.js           # Google Gemini: AI Analyst
```

## 🔑 API keys — all server-side on Vercel

No key ever appears in this repo or in any browser. The frontend calls the
serverless proxy (`/api/*`); each function attaches its key from a Vercel
**environment variable** and forwards the request. If any upstream API is
unreachable, the affected tab degrades to labeled sample data instead of
breaking.

| Function       | Upstream API                   | Env var      |
|----------------|--------------------------------|--------------|
| `api/games.js` | balldontlie (MLB/NBA/NFL/EPL)  | `BDL_KEY`    |
| `api/espn.js`  | ESPN public endpoints          | *(no key)*   |
| `api/odds.js`  | The Odds API                   | `ODDS_KEY`   |
| `api/ai.js`    | Google Gemini                  | `GEMINI_KEY` |

### Deploying your own copy
1. Fork/push this repo to GitHub.
2. On **vercel.com** (free): Add New → Project → import the repo →
   preset **Other** → Deploy.
3. Settings → Environment Variables → add `BDL_KEY`
   (app.balldontlie.io), `ODDS_KEY` (the-odds-api.com), and `GEMINI_KEY`
   (aistudio.google.com/apikey) → Redeploy.

## Run locally

Open `index.html` directly (runs in demo mode), or serve the folder:

```
python -m http.server 8000
```

Live data requires the Vercel proxy — point `proxyBase` in `js/config.js`
at a deployed instance, e.g. `https://sports-analyst-three.vercel.app/api`.

## Build history

Built in phases with AI pair-programming (see commit history): layout shell →
live scores (5 leagues) → team analytics & injuries → bet tracker → live odds
→ AI assistant → polish (parlays, Bet Journal, charts, live polling).
