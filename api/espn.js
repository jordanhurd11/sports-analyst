/* ===================================================================
   Vercel serverless function: /api/espn
   Proxies ESPN's public (undocumented) endpoints for Phase 3
   enrichment: standings, injuries, and scoreboards. No key needed —
   this proxy exists for CORS control and response caching, and so
   every data source flows through one place.

   NOTE: these ESPN endpoints are unofficial. The frontend treats
   them as untrusted and falls back to placeholders if they change.

   Usage:
     GET /api/espn?league=nba&type=standings
     GET /api/espn?league=nba&type=injuries
     GET /api/espn?league=nhl&type=scoreboard&dates=20260601-20260625
   =================================================================== */

const LEAGUE_PATHS = {
  nba: "basketball/nba",
  nfl: "football/nfl",
  mlb: "baseball/mlb",
  nhl: "hockey/nhl",
  epl: "soccer/eng.1"
};

const TYPE_URLS = {
  standings:  (path) => `https://site.api.espn.com/apis/v2/sports/${path}/standings`,
  injuries:   (path) => `https://site.api.espn.com/apis/site/v2/sports/${path}/injuries`,
  scoreboard: (path) => `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`
};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const league = (req.query && req.query.league) || "";
  const type = (req.query && req.query.type) || "";
  const path = LEAGUE_PATHS[league];
  const buildUrl = TYPE_URLS[type];
  if (!path || !buildUrl) {
    return res.status(400).json({ error: `unsupported league/type: ${league}/${type}` });
  }

  let url = buildUrl(path);
  if (type === "scoreboard" && req.query.dates) {
    // YYYYMMDD or YYYYMMDD-YYYYMMDD only — don't forward arbitrary input
    if (!/^\d{8}(-\d{8})?$/.test(req.query.dates)) {
      return res.status(400).json({ error: "bad dates format" });
    }
    url += `?dates=${req.query.dates}`;
  }

  try {
    const upstream = await fetch(url);
    const body = await upstream.json();
    // standings/injuries change slowly — cache hard at the CDN
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
    return res.status(upstream.status).json(body);
  } catch (err) {
    return res.status(502).json({ error: `upstream failed: ${err.message}` });
  }
};
