/* ===================================================================
   mybets.js — the Bet Journal page. Reads the SAME localStorage as
   the dashboard sidebar (via tracker.js), so bets logged anywhere
   appear everywhere. All charts are hand-rolled SVG — no libraries.
   =================================================================== */

const els = {
  hBets:   document.getElementById("hBets"),
  hWin:    document.getElementById("hWin"),
  hNet:    document.getElementById("hNet"),
  hRoi:    document.getElementById("hRoi"),
  hStreak: document.getElementById("hStreak"),
  ring:    document.getElementById("heroRing"),
  form:    document.getElementById("betForm"),
  sport:   document.getElementById("betSport"),
  pick:    document.getElementById("betPick"),
  odds:    document.getElementById("betOdds"),
  units:   document.getElementById("betUnits"),
  list:    document.getElementById("betsList"),
  count:   document.getElementById("logCount"),
  filters: document.getElementById("statusFilters"),
};

let statusFilter = "all";
let slipMode = "single";
const parlayLegs = [];
const fmtOdds = (o) => (o > 0 ? `+${o}` : `${o}`);
const r2 = (n) => Math.round(n * 100) / 100;

function showToast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => {
    el.classList.add("out");
    el.addEventListener("animationend", () => el.remove());
  }, 2600);
}

/* ---------- Hero stats ---------- */
function renderHero() {
  const s = BetTracker.stats();
  els.hBets.textContent = s.count;
  els.hWin.textContent = `${s.winPct}%`;
  els.hNet.textContent = `${s.netUnits > 0 ? "+" : ""}${s.netUnits}u`;
  els.hNet.style.color =
    s.netUnits > 0 ? "var(--green)" : s.netUnits < 0 ? "var(--danger)" : "";
  els.hRoi.textContent = `${s.roi > 0 ? "+" : ""}${s.roi}%`;
  els.hRoi.style.color =
    s.roi > 0 ? "var(--green)" : s.roi < 0 ? "var(--danger)" : "";
  els.hStreak.textContent = s.streak || "—";
  els.hStreak.style.color =
    s.streak.startsWith("W") ? "var(--green)" :
    s.streak.startsWith("L") ? "var(--danger)" : "";
  // ring: r=34 → circumference 213.6
  els.ring.style.strokeDashoffset = 213.6 * (1 - s.winPct / 100);
}

