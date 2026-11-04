import api from "./client";

export type ContractStatus = "draft" | "sent" | "signed" | "registered" | "shipped" | "completed" | "cancelled";

export interface ContractRow {
  id: string;
  number: string;
  lot: string;
  lot_code: string;
  lot_name: string;
  seller_name: string;
  buyer_name: string;
  quantity_kg: string;
  bags: number;
  price_usd_per_kg: string;
  value_usd: string;
  incoterm: string;
  named_place: string;
  shipment_from: string | null;
  shipment_to: string | null;
  status: ContractStatus;
  status_label: string;
  created_at: string;
}

export interface Money {
  contract_value_usd: string;
  accepted_claims_usd: string;
  amount_due_usd: string;
  received_usd: string;
  outstanding_usd: string;
  converted_usd: string;
  converted_etb: string;
  average_rate: string | null;
  required_conversion_usd: string;
  conversion_shortfall_usd: string;
  nbe_conversion_ok: boolean;
  retained_usd: string;
}

export interface Contract extends ContractRow {
  incoterm_label: string;
  payment_terms: string;
  payment_terms_label: string;
  advance_percent: string;
  terms_basis: string;
  terms_basis_label: string;
  quality_spec: string;
  pss_required: boolean;
  destination: string;
  notes: string;
  terms_hash: string;
  seller_signed_at: string | null;
  seller_signed_by_name: string | null;
  buyer_signed_at: string | null;
  buyer_signed_by_name: string | null;
  ecta_registration_number: string;
  ecta_registered_on: string | null;
  ecta_floor_price_usd: string | null;
  ecta_floor_source: string;
  cancelled_reason: string;
  my_party: "seller" | "buyer" | "forwarder" | "admin" | null;
  can_edit_terms: boolean;
  floor_check: { ok: boolean; message: string; floor_usd: string | null };
  pss_approved: boolean;
  money: Money | null;
}

export interface Sample {
  id: number;
  kind: "pss" | "arrival" | "type";
  kind_label: string;
  status: "sent" | "received" | "approved" | "rejected";
  status_label: string;
  sent_on: string | null;
  courier: string;
  tracking_number: string;
  weight_g: number;
  cup_score: string | null;
  moisture_pct: string | null;
  buyer_notes: string;
  created_at: string;
}

export interface Claim {
  id: number;
  reason: string;
  reason_label: string;
  description: string;
  amount_usd: string | null;
  status: "open" | "accepted" | "rejected" | "settled";
  status_label: string;
  resolution: string;
  raised_by_name: string | null;
  raised_at: string;
}

export interface ShipEvent { id: number; kind: string; kind_label: string; happened_at: string; location: string; note: string; recorded_by_name: string | null }
export interface ShipDoc {
  id: number;
  kind: string;
  kind_label: string;
  responsible: string;
  responsible_label: string;
  status: "missing" | "uploaded" | "approved" | "rejected" | "not_needed";
  status_label: string;
  number: string;
  issued_on: string | null;
  expires_on: string | null;
  is_expired: boolean;
  has_file: boolean;
  comment: string;
  uploaded_at: string | null;
}
export interface Shipment {
  id: string;
  forwarder: number | null;
  forwarder_name: string | null;
  booking_number: string;
  container_number: string;
  seal_number: string;
  shipping_line: string;
  vessel: string;
  voyage: string;
  bl_number: string;
  port_of_loading: string;
  port_of_discharge: string;
  bags: number | null;
  net_weight_kg: string | null;
  etd: string | null;
  eta: string | null;
  events: ShipEvent[];
  documents: ShipDoc[];
}

export interface PaymentRow {
  id: number;
  kind: string;
  kind_label: string;
  amount_usd: string;
  received_on: string;
  bank: string;
  reference: string;
  converted_usd: string | null;
  rate_etb_per_usd: string | null;
  converted_on: string | null;
  converted_etb: string | null;
}

export interface ConversationRow {
  id: string;
  lot: string;
  lot_code: string;
  lot_name: string;
  buyer_name: string;
  seller_name: string;
  contract: string | null;
  contract_number: string | null;
  last_message: string;
  last_message_at: string | null;
  unread: number;
  my_side: "buyer" | "seller";
}
export interface MessageRow { id: number; sender_name: string | null; sender_side: "buyer" | "seller" | null; body: string; has_attachment: boolean; created_at: string }

const blob = async (url: string, name: string) => {
  const res = await api.get(url, { responseType: "blob" });
  const href = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 2000);
};

const C = (id: string) => `/v1/trade/contracts/${id}`;

export const getContracts = async (params: Record<string, string> = {}): Promise<ContractRow[]> =>
  (await api.get("/v1/trade/contracts/", { params })).data;
export const getContract = async (id: string): Promise<Contract> => (await api.get(`${C(id)}/`)).data;
export const updateContract = async (id: string, input: Record<string, unknown>): Promise<Contract> =>
  (await api.patch(`${C(id)}/`, input)).data;
export const sendContract = async (id: string): Promise<Contract> => (await api.post(`${C(id)}/send/`)).data;
export const signContract = async (id: string, terms_hash: string): Promise<Contract> =>
  (await api.post(`${C(id)}/sign/`, { terms_hash })).data;
