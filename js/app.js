/* ===================================================================
   app.js — page wiring. Reads from SportsAPI, renders the dashboard.
   Phase 1: drives the whole UI from fake data in api.js.
   =================================================================== */

const els = {
  sportNav:   document.getElementById("sportNav"),
  gamesList:  document.getElementById("gamesList"),
  gamesCount: document.getElementById("gamesCount"),
  detailEmpty:document.getElementById("detailEmpty"),
  gameDetail: document.getElementById("gameDetail"),
  favBtn:     document.getElementById("favGameBtn"),
  favList:    document.getElementById("favoritesList"),
  favCount:   document.getElementById("favCount"),
};

const state = { sport: null, games: [], selected: null };

/* Convert "#RRGGBB" to a low-alpha rgba() for background tints */
function tint(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
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
    state.games = await SportsAPI.getGames(sport);
    renderGamesList();
  } catch (err) {
    els.gamesList.innerHTML =
      `<div class="placeholder-note">Couldn't load games. ${err.message}</div>`;
  }
}

/* ---------- Games list ---------- */
function renderGamesList() {
  els.gamesCount.textContent = state.games.length;
  if (!state.games.length) {
    els.gamesList.innerHTML = `<div class="placeholder-note">No games listed.</div>`;
    return;
  }
  els.gamesList.innerHTML = state.games.map((g, idx) => `
    <div class="game-card anim-in ${g.live ? "live" : ""}" data-id="${g.id}"
         style="--i:${idx}; --away-t:${tint(g.away.colors.g1, 0.16)}; --home-t:${tint(g.home.colors.g1, 0.16)}">
      <div class="gc-time">${g.time}</div>
      <div class="gc-row">
        <span class="gc-team" style="color:${g.away.colors.font}">${g.away.abbr} ${g.away.name}</span>
        <span class="gc-score">${g.away.score ?? ""}</span>
      </div>
      <div class="gc-row">
        <span class="gc-team" style="color:${g.home.colors.font}">${g.home.abbr} ${g.home.name}</span>
        <span class="gc-score">${g.home.score ?? ""}</span>
      </div>
    </div>`).join("");

  els.gamesList.querySelectorAll(".game-card").forEach((card) => {
    card.addEventListener("click", () => selectGame(card.dataset.id));
  });
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

  // Team colors: gradient abbreviations + colored names, tinted matchup banner
  awayBlock.style.cssText = `--t1:${g.away.colors.g1}; --t2:${g.away.colors.g2}; --tfont:${g.away.colors.font}`;
  homeBlock.style.cssText = `--t1:${g.home.colors.g1}; --t2:${g.home.colors.g2}; --tfont:${g.home.colors.font}`;
  els.gameDetail.style.setProperty("--away-t", tint(g.away.colors.g1, 0.18));
  els.gameDetail.style.setProperty("--home-t", tint(g.home.colors.g1, 0.18));

  // Odds
  document.getElementById("oddsGrid").innerHTML = `
    <div class="odds-cell"><div class="oc-label">Spread</div><div class="oc-val">${g.odds.spread}</div></div>
    <div class="odds-cell"><div class="oc-label">Moneyline</div><div class="oc-val" style="font-size:13px">${g.odds.moneyline}</div></div>
    <div class="odds-cell"><div class="oc-label">Total</div><div class="oc-val">${g.odds.total}</div></div>`;

  // Team info
  const ti = g.teamInfo;
  const tiCell = (label, o) =>
    `<div class="ti-cell"><div class="ti-label">${label}</div>
       <div class="ti-vals">
         <span style="color:${g.away.colors.font}">${g.away.abbr} ${o.away}</span>
         <span style="color:${g.home.colors.font}">${g.home.abbr} ${o.home}</span>
       </div></div>`;
  document.getElementById("teamInfoGrid").innerHTML =
    tiCell("Last 5", ti.last5) + tiCell("Home / Away", ti.homeAway) +
    tiCell("Streak", ti.streak) + tiCell("Rankings", ti.rank);

  // Injuries
  const teamFont = (abbr) =>
    abbr === g.away.abbr ? g.away.colors.font : g.home.colors.font;
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
  document.getElementById("trendsGrid").innerHTML =
    trCell("Against the Spread", tr.ats) + trCell("Over / Under", tr.ou) +
    trCell("Public Betting", tr.public) + trCell("Line Movement", tr.line);

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
      `<div class="placeholder-note">Star a matchup to pin it here (persists in Phase 4).</div>`;
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
  selectSport(state.sport);   // load first sport
}
document.addEventListener("DOMContentLoaded", init);
