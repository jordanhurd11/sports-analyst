/* ===================================================================
   tracker.js — Bet Tracker (Phase 4). Pure localStorage, no APIs.

   A bet: { id, sport, pick, odds (american), units, result, ts }
   result: "pending" | "win" | "loss" | "push"

   Profit math (units):
     win  → units * (odds > 0 ? odds/100 : 100/|odds|)
     loss → -units
     push → 0
   ROI = net units / total units staked on settled bets.
   =================================================================== */

const BetTracker = (() => {
  const STORAGE_KEY = "smartbet.bets.v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function save(bets) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bets)); }
    catch { /* storage full/unavailable — tracker becomes session-only */ }
  }

  function add({ sport, pick, odds, units }) {
    const bets = load();
    bets.unshift({
      id: "bet-" + Date.now() + "-" + Math.floor(Math.random() * 1e4),
      sport, pick,
      odds: Math.round(odds),
      units: Math.round(units * 10) / 10,
      result: "pending",
      ts: Date.now()
    });
    save(bets);
  }

  function remove(id) {
    save(load().filter((b) => b.id !== id));
  }

  function setResult(id, result) {
    const bets = load();
    const bet = bets.find((b) => b.id === id);
    if (bet) { bet.result = result; save(bets); }
  }

  function profit(bet) {
    if (bet.result === "win") {
      return bet.units * (bet.odds > 0 ? bet.odds / 100 : 100 / Math.abs(bet.odds));
    }
    if (bet.result === "loss") return -bet.units;
    return 0; // push / pending
  }

  function stats() {
    const bets = load();
    const settled = bets.filter((b) => b.result === "win" || b.result === "loss");
    const wins = settled.filter((b) => b.result === "win").length;
    const staked = settled.reduce((s, b) => s + b.units, 0);
    const net = bets.reduce((s, b) => s + profit(b), 0);

    // streak: walk newest→oldest settled results while they match
    let streak = "";
    if (settled.length) {
      const first = settled[0].result;
      let n = 0;
      for (const b of settled) { if (b.result === first) n++; else break; }
      streak = `${first === "win" ? "W" : "L"}${n}`;
    }

    return {
      count: bets.length,
      winPct: settled.length ? Math.round((wins / settled.length) * 100) : 0,
      netUnits: Math.round(net * 100) / 100,
      roi: staked ? Math.round((net / staked) * 1000) / 10 : 0,
      streak
    };
  }

  return { list: load, add, remove, setResult, profit, stats };
})();
