import api from "./client";

export type GeoPoint = { type: "Point"; coordinates: [number, number] };
export type GeoPolygon = { type: "Polygon"; coordinates: [number, number][][] };

export interface Producer {
  id: string;
  external_ref: string;
  name: string;
  phone: string;
  region: string;
  zone: string;
  woreda: string;
  kebele: string;
  cooperative: string;
  ectms_farmer_id: string;
  plots_count: number;
  eudr_consent: boolean;
  story_consent: boolean;
  created_at: string;
  archived_at: string | null;
}

export type DeforestationStatus = "clear" | "overlap" | "pending" | "no_data";

export interface Plot {
  id: string;
  producer: string;
  producer_name: string;
  name: string;
  ectms_farm_id: string;
  location: GeoPoint | null;
  boundary: GeoPolygon | null;
  geometry_type: "Point" | "Polygon" | null;
  area_ha: string | null;
  declared_area_ha: string | null;
  land_tenure: "owned" | "rented" | "communal" | "other";
  notes: string;
  geolocation_problem: string | null;
  deforestation_status: DeforestationStatus;
  deforestation_status_label: string;
  deforestation_checked_at: string | null;
  deforestation_datasets: string;
  forest_2020_overlap_pct: string | null;
  lots: { id: string; lot_id: string; quantity_kg: string }[];
}

export interface Consent {
  id: number;
  purpose: "eudr_sharing" | "story";
  purpose_label: string;
  granted: boolean;
  method: "in_app" | "paper" | "sms" | "witnessed";
  method_label: string;
  captured_by_email: string | null;
  captured_at: string;
  revoked_at: string | null;
}

export interface LotSource {
  id: string;
  plot: string;
  quantity_kg: string;
  delivery_reference: string;
  delivered_on: string | null;
  plot_detail: {
    id: string;
    name: string;
    producer_id: string;
    producer_name: string;
    geometry_type: "Point" | "Polygon" | null;
    geometry: GeoPoint | GeoPolygon | null;
    area_ha: string | null;
    deforestation_status: DeforestationStatus;
    geolocation_problem: string | null;
    eudr_consent: boolean;
  };
}

export interface Mitigation {
  id: number;
  kind: string;
  kind_label: string;
  notes: string;
  evidence: string | null;
  performed_by_email: string | null;
  performed_at: string;
}

export interface LotRisk {
  id: number;
  code: string;
  automatic: boolean;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  status: "open" | "mitigated" | "accepted" | "resolved";
  justification: string;
  mitigations: Mitigation[];
}

export interface EvidencePackage {
  id: string;
  sha256: string;
  plots_count: number;
  producers_count: number;
  total_kg: string;
  geojson_files: number;
  generated_by_email: string | null;
  generated_at: string;
  is_current: boolean;
}

export interface DdsReference {
  id: string;
  reference_number: string;
  verification_number: string;
  submitted_on: string | null;
  recorded_by_email: string;
  recorded_by_company: string;
  recorded_at: string;
}

export interface DueDiligenceSummary {
  has_sources: boolean;
  producers: number;
  plots: number;
  polygons: number;
  points: number;
  plots_clear: number;
  traced_kg: string;
  open_high_risks: number;
  open_risks: number;
  signed_off_at: string | null;
  package_generated_at: string | null;
  dds_recorded: boolean;
  channel: string;
}

export interface DueDiligence {
  lot: string;
  lot_id: string;
  is_owner: boolean;
  summary: DueDiligenceSummary;
  risks: LotRisk[];
  signoff: { id: number; conclusion: string; signed_by_email: string | null; signed_at: string } | null;
  signoff_current: boolean;
  package_blockers: string[];
  packages: EvidencePackage[];
  dds_references: DdsReference[];
  can_record_reference: boolean;
}

export interface ImportResult {
  dry_run: boolean;
  saved: boolean;
  rows?: number;
  features?: number;
  producers_created: number;
  producers_updated?: number;
  plots_created: number;
  consents_recorded?: number;
  errors: { row: number; error: string }[];
}

const list = <T,>(data: T[] | { results: T[] }) => (Array.isArray(data) ? data : data.results);

// ── Producers ──
export const getProducers = async (search = ""): Promise<Producer[]> => {
  const { data } = await api.get("/v1/traceability/producers/", { params: search ? { search } : {} });
  return list<Producer>(data);
};
export const getProducer = async (id: string): Promise<Producer> =>
  (await api.get(`/v1/traceability/producers/${id}/`)).data;
export const createProducer = async (input: Partial<Producer>): Promise<Producer> =>
  (await api.post("/v1/traceability/producers/", input)).data;
export const updateProducer = async (id: string, input: Partial<Producer>): Promise<Producer> =>
  (await api.patch(`/v1/traceability/producers/${id}/`, input)).data;
export const archiveProducer = async (id: string) => api.delete(`/v1/traceability/producers/${id}/`);

export const getConsents = async (producerId: string): Promise<Consent[]> =>
  list<Consent>((await api.get(`/v1/traceability/producers/${producerId}/consents/`)).data);
