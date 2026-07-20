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

  /* ---- Parlay math ----
     American odds → decimal, multiply across legs, convert back. */
  function toDecimal(odds) {
    return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
  }

  function parlayOdds(legs) {
    const dec = legs.reduce((p, l) => p * toDecimal(l.odds), 1);
    const american = dec >= 2
      ? Math.round((dec - 1) * 100)
      : -Math.round(100 / (dec - 1));
    return { dec, american };
  }

  function addParlay({ legs, units }) {
    const bets = load();
    bets.unshift({
      id: "bet-" + Date.now() + "-" + Math.floor(Math.random() * 1e4),
      sport: "PARLAY",
      legs: legs.map((l) => ({ pick: l.pick, odds: Math.round(l.odds) })),
      units: Math.round(units * 10) / 10,
      result: "pending",
      ts: Date.now()
    });
    save(bets);
  }

  /* Units won if the bet hits (before it settles) */
  function potential(bet) {
    if (bet.legs) return bet.units * (parlayOdds(bet.legs).dec - 1);
    return bet.units * (bet.odds > 0 ? bet.odds / 100 : 100 / Math.abs(bet.odds));
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
    if (bet.result === "win") return potential(bet);
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

  return { list: load, add, addParlay, remove, setResult,
           profit, potential, parlayOdds, stats };
})();
