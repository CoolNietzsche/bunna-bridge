// Admin design tokens — for the back-office / operational area only
// (Dashboard, Lots, Pipeline, Offers, Samples, Farm, Cupping, Settings…).
//
// Layout and density follow Gentelella v4 (fixed dark sidebar, top bar,
// compact cards and tables, Inter for data). The palette is Beersheba's
// "Highland Editorial" brand (src/index.css @theme) so the back office and
// the public site read as one product: deep forest chrome, forest-green
// actions, amber highlights, warm paper surfaces, Fraunces page titles.

export const AT = {
  color: {
    // Sidebar (dark, fixed — the one place dark chrome is intentional here)
    sidebarBg:         "#0F2A21",
    sidebarHover:       "rgba(255,255,255,0.05)",
    sidebarActive:      "rgba(214,137,44,0.14)",
    sidebarText:        "#9DB3A8",
    sidebarTextHover:   "#E4EEE8",
    sidebarTextActive:  "#ffffff",
    sidebarBorder:      "rgba(255,255,255,0.07)",

    // Primary accent — Beersheba forest green
    primary:            "#1F6B4F",
    primaryLight:       "rgba(31,107,79,0.08)",
    primaryDark:        "#123A2E",

    // Surfaces
    bodyBg:              "#F6F4EE",
    surface:              "#ffffff",
    surfaceSecondary:    "#FAF8F3",

    // Borders
    border:              "#E7E2D7",
    borderLight:        "#EFEBE2",

    // Text
    text:                "#1A1613",
    textSecondary:       "#5E5A52",
    textMuted:           "#857F74",
    textDisabled:        "#C8C2B6",

    // Status palette (matches Gentelella's semantic set)
    blue:                "#066fd1",
    azure:                "#4299e1",
    green:                "#3E8E5E",
    lime:                "#74b816",
    yellow:              "#D6892C",
    orange:              "#B2532E",
    red:                  "#d63939",
    pink:                "#d6336c",
    purple:              "#ae3ec9",
    indigo:              "#4263eb",
    cyan:                "#17a2b8",

    greenLight:          "rgba(62,142,94,0.08)",
    redLight:            "rgba(214,57,57,0.06)",
    yellowLight:        "rgba(214,137,44,0.09)",
    blueLight:            "rgba(6,111,209,0.06)",
  },
  font: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: '"Fraunces", Georgia, serif',
    mono: '"DM Mono", "SF Mono", Monaco, Consolas, monospace',
  },
  radius: {
    sm: "4px",
    md: "6px",
    lg: "8px",
    pill: "999px",
  },
  shadow: {
    card:  "0 2px 4px 0 rgba(30,38,51,0.04)",
    hover: "0 4px 12px 0 rgba(30,38,51,0.08)",
    modal: "0 16px 48px rgba(30,38,51,0.18)",
  },
  spacing: {
    "1": "4px", "2": "8px", "3": "12px", "4": "16px",
    "5": "24px", "6": "32px", "7": "48px", "8": "64px",
    sidebarW: "252px",
    sidebarCollapsedW: "68px",
    topbarH: "60px",
  },
  fontSize: {
    base: "0.875rem",   // 14px
    sm: "0.8125rem",    // 13px (nav links)
    xs: "0.72rem",      // ~11.5px (status pills)
  },
} as const;

export default AT;
