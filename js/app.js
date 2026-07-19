/* ===================================================================
   app.js — page wiring. Reads from SportsAPI, renders the dashboard.
   Phase 1: drives the whole UI from fake data in api.js.
   =================================================================== */

const els = {
  sourceNote: document.getElementById("dataSourceNote"),
  sportNav:   document.getElementById("sportNav"),
  gamesList:  document.getElementById("gamesList"),
  gamesCount: document.getElementById("gamesCount"),
  detailEmpty:document.getElementById("detailEmpty"),
  gameDetail: document.getElementById("gameDetail"),
  datePrev:   document.getElementById("datePrev"),
  datePick:   document.getElementById("datePick"),
  dateNext:   document.getElementById("dateNext"),
  favBtn:     document.getElementById("favGameBtn"),
  favList:    document.getElementById("favoritesList"),
  favCount:   document.getElementById("favCount"),
  trackerRoi: document.getElementById("trackerRoi"),
  betForm:    document.getElementById("betForm"),
  betPick:    document.getElementById("betPick"),
  betOdds:    document.getElementById("betOdds"),
  betUnits:   document.getElementById("betUnits"),
  statBets:   document.getElementById("statBets"),
  statWin:    document.getElementById("statWin"),
  statNet:    document.getElementById("statNet"),
  betsList:   document.getElementById("betsList"),
};

const state = { sport: null, games: [], allGames: [], date: null, selected: null };

