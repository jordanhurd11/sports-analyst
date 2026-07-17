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
- [ ] **Phase 2** — real scores & schedule API
- [ ] **Phase 3** — team & player info + injuries
- [ ] **Phase 4** — bet tracker & favorites (localStorage)
- [ ] **Phase 5** — betting odds (The Odds API, cached)
- [ ] **Phase 6** — AI assistant
- [ ] **Phase 7** — polish & stretch goals

## ⚠️ Security note
This is a **static** site. Anything in the JS ships publicly — **never** put a
secret API key in `js/api.js`. Use only keyless/free APIs, or add a small
backend proxy (Cloudflare Workers / Vercel free tier) in Phase 6.

## Run locally
Just open `index.html`, or serve the folder:
```
python -m http.server 8000
```
