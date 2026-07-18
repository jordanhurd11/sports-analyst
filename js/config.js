/* ===================================================================
   config.js — public frontend configuration. Safe to commit:
   there are NO secrets here. All API keys live in Vercel environment
   variables and never reach the browser.

   proxyBase:
     "/api"  → correct when the site itself is hosted on Vercel
               (static files + serverless functions, same origin).
     If you host the frontend on GitHub Pages instead, set this to
     your full Vercel URL, e.g.:
       proxyBase: "https://sports-analyst.vercel.app/api"
   =================================================================== */

window.SMARTBET_CONFIG = {
  proxyBase: "/api"
};
