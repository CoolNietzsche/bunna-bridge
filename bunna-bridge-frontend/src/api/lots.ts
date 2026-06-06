import type { GeoPolygon } from './boundary';
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
  sca_score: number | null;
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
  tasting_notes: string;
  farm_story: string;
  compliance_score: number;
  is_eudr_ready: boolean;
  latest_sca_score: number | null;
  exporter_name: string;
  exporter_company: string;
  cupping_scores?: CuppingScore[];
  sample_requests_count?: number;
  offers_count?: number;
}

export interface CuppingScore {
  id: string;
  grader_name: string;
  status: string;
  total_score: number;
  fragrance_aroma: number;
  flavor: number;
  aftertaste: number;
  acidity: number;
  body: number;
  balance: number;
  uniformity: number;
  clean_cup: number;
  sweetness: number;
  overall: number;
  defects: number;
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

export const downloadEudrDds = async (lotId: string): Promise<void> => {
  const response = await api.get(`/v1/lots/${lotId}/eudr-dds/`, { responseType: "blob" });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  const disposition = response.headers["content-disposition"] || "";
  a.download = disposition.split("filename=")[1]?.replace(/['"]/g, "") || `EUDR-DDS-${lotId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
