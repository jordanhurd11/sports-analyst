/* ===================================================================
   api.js  —  SINGLE source of data for the whole app.
   -------------------------------------------------------------------
   LIVE (through our Vercel proxy /api/games, key server-side):
     NBA · NFL · MLB  — balldontlie free tier
     EPL              — balldontlie free tier (season/week based)
     NHL              — code ready, but balldontlie needs a paid tier;
                        falls back to demo until then.
   Anything that fails falls back to the demo dataset below.

   Proxy location comes from js/config.js (public, committed).
   =================================================================== */

const SportsAPI = (() => {

  const PROXY = (typeof window !== "undefined" &&
                 window.SMARTBET_CONFIG?.proxyBase) || "";

  /* What the header chip should say after the last getGames() call */
  let lastSource = "DEMO DATA";

  /* In-memory caches (respect the 5 req/min free tier) */
  const cache = {};
  let eplTeamsById = null;

  /* =================================================================
     TEAM COLORS  (font = readable on dark bg, g1/g2 = official pair)
     ================================================================= */
  const DEFAULT_COLORS = { font: "#DBE7F4", g1: "#31404F", g2: "#7D8DA1" };

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

  const NFL_COLORS = {
    ARI: { font: "#E8556F", g1: "#97233F", g2: "#FFB612" },
    ATL: { font: "#E04150", g1: "#A71930", g2: "#A5ACAF" },
    BAL: { font: "#A78BDA", g1: "#241773", g2: "#D0B240" },
    BUF: { font: "#5B8DEF", g1: "#00338D", g2: "#C60C30" },
    CAR: { font: "#0085CA", g1: "#0085CA", g2: "#101820" },
    CHI: { font: "#E87740", g1: "#0B162A", g2: "#C83803" },
    CIN: { font: "#FB4F14", g1: "#FB4F14", g2: "#101820" },
    CLE: { font: "#FF3C00", g1: "#311D00", g2: "#FF3C00" },
    DAL: { font: "#A5B4CC", g1: "#003594", g2: "#869397" },
    DEN: { font: "#FB4F14", g1: "#FB4F14", g2: "#002244" },
    DET: { font: "#0076B6", g1: "#0076B6", g2: "#B0B7BC" },
    GB:  { font: "#FFB612", g1: "#203731", g2: "#FFB612" },
    HOU: { font: "#D64C5E", g1: "#03202F", g2: "#A71930" },
    IND: { font: "#4D82C8", g1: "#002C5F", g2: "#A2AAAD" },
    JAX: { font: "#1BB5C9", g1: "#006778", g2: "#D7A22A" },
    KC:  { font: "#FF4B5C", g1: "#E31837", g2: "#FFB81C" },
    LV:  { font: "#C4C9CC", g1: "#1A1A1A", g2: "#A5ACAF" },
    LAC: { font: "#0080C6", g1: "#0080C6", g2: "#FFC20E" },
    LAR: { font: "#FFD100", g1: "#003594", g2: "#FFD100" },
    MIA: { font: "#2AB5BF", g1: "#008E97", g2: "#FC4C02" },
    MIN: { font: "#A67FE8", g1: "#4F2683", g2: "#FFC62F" },
    NE:  { font: "#9AAFD1", g1: "#002244", g2: "#C60C30" },
    NO:  { font: "#D3BC8D", g1: "#101820", g2: "#D3BC8D" },
    NYG: { font: "#4D7FDA", g1: "#0B2265", g2: "#A71930" },
    NYJ: { font: "#2FA36B", g1: "#125740", g2: "#9AA7B4" },
    PHI: { font: "#2FA79B", g1: "#004C54", g2: "#A5ACAD" },
    PIT: { font: "#FFB612", g1: "#101820", g2: "#FFB612" },
    SF:  { font: "#D64545", g1: "#AA0000", g2: "#B3995D" },
    SEA: { font: "#69BE28", g1: "#002244", g2: "#69BE28" },
    TB:  { font: "#E43D3D", g1: "#D50A0A", g2: "#34302B" },
    TEN: { font: "#4B92DB", g1: "#0C2340", g2: "#4B92DB" },
    WAS: { font: "#FFB612", g1: "#5A1414", g2: "#FFB612" }
  };

  const MLB_COLORS = {
    ARI: { font: "#D9565F", g1: "#A71930", g2: "#E3D4AD" },
    ATL: { font: "#E04150", g1: "#13274F", g2: "#CE1141" },
    BAL: { font: "#DF4601", g1: "#DF4601", g2: "#27251F" },
    BOS: { font: "#E0424D", g1: "#BD3039", g2: "#0C2340" },
    CHC: { font: "#4D82C8", g1: "#0E3386", g2: "#CC3433" },
    CHW: { font: "#C4CED4", g1: "#27251F", g2: "#C4CED4" },
    CWS: { font: "#C4CED4", g1: "#27251F", g2: "#C4CED4" },
    CIN: { font: "#E04150", g1: "#C6011F", g2: "#27251F" },
    CLE: { font: "#E0455A", g1: "#0C2340", g2: "#E31937" },
    COL: { font: "#A57FC1", g1: "#33006F", g2: "#C4CED4" },
    DET: { font: "#FA7B36", g1: "#0C2340", g2: "#FA4616" },
    HOU: { font: "#EB6E1F", g1: "#002D62", g2: "#EB6E1F" },
    KC:  { font: "#4D82C8", g1: "#004687", g2: "#BD9B60" },
    LAA: { font: "#E04150", g1: "#BA0021", g2: "#003263" },
    LAD: { font: "#57A0E5", g1: "#005A9C", g2: "#A5ACAF" },
    MIA: { font: "#00A3E0", g1: "#00A3E0", g2: "#EF3340" },
    MIL: { font: "#FFC52F", g1: "#12284B", g2: "#FFC52F" },
    MIN: { font: "#4D82C8", g1: "#002B5C", g2: "#D31145" },
    NYM: { font: "#FF5910", g1: "#002D72", g2: "#FF5910" },
    NYY: { font: "#AEBFD4", g1: "#0C2340", g2: "#C4CED3" },
    OAK: { font: "#2FA36B", g1: "#003831", g2: "#EFB21E" },
    ATH: { font: "#2FA36B", g1: "#003831", g2: "#EFB21E" },
    PHI: { font: "#E04150", g1: "#E81828", g2: "#002D72" },
    PIT: { font: "#FDB827", g1: "#27251F", g2: "#FDB827" },
    SD:  { font: "#FFC425", g1: "#2F241D", g2: "#FFC425" },
    SF:  { font: "#FD5A1E", g1: "#FD5A1E", g2: "#27251F" },
    SEA: { font: "#1FA9A0", g1: "#0C2C56", g2: "#005C5C" },
    STL: { font: "#E0424D", g1: "#C41E3A", g2: "#0C2340" },
    TB:  { font: "#8FBCE6", g1: "#092C5C", g2: "#8FBCE6" },
    TEX: { font: "#4D82C8", g1: "#003278", g2: "#C0111F" },
    TOR: { font: "#4D82C8", g1: "#134A8E", g2: "#E8291C" },
    WSH: { font: "#E04150", g1: "#AB0003", g2: "#14225A" },
    WSN: { font: "#E04150", g1: "#AB0003", g2: "#14225A" }
  };

  const EPL_COLORS = {
    ARS: { font: "#F14F58", g1: "#EF0107", g2: "#9C824A" },
    AVL: { font: "#95BFE5", g1: "#670E36", g2: "#95BFE5" },
    BOU: { font: "#E04A3F", g1: "#DA291C", g2: "#1A1A1A" },
    BRE: { font: "#E04A3F", g1: "#E30613", g2: "#FBB800" },
    BHA: { font: "#4D82DE", g1: "#0057B8", g2: "#FFCD00" },
    BUR: { font: "#94C9E8", g1: "#6C1D45", g2: "#99D6EA" },
    CHE: { font: "#4D82DE", g1: "#034694", g2: "#DBA111" },
    CRY: { font: "#7FA0E8", g1: "#1B458F", g2: "#C4122E" },
    EVE: { font: "#4D82DE", g1: "#003399", g2: "#9AA7B4" },
    FUL: { font: "#CFCFCF", g1: "#1A1A1A", g2: "#CC0000" },
    LEE: { font: "#FFCD00", g1: "#FFCD00", g2: "#1D428A" },
    LIV: { font: "#E0453F", g1: "#C8102E", g2: "#00B2A9" },
    MCI: { font: "#6CABDD", g1: "#6CABDD", g2: "#1C2C5B" },
    MUN: { font: "#E85449", g1: "#DA291C", g2: "#FBE122" },
    NEW: { font: "#C9CFD4", g1: "#241F20", g2: "#C4C9CC" },
    NFO: { font: "#E0453F", g1: "#DD0000", g2: "#1A1A1A" },
    SUN: { font: "#ED5565", g1: "#EB172B", g2: "#1A1A1A" },
    TOT: { font: "#C7CFDA", g1: "#132257", g2: "#C7CFDA" },
    WHU: { font: "#93BEE5", g1: "#7A263A", g2: "#1BB1E7" },
    WOL: { font: "#FDB913", g1: "#FDB913", g2: "#231F20" }
  };

  const LEAGUE_COLORS = {
    NBA: NBA_COLORS, NFL: NFL_COLORS, MLB: MLB_COLORS, EPL: EPL_COLORS
  };

  function teamColors(sport, abbr) {
    return (LEAGUE_COLORS[sport] || {})[abbr] || DEFAULT_COLORS;
  }

  /* =================================================================
     DATE HELPERS
     ================================================================= */
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function recentDates(n) {
    const out = [], d = new Date();
    for (let i = 0; i < n; i++) { out.push(iso(d)); d.setDate(d.getDate() - 1); }
    return out;
  }

  /* Empty placeholders until Phases 3 & 5 fill them from real data */
  function placeholderExtras() {
    return {
      odds: { spread: "—", moneyline: "— (Phase 5)", total: "—" },
      teamInfo: {
        last5:    { away: "—", home: "—" },
        homeAway: { away: "—", home: "—" },
        streak:   { away: "—", home: "—" },
        rank:     { away: "— (Phase 3)", home: "— (Phase 3)" }
      },
      injuries: [],
      trends: { ats: "— (Phase 5)", ou: "—", public: "—", line: "—" }
    };
  }

  /* =================================================================
     ADAPTERS — one per API response shape
     ================================================================= */

  /* NBA / NFL / NHL: { visitor_team, home_team, *_team_score, status } */
  function adaptVH(raw, sport) {
    const status = String(raw.status || "");
    const isFinal = /final/i.test(status);
    const isScheduled = status.includes("T") || /sched/i.test(status);
    const live = !isFinal && !isScheduled;
    const dateStr = String(raw.date || "").slice(0, 10);

    let time;
    if (isFinal) {
      time = `FINAL · ${dateStr}`;
    } else if (isScheduled) {
      const d = new Date(raw.datetime || raw.status || raw.date);
      time = isNaN(d)
        ? `${status} · ${dateStr}`
        : `${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${dateStr}`;
    } else {
      time = `LIVE · ${status}${raw.time ? " " + raw.time : ""}`;
    }

    const team = (t, score) => ({
      abbr: t.abbreviation,
      name: t.name,
      record: [t.conference, t.division].filter(Boolean).join(" "),
      score: (isFinal || live) ? score : null,
      colors: teamColors(sport, t.abbreviation)
    });

    return {
      id: `${sport.toLowerCase()}-${raw.id}`,
      time, live,
      away: team(raw.visitor_team, raw.visitor_team_score),
      home: team(raw.home_team, raw.home_team_score),
      ...placeholderExtras()
    };
  }

  /* MLB: { away_team, home_team, *_team_data.runs, status: "STATUS_*" } */
  function adaptMLB(raw) {
    const status = String(raw.status || "");
    const isFinal = /FINAL/i.test(status);
    const isScheduled = /SCHEDULED/i.test(status);
    const live = !isFinal && !isScheduled;
    const dateStr = String(raw.date || "").slice(0, 10);

    let time;
    if (isFinal) {
      time = `FINAL · ${dateStr}`;
    } else if (isScheduled) {
      const d = new Date(raw.date);
      time = isNaN(d)
        ? dateStr
        : `${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${dateStr}`;
    } else {
      time = `LIVE · INN ${raw.period || "?"}`;
    }

    const team = (t, data) => ({
      abbr: t.abbreviation,
      name: t.name,
      record: [t.league, t.division].filter(Boolean).join(" "),
      score: (isFinal || live) ? (data?.runs ?? null) : null,
      colors: teamColors("MLB", t.abbreviation)
    });

    return {
      id: `mlb-${raw.id}`,
      time, live,
      away: team(raw.away_team, raw.away_team_data),
      home: team(raw.home_team, raw.home_team_data),
      ...placeholderExtras()
    };
  }

  /* EPL: { home_team_id, away_team_id, home_score, away_score,
            kickoff, status: "C"=complete, week } + separate teams map */
  function adaptEPL(raw, byId) {
    const kickoff = new Date(raw.kickoff);
    const dateStr = String(raw.kickoff || "").slice(0, 10);
    const isFinal = raw.status === "C";
    const isScheduled = !isFinal &&
      (raw.status === "PreMatch" || kickoff.getTime() > Date.now());
    const live = !isFinal && !isScheduled;

    let time;
    if (isFinal) {
      time = `FT · ${dateStr}`;
    } else if (isScheduled) {
      time = `${kickoff.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${dateStr}`;
    } else {
      time = `LIVE · ${raw.clock_display || ""}`;
    }

    const team = (id, score) => {
      const t = byId[id] || { abbr: "?", name: `Team ${id}` };
      return {
        abbr: t.abbr,
        name: t.name,
        record: `Matchweek ${raw.week}`,
        score: (isFinal || live) ? score : null,
        colors: teamColors("EPL", t.abbr)
      };
    };

    return {
      id: `epl-${raw.id}`,
      time, live,
      away: team(raw.away_team_id, raw.away_score),
      home: team(raw.home_team_id, raw.home_score),
      ...placeholderExtras()
    };
  }

  /* =================================================================
     LIVE FETCHERS (all go through the Vercel proxy — no keys here)
     ================================================================= */
  async function proxyJSON(params) {
    const res = await fetch(`${PROXY}/games?${params}`);
    if (!res.ok) throw new Error(`proxy HTTP ${res.status}`);
    return res.json();
  }

  /* Shared: date-based leagues. Fetch candidates in ONE request, keep
     the most recent date that has games (offseason-safe). */
  async function fetchByDates(league, dates, adapt) {
    const params = new URLSearchParams({ league, per_page: "100" });
    dates.forEach((d) => params.append("dates[]", d));
    const json = await proxyJSON(params);
    const games = json.data || [];
    if (!games.length) throw new Error("no games returned");
    const latest = games.map((g) => String(g.date).slice(0, 10)).sort().pop();
    return games
      .filter((g) => String(g.date).slice(0, 10) === latest)
      .map(adapt);
  }

  const LIVE_FETCHERS = {
    NBA: () => fetchByDates(
      "nba",
      // today + 2 back, then last season's Finals window
      [...recentDates(3),
       "2026-06-04", "2026-06-06", "2026-06-08", "2026-06-11", "2026-06-14"],
      (g) => adaptVH(g, "NBA")
    ),
    NFL: () => fetchByDates(
      "nfl",
      // today + 2 back, then last season's playoffs/Super Bowl
      [...recentDates(3),
       "2026-02-08", "2026-01-25", "2026-01-18", "2026-01-11"],
      (g) => adaptVH(g, "NFL")
    ),
    MLB: () => fetchByDates(
      "mlb",
      recentDates(7), // in-season: last week always has games
      adaptMLB
    ),
    NHL: () => fetchByDates(
      "nhl",
      // balldontlie NHL needs a paid tier — this 401s on free keys and
      // falls back to demo. Ready if the key is ever upgraded.
      [...recentDates(3), "2026-06-05", "2026-06-08", "2026-06-10"],
      (g) => adaptVH(g, "NHL")
    ),
    EPL: async () => {
      // EPL is season/week based. Season year flips in August.
      const now = new Date();
      const current = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;

      const weekGames = async (season) => {
        const gJson = await proxyJSON(new URLSearchParams({
          league: "epl", season: String(season), week: "38", per_page: "100"
        }));
        return gJson.data || [];
      };

      // Prefer the current season's final matchweek; if it has no
      // completed games yet (mid-season, or stale upstream data),
      // show last season's title-deciding day instead.
      let season = current;
      let games = await weekGames(season);
      if (!games.some((g) => g.status === "C")) {
        season = current - 1;
        games = await weekGames(season);
      }
      if (!games.length) throw new Error("no games returned");

      // Team ids → names for the season we actually used (clubs change
      // between seasons via promotion/relegation)
      if (!eplTeamsById || eplTeamsById.season !== season) {
        const tJson = await proxyJSON(new URLSearchParams({
          league: "epl", endpoint: "teams",
          season: String(season), per_page: "100"
        }));
        eplTeamsById = { season };
        (tJson.data || []).forEach((t) => { eplTeamsById[t.id] = t; });
      }
      return games.map((g) => adaptEPL(g, eplTeamsById));
    }
  };

  /* =================================================================
     DEMO DATASET (fallback for every sport)
     ================================================================= */
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
    ],
    EPL: [
      {
        id: "epl-1",
        time: "10:00 AM ET",
        live: false,
        away: { abbr: "ARS", name: "Arsenal", record: "Matchweek 38", score: null,
                colors: { font: "#F14F58", g1: "#EF0107", g2: "#9C824A" } },
        home: { abbr: "MCI", name: "Manchester City", record: "Matchweek 38", score: null,
                colors: { font: "#6CABDD", g1: "#6CABDD", g2: "#1C2C5B" } },
        odds: { spread: "MCI -0.5", moneyline: "ARS +240 / MCI +115", total: "O/U 2.5" },
        teamInfo: {
          last5:   { away: "4-1", home: "3-2" },
          homeAway:{ away: "Away 12-4-3", home: "Home 15-2-2" },
          streak:  { away: "W2", home: "W1" },
          rank:    { away: "Att #2 / Def #1", home: "Att #1 / Def #4" }
        },
        injuries: [
          { player: "Bukayo Saka", team: "ARS", status: "Questionable", cls: "inj-qb" }
        ],
        trends: {
          ats:  "MCI unbeaten in last 8 home",
          ou:   "Over 2.5 in 6 of last 10",
          public: "58% of bets on MCI",
          line: "Opened +100 → now +115"
        }
      }
    ]
  };

  const SPORTS = ["NBA", "NFL", "MLB", "NHL", "EPL"];

  /* =================================================================
     PUBLIC API
     ================================================================= */
  async function getGames(sport) {
    const fetcher = LIVE_FETCHERS[sport];

    if (PROXY && fetcher) {
      if (cache[sport]) {
        lastSource = `LIVE · ${sport}`;
        return cache[sport];
      }
      try {
        const games = await fetcher();
        cache[sport] = games;
        lastSource = `LIVE · ${sport}`;
        return games;
      } catch (err) {
        console.warn(`${sport} live fetch failed, using demo data:`, err.message);
        lastSource = err.message.includes("401")
          ? `DEMO · ${sport} NOT IN FREE TIER`
          : "DEMO · API OFFLINE";
        return [...(FAKE[sport] || [])];
      }
    }

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
