/* ===================================================================
   Vercel serverless function: /api/ai
   Proxies Google Gemini (free tier) so the key stays server-side.

   Env vars (Vercel → Settings → Environment Variables):
     GEMINI_KEY   — from https://aistudio.google.com/apikey (required)
     GEMINI_MODEL — optional override, defaults to gemini-2.5-flash

   The frontend POSTs { question, context } and gets { text } back.
   The system prompt lives HERE so users can't override it from the
   browser — the assistant explains stats, it never picks winners.
   =================================================================== */

const SYSTEM_PROMPT =
  "You are the research assistant inside SmartBet Analytics, a sports " +
  "betting research dashboard built as a student project. You explain " +
  "matchups using the game data provided: records, form, home/road " +
  "splits, streaks, injuries, and betting lines. Be concise (under 120 " +
  "words), factual, and neutral. Explain what the numbers mean for the " +
  "matchup. NEVER guarantee outcomes, never tell the user what to bet, " +
  "and remind them research is not a prediction if they ask for a lock. " +
  "Plain text only — no markdown headers or bullet lists.";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const key = process.env.GEMINI_KEY;
  if (!key) {
    return res.status(500).json({ error: "GEMINI_KEY env var not set on Vercel" });
  }

  const { question, context } = req.body || {};
  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "missing question" });
  }
  // hard caps so nobody can pump huge prompts through our quota
  const q = question.trim().slice(0, 300);
  const ctx = typeof context === "string" ? context.slice(0, 4000) : "";

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          role: "user",
          parts: [{ text: `Game data:\n${ctx}\n\nQuestion: ${q}` }]
        }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 512 }
      })
    });

    const body = await upstream.json();
    if (!upstream.ok) {
      const msg = body?.error?.message || `Gemini HTTP ${upstream.status}`;
      // 429 = free-tier rate limit — tell the frontend distinctly
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: msg });
    }

    const text = body?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text).filter(Boolean).join("") || "";
    if (!text) return res.status(502).json({ error: "empty response from Gemini" });
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(502).json({ error: `upstream failed: ${err.message}` });
  }
};