/* Local YYYY-MM-DD for a Date (or today) */
function localISO(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* Convert "#RRGGBB" to a low-alpha rgba() for background tints */
function tint(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* True when two hex colors are visually close (RGB distance), so
   "same color" catches near-identical shades like GSW/DEN gold too */
function colorsClose(hexA, hexB) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const dr = ((a >> 16) & 255) - ((b >> 16) & 255);
  const dg = ((a >> 8) & 255) - ((b >> 8) & 255);
  const db = (a & 255) - (b & 255);
  return Math.sqrt(dr * dr + dg * dg + db * db) < 80;
}

/* Per-game display colors: if both teams share a color, the AWAY team
   goes white/neutral so the two sides stay distinguishable */
function displayColors(g) {
  const away = { ...g.away.colors };
  const home = { ...g.home.colors };
  if (colorsClose(away.font, home.font)) {
    away.font = "#FFFFFF";
    away.g1 = "#8A97A8";   // neutral wash instead of the clashing color
    away.g2 = "#FFFFFF";
  }
  return { away, home };
}

/* ---------- Sport selector ---------- */
function renderSportNav() {
  const sports = SportsAPI.getSports();
  state.sport = sports[0];
  els.sportNav.innerHTML = sports
    .map((s) => `<button class="sport-btn" data-sport="${s}">${s}</button>`)
    .join("");
  els.sportNav.querySelectorAll(".sport-btn").forEach((btn) => {
    btn.addEventListener("click", () => selectSport(btn.dataset.sport));
  });
}

async function selectSport(sport) {
  state.sport = sport;
  els.sportNav.querySelectorAll(".sport-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.sport === sport)
  );
  els.gamesList.innerHTML = `<div class="placeholder-note">Loading ${sport} games…</div>`;
  els.gameDetail.hidden = true;
  els.detailEmpty.hidden = false;
  state.selected = null;

  try {
    state.allGames = await SportsAPI.getGames(sport);
    // default to today, else the nearest date that has games
    const today = localISO();
    const dates = [...new Set(state.allGames.map((g) => g.date || today))];
    state.date = dates.includes(today)
      ? today
      : dates.sort((a, b) =>
          Math.abs(new Date(a) - new Date(today)) -
          Math.abs(new Date(b) - new Date(today)))[0] || today;
    els.datePick.value = state.date;
    renderGamesList();
  } catch (err) {
    els.gamesList.innerHTML =
      `<div class="placeholder-note">Couldn't load games. ${err.message}</div>`;
  }
  els.sourceNote.textContent = SportsAPI.getSource();
}

/* ---------- Games list ---------- */
function renderGamesList(animate = true) {
  // show only the selected date's games; the full two-week window
  // stays in state.allGames for instant date switching
  const today = localISO();
  state.games = state.allGames.filter((g) => (g.date || today) === state.date);

  els.gamesCount.textContent = state.games.length;
  if (!state.games.length) {
    els.gamesList.innerHTML =
      `<div class="placeholder-note">No games on this date — use the arrows to browse.</div>`;
    return;
  }

  const prevScroll = els.gamesList.scrollTop;
  els.gamesList.innerHTML = state.games.map((g, idx) => {
    const dc = displayColors(g);
    const active = state.selected && state.selected.id === g.id;
    return `
    <div class="game-card ${animate ? "anim-in" : ""} ${g.live ? "live" : ""} ${active ? "active" : ""}"
         data-id="${g.id}"
         style="--i:${Math.min(idx, 8)}; --away-t:${tint(dc.away.g1, 0.16)}; --home-t:${tint(dc.home.g1, 0.16)}">
      <div class="gc-time">${g.time}</div>
      <div class="gc-row">
        <span class="gc-team" style="color:${dc.away.font}">${g.away.abbr} ${g.away.name}</span>
        <span class="gc-score">${g.away.score ?? ""}</span>
      </div>
      <div class="gc-row">
        <span class="gc-team" style="color:${dc.home.font}">${g.home.abbr} ${g.home.name}</span>
        <span class="gc-score">${g.home.score ?? ""}</span>
      </div>
    </div>`;
  }).join("");

  els.gamesList.querySelectorAll(".game-card").forEach((card) => {
    card.addEventListener("click", () => selectGame(card.dataset.id));
  });
  // silent refreshes keep the user's scroll position
  els.gamesList.scrollTop = animate ? 0 : prevScroll;
}

/* ---------- Game detail ---------- */
function selectGame(id) {
  const game = state.games.find((g) => g.id === id);
  if (!game) return;
  state.selected = game;

  els.gamesList.querySelectorAll(".game-card").forEach((c) =>
    c.classList.toggle("active", c.dataset.id === id)
  );

  els.detailEmpty.hidden = true;
  els.gameDetail.hidden = false;
  renderDetail(game);

  // Re-trigger the pop-in animation on every selection
  els.gameDetail.classList.remove("anim-pop");
  void els.gameDetail.offsetWidth; // force reflow so the animation restarts
  els.gameDetail.classList.add("anim-pop");

  // Phase 3: pull real standings + injuries in the background, then
  // re-render if this game is still the one on screen
  SportsAPI.enrichGame(state.sport, game).then((g) => {
    if (state.selected && state.selected.id === g.id) renderDetail(g);
  }).catch(() => { /* enrichment is best-effort */ });
}

function teamBlock(t) {
  return `
    <div class="tb-abbr">${t.abbr}</div>
    <div class="tb-name">${t.name}</div>
    <div class="tb-rec">${t.record}</div>`;
}

function renderDetail(g) {
  const awayBlock = document.getElementById("awayBlock");
  const homeBlock = document.getElementById("homeBlock");
  awayBlock.innerHTML = teamBlock(g.away);
  homeBlock.innerHTML = teamBlock(g.home);

  // Team colors: gradient abbreviations + colored names, tinted matchup banner.
  // displayColors() flips the away team to white when both teams share a color.
  const dc = displayColors(g);
  awayBlock.style.cssText = `--t1:${dc.away.g1}; --t2:${dc.away.g2}; --tfont:${dc.away.font}`;
  homeBlock.style.cssText = `--t1:${dc.home.g1}; --t2:${dc.home.g2}; --tfont:${dc.home.font}`;
  els.gameDetail.style.setProperty("--away-t", tint(dc.away.g1, 0.18));
  els.gameDetail.style.setProperty("--home-t", tint(dc.home.g1, 0.18));

  // Odds — two sections once a game is underway: the in-play market on
  // top, the captured pregame line below it
  const started = g.live || /^(FINAL|FT)/.test(g.time);
  document.getElementById("oddsTitle").textContent =
    g.oddsLive && started ? "Live Odds" : "Betting Lines";
  document.getElementById("oddsTag").textContent =
    g.oddsLive ? (started ? "in-play" : "pregame")
               : (g.src === "live" ? "no market" : "demo");
  const oddsCells = (o) => `
    <div class="odds-cell"><div class="oc-label">Spread</div><div class="oc-val">${o.spread}</div></div>
    <div class="odds-cell"><div class="oc-label">Moneyline</div><div class="oc-val" style="font-size:13px">${o.moneyline}</div></div>
    <div class="odds-cell"><div class="oc-label">Total</div><div class="oc-val">${o.total}</div></div>`;
  document.getElementById("oddsGrid").innerHTML = oddsCells(g.odds);

  const startSection = document.getElementById("startOddsSection");
  if (g.oddsLive && started) {
    startSection.hidden = false;
    document.getElementById("startOddsGrid").innerHTML = g.oddsStart
      ? oddsCells(g.oddsStart)
      : `<div class="placeholder-note" style="grid-column:1/-1">
           Pregame line wasn't captured — this game was already live the
           first time it was seen (the free odds tier has no history).
         </div>`;
  } else {
    startSection.hidden = true;
  }

  // Team info
  const ti = g.teamInfo;
  const tiCell = (label, o) =>
    `<div class="ti-cell"><div class="ti-label">${label}</div>
       <div class="ti-vals">
         <span style="color:${dc.away.font}">${g.away.abbr} ${o.away}</span>
         <span style="color:${dc.home.font}">${g.home.abbr} ${o.home}</span>
       </div></div>`;
  document.getElementById("teamInfoGrid").innerHTML =
    tiCell("Last 10", ti.last5) + tiCell("Home / Away", ti.homeAway) +
    tiCell("Streak", ti.streak) + tiCell("Rankings", ti.rank);

  // Injuries
  const teamFont = (abbr) =>
    abbr === g.away.abbr ? dc.away.font : dc.home.font;
  document.getElementById("injuryList").innerHTML = g.injuries.length
    ? g.injuries.map((i) => `
        <li>
          <span class="inj-status ${i.cls}">${i.status}</span>
          <span class="inj-player">${i.player}</span>
          <span class="inj-team" style="color:${teamFont(i.team)}">${i.team}</span>
        </li>`).join("")
    : `<li>No injuries reported.</li>`;

  // Trends
  const tr = g.trends;
  const trCell = (label, val) =>
    `<div class="trend-cell"><div class="tc-label">${label}</div><div class="tc-val">${val}</div></div>`;
  // For live games these are computed over the last 14 days of finals
  // plus market math; demo games keep their sample text
  const liveTrends = g.src === "live";
  document.getElementById("trendsGrid").innerHTML =
    trCell(liveTrends ? "Avg Win/Loss Margin · Last 14 Days" : "Against the Spread", tr.ats) +
    trCell(liveTrends ? "Avg Combined Score · Last 14 Days" : "Over / Under", tr.ou) +
    trCell(liveTrends ? "Implied Win % · Live Line" : "Public Betting", tr.public) +
    trCell("Line Movement", tr.line);

  // AI placeholder (Phase 6 replaces with real generated text).
  // Words fade in one-by-one via the .ai-word stagger animation.
  const aiText =
    `${g.home.name} (${g.home.record}) enter on ${ti.streak.home} with a strong ` +
    `home split (${ti.homeAway.home}). Key watch: injuries above and the line ` +
    `move "${tr.line}". This is a demo summary — Phase 6 wires the live AI assistant.`;
  document.getElementById("aiBox").innerHTML =
    `<strong>${g.home.abbr} favored by the market.</strong> ` +
    aiText.split(" ")
      .map((w, i) => `<span class="ai-word" style="--w:${i}">${w}</span>`)
      .join(" ");

  // Favorite button
  updateFavBtn(g);
  els.favBtn.onclick = () => {
    Favorites.toggle({ id: g.id, label: `${g.away.abbr} @ ${g.home.abbr}`, sport: state.sport });
    updateFavBtn(g);
    renderFavorites();
    // Star pop animation
    els.favBtn.classList.remove("pop");
    void els.favBtn.offsetWidth;
    els.favBtn.classList.add("pop");
  };
}

/* ---------- Favorites ---------- */
function updateFavBtn(g) {
  const on = Favorites.has(g.id);
  els.favBtn.textContent = on ? "★" : "☆";
  els.favBtn.classList.toggle("on", on);
}

function renderFavorites() {
  const items = Favorites.list();
  els.favCount.textContent = items.length;
  if (!items.length) {
    els.favList.innerHTML =
      `<div class="placeholder-note">Star a matchup to pin it here.</div>`;
    return;
  }
  els.favList.innerHTML = items.map((f) => `
    <div class="fav-item">
      <span>${f.label} <small style="color:var(--text-dim)">${f.sport}</small></span>
      <button data-id="${f.id}" title="Remove">✕</button>
    </div>`).join("");
  els.favList.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      Favorites.remove(b.dataset.id);
      if (state.selected) updateFavBtn(state.selected);
      renderFavorites();
    })
  );
}

