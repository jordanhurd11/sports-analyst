/* ===================================================================
   api.js  —  SINGLE source of data for the whole app.
   -------------------------------------------------------------------
   PHASE 2: NBA games come LIVE through our Vercel proxy
            (/api/games), which holds the balldontlie key in a
            server-side environment variable. No key ever reaches
            the browser or this repo. Everything else (NFL/MLB/NHL)
            and any error path falls back to the demo dataset below.

   Proxy location comes from js/config.js (public, committed).
   =================================================================== */

const SportsAPI = (() => {

  const PROXY = (typeof window !== "undefined" &&
                 window.SMARTBET_CONFIG?.proxyBase) || "";

  /* What the header chip should say after the last getGames() call */
  let lastSource = "DEMO DATA";

  /* In-memory cache so we respect the 5 req/min free tier */
  const cache = {};

  /* ---- NBA team colors, keyed by balldontlie abbreviation ---------
     font = readable on dark bg, g1/g2 = official pair for gradients */
  const NBA_COLORS = {
    ATL: { font: "#E03A3E", g1: "#E03A3E", g2: "#C1D32F" },
    BOS: { font: "#00C060", g1: "#007A33", g2: "#BA9653" },
    BKN: { font: "#FFFFFF", g1: "#444444", g2: "#8A97A8" },
    CHA: { font: "#00A9E0", g1: "#1D1160", g2: "#00788C" },
    CHI: { font: "#E5364C", g1: "#CE1141", g2: "#1A1A1A" },
    CLE: { font: "#FDBB30", g1: "#860038", g2: "#FDBB30" },
    DAL: { font: "#4D9FE0", g1: "#00538C", g2: "#B8C4CA" },
    DEN: { font: "#FEC524", g1: "#0E2240", g2: "#FEC524" },
    DET: { font: "#E5364C", g1: "#C8102E", g2: "#1D42BA" },
    GSW: { font: "#FFC72C", g1: "#1D428A", g2: "#FFC72C" },
    HOU: { font: "#E5364C", g1: "#CE1141", g2: "#C4CED4" },
    IND: { font: "#FDBB30", g1: "#002D62", g2: "#FDBB30" },
    LAC: { font: "#E5364C", g1: "#C8102E", g2: "#1D428A" },
    LAL: { font: "#FDB927", g1: "#552583", g2: "#FDB927" },
    MEM: { font: "#8CA9D6", g1: "#5D76A9", g2: "#12173F" },
    MIA: { font: "#F9A01B", g1: "#98002E", g2: "#F9A01B" },
    MIL: { font: "#3FBF7F", g1: "#00471B", g2: "#EEE1C6" },
    MIN: { font: "#78BE20", g1: "#0C2340", g2: "#78BE20" },
    NOP: { font: "#C9B37E", g1: "#0C2340", g2: "#85714D" },
    NYK: { font: "#F58426", g1: "#006BB6", g2: "#F58426" },
    OKC: { font: "#4DA8DF", g1: "#007AC1", g2: "#EF3B24" },
    ORL: { font: "#4DA8DF", g1: "#0077C0", g2: "#C4CED4" },
    PHI: { font: "#4DA8DF", g1: "#006BB6", g2: "#ED174C" },
    PHX: { font: "#E56020", g1: "#1D1160", g2: "#E56020" },
    POR: { font: "#E03A3E", g1: "#E03A3E", g2: "#1A1A1A" },
    SAC: { font: "#A57FC1", g1: "#5A2D81", g2: "#63727A" },
    SAS: { font: "#C4CED4", g1: "#333333", g2: "#C4CED4" },
    TOR: { font: "#E5364C", g1: "#CE1141", g2: "#A1A1A4" },
    UTA: { font: "#F9A01B", g1: "#002B5C", g2: "#F9A01B" },
    WAS: { font: "#E31837", g1: "#002B5C", g2: "#E31837" }
  };
  const DEFAULT_COLORS = { font: "#DBE7F4", g1: "#31404F", g2: "#7D8DA1" };

  /* ---- balldontlie → our game shape -------------------------------
     Missing free-tier fields (odds/trends/injuries/records) stay as
     placeholders until Phases 3 & 5. */
  function adaptGame(raw) {
    const isScheduled = typeof raw.status === "string" && raw.status.includes("T");
    const isFinal = /final/i.test(raw.status || "");
    const live = !isScheduled && !isFinal;

    let time;
    if (isFinal) {
      time = `FINAL · ${raw.date}`;
    } else if (isScheduled) {
      const d = new Date(raw.datetime || raw.status);
      time = isNaN(d)
        ? `${raw.status} · ${raw.date}`
        : `${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${raw.date}`;
    } else {
      time = `LIVE · ${raw.status}${raw.time ? " " + raw.time : ""}`;
    }

    const team = (t, score) => ({
      abbr: t.abbreviation,
      name: t.name,
      record: t.conference ? `${t.conference} Conference` : "",
      score: (isFinal || live) ? score : null,
      colors: NBA_COLORS[t.abbreviation] || DEFAULT_COLORS
    });

    return {
      id: `bdl-${raw.id}`,
      time,
      live,
      away: team(raw.visitor_team, raw.visitor_team_score),
      home: team(raw.home_team, raw.home_team_score),
      odds:  { spread: "—", moneyline: "— (Phase 5)", total: "—" },
      teamInfo: {
        last5:    { away: "—", home: "—" },
        homeAway: { away: "—", home: "—" },
        streak:   { away: "—", home: "—" },
        rank:     { away: "— (Phase 3)", home: "— (Phase 3)" }
      },
      injuries: [],
      trends: {
        ats: "— (Phase 5)", ou: "—",
        public: "—", line: "—"
      }
    };
  }

  function todayISO() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /* Ask for today plus recent days and last season's Finals window in
     ONE request, so the dashboard still shows real games during the
     offseason. We render the most recent date that has games. */
  function candidateDates() {
    const days = [];
    const d = new Date();
    for (let i = 0; i < 3; i++) {
      const p = (n) => String(n).padStart(2, "0");
      days.push(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
      d.setDate(d.getDate() - 1);
    }
    // June Finals window of the season just played
    const juneYear = new Date().getMonth() >= 9 ? new Date().getFullYear() : new Date().getFullYear();
    ["04", "06", "08", "11", "14", "17", "19"].forEach((dd) =>
      days.push(`${juneYear}-06-${dd}`)
    );
    return days;
  }

  async function fetchNBA() {
    const params = new URLSearchParams({ per_page: "100" });
    candidateDates().forEach((d) => params.append("dates[]", d));
    // No key here — the Vercel function attaches it server-side
    const res = await fetch(`${PROXY}/games?${params}`);
    if (!res.ok) throw new Error(`proxy HTTP ${res.status}`);
    const json = await res.json();
    const games = json.data || [];
    if (!games.length) throw new Error("no games returned");

    // keep only the most recent date that actually has games
    const latest = games.map((g) => g.date).sort().pop();
    return games.filter((g) => g.date === latest).map(adaptGame);
  }

  /* ---- Demo dataset (fallback + non-NBA sports until Phase 2b) ---- */
  const FAKE = {
    NBA: [
      {
        id: "nba-1",
        time: "7:30 PM ET",
        live: false,
        away: { abbr: "LAL", name: "Lakers", record: "41-22", score: null,
                colors: { font: "#FDB927", g1: "#552583", g2: "#FDB927" } },
        home: { abbr: "BOS", name: "Celtics", record: "48-15", score: null,
                colors: { font: "#00C060", g1: "#007A33", g2: "#BA9653" } },
        odds: { spread: "BOS -4.5", moneyline: "LAL +160 / BOS -190", total: "O/U 224.5" },
        teamInfo: {
          last5:   { away: "3-2", home: "4-1" },
          homeAway:{ away: "Away 18-13", home: "Home 27-4" },
          streak:  { away: "W1", home: "W3" },
          rank:    { away: "Off #8 / Def #12", home: "Off #3 / Def #2" }
        },
        injuries: [
          { player: "Anthony Davis", team: "LAL", status: "Questionable", cls: "inj-qb" },
          { player: "Kristaps Porzingis", team: "BOS", status: "Out", cls: "inj-out" }
        ],
        trends: {
          ats:  "BOS 7-3 ATS last 10",
          ou:   "Under 6-4 last 10",
          public: "68% of bets on BOS",
          line: "Opened -3.5 → now -4.5"
        }
      },
      {
        id: "nba-2",
        time: "LIVE · Q3 4:12",
        live: true,
        away: { abbr: "GSW", name: "Warriors", record: "36-27", score: 71,
                colors: { font: "#FFC72C", g1: "#1D428A", g2: "#FFC72C" } },
        home: { abbr: "DEN", name: "Nuggets", record: "45-18", score: 78,
                colors: { font: "#FEC524", g1: "#0E2240", g2: "#FEC524" } },
        odds: { spread: "DEN -6.5", moneyline: "GSW +210 / DEN -260", total: "O/U 228.5" },
        teamInfo: {
          last5:   { away: "2-3", home: "4-1" },
          homeAway:{ away: "Away 14-17", home: "Home 26-5" },
          streak:  { away: "L1", home: "W2" },
          rank:    { away: "Off #6 / Def #15", home: "Off #4 / Def #7" }
        },
        injuries: [
          { player: "Jamal Murray", team: "DEN", status: "Questionable", cls: "inj-qb" }
        ],
        trends: {
          ats:  "DEN 8-2 ATS at home",
          ou:   "Over 7-3 last 10",
          public: "74% of bets on DEN",
          line: "Opened -5.5 → now -6.5"
        }
      }
    ],
    NFL: [
      {
        id: "nfl-1",
        time: "1:00 PM ET",
        live: false,
        away: { abbr: "KC", name: "Chiefs", record: "11-3", score: null,
                colors: { font: "#FF4B5C", g1: "#E31837", g2: "#FFB81C" } },
        home: { abbr: "BUF", name: "Bills", record: "10-4", score: null,
                colors: { font: "#5B8DEF", g1: "#00338D", g2: "#C60C30" } },
        odds: { spread: "BUF -2.5", moneyline: "KC +120 / BUF -140", total: "O/U 48.5" },
        teamInfo: {
          last5:   { away: "4-1", home: "3-2" },
          homeAway:{ away: "Away 5-2", home: "Home 6-1" },
          streak:  { away: "W2", home: "L1" },
          rank:    { away: "Off #5 / Def #9", home: "Off #2 / Def #6" }
        },
        injuries: [
          { player: "Travis Kelce", team: "KC", status: "Questionable", cls: "inj-qb" },
          { player: "Matt Milano", team: "BUF", status: "Out", cls: "inj-out" }
        ],
        trends: {
          ats:  "KC 6-4 ATS as underdog",
          ou:   "Over 8-2 in BUF home games",
          public: "61% of bets on KC",
          line: "Opened -1.5 → now -2.5"
        }
      }
    ],
    MLB: [
      {
        id: "mlb-1",
        time: "8:05 PM ET",
        live: false,
        away: { abbr: "LAD", name: "Dodgers", record: "58-34", score: null,
                colors: { font: "#57A0E5", g1: "#005A9C", g2: "#A5ACAF" } },
        home: { abbr: "NYY", name: "Yankees", record: "55-37", score: null,
                colors: { font: "#AEBFD4", g1: "#0C2340", g2: "#C4CED3" } },
        odds: { spread: "NYY -1.5", moneyline: "LAD -125 / NYY +105", total: "O/U 8.5" },
        teamInfo: {
          last5:   { away: "4-1", home: "2-3" },
          homeAway:{ away: "Away 27-19", home: "Home 30-14" },
          streak:  { away: "W3", home: "L2" },
          rank:    { away: "Off #1 / Def #5", home: "Off #4 / Def #3" }
        },
        injuries: [
          { player: "Gerrit Cole", team: "NYY", status: "Out", cls: "inj-out" }
        ],
        trends: {
          ats:  "LAD 7-3 run line last 10",
          ou:   "Under 6-4 last 10",
          public: "57% of bets on LAD",
          line: "Opened +100 → now +105"
        }
      }
    ],
    NHL: [
      {
        id: "nhl-1",
        time: "7:00 PM ET",
        live: false,
        away: { abbr: "COL", name: "Avalanche", record: "42-20", score: null,
                colors: { font: "#D75A74", g1: "#6F263D", g2: "#236192" } },
        home: { abbr: "VGK", name: "Golden Knights", record: "40-22", score: null,
                colors: { font: "#C9B37E", g1: "#B4975A", g2: "#333F42" } },
        odds: { spread: "VGK -1.5", moneyline: "COL -110 / VGK -110", total: "O/U 6.5" },
        teamInfo: {
          last5:   { away: "3-2", home: "3-2" },
          homeAway:{ away: "Away 20-11", home: "Home 24-7" },
          streak:  { away: "W1", home: "W1" },
          rank:    { away: "Off #3 / Def #8", home: "Off #7 / Def #4" }
        },
        injuries: [
          { player: "Gabriel Landeskog", team: "COL", status: "Out", cls: "inj-out" }
        ],
        trends: {
          ats:  "VGK 6-4 puck line at home",
          ou:   "Over 5-5 last 10",
          public: "52% of bets on VGK",
          line: "Opened -105 → now -110"
        }
      }
    ]
  };

  const SPORTS = Object.keys(FAKE); // ["NBA","NFL","MLB","NHL"]

  /* ---- Public API -------------------------------------------------- */
  async function getGames(sport) {
    // Live path: NBA through the Vercel proxy
    if (sport === "NBA" && PROXY) {
      if (cache.NBA) {
        lastSource = "LIVE · NBA";
        return cache.NBA;
      }
      try {
        const games = await fetchNBA();
        cache.NBA = games;
        lastSource = "LIVE · NBA";
        return games;
      } catch (err) {
        console.warn("proxy fetch failed, using demo data:", err.message);
        lastSource = "DEMO · API OFFLINE";
        return [...FAKE.NBA];
      }
    }

    // Other sports stay demo until their APIs are wired up
    lastSource = "DEMO DATA";
    return new Promise((resolve) =>
      setTimeout(() => resolve(FAKE[sport] ? [...FAKE[sport]] : []), 150)
    );
  }

  function getSports() {
    return SPORTS;
  }

  function getSource() {
    return lastSource;
  }

  return { getSports, getGames, getSource };
})();
