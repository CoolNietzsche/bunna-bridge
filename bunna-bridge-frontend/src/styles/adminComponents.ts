// Admin component styles — built from adminTokens (AT) only.
// Import AC into admin/back-office pages instead of writing ad-hoc styles.

import { AT } from "./adminTokens";
import type { CSSProperties } from "react";

export const AC = {
  // ── Page shell ────────────────────────────────────────────
  page: {
    minHeight: "100vh",
    background: AT.color.bodyBg,
    fontFamily: AT.font.sans,
  } as CSSProperties,

  // ── Surfaces ──────────────────────────────────────────────
  card: {
    background: AT.color.surface,
    border: `1px solid ${AT.color.border}`,
    borderRadius: AT.radius.lg,
    boxShadow: AT.shadow.card,
  } as CSSProperties,

  cardPad: {
    padding: AT.spacing["5"],
  } as CSSProperties,

  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${AT.spacing["4"]} ${AT.spacing["5"]}`,
    borderBottom: `1px solid ${AT.color.borderLight}`,
  } as CSSProperties,

  cardTitle: {
    fontFamily: AT.font.sans,
    fontSize: "0.9rem",
    fontWeight: 600,
    color: AT.color.text,
    margin: 0,
  } as CSSProperties,

  // ── Typography ────────────────────────────────────────────
  pageTitle: {
    fontFamily: AT.font.sans,
    fontSize: "1.4rem",
    fontWeight: 600,
    color: AT.color.text,
    margin: 0,
    lineHeight: 1.3,
  } as CSSProperties,

  pageSubtitle: {
    fontFamily: AT.font.sans,
    fontSize: AT.fontSize.base,
    color: AT.color.textSecondary,
    margin: "2px 0 0",
  } as CSSProperties,

  eyebrow: {
    fontFamily: AT.font.sans,
    fontSize: "0.72rem",
    fontWeight: 500,
    color: AT.color.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  } as CSSProperties,

  // ── Metric / stat card ────────────────────────────────────
  metricValue: {
    fontFamily: AT.font.sans,
    fontSize: "1.75rem",
    fontWeight: 600,
    color: AT.color.text,
    lineHeight: 1.2,
  } as CSSProperties,

  metricLabel: {
    fontFamily: AT.font.sans,
    fontSize: AT.fontSize.sm,
    color: AT.color.textSecondary,
  } as CSSProperties,

  // ── Buttons ───────────────────────────────────────────────
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: AT.radius.md,
    background: AT.color.primary,
    border: `1px solid ${AT.color.primaryDark}`,
    color: "#ffffff",
    fontFamily: AT.font.sans,
    fontSize: AT.fontSize.base,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.12s",
  } as CSSProperties,

  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: AT.radius.md,
    background: "transparent",
    border: `1px solid ${AT.color.border}`,
    color: AT.color.textSecondary,
    fontFamily: AT.font.sans,
    fontSize: AT.fontSize.base,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.12s",
  } as CSSProperties,

  btnSm: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 12px",
    borderRadius: AT.radius.sm,
    fontSize: "0.78rem",
    fontWeight: 500,
    fontFamily: AT.font.sans,
    cursor: "pointer",
    border: `1px solid ${AT.color.border}`,
    background: "transparent",
    color: AT.color.textSecondary,
  } as CSSProperties,

  // ── Inputs ────────────────────────────────────────────────
  input: {
    width: "100%",
    background: AT.color.surface,
    border: `1px solid ${AT.color.border}`,
    borderRadius: AT.radius.md,
    padding: "8px 12px",
    color: AT.color.text,
    fontFamily: AT.font.sans,
    fontSize: AT.fontSize.base,
    outline: "none",
    boxSizing: "border-box" as const,
  } as CSSProperties,

  // ── Table ─────────────────────────────────────────────────
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontFamily: AT.font.sans,
    fontSize: AT.fontSize.base,
  } as CSSProperties,

  th: {
    textAlign: "left" as const,
    padding: "10px 14px",
    fontSize: "0.72rem",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    color: AT.color.textMuted,
    borderBottom: `1px solid ${AT.color.border}`,
    whiteSpace: "nowrap" as const,
  } as CSSProperties,

  td: {
    padding: "12px 14px",
    borderBottom: `1px solid ${AT.color.borderLight}`,
    color: AT.color.text,
    verticalAlign: "middle" as const,
  } as CSSProperties,

  trHover: {
    cursor: "pointer",
    transition: "background 0.1s",
  } as CSSProperties,

  // ── Status badges (matches Gentelella's .status-{color} pattern) ──
  status: {
    base: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "0.72rem",
      fontWeight: 500,
      fontFamily: AT.font.sans,
    } as CSSProperties,
    green:  { color: AT.color.green } as CSSProperties,
    yellow: { color: "#b45309" } as CSSProperties,
    blue:   { color: AT.color.blue } as CSSProperties,
    red:    { color: AT.color.red } as CSSProperties,
    muted:  { color: AT.color.textMuted } as CSSProperties,
  },

  // ── Pill badges (filled, for table cells) ──────────────────
  pill: {
    base: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "3px 10px",
      borderRadius: AT.radius.pill,
      fontSize: "0.7rem",
      fontWeight: 500,
      fontFamily: AT.font.sans,
      whiteSpace: "nowrap" as const,
    } as CSSProperties,
    green:  { background: AT.color.greenLight,  color: AT.color.primaryDark } as CSSProperties,
    yellow: { background: AT.color.yellowLight, color: "#b45309" } as CSSProperties,
    blue:   { background: AT.color.blueLight,   color: AT.color.blue } as CSSProperties,
    red:    { background: AT.color.redLight,    color: AT.color.red } as CSSProperties,
    muted:  { background: AT.color.surfaceSecondary, color: AT.color.textMuted } as CSSProperties,
  },

  // ── Nav link (sidebar) ──────────────────────────────────────
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minHeight: "32px",
    padding: "6px 12px",
    borderRadius: AT.radius.sm,
    fontSize: AT.fontSize.sm,
    fontWeight: 400,
    textDecoration: "none",
    cursor: "pointer",
    transition: "background 0.12s, color 0.12s",
    marginBottom: "1px",
  } as CSSProperties,
} as const;

export default AC;
