/* ===================================================================
   favorites.js — Saved matchups (Phase 4: persisted in localStorage).
   =================================================================== */

const Favorites = (() => {
  const STORAGE_KEY = "smartbet.favorites.v1";

  let items = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  })();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    catch { /* storage unavailable — favorites become session-only */ }
  }

  function list() { return [...items]; }

  function has(id) { return items.some((it) => it.id === id); }

  function toggle(fav) {
    if (has(fav.id)) {
      items = items.filter((it) => it.id !== fav.id);
    } else {
      items.push(fav);
    }
    persist();
    return has(fav.id);
  }

  function remove(id) {
    items = items.filter((it) => it.id !== id);
    persist();
  }

  return { list, has, toggle, remove };
})();