/* ---------- Date bar ---------- */
function initDateBar() {
  const shift = (days) => {
    const d = new Date((els.datePick.value || localISO()) + "T12:00:00");
    d.setDate(d.getDate() + days);
    els.datePick.value = localISO(d);
    state.date = els.datePick.value;
    renderGamesList();
  };
  els.datePrev.addEventListener("click", () => shift(-1));
  els.dateNext.addEventListener("click", () => shift(1));
  els.datePick.addEventListener("change", () => {
    if (!els.datePick.value) return;
    state.date = els.datePick.value;
    renderGamesList();
  });
}

/* ---------- Live refresh ---------- */
// Every 60s, quietly refetch just the visible day (1 request) and
// update scores in place — no animations, no scroll jump.
async function pollLive() {
  if (document.hidden || !state.sport || !state.date) return;
  const fresh = await SportsAPI.refreshDay(state.sport, state.date);
  if (!fresh || !fresh.length) return;

  const others = state.allGames.filter((g) => g.date !== state.date);
  state.allGames = [...others, ...fresh].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  renderGamesList(false);

  // keep the open detail panel in sync with the refreshed data
  if (state.selected) {
    const updated = fresh.find((g) => g.id === state.selected.id);
    if (updated) {
      state.selected = updated;
      renderDetail(updated);
      SportsAPI.enrichGame(state.sport, updated).then((g) => {
        if (state.selected && state.selected.id === g.id) renderDetail(g);
      }).catch(() => {});
    }
  }
}

