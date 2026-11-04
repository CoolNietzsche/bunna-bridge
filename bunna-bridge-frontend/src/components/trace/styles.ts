import type { CSSProperties } from "react";
import { AT } from "../../styles/adminTokens";

export const flabel: CSSProperties = {
  fontFamily: AT.font.sans, fontWeight: 500, fontSize: "0.74rem", color: AT.color.textSecondary,
  display: "block", marginBottom: "4px",
};

export const grid = (min = 200): CSSProperties => ({
  display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap: "0 14px",
});

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
