import type { GeoPolygon } from './boundary';
import type { LotCertification } from '../lib/certifications';
import api from "./client";

export interface CoffeeLot {
  id: string;
  lot_id: string;
  name: string;
  status: "draft" | "listed" | "contracted" | "exported";
  region: string;
  altitude_m: number;
  processing: string;
  grade: string;
  varietal: string;
  kebele: string;
  washing_station: string;
  washing_station_facility: string | null;
  // DRF serialises DecimalFields as strings — always Number() before maths.
  sca_score: string | null;
  sca_verified?: boolean;
  readiness_percent?: number;
  flavor_notes: string;
  volume_kg: string;
  price_per_kg: string | null;
  deforestation_free: boolean;
  gps_verified: boolean;
  eudr_dds_ready: boolean;
  phyto_cert_uploaded: boolean;
  ecta_license_active: boolean;
  nbe_fx_declared: boolean;
  cta_floor_met: boolean;
  green_passport_ready: boolean;
  export_ready: boolean;
  harvest_date: string;
  created_at: string;
  q_grader_name: string;
  q_grader_cert_id: string;
  cupping_date: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  boundary?: GeoPolygon | null;
  // marketplace fields
  flavor_tags: string[];
  farm_photos: string[];
  available_qty_kg: string;
  fob_price_usd: string | null;
  min_order_kg: string;
  delivery_window: string;
  lot_type: "spot" | "forward" | "reserve";
  is_organic: boolean;
  is_fair_trade: boolean;
  is_rainforest_alliance: boolean;
  certifications: LotCertification[];
  tasting_notes: string;
  farm_story: string;
  compliance_score: number;
  is_eudr_ready: boolean;
  latest_sca_score: number | null;
  exporter?: number;
  exporter_name: string;
  exporter_company: string;
  farmer?: number | null;
  farmer_name?: string | null;
  farmer_farm_id?: string | null;
  cupping_scores?: CuppingScore[];
  sample_requests_count?: number;
  offers_count?: number;
  // detail-only (owner/admin see documents; everyone sees the report)
  gate_report?: GateReport[];
  exporter_verified?: boolean;
  eudr_dds_generated_at?: string | null;
  eudr_dds_reference?: string;
  phyto_cert_file?: string | null;
  phyto_cert_expiry?: string | null;
  ecex_permit_file?: string | null;
  ecex_permit_number?: string;
  ecex_permit_expiry?: string | null;
  nbe_fx_declaration_file?: string | null;
  customs_declaration_file?: string | null;
  customs_declaration_id?: string;
  eudr_dds_file?: string | null;
}

export interface GateReport {
  gate: string;
  label: string;
  passed: boolean;
  reason: string;
  action: string;
}

export interface ComplianceEvent {
  id: number;
  gate: string;
  old_value: boolean | null;
  new_value: boolean;
  actor_name: string;
  reason: string;
  created_at: string;
  hash: string;
}

export interface PublicLotStory {
  id: string;
  lot_id: string;
  name: string;
  region: string;
  washing_station: string;
  altitude_m: number;
  processing: string;
  grade: string;
  varietal: string;
  harvest_date: string;
  flavor_notes: string;
  tasting_notes: string;
  farm_story: string;
  flavor_tags: string[];
  farm_photos: string[];
  is_organic: boolean;
  is_fair_trade: boolean;
  is_rainforest_alliance: boolean;
  certifications: LotCertification[];
  latest_sca_score: number | null;
  latest_q_grader: string | null;
  compliance_score: number;
  export_ready: boolean;
  exporter_company: string;
  boundary_geojson: GeoPolygon | null;
  farm_location_geojson: { type: "Point"; coordinates: [number, number] } | null;
}

export interface CuppingScore {
  id: string;
  grader_name: string;
  status: string;
  total_score: number;
  fragrance_aroma: string;
  flavor: string;
  aftertaste: string;
  acidity: string;
  body: string;
  balance: string;
  uniformity: string;
  clean_cup: string;
  sweetness: string;
  overall: string;
  defects: string;
  flavor_notes: string;
  cupping_date: string;
}

export interface Offer {
  id: string;
  lot: string;
  lot_name: string;
  lot_id_display: string;
  lot_region: string;
  lot_fob_price: string | null;
  buyer: number;
  buyer_email: string;
  buyer_name: string;
  buyer_company: string;
  quantity_kg: string;
  price_per_kg_usd: string;
  delivery_window: string;
  notes: string;
  status: "pending" | "countered" | "accepted" | "rejected" | "withdrawn";
  counter_price: string | null;
  counter_qty: string | null;
  exporter_notes: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceCheck {
  lot_id: string;
  export_ready: boolean;
  green_passport_ready: boolean;
  failed_gates: string[];
  gates: Record<string, boolean>;
  readiness_percent: number;
  report: GateReport[];
  deforestation_check?: {
    status: 'clear' | 'overlap' | 'pending' | 'no_data';
    deforestation_free: boolean | null;
    overlap_count: number;
    message: string;
  };
}

export interface PaginatedLots {
  count: number;
  next: string | null;
  previous: string | null;
  results: CoffeeLot[];
}

export const getLots = async (params?: Record<string, string>) => {
  const query = params && Object.keys(params).length
    ? "?" + new URLSearchParams(params).toString()
    : "";
  const { data } = await api.get<PaginatedLots>(`/v1/lots/${query}`);
  return data;
};

export const getLot = async (id: string): Promise<CoffeeLot> => {
  const { data } = await api.get(`/v1/lots/${id}/`);
  if (data.properties) {
    const coords = data.geometry?.coordinates;
    return {
      id: data.id,
      ...data.properties,
      gps_lat: coords ? coords[1] : null,
      gps_lng: coords ? coords[0] : null,
    } as CoffeeLot;
  }
  return data as CoffeeLot;
};

export const getLotStory = async (id: string): Promise<PublicLotStory> => {
  const { data } = await api.get<PublicLotStory>(`/v1/lots/${id}/story/`);
  return data;
};

export const getComplianceCheck = async (id: string) => {
  const { data } = await api.get<ComplianceCheck>(`/v1/lots/${id}/compliance-check/`);
  return data;
};

export const updateLot = async (id: string, data: Record<string, unknown>): Promise<CoffeeLot> => {
  const { data: res } = await api.patch(`/v1/lots/${id}/`, data);
  if (res.type === "Feature") return { id: res.id, ...res.properties } as CoffeeLot;
  return res;
};

export const createLot = async (lot: Partial<CoffeeLot>) => {
  const { data } = await api.post<CoffeeLot>("/v1/lots/", lot);
  return data;
};

/** Synchronous version for JSON error responses (most mutations). */
export function apiErrorText(err: unknown, fallback = "Something went wrong."): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === "object" && !(data instanceof Blob)) {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    const first = Object.entries(d)[0];
    if (first) {
      const [field, val] = first;
      const msg = Array.isArray(val) ? val[0] : val;
      return field === "non_field_errors" ? String(msg) : `${field.replace(/_/g, " ")}: ${msg}`;
    }
  }
  return fallback;
}

