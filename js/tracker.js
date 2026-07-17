/* ===================================================================
   tracker.js — Bet Tracker (Phase 4 will build this out fully).
   For now: a stub namespace so app.js can call into it safely.
   Persistence will use localStorage under the key below.
   =================================================================== */

const BetTracker = (() => {
  const STORAGE_KEY = "smartbet.bets.v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  // Phase 4: add(), remove(), and stats (Win %, ROI, units, streak).
  function summary() {
    const bets = load();
    return { count: bets.length, winPct: 0, netUnits: 0, roi: 0 };
  }

  return { summary };
})();
