import api from "./client";

export interface Delivery {
  id: string;
  station: string | null;
  station_name: string | null;
  producer: string;
  producer_name: string;
  producer_ref: string;
  plot: string | null;
  plot_name: string | null;
  form: "cherry" | "parchment" | "dry_cherry";
  form_label: string;
  receipt_number: string;
  delivered_on: string;
  weight_kg: string;
  price_per_kg_etb: string | null;
  amount_due_etb: string | null;
  amount_paid_etb: string | null;
  paid_on: string | null;
  payment_reference: string;
  lot: string | null;
  lot_code: string | null;
  green_equivalent_kg: string | null;
  notes: string;
  transferred_to: { id: string; status: string; buyer: string } | null;
}

export interface DeliveryList {
  results: Delivery[];
  count?: number;
  summary: { weight_kg: string; paid_etb: string; due_etb: string };
}

export interface Transfer {
  id: string;
  seller: number;
  seller_name: string;
  buyer: number;
  buyer_name: string;
  reference: string;
  form: string;
  quantity_kg: string;
  price_per_kg_etb: string | null;
  notes: string;
  status: "offered" | "accepted" | "rejected" | "cancelled";
  status_label: string;
  deliveries: Delivery[];
  producers_count: number;
  plots_count: number;
  delivered_kg: string;
  created_at: string;
  responded_at: string | null;
}

export interface MyDelivery {
  id: string;
  receipt_number: string;
  delivered_on: string;
  form: string;
  weight_kg: string;
  price_per_kg_etb: string | null;
  amount_due_etb: string | null;
  amount_paid_etb: string | null;
  paid_on: string | null;
  received_by: string;
  station: string | null;
  lot: string | null;
}

const list = <T,>(data: T[] | { results: T[] }) => (Array.isArray(data) ? data : data.results);

export const getDeliveries = async (params: Record<string, string> = {}): Promise<DeliveryList> => {
  const { data } = await api.get("/v1/traceability/deliveries/", { params: { page_size: 200, ...params } });
  return { results: list<Delivery>(data), count: data.count, summary: data.summary };
};
export const createDelivery = async (input: Record<string, unknown>): Promise<Delivery> =>
  (await api.post("/v1/traceability/deliveries/", input)).data;
export const updateDelivery = async (id: string, input: Record<string, unknown>): Promise<Delivery> =>
  (await api.patch(`/v1/traceability/deliveries/${id}/`, input)).data;
export const deleteDelivery = async (id: string) => api.delete(`/v1/traceability/deliveries/${id}/`);
export const allocateDeliveries = async (lotId: string, deliveries: string[], green_ratio?: string) =>
  (await api.post(`/v1/lots/${lotId}/allocate-deliveries/`, { deliveries, green_ratio: green_ratio || null })).data as {
    detail: string; green_kg: string;
  };
export const getMyDeliveries = async () =>
  (await api.get("/v1/traceability/my-deliveries/")).data as { results: MyDelivery[]; summary: { weight_kg: string; paid_etb: string } };

export const getTransfers = async (direction?: "incoming" | "outgoing"): Promise<Transfer[]> =>
  list<Transfer>((await api.get("/v1/traceability/transfers/", { params: direction ? { direction } : {} })).data);
export const createTransfer = async (input: Record<string, unknown>): Promise<Transfer> =>
  (await api.post("/v1/traceability/transfers/", input)).data;
export const respondTransfer = async (id: string, action: "accept" | "reject"): Promise<Transfer> =>
  (await api.post(`/v1/traceability/transfers/${id}/respond/`, { action })).data;
export const cancelTransfer = async (id: string): Promise<Transfer> =>
  (await api.post(`/v1/traceability/transfers/${id}/cancel/`)).data;
export const getExporterChoices = async (search = "") =>
  (await api.get("/v1/traceability/exporters/", { params: search ? { search } : {} })).data as {
    id: number; name: string; email: string; country: string;
  }[];

export interface Sms { id: number; to: string; body: string; language: string; kind_label: string; status: string; error: string; created_at: string }
export const getProducerSms = async (producer: string): Promise<Sms[]> =>
  list<Sms>((await api.get("/v1/messaging/sms/", { params: { producer } })).data);

export const formatEtb = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;
