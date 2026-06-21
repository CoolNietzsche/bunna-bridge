// Beersheba Design Tokens — single source of truth
// Never hardcode colors in components. Always import from here.

export const T = {
  color: {
    // Primary
    forest:       "#1B4D35",
    forestDark:   "#163D2A",
    forestLight:  "#E8F2EC",
    // Accent
    coffee:       "#7B4B2A",
    coffeeLight:  "#F5EDE4",
    sage:         "#2D7A52",
    mint:         "#A8D5BC",
    // Neutrals
    linen:        "#F7F5F0",
    stone:        "#F0EDE6",
    white:        "#FFFFFF",
    ink:          "#1C1C1A",
    slate:        "#4A4A45",
    // Status
    red:          "#C0392B",
    redLight:     "#FDECEA",
    gold:         "#B8860B",
    goldLight:    "#FEF9E7",
    // Borders
    border:       "rgba(28,28,26,0.08)",
    borderStrong: "rgba(28,28,26,0.14)",
    borderHover:  "rgba(28,28,26,0.22)",
    // Text opacity helpers
    textMuted:    "rgba(28,28,26,0.45)",
    textFaint:    "rgba(28,28,26,0.3)",
    textGhost:    "rgba(28,28,26,0.18)",
    // Sidebar (dark surface — only place dark is allowed)
    sidebarBg:    "#1B4D35",
    sidebarText:  "rgba(255,255,255,0.6)",
    sidebarMuted: "rgba(255,255,255,0.25)",
    sidebarActive:"rgba(255,255,255,0.13)",
  },
  font: {
    display: '"Cormorant Garamond", Georgia, serif',
    mono:    '"DM Mono", monospace',
    sans:    '"Instrument Sans", sans-serif',
    mark:    '"Playfair Display", serif',
  },
  radius: {
    sm:   "3px",
    md:   "4px",
    lg:   "6px",
    xl:   "8px",
    pill: "20px",
  },
  shadow: {
    card:  "0 1px 3px rgba(28,28,26,0.06)",
    hover: "0 4px 12px rgba(28,28,26,0.1)",
    modal: "0 8px 32px rgba(28,28,26,0.15)",
  },
  spacing: {
    cardPad:  "20px",
    pagePad:  "clamp(16px, 4vw, 24px)",
  },
} as const;

export default T;
