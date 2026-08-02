import api from "./client";

export interface WashingStation {
  id: string;
  name: string;
  region: string;
  location: string;
  capacity_kg_per_day: number | null;
  lots_count: number;
  created_at: string;
  updated_at: string;
}

export type WashingStationInput = Omit<WashingStation, "id" | "lots_count" | "created_at" | "updated_at">;

export const getWashingStations = async (): Promise<WashingStation[]> => {
  const { data } = await api.get<WashingStation[] | { results: WashingStation[] }>(
    "/v1/washing-stations/"
  );
  return Array.isArray(data) ? data : data.results;
};

export const createWashingStation = async (
  input: Partial<WashingStationInput>
): Promise<WashingStation> => {
  const { data } = await api.post<WashingStation>("/v1/washing-stations/", input);
  return data;
};

export const updateWashingStation = async (
  id: string,
  input: Partial<WashingStationInput>
): Promise<WashingStation> => {
  const { data } = await api.patch<WashingStation>(`/v1/washing-stations/${id}/`, input);
  return data;
};

export const deleteWashingStation = async (id: string): Promise<void> => {
  await api.delete(`/v1/washing-stations/${id}/`);
};