/* ---------- Bankroll curve ---------- */
function renderBankroll() {
  const el = document.getElementById("bankrollChart");
  const settled = BetTracker.list()
    .filter((b) => b.result !== "pending")
    .sort((a, b) => a.ts - b.ts);
  if (settled.length < 2) {
    el.innerHTML = `<div class="placeholder-note">Settle at least two bets and your bankroll curve draws itself here.</div>`;
    return;
  }
  let cum = 0;
  const pts = [0, ...settled.map((b) => (cum += BetTracker.profit(b)))];
  const W = 640, H = 210, P = 30;
  const min = Math.min(0, ...pts), max = Math.max(0, ...pts);
  const range = (max - min) || 1;
  const x = (i) => P + (i / (pts.length - 1)) * (W - 2 * P);
  const y = (v) => H - P - ((v - min) / range) * (H - 2 * P);
  const line = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - P} L${P},${H - P} Z`;
  const last = Math.round(pts[pts.length - 1] * 100) / 100;

  el.innerHTML = `
  <svg viewBox="0 0 ${W} ${H}" class="bk-svg">
    <defs>
      <linearGradient id="bkFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(0,229,255,.30)"/>
        <stop offset="1" stop-color="rgba(0,229,255,0)"/>
      </linearGradient>
    </defs>
    <line x1="${P}" y1="${y(0)}" x2="${W - P}" y2="${y(0)}" class="bk-zero"/>
    <path d="${area}" fill="url(#bkFill)"/>
    <path d="${line}" class="bk-line"/>
    ${pts.map((v, i) =>
      `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3"
         class="bk-dot ${v >= 0 ? "pos" : "neg"}">
         <title>${i === 0 ? "Start" : `After bet ${i}: ${v >= 0 ? "+" : ""}${Math.round(v * 100) / 100}u`}</title>
       </circle>`).join("")}
  </svg>
  <div class="bk-meta">
    <span>start · 0u</span>
    <span style="color:${last >= 0 ? "var(--green)" : "var(--danger)"}">
      now · ${last >= 0 ? "+" : ""}${last}u</span>
  </div>`;
}

/* ---------- Results donut ---------- */
function renderDonut() {
  const el = document.getElementById("donutChart");
  const bets = BetTracker.list();
  if (!bets.length) {
    el.innerHTML = `<div class="placeholder-note">Your win/loss split appears here.</div>`;
    return;
  }
  const counts = { win: 0, loss: 0, push: 0, pending: 0 };
  bets.forEach((b) => { counts[b.result] = (counts[b.result] || 0) + 1; });
  const colors = {
    win: "#2ee6a8", loss: "#ff5d5d", push: "#ffc857", pending: "#7d8da1"
  };
  const R = 34, C = 2 * Math.PI * R;
  let off = 0, segs = "";
  for (const k of ["win", "loss", "push", "pending"]) {
    if (!counts[k]) continue;
    const len = (counts[k] / bets.length) * C;
    segs += `<circle cx="45" cy="45" r="${R}" class="donut-seg" stroke="${colors[k]}"
       stroke-dasharray="${len - 1.5} ${C - len + 1.5}" stroke-dashoffset="${-off}"
       transform="rotate(-90 45 45)"><title>${k}: ${counts[k]}</title></circle>`;
    off += len;
  }
  el.innerHTML = `
    <svg viewBox="0 0 90 90" class="donut-svg">${segs}
      <text x="45" y="43" class="donut-num">${bets.length}</text>
      <text x="45" y="56" class="donut-sub">bets</text>
    </svg>
    <div class="donut-legend">
      ${["win", "loss", "push", "pending"].filter((k) => counts[k])
        .map((k) => `<span><i style="background:${colors[k]}"></i>${k} · ${counts[k]}</span>`).join("")}
    </div>`;
}

/* ---------- Per-sport bars ---------- */
function renderSportBars() {
  const el = document.getElementById("sportBars");
  const by = {};
  BetTracker.list()
    .filter((b) => b.result === "win" || b.result === "loss")
    .forEach((b) => {
      by[b.sport] = by[b.sport] || { w: 0, l: 0 };
      b.result === "win" ? by[b.sport].w++ : by[b.sport].l++;
    });
  const entries = Object.entries(by);
  if (!entries.length) {
    el.innerHTML = `<div class="placeholder-note">Settled bets break down by sport here.</div>`;
    return;
  }
  const max = Math.max(...entries.map(([, v]) => v.w + v.l));
  el.innerHTML = entries.map(([sport, v]) => `
    <div class="sb-row">
      <span class="sb-name">${sport}</span>
      <div class="sb-bar">
        <span class="sb-win" style="width:${(v.w / max) * 100}%"></span>
        <span class="sb-loss" style="width:${(v.l / max) * 100}%"></span>
      </div>
      <span class="sb-rec">${v.w}-${v.l}</span>
    </div>`).join("");
}

/* ---------- Bet log ---------- */
function betItemHtml(b) {
  const p = BetTracker.profit(b);
  const settled = b.result === "win" || b.result === "loss";
  const when = new Date(b.ts).toLocaleDateString([], { month: "short", day: "numeric" });
  const resultBtn = (r, label) =>
    `<button class="bi-btn ${r} ${b.result === r ? "on" : ""}"
       data-id="${b.id}" data-result="${r}" title="Mark ${r}">${label}</button>`;
  const net = settled
    ? `${p > 0 ? "+" : ""}${r2(p)}u`
    : b.result === "push" ? "push"
    : `<span class="bi-towin">to win +${r2(BetTracker.potential(b))}u</span>`;
  const isParlay = !!b.legs;
  const title = isParlay ? `${b.legs.length}-Leg Parlay` : b.pick;
  const oddsLabel = isParlay
    ? fmtOdds(BetTracker.parlayOdds(b.legs).american)
    : fmtOdds(b.odds);
  const legsHtml = isParlay
    ? `<div class="bi-legs">${b.legs.map((l) =>
        `<div>· ${l.pick} <em>${fmtOdds(l.odds)}</em></div>`).join("")}</div>`
    : "";
  return `
    <div class="bet-item ${isParlay ? "parlay" : ""} ${b.result}">
      <div class="bi-top">
        <span class="bi-pick">${title}</span>
        <span class="bi-net">${net}</span>
      </div>
      ${legsHtml}
      <div class="bi-bottom">
        <span class="bi-meta">${when} · ${b.sport} · ${oddsLabel} · ${b.units}u</span>
        <span class="bi-actions">
          ${resultBtn("win", "W")}${resultBtn("loss", "L")}${resultBtn("push", "P")}
          <button class="bi-btn bi-del" data-id="${b.id}" data-del="1" title="Delete">✕</button>
        </span>
      </div>
    </div>`;
}

function renderLog() {
  const all = BetTracker.list();
  const bets = statusFilter === "all"
    ? all : all.filter((b) => b.result === statusFilter);
  els.count.textContent = bets.length;
  if (!bets.length) {
    els.list.innerHTML = `<div class="placeholder-note">${
      all.length ? "Nothing matches this filter." : "Log your first bet on the left."}</div>`;
    return;
  }
  const parlays = bets.filter((b) => b.legs);
  const singles = bets.filter((b) => !b.legs);
  let html = "";
  if (parlays.length) {
    html += `<div class="log-sec">Parlays</div>` + parlays.map(betItemHtml).join("");
  }
  if (singles.length) {
    if (parlays.length) html += `<div class="log-sec">Straight Bets</div>`;
    html += singles.map(betItemHtml).join("");
  }
  els.list.innerHTML = html;
}

/* ---------- CSV export ---------- */
function exportCSV() {
  const bets = BetTracker.list();
  if (!bets.length) { showToast("No bets to export yet"); return; }
  const rows = [
    ["date", "type", "sport", "pick", "odds", "units", "result", "profit_units"],
    ...bets.map((b) => [
      new Date(b.ts).toISOString().slice(0, 10),
      b.legs ? "parlay" : "straight",
      b.sport,
      `"${(b.legs ? b.legs.map((l) => `${l.pick} ${l.odds}`).join(" + ") : b.pick)
        .replaceAll('"', '""')}"`,
      b.legs ? BetTracker.parlayOdds(b.legs).american : b.odds,
      b.units, b.result,
      Math.round(BetTracker.profit(b) * 100) / 100
    ])
  ];
  const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "smartbet-bets.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`Exported ${bets.length} bets to CSV`);
}

