import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministic per-origin cover art. With no photography in this demo, each
 * coffee region gets a distinct, on-brand gradient used on cards and story
 * heroes. Unknown regions hash to a stable gradient from the same family.
 */
const ORIGIN_GRADIENTS: Record<string, string> = {
  yirgacheffe: "linear-gradient(135deg, #1C5540 0%, #123A2E 55%, #0C2A21 100%)",
  guji:        "linear-gradient(135deg, #2E6B4E 0%, #1C5540 55%, #123A2E 100%)",
  sidama:      "linear-gradient(135deg, #7C6A2E 0%, #B2732E 55%, #8A4A24 100%)",
  harrar:      "linear-gradient(135deg, #9A4B2A 0%, #B2532E 50%, #6E2E1C 100%)",
  limu:        "linear-gradient(135deg, #3E7A57 0%, #245C42 60%, #123A2E 100%)",
  jimma:       "linear-gradient(135deg, #6E8A3E 0%, #4A6E2E 60%, #2E4A1E 100%)",
  kaffa:       "linear-gradient(135deg, #2E6B5A 0%, #1C5548 60%, #103A32 100%)",
};

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #1C5540 0%, #123A2E 60%, #0C2A21 100%)",
  "linear-gradient(135deg, #B2732E 0%, #8A4A24 60%, #5E2E18 100%)",
  "linear-gradient(135deg, #3E7A57 0%, #245C42 60%, #123A2E 100%)",
  "linear-gradient(135deg, #9A4B2A 0%, #6E2E1C 100%)",
];

export function originGradient(region?: string | null): string {
  if (!region) return FALLBACK_GRADIENTS[0];
  const key = region.trim().toLowerCase();
  if (ORIGIN_GRADIENTS[key]) return ORIGIN_GRADIENTS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xffff;
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
}

/** Title-case a region/kebele string for display. */
export function titleCase(s?: string | null): string {
  if (!s) return "";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format a USD price that may arrive as a string or number. */
export function formatUsd(value?: string | number | null, opts?: { decimals?: number }): string {
  const n = typeof value === "string" ? parseFloat(value) : value ?? NaN;
  if (!isFinite(n as number)) return "—";
  const decimals = opts?.decimals ?? 2;
  return `$${(n as number).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** Format a kilogram quantity that may arrive as a string or number. */
export function formatKg(value?: string | number | null): string {
  const n = typeof value === "string" ? parseFloat(value) : value ?? NaN;
  if (!isFinite(n as number)) return "—";
  return `${(n as number).toLocaleString("en-US")} kg`;
}

/**
 * Roasters transact on the marketplace the same way buyers do (offers,
 * samples, watchlist) — this is the single place that defines "buyer-like"
 * so the two roles don't drift out of sync across the many gated actions.
 */
export function isBuyerRole(role?: string | null): boolean {
  return role === "buyer" || role === "roaster";
}

/** Initials for avatars. */
export function initials(first?: string | null, last?: string | null, fallback = "?"): string {
  const a = first?.trim()?.[0] ?? "";
  const b = last?.trim()?.[0] ?? "";
  const out = `${a}${b}`.toUpperCase();
  return out || fallback;
}
