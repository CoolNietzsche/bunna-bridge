// Admin design tokens — for the back-office / operational area only
// (Dashboard, Lots, Pipeline, Offers, Samples, Farm, Cupping, Settings…).
//
// Deliberately a SEPARATE visual system from src/styles/tokens.ts (which
// stays "Highland Editorial" for the public site: Landing, Marketplace,
// Lot Story, Auth). Values below are extracted directly from Gentelella
// v4's compiled CSS (preview.colorlib.com/theme/gentelella), not
// approximated — dark navy sidebar, signature teal accent, dense SaaS
// spacing/radii, Inter typography.

export const AT = {
  color: {
    // Sidebar (dark, fixed — the one place dark chrome is intentional here)
    sidebarBg:         "#1a2332",
    sidebarHover:       "rgba(255,255,255,0.04)",
    sidebarActive:      "rgba(26,187,156,0.08)",
    sidebarText:        "#7b8fa3",
    sidebarTextHover:   "#c5d0dc",
    sidebarTextActive:  "#ffffff",
    sidebarBorder:      "rgba(255,255,255,0.06)",

    // Primary accent — the signature Gentelella teal
    primary:            "#1abb9c",
    primaryLight:       "rgba(26,187,156,0.06)",
    primaryDark:        "#169f85",

    // Surfaces
    bodyBg:              "#f5f7fb",
    surface:              "#ffffff",
    surfaceSecondary:    "#f9fafb",

    // Borders
    border:              "#e6e7eb",
    borderLight:        "#eff0f3",

    // Text
    text:                "#1e2633",
    textSecondary:       "#626d7d",
    textMuted:           "#7e8896",
    textDisabled:        "#c0c7cf",

    // Status palette (matches Gentelella's semantic set)
    blue:                "#066fd1",
    azure:                "#4299e1",
    green:                "#2fb344",
    lime:                "#74b816",
    yellow:              "#f59f00",
    orange:              "#f76707",
    red:                  "#d63939",
    pink:                "#d6336c",
    purple:              "#ae3ec9",
    indigo:              "#4263eb",
    cyan:                "#17a2b8",

    greenLight:          "rgba(47,179,68,0.06)",
    redLight:            "rgba(214,57,57,0.06)",
    yellowLight:        "rgba(245,159,0,0.06)",
    blueLight:            "rgba(6,111,209,0.06)",
  },
  font: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", Monaco, Consolas, "Liberation Mono", monospace',
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
