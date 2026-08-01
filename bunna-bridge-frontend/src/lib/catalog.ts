// Catalog helpers — derive origins, curated selections, and impact metrics
// from lots, client-side. The marketplace list requires auth on this
// deployment, so these only run for authenticated views (Marketplace); the
// public Landing page uses STATIC_ORIGINS instead of live data.

import type { CoffeeLot } from "../api/lots";
import { originGradient, titleCase } from "./utils";

export interface Selection {
  key: string;
  label: string;
  description: string;
  query: string;
  match: (lot: CoffeeLot) => boolean;
}

/** Curated "browse by selection" collections (Belco-style). */
export const SELECTIONS: Selection[] = [
  { key: "eudr",        label: "EUDR-ready",     description: "Deforestation-free, DDS lodged and verified.",        query: "eudr_dds_ready=true",       match: (l) => !!l.eudr_dds_ready },
  { key: "green",       label: "Green Passport", description: "GPS-verified boundary, cleared for the EU.",          query: "green_passport_ready=true", match: (l) => !!l.green_passport_ready },
  { key: "export",      label: "Export-ready",   description: "All seven compliance gates passed.",                  query: "export_ready=true",         match: (l) => !!l.export_ready },
  { key: "organic",     label: "Organic",        description: "Certified organic cultivation.",                      query: "is_organic=true",           match: (l) => !!l.is_organic },
  { key: "fairtrade",   label: "Fair Trade",     description: "Fair income guaranteed to producers.",                query: "is_fair_trade=true",        match: (l) => !!l.is_fair_trade },
  { key: "highaltitude",label: "High-altitude",  description: "Grown at 1,900m and above.",                          query: "min_altitude=1900",         match: (l) => (l.altitude_m ?? 0) >= 1900 },
];

export interface OriginSummary {
  region: string;
  label: string;
  gradient: string;
  /** Lot count — omitted (not fabricated) when live data isn't available. */
  count?: number;
}

/** Group lots by origin/region for the "browse by origin" grid (authenticated use only). */
export function computeOrigins(lots: CoffeeLot[]): OriginSummary[] {
  const map = new Map<string, number>();
  for (const l of lots) {
    const key = (l.region || "other").toLowerCase();
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([region, count]) => ({ region, label: titleCase(region), count, gradient: originGradient(region) }))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
}

/**
 * Static, curated list of major Ethiopian coffee origins for the public
 * Landing page, where no live lot data is available (marketplace list
 * requires auth on this deployment). Region names are real geography, not
 * fabricated business data — only a lot count would be, so none is shown.
 */
export const STATIC_ORIGINS: OriginSummary[] = [
  { region: "yirgacheffe", label: "Yirgacheffe", gradient: originGradient("yirgacheffe") },
  { region: "guji",        label: "Guji",        gradient: originGradient("guji") },
  { region: "sidama",      label: "Sidama",      gradient: originGradient("sidama") },
  { region: "harrar",      label: "Harrar",      gradient: originGradient("harrar") },
];

// ── Filtering / sorting (authenticated Marketplace) ─────────────

export interface LotFilters {
  q: string;
  origin: string;      // region key or ""
  process: string;     // washed | natural | honey | anaerobic | ""
  grade: string;       // G1 | G2 | G3 | ""
  cert: string;        // organic | fairtrade | rainforest | ""
  compliance: string;  // eudr | passport | export | ""
  minAltitude: number; // 0 = any
  sort: string;        // score | price_asc | price_desc | recent
}

export const defaultFilters: LotFilters = {
  q: "", origin: "", process: "", grade: "", cert: "", compliance: "", minAltitude: 0, sort: "score",
};

const num = (v?: string | number | null) => {
  const n = typeof v === "string" ? parseFloat(v) : v ?? 0;
  return isFinite(n as number) ? (n as number) : 0;
};

/** Client-side refinement on top of whatever the (already role-scoped) API returned. */
export function applyLotFilters(lots: CoffeeLot[], f: LotFilters): CoffeeLot[] {
  const q = f.q.trim().toLowerCase();
  let out = lots.filter((l) => {
    if (q && !`${l.name} ${l.lot_id} ${l.region} ${l.washing_station} ${l.flavor_notes}`.toLowerCase().includes(q)) return false;
    if (f.origin && (l.region || "").toLowerCase() !== f.origin.toLowerCase()) return false;
    if (f.process && l.processing !== f.process) return false;
    if (f.grade && l.grade !== f.grade) return false;
    if (f.cert === "organic" && !l.is_organic) return false;
    if (f.cert === "fairtrade" && !l.is_fair_trade) return false;
    if (f.cert === "rainforest" && !l.is_rainforest_alliance) return false;
    if (f.compliance === "eudr" && !l.eudr_dds_ready) return false;
    if (f.compliance === "passport" && !l.green_passport_ready) return false;
    if (f.compliance === "export" && !l.export_ready) return false;
    if (f.minAltitude && (l.altitude_m ?? 0) < f.minAltitude) return false;
    return true;
  });
  const score = (l: CoffeeLot) => l.latest_sca_score ?? l.sca_score ?? 0;
  out = [...out].sort((a, b) => {
    switch (f.sort) {
      case "price_asc":  return num(a.fob_price_usd) - num(b.fob_price_usd);
      case "price_desc": return num(b.fob_price_usd) - num(a.fob_price_usd);
      case "recent":     return (b.created_at || "").localeCompare(a.created_at || "");
      default:           return score(b) - score(a);
    }
  });
  return out;
}

/** Seed a filter set from URL query params (links from footer / dashboard). */
export function filtersFromParams(params: URLSearchParams): LotFilters {
  const f = { ...defaultFilters };
  if (params.get("origin")) f.origin = params.get("origin")!;
  if (params.get("q")) f.q = params.get("q")!;
  if (params.get("is_organic") === "true") f.cert = "organic";
  if (params.get("is_fair_trade") === "true") f.cert = "fairtrade";
  if (params.get("eudr_dds_ready") === "true") f.compliance = "eudr";
  if (params.get("green_passport_ready") === "true") f.compliance = "passport";
  if (params.get("export_ready") === "true") f.compliance = "export";
  if (params.get("min_altitude")) f.minAltitude = parseInt(params.get("min_altitude")!, 10) || 0;
  return f;
}

export interface ImpactStats {
  lots: number;
  origins: number;
  avgScore: number | null;
  eudrReady: number;
  exportReady: number;
  qGraders: number;
}

/** Headline metrics for the authenticated dashboard/marketplace (not used on the public Landing). */
export function impactStats(lots: CoffeeLot[]): ImpactStats {
  const scored = lots.map((l) => l.latest_sca_score ?? l.sca_score).filter((s): s is number => typeof s === "number");
  const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  const origins = new Set(lots.map((l) => (l.region || "other").toLowerCase())).size;
  const graders = new Set(lots.map((l) => l.q_grader_name).filter(Boolean)).size;
  return {
    lots: lots.length,
    origins,
    avgScore: avg,
    eudrReady: lots.filter((l) => l.eudr_dds_ready).length,
    exportReady: lots.filter((l) => l.export_ready).length,
    qGraders: Math.max(graders, 1),
  };
}
