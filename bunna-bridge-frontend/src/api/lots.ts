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
}

export interface ComplianceCheck {
  lot_id: string;
  export_ready: boolean;
  green_passport_ready: boolean;
  failed_gates: string[];
  gates: Record<string, boolean>;
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

// Detail endpoint returns GeoJSON — extract properties + id
export const getLot = async (id: string): Promise<CoffeeLot> => {
  const { data } = await api.get(`/v1/lots/${id}/`);
  // GeoFeatureModelSerializer wraps in { id, type, geometry, properties }
  if (data.properties) {
    return { id: data.id, ...data.properties } as CoffeeLot;
  }
  return data as CoffeeLot;
};

export const getComplianceCheck = async (id: string) => {
  const { data } = await api.get<ComplianceCheck>(`/v1/lots/${id}/compliance-check/`);
  return data;
};

export const createLot = async (lot: Partial<CoffeeLot>) => {
  const { data } = await api.post<CoffeeLot>("/v1/lots/", lot);
  return data;
};
