import apiClient from "./client";

export interface GeoPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

// Set or update a lot's boundary polygon
export async function setLotBoundary(lotId: string, polygon: GeoPolygon) {
  const res = await apiClient.patch(`/v1/lots/${lotId}/boundary/`, {
    boundary: polygon,
  });
  return res.data;
}

// Inherit farm boundary into a lot
export async function inheritLotBoundary(lotId: string) {
  const res = await apiClient.post(`/v1/lots/${lotId}/boundary/inherit/`);
  return res.data;
}

// Update farmer profile boundary
export async function setFarmBoundary(polygon: GeoPolygon) {
  const res = await apiClient.patch(`/v1/auth/farmer/profile/`, {
    boundary: polygon,
  });
  return res.data;
}

// Calculate polygon area in hectares (client-side, no server needed)
/**
 * Geodesic area of a WGS84 polygon ring in hectares (spherical excess
 * approximation, as used by Leaflet.draw's geodesicArea). Accurate to well
 * under 1% at farm scale, unlike a planar shoelace on raw degrees.
 */
export function ringAreaHa(coords: number[][]): number {
  const R = 6378137; // metres
  const rad = Math.PI / 180;
  let total = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[(i + 1) % coords.length];
    total += (lng2 - lng1) * rad * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
  }
  const m2 = Math.abs((total * R * R) / 2);
  return Math.round(m2 / 100) / 100; // m² → ha, 2 decimals
}

export function calcAreaHa(polygon: GeoPolygon): number {
  return ringAreaHa(polygon.coordinates[0] as number[][]);
}

// Offline queue — save pending boundary to localStorage
export function queueBoundarySync(
  type: "lot" | "farm",
  id: string | null,
  polygon: GeoPolygon
) {
  const queue = JSON.parse(localStorage.getItem("boundary_sync_queue") || "[]");
  queue.push({ type, id, polygon, queuedAt: new Date().toISOString() });
  localStorage.setItem("boundary_sync_queue", JSON.stringify(queue));
}

export function getSyncQueue(): Array<{
  type: "lot" | "farm";
  id: string | null;
  polygon: GeoPolygon;
  queuedAt: string;
}> {
  return JSON.parse(localStorage.getItem("boundary_sync_queue") || "[]");
}

export function clearSyncQueue() {
  localStorage.removeItem("boundary_sync_queue");
}
