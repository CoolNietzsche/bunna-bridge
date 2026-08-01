// Beersheba Component Styles — built from tokens only ("Highland Editorial")
// Import CS into any component instead of writing inline style objects.

import { T } from "./tokens";
import type { CSSProperties } from "react";

export const CS = {

  // ── Layout ────────────────────────────────────────────────
  container: {
    width:        "100%",
    maxWidth:     T.spacing.maxW,
    marginInline: "auto",
    paddingInline: T.spacing.pagePad,
  } as CSSProperties,

  // ── Surfaces ──────────────────────────────────────────────
  card: {
    background:   T.color.surface,
    border:       `1px solid ${T.color.border}`,
    borderRadius: T.radius.lg,
    boxShadow:    T.shadow.card,
    padding:      T.spacing.cardPad,
  } as CSSProperties,

  cardInner: {
    background:   T.color.paper,
    border:       `1px solid ${T.color.border}`,
    borderRadius: T.radius.md,
    padding:      "14px 16px",
  } as CSSProperties,

  cardTitle: {
    fontFamily:    T.font.mono,
    fontSize:      "0.625rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color:         T.color.textMuted,
    margin:        "0 0 14px",
  } as CSSProperties,

  // ── Typography ────────────────────────────────────────────
  kicker: {
    display:       "inline-flex",
    alignItems:    "center",
    gap:           "8px",
    fontFamily:    T.font.mono,
    fontSize:      "0.68rem",
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
    color:         T.color.clay,
  } as CSSProperties,

  displayXL: {
    fontFamily:    T.font.display,
    fontSize:      "clamp(2.75rem, 6vw, 5rem)",
    fontWeight:    400,
    lineHeight:    1.02,
    letterSpacing: "-0.02em",
    color:         T.color.ink,
    margin:        0,
  } as CSSProperties,

  displayLG: {
    fontFamily:    T.font.display,
    fontSize:      "clamp(1.9rem, 3.4vw, 2.9rem)",
    fontWeight:    400,
    lineHeight:    1.08,
    letterSpacing: "-0.01em",
    color:         T.color.ink,
    margin:        0,
  } as CSSProperties,

  pageTitle: {
    fontFamily:    T.font.display,
    fontSize:      "clamp(1.9rem, 3vw, 2.6rem)",
    fontWeight:    400,
    color:         T.color.ink,
    margin:        "0 0 6px",
    lineHeight:    1.08,
    letterSpacing: "-0.01em",
  } as CSSProperties,

  pageSubtitle: {
    fontFamily:    T.font.mono,
    fontSize:      "0.66rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color:         T.color.textFaint,
    margin:        0,
  } as CSSProperties,

  lead: {
    fontFamily:  T.font.sans,
    fontSize:    "1.075rem",
    lineHeight:  1.6,
    color:       T.color.textMuted,
    margin:      0,
  } as CSSProperties,

  label: {
    display:       "block",
    fontFamily:    T.font.mono,
    fontSize:      "0.6rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color:         T.color.textMuted,
    marginBottom:  "7px",
  } as CSSProperties,

  monoMeta: {
    fontFamily:    T.font.mono,
    fontSize:      "0.6rem",
    color:         T.color.textFaint,
    letterSpacing: "0.06em",
  } as CSSProperties,

  // ── Inputs ────────────────────────────────────────────────
  input: {
    width:        "100%",
    background:   T.color.surface,
    border:       `1px solid ${T.color.borderStrong}`,
    borderRadius: T.radius.md,
    padding:      "11px 14px",
    color:        T.color.ink,
    fontFamily:   T.font.sans,
    fontSize:     "0.9rem",
    outline:      "none",
    boxSizing:    "border-box" as const,
    transition:   "border-color 0.15s, box-shadow 0.15s",
  } as CSSProperties,

  textarea: {
    width:        "100%",
    background:   T.color.surface,
    border:       `1px solid ${T.color.borderStrong}`,
    borderRadius: T.radius.md,
    padding:      "11px 14px",
    color:        T.color.ink,
    fontFamily:   T.font.sans,
    fontSize:     "0.9rem",
    outline:      "none",
    boxSizing:    "border-box" as const,
    transition:   "border-color 0.15s, box-shadow 0.15s",
    minHeight:    "96px",
    resize:       "vertical" as const,
  } as CSSProperties,

  // ── Buttons ───────────────────────────────────────────────
  btnPrimary: {
    display:        "inline-flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "8px",
    padding:        "11px 22px",
    borderRadius:   T.radius.pill,
    background:     T.color.forest,
    border:         `1px solid ${T.color.forest}`,
    color:          "#FFFFFF",
    fontFamily:     T.font.sans,
    fontSize:       "0.9rem",
    fontWeight:     500,
    cursor:         "pointer",
    transition:     "transform 0.15s, background 0.15s, box-shadow 0.15s",
    whiteSpace:     "nowrap" as const,
  } as CSSProperties,

  btnAmber: {
    display:        "inline-flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "8px",
    padding:        "11px 22px",
    borderRadius:   T.radius.pill,
    background:     T.color.amber,
    border:         `1px solid ${T.color.amber}`,
    color:          "#1A1613",
    fontFamily:     T.font.sans,
    fontSize:       "0.9rem",
    fontWeight:     600,
    cursor:         "pointer",
    transition:     "transform 0.15s, box-shadow 0.15s",
    whiteSpace:     "nowrap" as const,
  } as CSSProperties,

  btnGhost: {
    display:        "inline-flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "8px",
    padding:        "11px 22px",
    borderRadius:   T.radius.pill,
    background:     "transparent",
    border:         `1px solid ${T.color.borderStrong}`,
    color:          T.color.ink,
    fontFamily:     T.font.sans,
    fontSize:       "0.9rem",
    fontWeight:     500,
    cursor:         "pointer",
    transition:     "all 0.15s",
    whiteSpace:     "nowrap" as const,
  } as CSSProperties,

  btnDanger: {
    display:        "inline-flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "8px",
    padding:        "11px 22px",
    borderRadius:   T.radius.pill,
    background:     T.color.redLight,
    border:         `1px solid ${T.color.errorBorder}`,
    color:          T.color.red,
    fontFamily:     T.font.sans,
    fontSize:       "0.9rem",
    fontWeight:     500,
    cursor:         "pointer",
    transition:     "all 0.15s",
    whiteSpace:     "nowrap" as const,
  } as CSSProperties,

  btnSmall: {
    display:        "inline-flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "6px",
    padding:        "7px 14px",
    borderRadius:   T.radius.pill,
    background:     "transparent",
    border:         `1px solid ${T.color.borderStrong}`,
    color:          T.color.textMuted,
    fontFamily:     T.font.sans,
    fontSize:       "0.78rem",
    fontWeight:     500,
    cursor:         "pointer",
    transition:     "all 0.15s",
  } as CSSProperties,

  // ── Chips (flavor tags, filters) ──────────────────────────
  chip: {
    display:       "inline-flex",
    alignItems:    "center",
    gap:           "6px",
    padding:       "5px 12px",
    borderRadius:  T.radius.pill,
    background:    T.color.stone,
    border:        `1px solid ${T.color.border}`,
    color:         T.color.ink,
    fontFamily:    T.font.sans,
    fontSize:      "0.78rem",
    fontWeight:    500,
    whiteSpace:    "nowrap" as const,
  } as CSSProperties,

  // ── Divider ───────────────────────────────────────────────
  divider: {
    border:    "none",
    borderTop: `1px solid ${T.color.border}`,
    margin:    "18px 0",
  } as CSSProperties,

  // ── Table row ─────────────────────────────────────────────
  tableRow: {
    display:       "flex",
    alignItems:    "center",
    gap:           "12px",
    padding:       "12px 14px",
    borderRadius:  T.radius.md,
    border:        "1px solid transparent",
    cursor:        "pointer",
    transition:    "all 0.15s",
  } as CSSProperties,

  // ── Badges ────────────────────────────────────────────────
  badge: {
    base: {
      display:       "inline-flex",
      alignItems:    "center",
      gap:           "5px",
      padding:       "3px 10px",
      borderRadius:  T.radius.pill,
      border:        `1px solid ${T.color.border}`,
      fontFamily:    T.font.mono,
      fontSize:      "0.55rem",
      letterSpacing: "0.06em",
      whiteSpace:    "nowrap" as const,
    } as CSSProperties,
    eudr:    { background: T.color.forestLight, color: T.color.forest } as CSSProperties,
    organic: { background: T.color.forestLight, color: T.color.matcha } as CSSProperties,
    coffee:  { background: T.color.coffeeLight, color: T.color.clay   } as CSSProperties,
    warning: { background: T.color.amberLight,  color: T.color.amber  } as CSSProperties,
    fail:    { background: T.color.redLight,    color: T.color.red    } as CSSProperties,
    neutral: { background: T.color.stone,       color: T.color.slate  } as CSSProperties,
    draft:   { background: T.color.stone,       color: T.color.slate  } as CSSProperties,
  },

  // ── Gate rows (compliance) ────────────────────────────────
  gateRow: {
    pass: {
      display:    "flex", alignItems: "center", justifyContent: "space-between",
      padding:    "10px 14px", borderRadius: T.radius.md,
      background: T.color.forestLight, border: `1px solid ${T.color.border}`,
    } as CSSProperties,
    fail: {
      display:    "flex", alignItems: "center", justifyContent: "space-between",
      padding:    "10px 14px", borderRadius: T.radius.md,
      background: T.color.redLight, border: `1px solid ${T.color.errorBorder}`,
    } as CSSProperties,
    pending: {
      display:    "flex", alignItems: "center", justifyContent: "space-between",
      padding:    "10px 14px", borderRadius: T.radius.md,
      background: T.color.amberLight, border: `1px solid ${T.color.border}`,
    } as CSSProperties,
  },

  // ── Stat / score ──────────────────────────────────────────
  statValue: {
    fontFamily: T.font.display,
    fontSize:   "2.75rem",
    fontWeight: 400,
    lineHeight: 1,
    color:      T.color.forest,
  } as CSSProperties,

  scoreBadge: {
    display:       "inline-flex",
    alignItems:    "baseline",
    gap:           "3px",
    padding:       "4px 11px",
    borderRadius:  T.radius.pill,
    background:    T.color.forest,
    color:         "#FFFFFF",
    fontFamily:    T.font.mono,
    fontSize:      "0.72rem",
    fontWeight:    500,
    letterSpacing: "0.02em",
  } as CSSProperties,

  // ── Banners ───────────────────────────────────────────────
  errorBanner: {
    display:      "flex",
    alignItems:   "center",
    gap:          "8px",
    background:   T.color.redLight,
    border:       `1px solid ${T.color.errorBorder}`,
    borderRadius: T.radius.md,
    padding:      "12px 16px",
    fontFamily:   T.font.sans,
    fontSize:     "0.875rem",
    color:        T.color.red,
  } as CSSProperties,

  successBanner: {
    display:      "flex",
    alignItems:   "center",
    gap:          "8px",
    background:   T.color.forestLight,
    border:       `1px solid ${T.color.border}`,
    borderRadius: T.radius.md,
    padding:      "12px 16px",
    fontFamily:   T.font.sans,
    fontSize:     "0.875rem",
    color:        T.color.forest,
  } as CSSProperties,

  // ── Modal ─────────────────────────────────────────────────
  modalOverlay: {
    position:       "fixed" as const,
    inset:          0,
    zIndex:         1000,
    background:     "rgba(20,18,14,0.55)",
    backdropFilter: "blur(6px)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    padding:        "20px",
  } as CSSProperties,

  modalBox: {
    background:   T.color.surface,
    border:       `1px solid ${T.color.border}`,
    borderRadius: T.radius.xl,
    padding:      "28px",
    width:        "100%",
    maxWidth:     "460px",
    boxShadow:    T.shadow.modal,
  } as CSSProperties,

} as const;

export default CS;
