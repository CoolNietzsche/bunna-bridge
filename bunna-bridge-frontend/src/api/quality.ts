import api from "./client";

export const AFFECTIVE = ["fragrance", "aroma", "flavor", "aftertaste", "acidity", "sweetness", "mouthfeel", "overall"] as const;
export const DESCRIPTIVE = ["fragrance", "aroma", "flavor", "aftertaste", "acidity", "sweetness", "mouthfeel"] as const;
export const CATEGORIES = ["floral", "fruity", "berry", "dried_fruit", "citrus", "sour_fermented", "green_vegetative", "other", "roasted", "spices", "nutty_cocoa", "brown_sugar", "vanilla"] as const;
export type Affective = (typeof AFFECTIVE)[number];

export interface Cva {
  id: string;
  lot: string | null;
  lot_code: string | null;
  grader_name: string;
  status: "draft" | "submitted" | "confirmed";
  assessed_on: string;
  roast_level: string;
  intensities: Partial<Record<string, number>>;
  flavor_categories: string[];
  main_acid: string;
  mouthfeel_type: string;
  descriptors: string;
  fragrance: number; aroma: number; flavor: number; aftertaste: number; acidity: number; sweetness: number; mouthfeel: number; overall: number;
  non_uniform_cups: number;
  defective_cups: number;
  score: string;
  band: string;
  notes: string;
}
export type CvaInput = Omit<Cva, "id" | "lot" | "lot_code" | "grader_name" | "status" | "score" | "band" | "assessed_on"> & { assessed_on?: string };

export interface Physical {
  id: string;
  analysed_by_name: string | null;
  analysed_on: string;
  lab: string;
  sample_weight_g: number;
  moisture_pct: string | null;
  water_activity: string | null;
  density_g_l: string | null;
  screens: Record<string, number>;
  screen_18_plus: string;
  defects: Record<string, number>;
  quakers: number;
  odour: string;
  color: string;
  ecta_grade: string;
  ecta_certificate: string;
  primary_full_defects: number;
  secondary_full_defects: number;
  total_full_defects: number;
  sca_green_grade: string;
  warnings: string[];
  notes: string;
}

export interface Reference {
  affective: string[];
  descriptive: string[];
  flavor_categories: string[];
  screens: string[];
  defects: { key: string; label: string; category: number; per_full_defect: number }[];
}

export interface Latest { score: number; grader: string; method: string; date: string }

export const getReference = async (): Promise<Reference> => (await api.get("/v1/quality/reference/")).data;
export const getLotCva = async (lot: string): Promise<{ assessments: Cva[]; latest: Latest | null }> => (await api.get(`/v1/quality/lots/${lot}/cva/`)).data;
export const createLotCva = async (lot: string, input: CvaInput): Promise<Cva> => (await api.post(`/v1/quality/lots/${lot}/cva/`, input)).data;
export const confirmCva = async (id: string): Promise<Cva> => (await api.post(`/v1/quality/cva/${id}/confirm/`)).data;
export const getLotPhysical = async (lot: string): Promise<Physical[]> => (await api.get(`/v1/quality/lots/${lot}/physical/`)).data;
export const createLotPhysical = async (lot: string, input: Record<string, unknown>): Promise<Physical> => (await api.post(`/v1/quality/lots/${lot}/physical/`, input)).data;
export const createSamplePhysical = async (sid: number, input: Record<string, unknown>): Promise<Physical> => (await api.post(`/v1/quality/contract-samples/${sid}/physical/`, input)).data;

export interface CompareRow { key: string; label: string; pss: number | null; arrival: number | null; delta: number | null; flag: boolean }
export interface Comparison { pss: Record<string, unknown> | null; arrival: Record<string, unknown> | null; rows: CompareRow[]; flags: string[]; consistent: boolean }
export const getComparison = async (contract: string): Promise<Comparison> => (await api.get(`/v1/quality/contracts/${contract}/comparison/`)).data;

export interface Reliability {
  contracts: number; shipped: number; on_time_shipments: number; late_shipments: number; on_time_rate: number | null;
  claims: number; accepted_claims: number; claim_rate: number | null; pss_first_time_approval: number | null;
  average_cup_change_pss_to_arrival: number | null;
}
export const getReliability = async (userId: number | string): Promise<Reliability> => (await api.get(`/v1/quality/exporters/${userId}/reliability/`)).data;

export interface SessionRow { id: string; name: string; held_on: string; location: string; blind: boolean; notes: string; status: "open" | "closed" | "revealed"; status_label: string; owner_name: string; samples_count: number; graders_count: number }
export interface SessionSampleRow { id: number; code: string; position: number; name: string | null; lot: string | null; published_score: number | null; my_assessment: Cva | null }
export interface SessionResults {
  samples: { id: number; code: string; name: string; lot: string | null; n: number; mean: number | null; sd: number | null; min: number | null; max: number | null; published_score: number | null; attributes: Record<string, number | null>; descriptors: string[] }[];
  graders: { grader: string; cups: number; bias: number; mean_abs_deviation: number; calibrated: boolean }[];
  progress: { done: number; expected: number };
}
export interface SessionDetail extends SessionRow { is_organiser: boolean; is_grader: boolean; samples: SessionSampleRow[]; graders: { id: number; name: string; email: string }[]; results: SessionResults | null }

export const getSessions = async (): Promise<SessionRow[]> => (await api.get("/v1/quality/sessions/")).data;
export const createSession = async (input: Record<string, unknown>): Promise<SessionRow> => (await api.post("/v1/quality/sessions/", input)).data;
export const getSession = async (id: string): Promise<SessionDetail> => (await api.get(`/v1/quality/sessions/${id}/`)).data;
export const setSessionStatus = async (id: string, status: string): Promise<SessionDetail> => (await api.post(`/v1/quality/sessions/${id}/status/`, { status })).data;
export const addSessionSample = async (id: string, input: Record<string, unknown>) => (await api.post(`/v1/quality/sessions/${id}/samples/`, input)).data;
export const removeSessionSample = async (id: string, sid: number) => api.delete(`/v1/quality/sessions/${id}/samples/${sid}/`);
export const addSessionGrader = async (id: string, email: string) => (await api.post(`/v1/quality/sessions/${id}/graders/`, { email })).data;
export const removeSessionGrader = async (id: string, gid: number) => api.delete(`/v1/quality/sessions/${id}/graders/${gid}/`);
export const scoreSessionSample = async (id: string, sid: number, input: CvaInput & { draft?: boolean }): Promise<Cva> => (await api.post(`/v1/quality/sessions/${id}/samples/${sid}/score/`, input)).data;
export const publishSessionSample = async (id: string, sid: number) => (await api.post(`/v1/quality/sessions/${id}/samples/${sid}/publish/`)).data as { published_score: number };

export const cvaScore = (h: Record<Affective, number>, u = 0, d = 0) =>
  Math.round((0.65625 * AFFECTIVE.reduce((s, a) => s + Number(h[a] || 0), 0) + 52.75 - 2 * u - 4 * d) * 100) / 100;
export const label = (key: string) => key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