export const cancelContract = async (id: string, reason: string): Promise<Contract> =>
  (await api.post(`${C(id)}/cancel/`, { reason })).data;
export const registerContract = async (id: string, registration_number: string, registered_on: string): Promise<Contract> =>
  (await api.post(`${C(id)}/register/`, { registration_number, registered_on: registered_on || null })).data;
export const downloadContractPdf = (id: string, number: string) => blob(`${C(id)}/pdf/`, `Contract-${number}.pdf`);

export const getSamples = async (id: string): Promise<Sample[]> => (await api.get(`${C(id)}/samples/`)).data;
export const sendSample = async (id: string, input: Record<string, unknown>) => (await api.post(`${C(id)}/samples/`, input)).data;
export const decideSample = async (id: string, sid: number, input: Record<string, unknown>) =>
  (await api.post(`${C(id)}/samples/${sid}/decide/`, input)).data;

export const getClaims = async (id: string): Promise<Claim[]> => (await api.get(`${C(id)}/claims/`)).data;
export const raiseClaim = async (id: string, form: FormData) =>
  (await api.post(`${C(id)}/claims/`, form, { headers: { "Content-Type": "multipart/form-data" } })).data;
export const respondClaim = async (id: string, cid: number, input: Record<string, unknown>) =>
  (await api.post(`${C(id)}/claims/${cid}/respond/`, input)).data;

export const getShipments = async (id: string): Promise<Shipment[]> => (await api.get(`${C(id)}/shipments/`)).data;
export const createShipment = async (id: string, input: Record<string, unknown>): Promise<Shipment> =>
  (await api.post(`${C(id)}/shipments/`, input)).data;
export const updateShipment = async (sid: string, input: Record<string, unknown>): Promise<Shipment> =>
  (await api.patch(`/v1/trade/shipments/${sid}/`, input)).data;
export const addEvent = async (sid: string, input: Record<string, unknown>) =>
  (await api.post(`/v1/trade/shipments/${sid}/events/`, input)).data;
export const uploadShipDoc = async (sid: string, did: number, form: FormData) =>
  (await api.post(`/v1/trade/shipments/${sid}/documents/${did}/`, form, { headers: { "Content-Type": "multipart/form-data" } })).data;
export const reviewShipDoc = async (sid: string, did: number, review: "approved" | "rejected", comment = "") =>
  (await api.post(`/v1/trade/shipments/${sid}/documents/${did}/`, { review, comment })).data;
export const openShipDoc = async (sid: string, did: number) => {
  const res = await api.get(`/v1/trade/shipments/${sid}/documents/${did}/`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const getPayments = async (id: string): Promise<{ payments: PaymentRow[]; summary: Money }> =>
  (await api.get(`${C(id)}/payments/`)).data;
export const addPayment = async (id: string, input: Record<string, unknown>) => (await api.post(`${C(id)}/payments/`, input)).data;
export const updatePayment = async (id: string, pid: number, input: Record<string, unknown>) =>
  (await api.patch(`${C(id)}/payments/${pid}/`, input)).data;

export const getConversations = async (params: Record<string, string> = {}): Promise<{ results: ConversationRow[]; unread: number }> =>
  (await api.get("/v1/trade/conversations/", { params })).data;
export const startConversation = async (lot: string): Promise<ConversationRow> =>
  (await api.post("/v1/trade/conversations/", { lot })).data;
export const getMessages = async (cid: string): Promise<{ conversation: ConversationRow; messages: MessageRow[] }> =>
  (await api.get(`/v1/trade/conversations/${cid}/messages/`)).data;
export const sendMessage = async (cid: string, body: string, file?: File | null) => {
  const form = new FormData();
  form.append("body", body);
  if (file) form.append("attachment", file);
  return (await api.post(`/v1/trade/conversations/${cid}/messages/`, form, { headers: { "Content-Type": "multipart/form-data" } })).data as MessageRow;
};
export const openAttachment = async (cid: string, mid: number) => {
  const res = await api.get(`/v1/trade/conversations/${cid}/messages/${mid}/attachment/`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export interface FloorRow { id: string; grade: string; processing: string; region: string; min_price_usd_per_kg: string; valid_from: string; valid_to: string; source: string }
export const getFloorPrices = async (): Promise<FloorRow[]> => (await api.get("/v1/trade/floor-prices/")).data;
export const importFloorPrices = async (file: File, dryRun: boolean) => {
  const form = new FormData();
  form.append("file", file);
  form.append("dry_run", dryRun ? "1" : "0");
  try {
    return (await api.post("/v1/trade/floor-prices/", form, { headers: { "Content-Type": "multipart/form-data" } })).data;
  } catch (err: unknown) {
    const data = (err as { response?: { data?: unknown } }).response?.data;
    if (data && typeof data === "object" && "errors" in data) return data;
    throw err;
  }
};
export const downloadFloorCsv = () => blob("/v1/trade/floor-prices/?format=csv", "floor-prices.csv");

export const STATUS_TONE: Record<ContractStatus, "muted" | "yellow" | "blue" | "green" | "red"> = {
  draft: "muted", sent: "yellow", signed: "blue", registered: "blue", shipped: "green", completed: "green", cancelled: "red",
};
export const usd = (v: string | number | null | undefined, digits = 2) =>
  v === null || v === undefined || v === "" ? "—" : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
