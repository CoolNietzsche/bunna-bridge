/**
 * Offline storage for the field app (roadmap O-4), in IndexedDB so it
 * survives closing the browser and holds photos too large for localStorage.
 *
 *   queue      items waiting to be sent to /traceability/field-sync/
 *   producers  farmers known on this phone (cached from the server + registered offline)
 */
import api from "../api/client";

export type ItemType = "producer" | "plot" | "consent" | "delivery";

export interface QueueItem {
  client_id: string;
  type: ItemType;
  data: Record<string, unknown>;
  label: string;
  created_at: string;
  error?: string;
}

export interface CachedProducer {
  id: string; // server id, or "client:<uuid>" for one registered offline
  name: string;
  external_ref?: string;
  kebele?: string;
  pending?: boolean;
}

const DB_NAME = "bb-field";
const DB_VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "client_id" });
      if (!db.objectStoreNames.contains("producers")) db.createObjectStore("producers", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? (req.result as T) : undefined);
    t.onerror = () => reject(t.error);
  });
}

export const newId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)));

export async function getQueue(): Promise<QueueItem[]> {
  const items = (await tx<QueueItem[]>("queue", "readonly", (s) => s.getAll())) ?? [];
  return items.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function enqueue(type: ItemType, data: Record<string, unknown>, label: string, clientId = newId()) {
  const item: QueueItem = { client_id: clientId, type, data, label, created_at: new Date().toISOString() };
  // Small delay-free ordering guarantee: created_at includes ms; add the counter for same-ms items.
  item.created_at = `${item.created_at}-${String(performance.now()).padStart(14, "0")}`;
  await tx("queue", "readwrite", (s) => s.put(item));
  return item;
}

export async function removeFromQueue(clientId: string) {
  await tx("queue", "readwrite", (s) => s.delete(clientId));
}

export async function getProducers(): Promise<CachedProducer[]> {
  const rows = (await tx<CachedProducer[]>("producers", "readonly", (s) => s.getAll())) ?? [];
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function putProducer(p: CachedProducer) {
  await tx("producers", "readwrite", (s) => s.put(p));
}

/** Replace the server copies in the cache, keeping farmers registered offline that are not synced yet. */
export async function refreshProducerCache(): Promise<void> {
  const { data } = await api.get("/v1/traceability/producers/", { params: { page_size: 1000 } });
  const list = (Array.isArray(data) ? data : data.results) as { id: string; name: string; external_ref: string; kebele: string }[];
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("producers", "readwrite");
    const store = t.objectStore("producers");
    const all = store.getAll();
    all.onsuccess = () => {
      for (const p of all.result as CachedProducer[]) if (!p.pending) store.delete(p.id);
      for (const p of list) store.put({ id: p.id, name: p.name, external_ref: p.external_ref, kebele: p.kebele });
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export interface SyncReport { sent: number; failed: number }

/** Send everything in the queue, oldest first. Items the server accepted are removed; failures keep their error. */
export async function syncQueue(): Promise<SyncReport> {
  const items = await getQueue();
  if (!items.length) return { sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    const { data } = await api.post("/v1/traceability/field-sync/", {
      items: batch.map(({ client_id, type, data }) => ({ client_id, type, data })),
    });
    for (const r of data.results as { client_id: string; status: string; id?: string; error?: string }[]) {
      const item = batch.find((b) => b.client_id === r.client_id);
      if (!item) continue;
      if (r.status === "created" || r.status === "duplicate") {
        await removeFromQueue(r.client_id);
        if (item.type === "producer" && r.id) {
          await tx("producers", "readwrite", (s) => s.delete(`client:${r.client_id}`));
          await putProducer({ id: r.id, name: String(item.data.name ?? ""), external_ref: String(item.data.external_ref ?? ""), kebele: String(item.data.kebele ?? "") });
        }
        sent += 1;
      } else {
        await tx("queue", "readwrite", (s) => s.put({ ...item, error: r.error ?? "Error" }));
        failed += 1;
      }
    }
  }
  return { sent, failed };
}

/** Read an image file as a JPEG data URL, scaled down so photos stay small on 3G. */
export function photoToDataUrl(file: File, maxSide = 1280, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read photo")); };
    img.src = url;
  });
}
