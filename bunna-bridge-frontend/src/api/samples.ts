import api from "./client";

export interface SampleRequest {
  id: string;
  lot: string;
  lot_name: string;
  lot_ref: string;
  lot_region: string;
  buyer: number;
  buyer_name: string;
  buyer_email: string;
  buyer_company: string;
  status: "pending" | "approved" | "rejected" | "shipped" | "received";
  quantity_g: number;
  message: string;
  response: string;
  shipping_address: string;
  tracking_number: string;
  created_at: string;
  updated_at: string;
}

export const getSampleRequests = async (): Promise<SampleRequest[]> => {
  const { data } = await api.get("/v1/sample-requests/");
  return data.results ?? data;
};

export const createSampleRequest = async (payload: {
  lot: string;
  quantity_g: number;
  message: string;
  shipping_address: string;
}): Promise<SampleRequest> => {
  const { data } = await api.post("/v1/sample-requests/", payload);
  return data;
};

export const respondToSample = async (
  id: string,
  payload: { status: string; response: string; tracking_number?: string }
): Promise<SampleRequest> => {
  const { data } = await api.post(`/v1/sample-requests/${id}/respond/`, payload);
  return data;
};

export const updateLotStatus = async (
  lotId: string,
  status: string
): Promise<{ lot_id: string; status: string; export_ready: boolean }> => {
  const { data } = await api.patch(`/v1/lots/${lotId}/status/`, { status });
  return data;
};