export const recordConsent = async (producerId: string, form: FormData): Promise<Consent> =>
  (await api.post(`/v1/traceability/producers/${producerId}/consents/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })).data;

// ── Plots ──
export const getPlots = async (params: { producer?: string; search?: string } = {}): Promise<Plot[]> =>
  list<Plot>((await api.get("/v1/traceability/plots/", { params })).data);
export const createPlot = async (input: Partial<Plot>): Promise<Plot> =>
  (await api.post("/v1/traceability/plots/", input)).data;
export const updatePlot = async (id: string, input: Partial<Plot>): Promise<Plot> =>
  (await api.patch(`/v1/traceability/plots/${id}/`, input)).data;
export const archivePlot = async (id: string) => api.delete(`/v1/traceability/plots/${id}/`);
export const recheckPlot = async (id: string): Promise<Plot & { check_message: string }> =>
  (await api.post(`/v1/traceability/plots/${id}/recheck/`)).data;

// ── Imports ──
const upload = async (url: string, file: File, dryRun: boolean, extra: Record<string, string> = {}) => {
  const form = new FormData();
  form.append("file", file);
  form.append("dry_run", dryRun ? "1" : "0");
  Object.entries(extra).forEach(([k, v]) => form.append(k, v));
  try {
    return (await api.post<ImportResult>(url, form, { headers: { "Content-Type": "multipart/form-data" } })).data;
  } catch (err: unknown) {
    const data = (err as { response?: { data?: ImportResult } }).response?.data;
    if (data && Array.isArray(data.errors)) return data;
    throw err;
  }
};
export const importProducers = (file: File, dryRun: boolean) =>
  upload("/v1/traceability/producers/import/", file, dryRun);
export const importPlots = (file: File, dryRun: boolean, producer?: string) =>
  upload("/v1/traceability/plots/import/", file, dryRun, producer ? { producer } : {});

// ── Lot sources ──
export const getLotSources = async (lotId: string): Promise<LotSource[]> =>
  list<LotSource>((await api.get(`/v1/lots/${lotId}/sources/`)).data);
export const addLotSource = async (lotId: string, input: { plot: string; quantity_kg: string; delivery_reference?: string; delivered_on?: string | null }) =>
  (await api.post(`/v1/lots/${lotId}/sources/`, input)).data as LotSource;
export const updateLotSource = async (lotId: string, id: string, input: Partial<LotSource>) =>
  (await api.patch(`/v1/lots/${lotId}/sources/${id}/`, input)).data as LotSource;
export const removeLotSource = async (lotId: string, id: string) => api.delete(`/v1/lots/${lotId}/sources/${id}/`);
export const convertLegacyLot = async (lotId: string) =>
  (await api.post(`/v1/lots/${lotId}/sources/convert-legacy/`)).data;

// ── Due diligence ──
export const getDueDiligence = async (lotId: string): Promise<DueDiligence> =>
  (await api.get(`/v1/lots/${lotId}/due-diligence/`)).data;
export const updateRisk = async (lotId: string, riskId: number, input: Partial<LotRisk>) =>
  (await api.patch(`/v1/lots/${lotId}/risks/${riskId}/`, input)).data as LotRisk;
export const addRisk = async (lotId: string, input: { severity: string; title: string; detail: string }) =>
  (await api.post(`/v1/lots/${lotId}/risks/`, input)).data as LotRisk;
export const addMitigation = async (lotId: string, riskId: number, form: FormData) =>
  (await api.post(`/v1/lots/${lotId}/risks/${riskId}/mitigations/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  })).data as LotRisk;
export const signOff = async (lotId: string, conclusion: string) =>
  (await api.post(`/v1/lots/${lotId}/sign-off/`, { conclusion })).data;
export const generatePackage = async (lotId: string): Promise<EvidencePackage> =>
  (await api.post(`/v1/lots/${lotId}/evidence-packages/`)).data;
export const recordDdsReference = async (lotId: string, input: { reference_number: string; verification_number?: string; submitted_on?: string | null }) =>
  (await api.post(`/v1/lots/${lotId}/dds-references/`, input)).data as DdsReference;

async function saveBlob(url: string, fallbackName: string) {
  const res = await api.get(url, { responseType: "blob" });
  const disposition = (res.headers["content-disposition"] as string | undefined) ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const href = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = match?.[1] ?? fallbackName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}
export const downloadPackage = (lotId: string, pkgId: string) =>
  saveBlob(`/v1/lots/${lotId}/evidence-packages/${pkgId}/download/`, "evidence-package.zip");
export const downloadRecordsExport = () =>
  saveBlob("/v1/traceability/records-export/", "eudr-records.csv");

export const apiError = (err: unknown): string => {
  const data = (err as { response?: { data?: unknown } }).response?.data;
  if (!data) return "Something went wrong. Please try again.";
  if (typeof data === "string") return data;
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === "string") {
    const extra = (obj.blockers ?? obj.open_risks ?? obj.open_high_risks ?? obj.producers) as string[] | undefined;
    return extra?.length ? `${obj.detail} ${extra.join("; ")}` : obj.detail;
  }
  return Object.entries(obj)
    .map(([k, v]) => `${k === "non_field_errors" ? "" : k + ": "}${Array.isArray(v) ? v.flat().join(" ") : String(v)}`)
    .join(" · ");
};
