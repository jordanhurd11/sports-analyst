**PRD — SmartBet Analytics**

Author: Jordan Hurd
Live site: https://sports-analyst-three.vercel.app
Repo: https://github.com/jordanhurd11/sports-analyst
Status: Shipped (v1)

1. Overview
SmartBet Analytics is a sports betting research platform that brings live scores, betting lines, team analytics, and bet tracking into a single dashboard. Instead of switching between multiple websites to check injuries, odds, recent form, and line movement, users research a game in one place, ask an AI analyst questions about it, and log their bets — all in the browser.

One-liner: A research dashboard that helps sports bettors make informed decisions faster.

2. Problem Statement
Sports bettors typically need 4–6 open tabs to research a single game: one for scores, one for odds, one for injuries, one for team stats, one for trends. The information exists but is fragmented, and by the time it's gathered, lines have moved. Casual bettors (me and my friends) end up betting on incomplete information or skipping research entirely.

3. Target Users
Casual sports bettors who want quick, trustworthy research before placing wagers
Friends tracking bets together and comparing records
Sports analytics enthusiasts who want game data without a paid subscription

4. Goals & Non-Goals

Goals

All essential pre-bet research for a game visible within two clicks
Live data that stays current without manual refreshing
An AI assistant that explains the numbers in plain English
Private, personal bet tracking with honest performance math (ROI, units, streaks)
Zero cost to operate (free API tiers) and zero exposed credentials

Non-Goals

The app does not recommend bets, guarantee outcomes, or suggest wager sizes — it is a research tool, not a tipster
No user accounts or server-side storage of personal data — bets stay in the user's browser
No real-money integration with sportsbooks

5. Core Features (as built)

5.1 Live Multi-Sport Dashboard
Sports: NBA, NFL, MLB, NHL, EPL (Premier League)
Scores, schedules, and finals across a rolling window (14 days back, up to 14 forward), with a date picker and prev/next-day arrows
Live games auto-refresh every 60 seconds (single-day refresh to respect rate limits); live games show a pulsing indicator and current period/inning
Offseason handling: leagues with no current games fall back to their most recent championship round so the dashboard is never empty
5.2 Betting Lines & Odds Intelligence
Live spread, moneyline, and total for each game from real US sportsbooks, searched across all available bookmakers per market
Starting odds: the app automatically snapshots the pregame line for every upcoming game it sees (localStorage, timestamp-validated), so once a game goes live, users can compare the in-play line to the opener; games first seen mid-game honestly display "not captured"
Market-implied win probability computed from the moneyline and visualized as a team-colored split bar
Line movement summarized in the Betting Trends section ("Started X → now Y")
5.3 Team Research & Analytics
Real season records, last-10 form, home/road splits, current streaks, and playoff seeds per team
Injury reports with player names, status (Out / Day-to-Day / IL), and affected body part
Computed 14-day trends: average win/loss margin (worded as "wins by / loses by") and average combined score vs. the current total line
Form chart: one bar per completed game (height = margin, green = win, red = loss) plus last-5 streak dots
5.4 AI Analyst
Gemini-powered Q&A about the selected game; the prompt includes the game's live records, form, splits, injuries, and betting lines so answers are grounded in current data
Quick-action questions ("Explain the line," "Biggest risk," "What changes it?") plus free-form input
Guardrails: the server-side system prompt instructs the model to explain statistics, never guarantee outcomes or tell the user what to bet
Data-freshness timestamp shown under the module
5.5 Bet Tracker & Journal
Log straight bets or multi-leg parlays; clicking any live odds button pre-fills the slip (in parlay mode, clicks stack as legs)
Automatic math: American-odds payout preview ("2u to win +4.4u"), combined parlay odds via decimal conversion, Win %, ROI, net units, and current streak
Bet log separates Parlays and Straight Bets; results settle with one tap (W/L/Push)
Dedicated Bet Journal page: bankroll curve (cumulative units over time), results donut, per-sport win/loss bars, status filters, and CSV export
All data persists in localStorage — shared across both pages, never sent to a server

6. Technical Architecture

Layer	Technology	Notes
Frontend	Vanilla HTML/CSS/JS, no frameworks	Two pages (dashboard, journal); hand-rolled SVG charts
Hosting	Vercel (static + serverless)	Auto-deploys from GitHub main
Proxy layer	Vercel serverless functions (/api/*)	All API keys live in server-side env vars; browser never sees them
Sports data	balldontlie (NBA/NFL/MLB/EPL)	Documented, keyed (BDL_KEY), 5 req/min free tier
Stats & NHL	ESPN public endpoints	Unofficial — treated as untrusted, wrapped in fallbacks
Odds	The Odds API (ODDS_KEY)	500 credits/month; ~3 credits per sport per 10-min cache window
AI	Google Gemini (GEMINI_KEY)	Model-fallback chain (gemini-flash-latest first) since Google retires model names
Persistence	localStorage	Bets, favorites, pregame odds snapshots
Resilience design: every data source has a labeled fallback — if an API fails or rate-limits, the affected tab degrades to sample data with a "DEMO" chip rather than breaking. Caching is layered (in-memory TTLs, CDN cache, partial-pagination tolerance, patient 429 retry) to stay inside free-tier limits even during a live demo.

7. Key Design Decisions

Vercel proxy over client-side keys — a static site cannot hide secrets; the proxy keeps all three keys server-side and adds CDN caching that protects rate limits
Adapters per API — each source returns a different shape (visitor_team vs away_team, dates vs season/week); all normalize into one internal game format so the UI never changes when a source does
Build missing data instead of paying for it — no free odds history exists, so the app snapshots pregame lines itself; standings aren't in the free sports API, so they're enriched from ESPN
Research, not picks — the AI's guardrails and the absence of "recommended bets" are deliberate product decisions, not omissions
localStorage over accounts — bet history is personal; keeping it client-side eliminates auth, a database, and privacy risk

8. Risks & Mitigations

Risk	Mitigation
Free-tier rate limits during a demo	5-min tab cache, single-day polling, partial pagination, 429 retry
ESPN endpoints are unofficial and could change	Defensive parsing; every field falls back to a placeholder
Odds credits exhausted (500/mo)	10-min CDN + browser caching; balance surfaced via response header
Gemini model retirement	Fallback chain of model names, -latest alias first
Any API fully down	Labeled demo-mode data keeps the site functional

9. Success Criteria

A user can go from opening the site to a fully-researched game (score, line, form, injuries, AI summary) in under 30 seconds
Live scores never more than ~90 seconds stale while the tab is open
The site loads and functions even with every external API unavailable
Bet math is exact: payouts, ROI, and parlay odds verified against manual calculation

10. Future Work

Best-line comparison across bookmakers (data already fetched, display only)
Line-movement history charts from accumulated snapshots
AI weekly recap of the user's betting record
Player props research; PWA install for mobile