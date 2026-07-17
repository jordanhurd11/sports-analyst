/* ===================================================================
   favorites.js — Saved matchups/teams (Phase 4 makes this persistent).
   Phase 1: in-memory only so the star button works during a session.
   =================================================================== */

const Favorites = (() => {
  const STORAGE_KEY = "smartbet.favorites.v1";
  let items = [];        // Phase 4: hydrate from localStorage

  function list() { return [...items]; }

  function has(id) { return items.some((it) => it.id === id); }

  function toggle(fav) {
    if (has(fav.id)) {
      items = items.filter((it) => it.id !== fav.id);
    } else {
      items.push(fav);
    }
    return has(fav.id);
  }

  function remove(id) { items = items.filter((it) => it.id !== id); }

  return { list, has, toggle, remove };
})();