/* ---------- AI assistant ---------- */
// Compile everything on screen about the selected game into plain text
// for the model. No secrets here — it's the same data the user sees.
function buildGameContext(g) {
  if (!g) return "";
  const ti = g.teamInfo, tr = g.trends;
  const inj = g.injuries.length
    ? g.injuries.map((i) => `${i.status} ${i.player} (${i.team})`).join("; ")
    : "none reported";
  return [
    `Sport: ${state.sport}. ${g.away.abbr} ${g.away.name} (${g.away.record}) at ` +
      `${g.home.abbr} ${g.home.name} (${g.home.record}). Status: ${g.time}.`,
    g.away.score != null ? `Score: ${g.away.abbr} ${g.away.score} — ${g.home.abbr} ${g.home.score}.` : "",
    `Lines: spread ${g.odds.spread}, moneyline ${g.odds.moneyline}, total ${g.odds.total}` +
      `${g.oddsLive ? " (live market)" : " (no live market)"}.`,
    `Last 10: ${g.away.abbr} ${ti.last5.away}, ${g.home.abbr} ${ti.last5.home}.`,
    `Splits: ${g.away.abbr} ${ti.homeAway.away}, ${g.home.abbr} ${ti.homeAway.home}.`,
    `Streaks: ${g.away.abbr} ${ti.streak.away}, ${g.home.abbr} ${ti.streak.home}.`,
    `Rankings: ${g.away.abbr} ${ti.rank.away}, ${g.home.abbr} ${ti.rank.home}.`,
    `Injuries: ${inj}.`,
    `Trends: ATS ${tr.ats}; O/U ${tr.ou}; public ${tr.public}; line move ${tr.line}.`
  ].filter(Boolean).join("\n");
}

function renderAiText(text) {
  document.getElementById("aiBox").innerHTML = text
    .split(" ")
    .map((w, i) => `<span class="ai-word" style="--w:${i}">${w
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</span>`)
    .join(" ");
}

