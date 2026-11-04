import api from "./client";

export interface Programme {
  id: string; name: string; season: string; description: string;
  status: "nominations" | "jury" | "catalogue" | "auction" | "closed"; status_label: string;
  nominations_close: string; min_jury_score: string; jury_session: string | null; auction: boolean;
  auction_starts: string | null; auction_ends: string | null; min_increment_usd: string; extension_minutes: number;
  entries_count: number; selected_count: number;
}
export interface Entry {
  id: number; lot: string; lot_code: string; lot_name: string; region: string; processing: string; exporter_name: string;
  status: string; status_label: string; eligibility_notes: string; jury_score: string | null; rank: number | null;
  quantity_kg: string; starting_price_usd: string; closes_at: string | null; high_bid_usd: string | null; bids_count: number;
  next_min_bid_usd: string; my_high_bid_usd: string | null; i_am_winning: boolean; reserve_met: boolean; photo: string | null;
}
export interface ProgrammeDetail extends Programme { entries: Entry[]; is_admin: boolean; server_time: string }

export interface Stock {
  id: string; lot: string; lot_code: string; lot_name: string; region: string; processing: string; score: string | null;
  partner_name: string; warehouse: string; warehouse_label: string; warehouse_name: string; bag_kg: string;
  bags_total: number; bags_available: number; price_eur_per_kg: string; min_bags: number; landed_on: string | null;
  dds_reference: string; sample_available: boolean; active: boolean;
}
export interface Order {
  id: string; buyer_name: string; partner_name: string; warehouse: string; warehouse_label: string;
  status: "requested" | "confirmed" | "released" | "cancelled"; status_label: string; delivery: string; notes: string;
  lines: { stock: string; lot_code: string; lot_name: string; bags: number; bag_kg: string; price_eur_per_kg: string }[];
  total_kg: string; total_eur: string; created_at: string; side: "buyer" | "partner" | null;
}
export interface SavedSearch { id: number; name: string; filters: Record<string, string | number>; alert: boolean; last_alerted_at: string | null; current_matches?: number }
export interface Criterion { key: string; label: string; points: number; max: number; detail: string; has_data: boolean }
export interface ScoreResult { score: number | null; coverage: number; criteria: Criterion[]; provisional?: boolean; contracts?: number }
export interface Article {
  id: string; slug: string; title: string; kind: "origin" | "harvest" | "guide" | "webinar"; kind_label: string; region: string;
  summary: string; body?: string; cover_image_url: string; video_url: string; event_at: string | null; author_name: string | null;
  published_at: string | null;
}

export const getProgrammes = async (): Promise<Programme[]> => (await api.get("/v1/market/select/")).data;
export const createProgramme = async (input: Record<string, unknown>): Promise<Programme> => (await api.post("/v1/market/select/", input)).data;
export const getProgramme = async (id: string): Promise<ProgrammeDetail> => (await api.get(`/v1/market/select/${id}/`)).data;
export const nominateLot = async (id: string, input: Record<string, unknown>): Promise<Entry> => (await api.post(`/v1/market/select/${id}/nominate/`, input)).data;
export const programmeStep = async (id: string, step: "start-jury" | "publish" | "start-auction", input: Record<string, unknown> = {}): Promise<ProgrammeDetail> =>
  (await api.post(`/v1/market/select/${id}/${step}/`, input)).data;
export const placeBid = async (entry: number, price: string): Promise<Entry> => (await api.post(`/v1/market/select/entries/${entry}/bid/`, { price_usd_per_kg: price })).data;

export const getStock = async (params: Record<string, string> = {}): Promise<Stock[]> => (await api.get("/v1/market/stock/", { params })).data;
export const createStock = async (input: Record<string, unknown>): Promise<Stock> => (await api.post("/v1/market/stock/", input)).data;
export const updateStock = async (id: string, input: Record<string, unknown>): Promise<Stock> => (await api.patch(`/v1/market/stock/${id}/`, input)).data;
export const getOrders = async (): Promise<Order[]> => (await api.get("/v1/market/orders/")).data;
export const placeOrder = async (lines: { stock: string; bags: number }[], delivery: string, notes = ""): Promise<Order> =>
  (await api.post("/v1/market/orders/", { lines, delivery, notes })).data;
export const orderAction = async (id: string, action: "confirm" | "release" | "cancel"): Promise<Order> => (await api.post(`/v1/market/orders/${id}/${action}/`)).data;

export const getServerWatchlist = async (): Promise<string[]> => (await api.get("/v1/market/watchlist/")).data;
export const mergeWatchlist = async (lots: string[]): Promise<string[]> => (await api.post("/v1/market/watchlist/", { lots })).data;
export const watch = async (lot: string) => api.put(`/v1/market/watchlist/${lot}/`);
export const unwatch = async (lot: string) => api.delete(`/v1/market/watchlist/${lot}/`);

export const getSavedSearches = async (): Promise<SavedSearch[]> => (await api.get("/v1/market/saved-searches/")).data;
export const saveSearch = async (name: string, filters: Record<string, unknown>): Promise<SavedSearch> => (await api.post("/v1/market/saved-searches/", { name, filters })).data;
export const updateSavedSearch = async (id: number, input: Partial<SavedSearch>): Promise<SavedSearch> => (await api.patch(`/v1/market/saved-searches/${id}/`, input)).data;
export const deleteSavedSearch = async (id: number) => api.delete(`/v1/market/saved-searches/${id}/`);

export const getImpact = async (lot: string): Promise<ScoreResult> => (await api.get(`/v1/market/lots/${lot}/impact/`)).data;
export const getReliabilityScore = async (user: number | string): Promise<ScoreResult> => (await api.get(`/v1/market/exporters/${user}/reliability-score/`)).data;

export const getArticles = async (kind = ""): Promise<Article[]> => (await api.get("/v1/market/articles/", { params: kind ? { kind } : {} })).data;
export const getArticle = async (slug: string): Promise<Article> => (await api.get(`/v1/market/articles/${slug}/`)).data;
export const createArticle = async (input: Record<string, unknown>): Promise<Article> => (await api.post("/v1/market/articles/", input)).data;
export const updateArticle = async (slug: string, input: Record<string, unknown>): Promise<Article> => (await api.patch(`/v1/market/articles/${slug}/`, input)).data;

export const AVAILABILITY_LABEL: Record<string, string> = { spot: "Spot", forward: "Forward", afloat: "Afloat", eu_stock: "EU stock" };
