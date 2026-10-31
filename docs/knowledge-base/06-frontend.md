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

## Conventions (from `CLAUDE.md` + code)

- Theme tokens live in `src/index.css` `@theme` — use Tailwind classes (`bg-forest`, `text-ink`). No `tailwind.config.js`.
- Inline styles only for Leaflet components. Reality: ~56 files still use `style={{…}}` and ~18 contain raw hex colours — gradual migration ongoing.
- Icons: `lucide-react` only; no emojis.
- Always parse DRF decimals: `Number(lot.sca_score)`.
- `npm run build` = `tsc -b && vite build` — never run `vite build` alone (skips type check).

## Known frontend debts

- Settlement NBE rate input is ignored (`components/SettlementWidget.tsx:21`).
- `CoffeeLot.sca_score` and cupping component types declared `number` but arrive as strings (`api/lots.ts:18`).
- `FarmerLotsMap.tsx:73` point-only fallback never fires (list API lacks coordinates).
- JWT stored in `localStorage` (XSS-exposed); refresh-failure does `localStorage.clear()` (also wipes watchlist/theme/offline boundary queue).
- No tests, no frontend CI. README is Vite boilerplate. Stray files: `=` (empty), `output.txt`, `response.txt`.
- No i18n (Amharic is a strategic requirement).
- `mapbox-gl` is a dependency but is imported nowhere — remove it.
