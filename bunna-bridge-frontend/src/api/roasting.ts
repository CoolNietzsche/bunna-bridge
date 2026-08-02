import api from "./client";

export type MachineType = "drum" | "fluid_bed" | "hybrid" | "other";

export interface RoastEquipment {
  id: string;
  name: string;
  machine_type: MachineType;
  brand: string;
  batch_capacity_kg: number | null;
  installed_date: string | null;
  created_at: string;
  updated_at: string;
}

export type RoastEquipmentInput = Omit<RoastEquipment, "id" | "created_at" | "updated_at">;

export type RoastBatchStatus = "queued" | "roasting" | "resting" | "qc" | "packaged" | "shipped";
export type RoastLevel = "light" | "medium" | "medium_dark" | "dark" | "";

export interface RoastBatchLotLine {
  id: string;
  lot: string;
  lot_id_display: string;
  lot_name: string;
  quantity_kg: number;
}

export interface RoastBatch {
  id: string;
  batch_code: string;
  equipment: string | null;
  equipment_name: string | null;
  status: RoastBatchStatus;
  roast_date: string | null;
  roast_level: RoastLevel;
  charge_temp_c: number | null;
  drop_temp_c: number | null;
  first_crack_time_s: number | null;
  development_time_s: number | null;
  output_weight_kg: number | null;
  input_weight_kg: number;
  weight_loss_pct: number | null;
  qc_score: number | null;
  qc_notes: string;
  notes: string;
  lot_inputs: RoastBatchLotLine[];
  created_at: string;
  updated_at: string;
}

export interface RoastBatchInput {
  batch_code: string;
  equipment?: string | null;
  roast_date?: string | null;
  roast_level?: RoastLevel;
  charge_temp_c?: number | null;
  drop_temp_c?: number | null;
  first_crack_time_s?: number | null;
  development_time_s?: number | null;
  output_weight_kg?: number | null;
  qc_score?: number | null;
  qc_notes?: string;
  notes?: string;
  lot_inputs: { lot: string; quantity_kg: number }[];
}

export interface AvailableLot {
  id: string;
  lot_id: string;
  name: string;
  region: string;
  grade: string;
  volume_kg: string;
}

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results;
}

// ── Equipment ──────────────────────────────────────────────────────────

export const getRoastEquipment = async (): Promise<RoastEquipment[]> => {
  const { data } = await api.get<RoastEquipment[] | { results: RoastEquipment[] }>("/v1/roasting/equipment/");
  return unwrap(data);
};

export const createRoastEquipment = async (input: Partial<RoastEquipmentInput>): Promise<RoastEquipment> => {
  const { data } = await api.post<RoastEquipment>("/v1/roasting/equipment/", input);
  return data;
};

export const updateRoastEquipment = async (id: string, input: Partial<RoastEquipmentInput>): Promise<RoastEquipment> => {
  const { data } = await api.patch<RoastEquipment>(`/v1/roasting/equipment/${id}/`, input);
  return data;
};

export const deleteRoastEquipment = async (id: string): Promise<void> => {
  await api.delete(`/v1/roasting/equipment/${id}/`);
};

// ── Batches ────────────────────────────────────────────────────────────

export const getRoastBatches = async (): Promise<RoastBatch[]> => {
  const { data } = await api.get<RoastBatch[] | { results: RoastBatch[] }>("/v1/roasting/batches/");
  return unwrap(data);
};

export const createRoastBatch = async (input: RoastBatchInput): Promise<RoastBatch> => {
  const { data } = await api.post<RoastBatch>("/v1/roasting/batches/", input);
  return data;
};

export const updateRoastBatch = async (id: string, input: Partial<RoastBatchInput>): Promise<RoastBatch> => {
  const { data } = await api.patch<RoastBatch>(`/v1/roasting/batches/${id}/`, input);
  return data;
};

export const deleteRoastBatch = async (id: string): Promise<void> => {
  await api.delete(`/v1/roasting/batches/${id}/`);
};

export const updateRoastBatchStatus = async (id: string, status: RoastBatchStatus): Promise<RoastBatch> => {
  const { data } = await api.patch<RoastBatch>(`/v1/roasting/batches/${id}/status/`, { status });
  return data;
};

// ── Available green lots (owned or bought via accepted offer) ───────────

export const getAvailableLots = async (): Promise<AvailableLot[]> => {
  const { data } = await api.get<AvailableLot[] | { results: AvailableLot[] }>("/v1/roasting/available-lots/");
  return unwrap(data);
};
