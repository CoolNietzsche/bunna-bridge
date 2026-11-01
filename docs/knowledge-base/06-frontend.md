# 06 — Frontend (`bunna-bridge-frontend/`)

React 19 + TS + Vite + Tailwind v4 SPA. Built on the VPS host with `npm run build` and copied to `/var/www/bunnabridge/`. Dev server proxies `/api` and `/media` to `localhost:8001`.

## Folders (`src/`)

| Folder | Contents |
|---|---|
| `api/` | One module per resource: `client.ts` (axios, JWT from `localStorage`, auto-refresh on 401), `auth`, `lots`, `boundary` (+ offline queue), `certifications`, `cupping`, `docs`, `farmer`, `notifications`, `roaster`, `roasting`, `samples` (not `sampleRequests`), `settlement`, `washingStations` |
| `pages/` | 26 page components (routes below) |
| `components/` | `AppShell`, maps (`PolygonCaptureWidget`, `FarmMapDisplay`), docs (`LotDocuments`, `EctaDocuments`), `SettlementWidget`, `SampleRequestWidget`, `CuppingHistory`, `LotPhotos`/`LotPhotoGallery`; `admin/` (Gentelella-style back-office shell, sidebar, top bar, widgets); `charts/` (Bar, Donut, Sparkline — hand-rolled SVG); `market/` (FilterBar, LotCard, OriginCard); `site/` (public header/footer, brand) |
| `context/` | `AuthContext` (user + tokens), `ThemeContext` (light/dark, `localStorage.theme`) |
| `hooks/` | `useWatchlist` (localStorage only), `useBoundarySync` (retries queued offline boundary saves) |
| `lib/` | `catalog.ts` (origins/curation derived client-side), `certifications.ts`, `utils.ts` |
| `styles/` | `tokens.ts`, `components.ts`, `adminTokens.ts`, `adminComponents.ts` (JS style objects — legacy approach) |

## Routes (`App.tsx`)

Public: `/` (Landing, or redirect to `/dashboard` when logged in), `/story/:id`, `/login`, `/register`, `/marketplace`, `/marketplace/:id`.

Protected (any logged-in role — **no per-role route guards**; pages hide/show by role and the API enforces): `/dashboard`, `/lots`, `/lots/new`, `/lots/:id`, `/lots/:id/edit`, `/lots/:id/cup`, `/map`, `/pipeline`, `/samples`, `/farm`, `/roastery`, `/certifications`, `/washing-stations`, `/roast-equipment`, `/roast-batches`, `/buyer/offers`, `/buyer/watchlist`, `/exporters/:id`, `/offers`, `/settings`.

## Design system (Apple-inspired, since 2026-11-01)

Principles: **clarity** (bold, tight, sentence-case type; no shouty uppercase labels), **deference** (neutral canvas so photos and data lead; one accent colour), **depth** (frosted translucent bars, soft layered shadows, generous radii).

| Element | Rule |
|---|---|
| Type | System SF Pro on Apple devices, Inter elsewhere (`-apple-system, …, "Inter"`). Headlines 700 weight, tracking −0.03 to −0.045em. Monospace (`ui-monospace` / SF Mono) only for data such as lot IDs and scores. |
| Colour | Canvas `#F5F5F7`, surfaces white, text `#1D1D1F` / `#6E6E73` / `#86868B`. Single accent: forest `#1B7A4E` (dark mode `#23874F`, both AA with white text). Eyebrows `#BF4800`. Status: Apple system green/orange/red/blue. |
| Shape | Radii 8 / 12 / 18 / 28 px; buttons are pills. Primary = filled accent; secondary = tinted grey fill (no outline); tertiary = text link with "›". |
| Materials | `.bb-material-bar` / `.bb-material-sidebar` (blur 20–24px, saturate 180%) for the site header, back-office top bar and sidebar. |
| Signature components | Activity-ring readiness (`ComplianceGatesPanel`), iOS inset grouped lists for gate rows, gradient "app icon" tiles in dashboard widgets, centred product-page hero with gradient headline on Landing. |
| Dark mode | `.dark` on `<html>`: true-black canvas, `#1C1C1E` surfaces. |

Where it lives: CSS variables in `src/index.css` (`:root`, `.dark`, `@theme`); `styles/tokens.ts` (public) and `styles/adminTokens.ts` (back office) map onto them. Change colours there, not in components. `docs/THEMING.md` describes an older system and is obsolete.

## Conventions (from `CLAUDE.md` + code)

- Theme tokens live in `src/index.css` `@theme` — use Tailwind classes (`bg-forest`, `text-ink`). No `tailwind.config.js`.
- Inline styles only for Leaflet components. Reality: ~56 files still use `style={{…}}` and ~18 contain raw hex colours — gradual migration ongoing.
- Icons: `lucide-react` only; no emojis.
- Always parse DRF decimals: `Number(lot.sca_score)`.
- `npm run build` = `tsc -b && vite build` — never run `vite build` alone (skips type check).

## Known frontend debts

- JWT stored in `localStorage` (XSS-exposed). Move to httpOnly cookies when the backend supports it.
- 52 pre-existing ESLint errors (mostly `any` types and React-hooks rules); CI reports lint without blocking.
- No frontend tests beyond the Playwright click-through used for the 2026-10-31 release (not yet committed as a CI job).
- No i18n (Amharic is a strategic requirement).
- Many components still use inline style objects rather than Tailwind token classes.
- Routes are lazy-loaded (`App.tsx`); keep new pages lazy too.
