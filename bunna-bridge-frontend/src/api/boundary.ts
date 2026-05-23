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
export function calcAreaHa(polygon: GeoPolygon): number {
  const coords = polygon.coordinates[0];
  // Shoelace formula on geographic coords → approximate hectares
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    area += coords[i][0] * coords[i + 1][1];
    area -= coords[i + 1][0] * coords[i][1];
  }
  const sqDeg = Math.abs(area / 2);
  // 1 degree² ≈ 12,308 km² at equator; convert to hectares
  return Math.round(sqDeg * 1230800000) / 100;
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
