/* ===================================================================
   Vercel serverless function: /api/odds
   Proxies The Odds API so the key stays server-side (env var ODDS_KEY).
   Ready for Phase 5 — the frontend calls:
     GET /api/odds?sport=basketball_nba

   Endpoint and markets are fixed here on purpose: this is a proxy for
   OUR app, not an open relay anyone can point elsewhere. Aggressive
   caching because the free tier is only 500 credits/month.
   =================================================================== */

const ALLOWED_SPORTS = new Set([
  "basketball_nba",
  "americanfootball_nfl",
  "baseball_mlb",
  "icehockey_nhl",
  "soccer_epl"
]);

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const key = process.env.ODDS_KEY;
  if (!key) {
    return res.status(500).json({ error: "ODDS_KEY env var not set on Vercel" });
  }

  const sport = (req.query && req.query.sport) || "basketball_nba";
  if (!ALLOWED_SPORTS.has(sport)) {
    return res.status(400).json({ error: `unsupported sport: ${sport}` });
  }

  const url =
    `https://api.the-odds-api.com/v4/sports/${sport}/odds` +
    `?apiKey=${key}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;

  try {
    const upstream = await fetch(url);
    const body = await upstream.json();
    // cache hard: odds refresh every 10 min is plenty for a research tool
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");
    return res.status(upstream.status).json(body);
  } catch (err) {
    return res.status(502).json({ error: `upstream failed: ${err.message}` });
  }
};
