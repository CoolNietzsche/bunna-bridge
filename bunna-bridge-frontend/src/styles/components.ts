// Beersheba Component Styles — built from tokens only
// Import CS into any component instead of writing inline style objects.

import { T } from "./tokens";
import type { CSSProperties } from "react";

export const CS = {

  // ── Surfaces ──────────────────────────────────────────────
  card: {
    background:   T.color.white,
    border:       `1px solid ${T.color.border}`,
    borderRadius: T.radius.lg,
    boxShadow:    T.shadow.card,
    padding:      T.spacing.cardPad,
  } as CSSProperties,

  cardInner: {
    background:   T.color.linen,
    border:       `1px solid ${T.color.border}`,
    borderRadius: T.radius.md,
    padding:      "12px 14px",
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
  pageTitle: {
    fontFamily: T.font.display,
    fontSize:   "1.85rem",
    fontWeight: 400,
    color:      T.color.ink,
    margin:     "0 0 4px",
    lineHeight: 1.2,
  } as CSSProperties,

  pageSubtitle: {
    fontFamily:    T.font.mono,
    fontSize:      "0.58rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color:         T.color.textFaint,
    margin:        0,
  } as CSSProperties,

  label: {
    display:       "block",
    fontFamily:    T.font.mono,
    fontSize:      "0.58rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color:         T.color.textMuted,
    marginBottom:  "5px",
  } as CSSProperties,

  monoMeta: {
    fontFamily:    T.font.mono,
    fontSize:      "0.58rem",
    color:         T.color.textFaint,
    letterSpacing: "0.06em",
  } as CSSProperties,

  // ── Inputs ────────────────────────────────────────────────
  input: {
    width:        "100%",
    background:   T.color.white,
    border:       `1px solid ${T.color.borderStrong}`,
    borderRadius: T.radius.md,
    padding:      "9px 12px",
    color:        T.color.ink,
    fontFamily:   T.font.sans,
    fontSize:     "0.875rem",
    outline:      "none",
    boxSizing:    "border-box" as const,
    transition:   "border-color 0.15s, box-shadow 0.15s",
  } as CSSProperties,

  // ── Buttons ───────────────────────────────────────────────
  btnPrimary: {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "8px",
    padding:        "9px 18px",
    borderRadius:   T.radius.md,
    background:     T.color.forest,
    border:         `1px solid ${T.color.forest}`,
    color:          T.color.white,
    fontFamily:     T.font.mono,
    fontSize:       "0.72rem",
    letterSpacing:  "0.06em",
    cursor:         "pointer",
    transition:     "all 0.15s",
    whiteSpace:     "nowrap" as const,
  } as CSSProperties,

  btnGhost: {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "8px",
    padding:        "9px 18px",
    borderRadius:   T.radius.md,
    background:     "transparent",
    border:         `1px solid ${T.color.border}`,
    color:          T.color.textMuted,
    fontFamily:     T.font.mono,
    fontSize:       "0.72rem",
    letterSpacing:  "0.06em",
    cursor:         "pointer",
    transition:     "all 0.15s",
    whiteSpace:     "nowrap" as const,
  } as CSSProperties,

  btnDanger: {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "8px",
    padding:        "9px 18px",
    borderRadius:   T.radius.md,
    background:     T.color.redLight,
    border:         `1px solid rgba(192,57,43,0.2)`,
    color:          T.color.red,
    fontFamily:     T.font.mono,
    fontSize:       "0.72rem",
    letterSpacing:  "0.06em",
    cursor:         "pointer",
    transition:     "all 0.15s",
    whiteSpace:     "nowrap" as const,
  } as CSSProperties,

  btnSmall: {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            "5px",
    padding:        "5px 12px",
    borderRadius:   T.radius.md,
    background:     "transparent",
    border:         `1px solid ${T.color.border}`,
    color:          T.color.textMuted,
    fontFamily:     T.font.mono,
    fontSize:       "0.62rem",
    letterSpacing:  "0.06em",
    cursor:         "pointer",
    transition:     "all 0.15s",
  } as CSSProperties,

  // ── Divider ───────────────────────────────────────────────
  divider: {
    border:    "none",
    borderTop: `1px solid ${T.color.border}`,
    margin:    "14px 0",
  } as CSSProperties,

  // ── Table row ─────────────────────────────────────────────
  tableRow: {
    display:       "flex",
    alignItems:    "center",
    gap:           "12px",
    padding:       "10px 12px",
    borderRadius:  T.radius.md,
    border:        "1px solid transparent",
    cursor:        "pointer",
    transition:    "all 0.12s",
  } as CSSProperties,

  // ── Badges ────────────────────────────────────────────────
  badge: {
    base: {
      display:       "inline-flex",
      alignItems:    "center",
      gap:           "4px",
      padding:       "3px 9px",
      borderRadius:  T.radius.pill,
      fontFamily:    T.font.mono,
      fontSize:      "0.52rem",
      letterSpacing: "0.06em",
      whiteSpace:    "nowrap" as const,
    } as CSSProperties,
    eudr:    { background: T.color.forestLight, border: `1px solid rgba(27,77,53,0.2)`,    color: T.color.forest  } as CSSProperties,
    organic: { background: T.color.forestLight, border: `1px solid rgba(27,77,53,0.2)`,    color: T.color.forest  } as CSSProperties,
    coffee:  { background: T.color.coffeeLight, border: `1px solid rgba(123,75,42,0.2)`,   color: T.color.coffee  } as CSSProperties,
    warning: { background: T.color.goldLight,   border: `1px solid rgba(184,134,11,0.2)`,  color: T.color.gold    } as CSSProperties,
    fail:    { background: T.color.redLight,    border: `1px solid rgba(192,57,43,0.2)`,   color: T.color.red     } as CSSProperties,
    neutral: { background: T.color.stone,       border: `1px solid ${T.color.border}`,     color: T.color.slate   } as CSSProperties,
    draft:   { background: T.color.stone,       border: `1px solid ${T.color.border}`,     color: T.color.slate   } as CSSProperties,
  },

  // ── Gate rows (compliance) ────────────────────────────────
  gateRow: {
    pass: {
      display:    "flex", alignItems: "center", justifyContent: "space-between",
      padding:    "7px 10px", borderRadius: T.radius.sm,
      background: T.color.forestLight, border: `1px solid rgba(27,77,53,0.15)`,
    } as CSSProperties,
    fail: {
      display:    "flex", alignItems: "center", justifyContent: "space-between",
      padding:    "7px 10px", borderRadius: T.radius.sm,
      background: T.color.redLight, border: `1px solid rgba(192,57,43,0.2)`,
    } as CSSProperties,
    pending: {
      display:    "flex", alignItems: "center", justifyContent: "space-between",
      padding:    "7px 10px", borderRadius: T.radius.sm,
      background: T.color.coffeeLight, border: `1px solid rgba(123,75,42,0.2)`,
    } as CSSProperties,
  },

  // ── Stat card ─────────────────────────────────────────────
  statValue: {
    fontFamily: T.font.display,
    fontSize:   "2.5rem",
    fontWeight: 300,
    lineHeight: 1,
    color:      T.color.forest,
  } as CSSProperties,

  // ── Error / info banners ──────────────────────────────────
  errorBanner: {
    display:      "flex",
    alignItems:   "center",
    gap:          "8px",
    background:   T.color.redLight,
    border:       `1px solid rgba(192,57,43,0.2)`,
    borderRadius: T.radius.md,
    padding:      "10px 14px",
    fontFamily:   T.font.sans,
    fontSize:     "0.825rem",
    color:        T.color.red,
  } as CSSProperties,

  successBanner: {
    display:      "flex",
    alignItems:   "center",
    gap:          "8px",
    background:   T.color.forestLight,
    border:       `1px solid rgba(27,77,53,0.2)`,
    borderRadius: T.radius.md,
    padding:      "10px 14px",
    fontFamily:   T.font.sans,
    fontSize:     "0.825rem",
    color:        T.color.forest,
  } as CSSProperties,

  // ── Modal overlay ─────────────────────────────────────────
  modalOverlay: {
    position:       "fixed" as const,
    inset:          0,
    zIndex:         1000,
    background:     "rgba(28,28,26,0.5)",
    backdropFilter: "blur(4px)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    padding:        "20px",
  } as CSSProperties,

  modalBox: {
    background:   T.color.white,
    border:       `1px solid ${T.color.border}`,
    borderRadius: T.radius.xl,
    padding:      "28px",
    width:        "100%",
    maxWidth:     "440px",
    boxShadow:    T.shadow.modal,
  } as CSSProperties,

} as const;

export default CS;
