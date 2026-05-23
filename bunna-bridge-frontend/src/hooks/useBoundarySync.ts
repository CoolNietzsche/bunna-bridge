import { useEffect } from "react";
import {
  getSyncQueue, clearSyncQueue,
  setLotBoundary, setFarmBoundary,
} from "../api/boundary";

export function useBoundarySync() {
  const flush = async () => {
    const queue = getSyncQueue();
    if (queue.length === 0) return;

    console.log(`[BoundarySync] Flushing ${queue.length} queued boundaries…`);
    const failed: typeof queue = [];

    for (const item of queue) {
      try {
        if (item.type === "farm") {
          await setFarmBoundary(item.polygon);
        } else if (item.type === "lot" && item.id) {
          await setLotBoundary(item.id, item.polygon);
        }
        console.log(`[BoundarySync] ✅ Synced ${item.type} ${item.id ?? ""}`);
      } catch (err) {
        console.warn(`[BoundarySync] ❌ Failed ${item.type} ${item.id}`, err);
        failed.push(item);
      }
    }

    if (failed.length === 0) {
      clearSyncQueue();
    } else {
      localStorage.setItem("boundary_sync_queue", JSON.stringify(failed));
    }
  };

  useEffect(() => {
    if (navigator.onLine) flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);
}
