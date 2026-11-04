import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getServerWatchlist, mergeWatchlist, unwatch, watch } from "../api/market";

const KEY = "bb_watchlist";

function load(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

function store(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* private mode */ }
}

/**
 * Watchlist that follows the user across devices (M-4). Signed in, the server
 * is the source of truth; anything saved in this browser before is merged in
 * once. Signed out, it falls back to this browser only.
 */
export function useWatchlist() {
  const { isAuthenticated } = useAuth();
  const [ids, setIds] = useState<string[]>(load);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const local = load();
    let merged = false;
    try { merged = localStorage.getItem(`${KEY}_merged`) === "1"; } catch { /* ignore */ }
    (local.length && !merged ? mergeWatchlist(local) : getServerWatchlist())
      .then((server) => {
        if (cancelled) return;
        setIds(server);
        store(server);
        try { localStorage.setItem(`${KEY}_merged`, "1"); } catch { /* ignore */ }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const on = prev.includes(id);
      const next = on ? prev.filter((x) => x !== id) : [...prev, id];
      store(next);
      if (isAuthenticated) (on ? unwatch(id) : watch(id)).catch(() => undefined);
      return next;
    });
  }, [isAuthenticated]);

  const isWatched = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, isWatched };
}
