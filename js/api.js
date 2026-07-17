/* ===================================================================
   api.js  —  SINGLE source of data for the whole app.
   -------------------------------------------------------------------
   PHASE 1: returns hardcoded fake data (no network).
   PHASE 2+: replace the bodies of these functions with real fetch()
             calls. Keep the SAME return shape and the rest of the app
             keeps working untouched.

   ⚠️  Anything in this file ships publicly on GitHub Pages.
       Never put a secret API key here on a static host — see README.
   =================================================================== */

const SportsAPI = (() => {

  // ---- Fake dataset, keyed by sport --------------------------------
  const FAKE = {
    NBA: [
      {
        id: "nba-1",
        time: "7:30 PM ET",
        live: false,
        away: { abbr: "LAL", name: "Lakers", record: "41-22", score: null },
        home: { abbr: "BOS", name: "Celtics", record: "48-15", score: null },
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
        away: { abbr: "GSW", name: "Warriors", record: "36-27", score: 71 },
        home: { abbr: "DEN", name: "Nuggets", record: "45-18", score: 78 },
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
        away: { abbr: "KC", name: "Chiefs", record: "11-3", score: null },
        home: { abbr: "BUF", name: "Bills", record: "10-4", score: null },
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
        away: { abbr: "LAD", name: "Dodgers", record: "58-34", score: null },
        home: { abbr: "NYY", name: "Yankees", record: "55-37", score: null },
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
        away: { abbr: "COL", name: "Avalanche", record: "42-20", score: null },
        home: { abbr: "VGK", name: "Golden Knights", record: "40-22", score: null },
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

  // Simulate async so Phase 2 (real fetch) is a drop-in replacement.
  function getGames(sport) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(FAKE[sport] ? [...FAKE[sport]] : []), 150);
    });
  }

  function getSports() {
    return SPORTS;
  }

  return { getSports, getGames };
})();