/** Turn an axios error (including blob responses) into a readable message. */
export async function apiErrorMessage(err: unknown, fallback = "Something went wrong."): Promise<string> {
  const e = err as { response?: { data?: unknown } };
  let data = e?.response?.data;
  if (data instanceof Blob) {
    try { data = JSON.parse(await data.text()); } catch { return fallback; }
  }
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    const first = Object.entries(d)[0];
    if (first) {
      const [field, val] = first;
      const msg = Array.isArray(val) ? val[0] : val;
      return field === "non_field_errors" ? String(msg) : `${field.replace(/_/g, " ")}: ${msg}`;
    }
  }
  return fallback;
}

function saveBlob(data: BlobPart, type: string, disposition: string, fallbackName: string) {
  const blob = new Blob([data], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = disposition.split("filename=")[1]?.replace(/['"]/g, "") || fallbackName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Generates (and stores) the DDS, then downloads it. Throws an Error with the server's reason. */
export const downloadEudrDds = async (lotId: string): Promise<void> => {
  try {
    const response = await api.get(`/v1/lots/${lotId}/eudr-dds/`, { responseType: "blob" });
    saveBlob(response.data, "application/pdf", response.headers["content-disposition"] || "", `EUDR-DDS-${lotId}.pdf`);
  } catch (err) {
    throw new Error(await apiErrorMessage(err, "Could not generate the DDS."), { cause: err });
  }
};

export const downloadEudrGeoJson = async (lotId: string): Promise<void> => {
  try {
    const response = await api.get(`/v1/lots/${lotId}/eudr-geojson/`, { responseType: "blob" });
    saveBlob(response.data, "application/geo+json", response.headers["content-disposition"] || "", `${lotId}.geojson`);
  } catch (err) {
    throw new Error(await apiErrorMessage(err, "Could not export the geolocation."), { cause: err });
  }
};

export const getComplianceEvents = async (id: string) => {
  const { data } = await api.get<{ chain_valid: boolean; events: ComplianceEvent[] }>(
    `/v1/lots/${id}/compliance-events/`,
  );
  return data;
};

export const updateLotStatus = async (id: string, status: CoffeeLot["status"]) => {
  try {
    const { data } = await api.patch(`/v1/lots/${id}/status/`, { status });
    return data as { lot_id: string; status: CoffeeLot["status"]; export_ready: boolean };
  } catch (err) {
    throw new Error(await apiErrorMessage(err, "Could not update the status."), { cause: err });
  }
};

// ── Offers ────────────────────────────────────────────────────────────────────

export const getOffers = async () => {
  const { data } = await api.get<{ results: Offer[] }>("/v1/offers/");
  return data.results ?? data;
};

export const createOffer = async (payload: {
  lot: string;
  quantity_kg: number;
  price_per_kg_usd: number;
  delivery_window?: string;
  notes?: string;
}) => {
  const { data } = await api.post<Offer>("/v1/offers/", payload);
  return data;
};

export const respondToOffer = async (
  offerId: string,
  action: "accept" | "reject" | "counter",
  extra?: { counter_price?: number; counter_qty?: number; exporter_notes?: string }
) => {
  const { data } = await api.post<Offer>(`/v1/offers/${offerId}/respond/`, { action, ...extra });
  return data;
};

export const withdrawOffer = async (offerId: string) => {
  const { data } = await api.post<Offer>(`/v1/offers/${offerId}/withdraw/`);
  return data;
};

export const acceptCounter = async (offerId: string) => {
  const { data } = await api.post<Offer>(`/v1/offers/${offerId}/accept-counter/`);
  return data;
};

export async function uploadLotPhoto(lotId: string, photo: File): Promise<string[]> {
  const fd = new FormData();
  fd.append("photo", photo);
  const { data } = await api.post<{ farm_photos: string[] }>(
    `/v1/lots/${lotId}/photos/`,
    fd,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.farm_photos;
}

export async function deleteLotPhoto(lotId: string, url: string): Promise<string[]> {
  const { data } = await api.delete<{ farm_photos: string[] }>(`/v1/lots/${lotId}/photos/`, {
    data: { url },
  });
  return data.farm_photos;
}

export async function downloadSpecSheet(lotId: string, lotCode: string): Promise<void> {
  const response = await api.get(`/v1/lots/${lotId}/spec-sheet/`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `spec-sheet-${lotCode}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
