// Admin design tokens — back office (Dashboard, Lots, Pipeline, Offers…).
//
// Apple-inspired, matching the public site (src/index.css):
//   · light, translucent macOS-style sidebar and frosted top bar
//   · neutral canvas (#F5F5F7), white grouped cards, soft layered shadows
//   · one accent (Beersheba forest) + Apple semantic status colours
//   · system SF Pro / Inter, bold tight titles
// Colours are hex where components append alpha suffixes (e.g. `${c}33`).

export const AT = {
  color: {
    // Sidebar (dark, fixed — the one place dark chrome is intentional here)
    sidebarBg:         "rgba(246,246,248,0.82)",
    sidebarHover:       "rgba(0,0,0,0.045)",
    sidebarActive:      "rgba(27,122,78,0.12)",
    sidebarText:        "#3A3A3C",
    sidebarTextHover:   "#1D1D1F",
    sidebarTextActive:  "#125C3A",
    sidebarBorder:      "rgba(0,0,0,0.08)",

    // Dark "product page" hero (lot detail / lot story headers)
    heroBg:             "#0E2219",
    heroText:           "#F5F5F7",
    heroTextMuted:      "rgba(245,245,247,0.62)",

    // Primary accent — Beersheba forest green
    primary:            "#1B7A4E",
    primaryLight:       "rgba(27,122,78,0.09)",
    primaryDark:        "#125C3A",

    // Surfaces
    bodyBg:              "#F5F5F7",
    surface:              "#ffffff",
    surfaceSecondary:    "#F7F7F9",

    // Borders
    border:              "#E5E5EA",
    borderLight:        "#F0F0F3",

    // Text
    text:                "#1D1D1F",
    textSecondary:       "#6E6E73",
    textMuted:           "#86868B",
    textDisabled:        "#AEAEB2",

    // Status palette (matches Gentelella's semantic set)
    blue:                "#0071E3",
    azure:                "#4299e1",
    green:                "#248A3D",
    lime:                "#74b816",
    yellow:              "#C77700",
    orange:              "#C93400",
    red:                  "#D70015",
    pink:                "#d6336c",
    purple:              "#ae3ec9",
    indigo:              "#4263eb",
    cyan:                "#17a2b8",

    greenLight:          "rgba(36,138,61,0.09)",
    redLight:            "rgba(215,0,21,0.07)",
    yellowLight:        "rgba(255,149,0,0.11)",
    blueLight:            "rgba(0,113,227,0.08)",
  },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Helvetica Neue", Arial, sans-serif',
    display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace',
  },
  radius: {
    sm: "8px",
    md: "10px",
    lg: "16px",
    pill: "999px",
  },
  shadow: {
    card:  "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04)",
    hover: "0 2px 6px rgba(0,0,0,0.04), 0 16px 36px rgba(0,0,0,0.10)",
    modal: "0 30px 80px rgba(0,0,0,0.25)",
  },
  spacing: {
    "1": "4px", "2": "8px", "3": "12px", "4": "16px",
    "5": "24px", "6": "32px", "7": "48px", "8": "64px",
    sidebarW: "248px",
    sidebarCollapsedW: "72px",
    topbarH: "60px",
  },
  fontSize: {
    base: "0.875rem",   // 14px
    sm: "0.8125rem",    // 13px (nav links)
    xs: "0.72rem",      // ~11.5px (status pills)
  },
} as const;

export default AT;