/* ---------- Wiring ---------- */
function renderAll() {
  renderHero();
  renderBankroll();
  renderDonut();
  renderSportBars();
  renderLog();
}

/* ---------- Slip modes (straight / parlay) ---------- */
function setSlipMode(mode) {
  slipMode = mode;
  document.querySelectorAll("#slipMode .chip").forEach((c) =>
    c.classList.toggle("on", c.dataset.mode === mode));
  const parlay = mode === "parlay";
  document.getElementById("addLegBtn").hidden = !parlay;
  document.getElementById("logBetBtn").textContent = parlay ? "+ Log Parlay" : "+ Log Bet";
  els.pick.required = !parlay;
  els.odds.required = !parlay;
  els.pick.placeholder = parlay ? "Leg (e.g. BOS ML)" : "Pick (e.g. BOS -4.5)";
  renderParlayLegs();
}

function renderParlayLegs() {
  const el = document.getElementById("parlayLegs");
  el.hidden = slipMode !== "parlay" || !parlayLegs.length;
  el.innerHTML = parlayLegs.map((l, i) => `
    <div class="pl-leg">
      <span>${l.pick}</span>
      <span>${fmtOdds(l.odds)} <button type="button" data-leg="${i}" title="Remove leg">✕</button></span>
    </div>`).join("");
  updatePayoutNote();
}

