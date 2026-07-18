/* ===================================================================
   Vercel serverless function: /api/games
   Proxies balldontlie so the API key stays server-side.

   The key lives in a Vercel environment variable named BDL_KEY —
   set it in: Vercel dashboard → Project → Settings → Environment
   Variables. It is never sent to the browser.

   Usage from the frontend:
     GET /api/games?dates[]=2026-07-17&dates[]=2026-07-16&per_page=100
   (query params are forwarded to balldontlie unchanged)
   =================================================================== */

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

  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  try {
    const upstream = await fetch(`https://api.balldontlie.io/v1/games${qs}`, {
      headers: { Authorization: key }
    });
    const body = await upstream.json();
    // brief CDN cache so repeat visitors don't burn the rate limit
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(upstream.status).json(body);
  } catch (err) {
    return res.status(502).json({ error: `upstream failed: ${err.message}` });
  }
};
