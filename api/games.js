/* ===================================================================
   Vercel serverless function: /api/games
   Proxies balldontlie so the API key stays server-side.

   The key lives in a Vercel environment variable named BDL_KEY —
   set it in: Vercel dashboard → Project → Settings → Environment
   Variables. It is never sent to the browser.

   Usage from the frontend:
     GET /api/games?league=nba&dates[]=2026-07-17&per_page=100
   `league` picks the balldontlie sport API; all other query params
   are forwarded to balldontlie unchanged.
   =================================================================== */

const LEAGUE_PATHS = {
  nba: "nba/v1",
  nfl: "nfl/v1",
  mlb: "mlb/v1",
  nhl: "nhl/v1",
  epl: "epl/v1"
};

module.exports = async (req, res) => {
  // Allow the GitHub Pages copy of the site to call this proxy too
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const key = process.env.BDL_KEY;
  if (!key) {
    return res.status(500).json({ error: "BDL_KEY env var not set on Vercel" });
  }

  const league = (req.query && req.query.league) || "nba";
  const path = LEAGUE_PATHS[league];
  if (!path) {
    return res.status(400).json({ error: `unsupported league: ${league}` });
  }

  // games (default) or teams — nothing else is proxied
  const endpoint = (req.query && req.query.endpoint) === "teams" ? "teams" : "games";

  // forward everything except our own params
  const params = new URLSearchParams(
    req.url.includes("?") ? req.url.slice(req.url.indexOf("?") + 1) : ""
  );
  params.delete("league");
  params.delete("endpoint");

  try {
    const upstream = await fetch(
      `https://api.balldontlie.io/${path}/${endpoint}?${params}`,
      { headers: { Authorization: key } }
    );
    const body = await upstream.json();
    // brief CDN cache so repeat visitors don't burn the rate limit
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(upstream.status).json(body);
  } catch (err) {
    return res.status(502).json({ error: `upstream failed: ${err.message}` });
  }
};
