## PROPOSAL

- What I'm building: 

A tool to help sports better make more informed decisions based on analytics.

- Who it's for / why: 

I built this app for myself and my friends because we all enjoy sports betting and found it difficult to quickly find the information we needed before placing our bets. The goal was to bring all of the most important game data into one place, making it faster and easier to make informed betting decisions.

- Core Features:

1. Live multi-sport game dashboard — Real-time scores, schedules, and results for NBA, NFL, MLB, NHL, and Premier League soccer, with a date picker to browse two weeks of games and auto-refresh every 60 seconds for live games.
2. Betting lines & odds intelligence — Live spreads, moneylines, and totals from real sportsbooks, plus starting (pregame) odds captured automatically so you can see line movement, and market-implied win probabilities visualized per team.
3. Team research & analytics — Real records, last-10 form, home/road splits, streaks, and injury reports for every matchup, with computed 14-day trend stats (average margins, combined scoring) and visual form charts.
4. AI Analyst — A Gemini-powered assistant that answers questions about any selected game using its live data (records, injuries, lines) as context — it explains the numbers rather than picking winners, with quick-action questions like "Explain the line" and "Biggest risk."
5. Bet Tracker & Journal — Log straight bets and multi-leg parlays (one click from live odds), with automatic payout math, Win %, ROI, net units, and streaks — plus a dedicated journal page with a bankroll chart, results breakdown, filters, and CSV export. All stored privately in the browser.

- What I don't know yet:

1. What APIs to use
2. How to use Vercel to hide my API keys
3. How to fetch live data so it updates as the scores and odds of the games change
4. How to include an AI chat bot in my website