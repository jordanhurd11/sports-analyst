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
  "splits, streaks, injuries, and betting lines. Give complete, focused " +
  "answers (a solid paragraph or two, up to ~200 words). Be factual and " +
  "neutral. Explain what the numbers mean for the " +
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

  // Google retires model names often — try candidates until one works.
  // "-latest" aliases track Google's newest models automatically.
  const candidates = [
    process.env.GEMINI_MODEL,
    globalThis.__workingModel,           // remembered from a prior request
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3-flash",
    "gemini-2.5-flash"
  ].filter(Boolean);

  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{
      role: "user",
      parts: [{ text: `Game data:\n${ctx}\n\nQuestion: ${q}` }]
    }],
    generationConfig: { temperature: 0.6, maxOutputTokens: 2048 }
  });

  let lastError = "no model candidates";
  for (const model of [...new Set(candidates)]) {
    try {
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: payload }
      );
      const body = await upstream.json();

      if (upstream.status === 429) {
        // rate limit — no point trying other models with the same key
        return res.status(429).json({ error: body?.error?.message || "rate limited" });
      }
      if (!upstream.ok) {
        lastError = body?.error?.message || `Gemini HTTP ${upstream.status}`;
        continue; // retired/unknown model name — try the next candidate
      }

      // newer models interleave "thought" parts — keep only the answer
      const text = (body?.candidates?.[0]?.content?.parts || [])
        .filter((p) => p.text && !p.thought)
        .map((p) => p.text).join("") || "";
      if (!text) { lastError = "empty response from Gemini"; continue; }

      globalThis.__workingModel = model; // warm lambda: skip dead names next time
      return res.status(200).json({ text, model });
    } catch (err) {
      lastError = `upstream failed: ${err.message}`;
    }
  }
  return res.status(502).json({ error: lastError });
};
