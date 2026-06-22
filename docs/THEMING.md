# Beersheba Theme System

## Philosophy

Single source of truth:

src/index.css

Never create:

- tokens.ts
- colors.ts
- theme.ts

Tailwind v4 @theme is the token system.

---

# Core Tokens

```css
--color-forest:#1B4D35;
--color-coffee:#8B5E3C;
--color-linen:#F7F5F0;
--color-stone:#F0EDE6;
--color-ink:#1C1C1A;
--color-slate:#4A4A45;
```

---

# Color Roles

Forest:

- actions
- sidebar
- success

Coffee:

- prices
- SCA scores

Linen:

- page backgrounds

Stone:

- cards

---

# Typography

Display:

Cormorant Garamond

Data:

DM Mono

Body:

Instrument Sans

Logo:

Playfair Display

---

# Logo Rules

Expanded sidebar:

logo-full.png

Collapsed sidebar:

logo-icon.png

Favicon:

favicon.png

Never hardcode Beersheba beside the logo.

---

# Leaflet Exceptions

Inline styles are acceptable for:

- PolygonCaptureWidget
- FarmMapDisplay

Use CSS variables:

var(--color-forest)

Never Tailwind popup content.

---

# Migration Rule

One page per session.

Order:

1. Dashboard
2. Lots
3. Marketplace
4. LotDetail
5. LotPipeline
6. SampleRequests

Build after every session.

