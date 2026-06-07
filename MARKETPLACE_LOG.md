# Bunna Bridge Marketplace — Session Log
_Date: June 2026_

## Phase 2 Frontend — Deployed ✅

### Fixes applied
1. Added `MarketplaceLotDetail` import + `/marketplace/:id` route to `App.tsx`
2. Fixed wrong import in `MarketplaceLotDetail.tsx`: `sampleRequests` → `samples`
3. Added missing `quantity_g: 200, shipping_address: ""` defaults to `createSampleRequest` call
4. Fixed `ScaBadge` crash: `lot.sca_score` is a string from API — wrapped with `parseFloat()`

### Root causes noted
- List endpoint returns plain JSON; detail endpoint returns GeoJSON Feature (getLot unwraps correctly)
- `latest_sca_score` is always `null` on list response — falls back to `sca_score` string field
- Both marketplace card page and lot detail page now fully functional

## Phase 3 — Next: Offer Management Pages

### Buyer: `/buyer/offers`
- List own offers with status pills
- Accept counter-offer button
- Withdraw pending offer button

### Exporter: `/offers`
- Incoming offers grouped by lot
- Accept / Reject / Counter inline
- Counter modal: price + qty + notes

---

## Phase 3 — Offer Management Pages ✅ Deployed

### Files written
- `src/pages/BuyerOffers.tsx` — `/buyer/offers`
  - Filter tabs: all / pending / countered / accepted / rejected / withdrawn
  - Per-offer card: price, qty, total value, status pill
  - Counter offer block shown when status = countered
  - Accept counter + Withdraw actions with confirm step
  - Links back to lot product page

- `src/pages/ExporterOffers.tsx` — `/offers`
  - Pending badge count in header
  - Offers grouped by lot when multiple lots have offers
  - Inline Accept / Counter / Reject actions per offer
  - Counter modal: price + qty + notes → POST respond/ with action=counter
  - Filter tabs default to "pending"

### Routes added to App.tsx
- `/buyer/offers` → BuyerOffers (buyer role)
- `/offers` → ExporterOffers (exporter/admin role)

### Sidebar nav added
- "My Offers" (TrendingUp icon) → buyers only
- "Offers" (Inbox icon) → exporters + admin

### Fixes applied during build
- `getOffers` returns `Offer[]` not `{ results: Offer[] }` — fixed `.results` access in both pages
- Added explicit TypeScript types to reduce() callbacks and grouped record

---

## Phase 4 — Watchlist & Discovery ⏳ Next
- Heart icon on lot cards → buyer watchlist
- `/buyer/watchlist` page
- "New lots matching saved filters" notification type
- Price change alert on watched lots

---

## Phase 4 — Watchlist & Discovery ✅ Deployed

### Files written
- `src/hooks/useWatchlist.ts` — localStorage-based hook
  - `toggle(id)` — adds/removes lot UUID from watchlist
  - `isWatched(id)` — boolean check
  - Persists across sessions via `bb_watchlist` key

- `src/pages/BuyerWatchlist.tsx` — `/buyer/watchlist`
  - Lists all watched lots with price, flavor tags, region, compliance badges
  - Make Offer + Request Sample CTAs inline
  - Remove button per lot
  - Empty state with link to marketplace

### Changes to existing files
- `Marketplace.tsx` — heart button added to each card (buyer only)
  - Filled red when watched, outline when not
  - Toggles instantly via useWatchlist hook

### Routes added
- `/buyer/watchlist` → BuyerWatchlist (buyer only)

### Sidebar nav added
- "Watchlist" (Heart icon) → buyer only, below My Offers

### Decision: localStorage over backend
- No backend model needed — watchlist is ephemeral buyer preference
- Survives page refresh, cleared when localStorage is cleared
- Can be migrated to backend user profile field in future if needed

---

## Phase 5 — Exporter Storefront ⏳ In Progress

### Backend work
- `ExporterPublicSerializer` added to `users/serializers.py`
  - Fields: id, full_name, company_name, country, bio, is_verified, date_joined,
    ecta_license_number, ecta_license_expiry, lots_count, exported_count, avg_sca_score
- `ExporterProfileView` + `ExporterLotsView` added to `users/views.py`
- Routes added to `api_urls.py`:
  - `GET /api/v1/auth/exporters/<id>/` — public exporter profile
  - `GET /api/v1/auth/exporters/<id>/lots/` — exporter's active lots

### Issues encountered & fixed
- Wrong url file: routes added to `users/urls.py` instead of `users/api_urls.py` — fixed
- `coffeelot_set` reverse relation doesn't exist on User model —
  fixed by using `CoffeeLot.objects.filter(exporter=obj)` directly in serializer methods
- Token expiry during long debug sessions — worked around by saving token to /tmp/token.txt

### Frontend (pending backend confirmation)
- New page: `src/pages/ExporterStorefront.tsx` at `/exporters/:id`
- Sidebar: exporter name on lot cards will link to their storefront

### Phase 5 continued — Frontend ✅ Deployed
- `src/pages/ExporterStorefront.tsx` written at `/exporters/:id`
  - Profile hero: avatar, company name, verified badge, country, member since, ECTA number
  - Stats block: active lots · exported · avg SCA score
  - Full lot list with flavor tags, price, compliance badges, Make Offer + Sample + Watchlist CTAs
- `exporter?: number` field added to `CoffeeLot` interface in `lots.ts`
- Exporter name on Marketplace cards now links to `/exporters/:id`
- Route `/exporters/:id` added to App.tsx