function initAssistant() {
  const form = document.getElementById("aiForm");
  const input = document.getElementById("aiInput");
  const tag = document.getElementById("aiTag");
  const proxy = window.SMARTBET_CONFIG?.proxyBase || "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question || !state.selected || !proxy) return;
    const box = document.getElementById("aiBox");
    box.innerHTML = `<em style="color:var(--text-dim)">Thinking…</em>`;
    try {
      const res = await fetch(`${proxy}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context: buildGameContext(state.selected) })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      renderAiText(json.text);
      tag.textContent = "live";
      input.value = "";
    } catch (err) {
      tag.textContent = "offline";
      box.innerHTML = `<em style="color:var(--text-dim)">The assistant is unavailable right now` +
        `${/429|quota|rate/i.test(err.message) ? " (free-tier rate limit — try again in a minute)" : ""}.</em>`;
    }
  });
}

/* ---------- Bet tracker ---------- */
function renderTracker() {
  const s = BetTracker.stats();
  els.statBets.textContent = s.count;
  els.statWin.textContent = `${s.winPct}%`;
  els.statNet.textContent = `${s.netUnits > 0 ? "+" : ""}${s.netUnits}u`;
  els.statNet.style.color =
    s.netUnits > 0 ? "var(--green)" : s.netUnits < 0 ? "var(--danger)" : "";
  els.trackerRoi.textContent =
    `ROI ${s.roi > 0 ? "+" : ""}${s.roi}%` + (s.streak ? ` · ${s.streak}` : "");

  const bets = BetTracker.list();
  if (!bets.length) {
    els.betsList.innerHTML =
      `<div class="placeholder-note">Log your first bet above. Everything stays in your browser.</div>`;
    return;
  }
  const resultBtn = (b, r, label) =>
    `<button class="bi-btn ${r} ${b.result === r ? "on" : ""}"
             data-id="${b.id}" data-result="${r}" title="Mark ${r}">${label}</button>`;
  els.betsList.innerHTML = bets.map((b) => {
    const p = BetTracker.profit(b);
    const settled = b.result === "win" || b.result === "loss";
    return `
    <div class="bet-item ${b.result}">
      <div class="bi-top">
        <span class="bi-pick">${b.pick}</span>
        <span class="bi-net">${settled ? (p > 0 ? "+" : "") + (Math.round(p * 100) / 100) + "u" : ""}</span>
      </div>
      <div class="bi-bottom">
        <span class="bi-meta">${b.sport} · ${b.odds > 0 ? "+" : ""}${b.odds} · ${b.units}u</span>
        <span class="bi-actions">
          ${resultBtn(b, "win", "W")}${resultBtn(b, "loss", "L")}${resultBtn(b, "push", "P")}
          <button class="bi-btn bi-del" data-id="${b.id}" data-del="1" title="Delete">✕</button>
        </span>
      </div>
    </div>`;
  }).join("");
}

function initTracker() {
  els.betForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const pick = els.betPick.value.trim();
    const odds = parseInt(els.betOdds.value, 10);
    const units = parseFloat(els.betUnits.value);
    if (!pick || !Number.isFinite(odds) || odds === 0 || !(units > 0)) return;
    BetTracker.add({ sport: state.sport, pick, odds, units });
    els.betForm.reset();
    renderTracker();
  });

  // one delegated handler for result + delete buttons
  els.betsList.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.del) {
      BetTracker.remove(btn.dataset.id);
    } else if (btn.dataset.result) {
      const bet = BetTracker.list().find((b) => b.id === btn.dataset.id);
      // clicking the active result un-settles the bet back to pending
      BetTracker.setResult(btn.dataset.id,
        bet && bet.result === btn.dataset.result ? "pending" : btn.dataset.result);
    }
    renderTracker();
  });
}

/* ---------- Cursor spotlight ---------- */
// One delegated listener updates --mx/--my on whichever card the mouse is over;
// CSS paints a radial glow at that point.
document.addEventListener("mousemove", (e) => {
  const el = e.target.closest?.(".game-card, .odds-cell, .trend-cell");
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
});

/* ---------- Init ---------- */
function init() {
  renderSportNav();
  renderFavorites();
  initTracker();
  renderTracker();
  initAssistant();
  initDateBar();
  setInterval(pollLive, 60_000);
  selectSport(state.sport);   // load first sport
}
document.addEventListener("DOMContentLoaded", init);
