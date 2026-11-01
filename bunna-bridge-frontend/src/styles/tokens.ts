// Beersheba Design Tokens — single source of truth (Apple-inspired system)
// Never hardcode colors in components. Always import from here.
// Values resolve to CSS variables in src/index.css, so every token is
// light/dark aware automatically.

export const T = {
  color: {
    // Primary — evergreen
    forest:       "var(--color-forest)",
    forestDark:   "var(--color-forest-dark)",
    forestLight:  "var(--color-forest-light)",
    forestHover:  "var(--color-forest-hover)",
    evergreen:    "var(--color-evergreen)",
    // Accent — amber / saffron
    amber:        "var(--color-amber)",
    amberLight:   "var(--color-amber-light)",
    gold:         "var(--color-gold)",       // alias of amber
    goldLight:    "var(--color-gold-light)",
    // Accent 2 — clay (sensory warmth)
    clay:         "var(--color-clay)",
    clayLight:    "var(--color-clay-light)",
    coffee:       "var(--color-coffee)",      // alias of clay
    coffeeLight:  "var(--color-coffee-light)",
    // Fresh — matcha
    matcha:       "var(--color-matcha)",
    sage:         "var(--color-sage)",        // alias of matcha
    mint:         "var(--color-mint)",
    // Neutrals — warm bone paper
    paper:        "var(--color-paper)",
    linen:        "var(--color-linen)",       // alias of paper
    surface:      "var(--color-surface)",
    white:        "var(--color-white)",       // alias of surface (dark-inverting)
    stone:        "var(--color-stone)",
    ink:          "var(--color-ink)",
    slate:        "var(--color-slate)",
    // Status
    red:          "var(--color-red)",
    redLight:     "var(--color-red-light)",
    errorBorder:  "var(--color-error-border)",
    // Borders
    border:       "var(--color-border)",
    borderStrong: "var(--color-border-strong)",
    borderHover:  "var(--color-border-hover)",
    // Text opacity helpers
    textMuted:    "var(--color-text-muted)",
    textFaint:    "var(--color-text-faint)",
    textGhost:    "var(--color-text-ghost)",
    // Contextual rail (light surface in the new system)
    sidebarBg:    "var(--color-surface)",
    sidebarText:  "var(--color-text-muted)",
    sidebarMuted: "var(--color-text-faint)",
    sidebarActive:"var(--color-forest-light)",
  },
  font: {
    // System SF Pro on Apple devices, Inter everywhere else.
    display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif',
    mono:    'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace',
    sans:    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Helvetica Neue", Arial, sans-serif',
    mark:    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
  },
  // Headline weights/tracking — Apple uses heavy, tight display type.
  type: {
    displayWeight: 700,
    titleWeight:   600,
    tightTracking: "-0.03em",
    titleTracking: "-0.022em",
  },
  radius: {
    sm:   "8px",
    md:   "12px",
    lg:   "18px",
    xl:   "28px",
    pill: "999px",
  },
  shadow: {
    card:  "0 1px 2px rgba(0,0,0,0.03), 0 6px 20px rgba(0,0,0,0.04)",
    hover: "0 2px 6px rgba(0,0,0,0.04), 0 22px 48px rgba(0,0,0,0.12)",
    modal: "0 30px 80px rgba(0,0,0,0.25)",
    sm:    "0 1px 2px rgba(0,0,0,0.03), 0 6px 20px rgba(0,0,0,0.04)",
    md:    "0 2px 6px rgba(0,0,0,0.04), 0 22px 48px rgba(0,0,0,0.12)",
  },
  spacing: {
    cardPad:  "24px",
    pagePad:  "clamp(20px, 5vw, 40px)",
    section:  "clamp(80px, 12vw, 160px)",
    maxW:     "1180px",
  },
} as const;

export default T;