function updatePayoutNote() {
  const note = document.getElementById("payoutNote");
  const units = parseFloat(els.units.value);
  if (slipMode === "parlay") {
    if (parlayLegs.length < 2) {
      note.textContent = parlayLegs.length
        ? "Add one more leg to make it a parlay" : "";
      return;
    }
    const { dec, american } = BetTracker.parlayOdds(parlayLegs);
    const pay = units > 0 ? ` · ${units}u to win +${r2(units * (dec - 1))}u` : "";
    note.textContent = `${parlayLegs.length} legs · combined ${fmtOdds(american)}${pay}`;
  } else {
    const odds = parseInt(els.odds.value, 10);
    if (!Number.isFinite(odds) || odds === 0 || !(units > 0)) {
      note.textContent = "";
      return;
    }
    const pay = units * (odds > 0 ? odds / 100 : 100 / Math.abs(odds));
    note.textContent = `${units}u at ${fmtOdds(odds)} to win +${r2(pay)}u`;
  }
}

document.getElementById("slipMode").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) setSlipMode(chip.dataset.mode);
});
document.getElementById("addLegBtn").addEventListener("click", () => {
  const pick = els.pick.value.trim();
  const odds = parseInt(els.odds.value, 10);
  if (!pick || !Number.isFinite(odds) || odds === 0) {
    showToast("Enter a pick and its odds first");
    return;
  }
  if (parlayLegs.length >= 10) { showToast("Parlays max out at 10 legs"); return; }
  parlayLegs.push({ pick, odds });
  els.pick.value = "";
  els.odds.value = "";
  els.pick.focus();
  renderParlayLegs();
  showToast(`Leg ${parlayLegs.length} · ${pick}`);
});
document.getElementById("parlayLegs").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-leg]");
  if (!btn) return;
  parlayLegs.splice(Number(btn.dataset.leg), 1);
  renderParlayLegs();
});
[els.odds, els.units].forEach((inp) =>
  inp.addEventListener("input", updatePayoutNote));

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const units = parseFloat(els.units.value);

  if (slipMode === "parlay") {
    if (parlayLegs.length < 2) { showToast("A parlay needs at least 2 legs"); return; }
    if (!(units > 0)) { els.units.focus(); return; }
    const n = parlayLegs.length;
    BetTracker.addParlay({ legs: parlayLegs, units });
    parlayLegs.length = 0;
    els.form.reset();
    renderParlayLegs();
    renderAll();
    showToast(`${n}-leg parlay logged`);
    return;
  }

  const pick = els.pick.value.trim();
  const odds = parseInt(els.odds.value, 10);
  if (!pick || !Number.isFinite(odds) || odds === 0 || !(units > 0)) return;
  BetTracker.add({ sport: els.sport.value, pick, odds, units });
  els.form.reset();
  updatePayoutNote();
  renderAll();
  showToast(`Bet logged · ${pick}`);
});

els.list.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.del) {
    BetTracker.remove(btn.dataset.id);
  } else if (btn.dataset.result) {
    const bet = BetTracker.list().find((b) => b.id === btn.dataset.id);
    BetTracker.setResult(btn.dataset.id,
      bet && bet.result === btn.dataset.result ? "pending" : btn.dataset.result);
  }
  renderAll();
});

els.filters.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  statusFilter = chip.dataset.status;
  els.filters.querySelectorAll(".chip").forEach((c) =>
    c.classList.toggle("on", c === chip));
  renderLog();
});

document.getElementById("csvBtn").addEventListener("click", exportCSV);

renderAll();
