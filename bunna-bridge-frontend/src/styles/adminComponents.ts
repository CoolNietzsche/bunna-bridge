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
    fontFamily: AT.font.display,
    fontSize: "1.02rem",
    fontWeight: 600,
    letterSpacing: "-0.015em",
    color: AT.color.text,
    margin: 0,
  } as CSSProperties,

  // ── Typography ────────────────────────────────────────────
  pageTitle: {
    fontFamily: AT.font.display,
    fontSize: "2.1rem",
    fontWeight: 700,
    letterSpacing: "-0.03em",
    color: AT.color.text,
    margin: 0,
    lineHeight: 1.12,
  } as CSSProperties,

  pageSubtitle: {
    fontFamily: AT.font.sans,
    fontSize: "0.98rem",
    color: AT.color.textSecondary,
    margin: "6px 0 0",
    letterSpacing: "-0.01em",
  } as CSSProperties,

  // Small section label above a title — sentence case, like Apple's
  // "New" / category eyebrows, not shouty uppercase tracking.
  eyebrow: {
    fontFamily: AT.font.sans,
    fontSize: "0.82rem",
    fontWeight: 600,
    color: AT.color.primary,
    letterSpacing: "-0.005em",
  } as CSSProperties,

  // ── Metric / stat card ────────────────────────────────────
  metricValue: {
    fontFamily: AT.font.display,
    fontSize: "1.9rem",
    fontWeight: 700,
    letterSpacing: "-0.03em",
    color: AT.color.text,
    lineHeight: 1.2,
  } as CSSProperties,

  metricLabel: {
    fontFamily: AT.font.sans,
    fontSize: AT.fontSize.sm,
    color: AT.color.textSecondary,
  } as CSSProperties,

  // ── Buttons ───────────────────────────────────────────────
  // Filled accent pill — Apple's primary action.
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 18px",
    borderRadius: AT.radius.pill,
    background: AT.color.primary,
    border: "1px solid transparent",
    color: "#ffffff",
    fontFamily: AT.font.sans,
    fontSize: AT.fontSize.base,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.2s",
  } as CSSProperties,

  // Tinted gray pill — Apple's secondary action (no outline).
  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 18px",
    borderRadius: AT.radius.pill,
    background: "rgba(0,0,0,0.05)",
    border: "1px solid transparent",
    color: AT.color.text,
    fontFamily: AT.font.sans,
    fontSize: AT.fontSize.base,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.2s",
  } as CSSProperties,

  btnSm: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 13px",
    borderRadius: AT.radius.pill,
    fontSize: "0.8rem",
    fontWeight: 500,
    fontFamily: AT.font.sans,
    cursor: "pointer",
    border: "1px solid transparent",
    background: "rgba(0,0,0,0.05)",
    color: AT.color.text,
  } as CSSProperties,

  // ── Inputs ────────────────────────────────────────────────
  input: {
    width: "100%",
    background: AT.color.surface,
    border: `1px solid ${AT.color.border}`,
    borderRadius: AT.radius.md,
    padding: "10px 13px",
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
    fontSize: "0.78rem",
    fontWeight: 600,
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
    yellow: { color: AT.color.yellow } as CSSProperties,
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
      fontSize: "0.72rem",
      fontWeight: 600,
      fontFamily: AT.font.sans,
      whiteSpace: "nowrap" as const,
    } as CSSProperties,
    green:  { background: AT.color.greenLight,  color: AT.color.green } as CSSProperties,
    yellow: { background: AT.color.yellowLight, color: AT.color.yellow } as CSSProperties,
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
