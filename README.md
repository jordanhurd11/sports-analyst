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
- [x] **Phase 2** — real NBA scores & schedule via balldontlie (NFL/MLB/NHL still demo)
- [ ] **Phase 3** — team & player info + injuries
- [ ] **Phase 4** — bet tracker & favorites (localStorage)
- [ ] **Phase 5** — betting odds (The Odds API, cached)
- [ ] **Phase 6** — AI assistant
- [ ] **Phase 7** — polish & stretch goals

## 🔑 API key setup (balldontlie — live NBA data)
1. Create a free account at **https://app.balldontlie.io** — your API key is
   shown on the dashboard after signup. No credit card needed.
2. Add the key one of two ways:
   - **Browser (recommended):** open the site and click the status chip in the
     top-right header. Paste the key. It's stored in your browser's
     localStorage — it never touches the repo or the deployed files.
   - **Local file:** copy `js/keys.example.js` to `js/keys.js` and paste the
     key there. `js/keys.js` is gitignored and will never be committed.
3. Without a key the site runs in demo mode with sample data.

## ⚠️ Security note
This is a **static** site. Anything **committed** ships publicly on GitHub
Pages — never paste a real key into a tracked file. The two methods above keep
the key out of the repo entirely. A truly server-hidden key requires a small
backend proxy (Cloudflare Workers / Vercel free tier) — planned as a Phase 6
option for the OpenAI key.

## Run locally
Just open `index.html`, or serve the folder:
```
python -m http.server 8000
```
