# SmartBet Analytics

A sports betting **research** dashboard — scores, team & player info, injuries,
betting lines, and trends in one place. Final project by Jordan Hurd.

> For research & education only. Not betting advice.

## Live site
`https://<your-github-username>.github.io/sports-analyst/`

## Tech
Vanilla HTML, CSS, and JavaScript. Deployed on GitHub Pages. No build step.

## Structure
```
sports-analyst/
├── index.html          # dashboard shell
├── css/style.css       # all styles
├── js/
│   ├── api.js          # SINGLE data source (fake data in Phase 1)
│   ├── tracker.js      # bet tracker (Phase 4)
│   ├── favorites.js    # saved matchups (Phase 4)
│   └── app.js          # page wiring / rendering
├── .nojekyll           # let GitHub Pages serve the js/ folder as-is
└── .gitignore
```

## Build phases
- [x] **Phase 0** — repo + GitHub Pages pipeline
- [x] **Phase 1** — layout shell driven by fake data
- [x] **Phase 2** — real scores & schedules: NBA/NFL/MLB/EPL via balldontlie, NHL via ESPN
- [x] **Phase 3** — real team records, last-10, home/road splits, streaks & injuries
      via ESPN's public endpoints (unofficial — treated as untrusted, falls back
      to placeholders if unavailable)
- [x] **Phase 4** — bet tracker (Win %, ROI, units, streak) & favorites, persisted in localStorage
- [x] **Phase 5** — live betting lines (spread/moneyline/total) via The Odds API, cached hard
- [ ] **Phase 6** — AI assistant
- [ ] **Phase 7** — polish & stretch goals

## 🔑 API keys — all server-side on Vercel
No key ever appears in this repo or in any browser. The frontend calls our
own serverless proxy (`/api/*`); the proxy attaches the key from a Vercel
**environment variable** and forwards the request.

| Function      | Upstream API        | Env var    |
|---------------|---------------------|------------|
| `api/games.js`| balldontlie (NBA)   | `BDL_KEY`  |
| `api/odds.js` | The Odds API        | `ODDS_KEY` |

### Deploy steps
1. Push this repo to GitHub.
2. Sign up at **https://vercel.com** with your GitHub account (free Hobby plan).
3. **Add New → Project** → import `sports-analyst` → Framework preset:
   **Other** → Deploy. The static site and `/api` functions deploy together.
4. Project → **Settings → Environment Variables** → add `BDL_KEY`
   (from https://app.balldontlie.io) and later `ODDS_KEY`
   (from https://the-odds-api.com). Redeploy after adding.
5. Done — the site is live at `https://<project>.vercel.app`.

If the frontend is ALSO hosted on GitHub Pages, set `proxyBase` in
`js/config.js` to the full Vercel URL (e.g.
`https://sports-analyst.vercel.app/api`) so Pages can reach the proxy.

Without a reachable proxy the site runs in demo mode with sample data.

## Run locally
Just open `index.html`, or serve the folder:
```
python -m http.server 8000
```
