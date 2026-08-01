// Beersheba Design Tokens — single source of truth ("Highland Editorial")
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
    display: '"Fraunces", Georgia, serif',
    mono:    '"DM Mono", monospace',
    sans:    '"Space Grotesk", "Instrument Sans", sans-serif',
    mark:    '"Fraunces", serif',
  },
  radius: {
    sm:   "6px",
    md:   "10px",
    lg:   "16px",
    xl:   "24px",
    pill: "999px",
  },
  shadow: {
    card:  "0 1px 2px rgba(26,22,19,0.04), 0 2px 10px rgba(26,22,19,0.05)",
    hover: "0 8px 30px rgba(26,22,19,0.10)",
    modal: "0 24px 60px rgba(26,22,19,0.22)",
    sm:    "0 1px 2px rgba(26,22,19,0.04), 0 2px 10px rgba(26,22,19,0.05)",
    md:    "0 8px 30px rgba(26,22,19,0.10)",
  },
  spacing: {
    cardPad:  "24px",
    pagePad:  "clamp(20px, 5vw, 40px)",
    section:  "clamp(64px, 10vw, 128px)",
    maxW:     "1200px",
  },
} as const;

export default T;
