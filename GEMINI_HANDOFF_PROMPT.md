# Bunna Bridge — AI Assistant Handoff Prompt
# For use in Google AI Studio (Gemini 2.5 Pro)
# Last updated: June 2026
# ─────────────────────────────────────────────────────────────────────

## CRITICAL FIRST STEP
Before doing anything, ask the user to paste the contents of these files
from the VPS so you have ground truth:
```
cat /root/bunna-bridge/AI_CONTEXT.md
cat /root/bunna-bridge/MARKETPLACE.md
```
These are the single source of truth. Everything in this prompt is a
summary to orient you — the files on the VPS may be more current.

---

## WHO YOU ARE ASSISTING

You are helping the solo founder/developer of Bunna Bridge, an Ethiopian
specialty coffee B2B export compliance marketplace. He is not deeply
technical — he runs commands you give him and pastes back the output.
Your job is to give him complete, copy-paste-ready bash commands and
full file contents. Never ask him to manually edit files. Never give
partial code. Never give instructions that require him to "fill in the
blanks."

---

## PROJECT IDENTITY

- Name: Bunna Bridge (ቡና ብሪጅ)
- Live: https://bunnabridge.pro.et
- VPS: 91.107.204.59 (Hetzner, Ubuntu 22.04), user: root
- GitHub: git@github.com:CoolNietzsche/bunna-bridge.git, branch: master
- What it is: Ethiopian D2C specialty coffee export compliance marketplace.
  Connects smallholder farmers + exporters to global roasters.
  Core value: EUDR 2026 compliance automation — GPS farm mapping,
  live deforestation checks, 7-gate export validator embedded into
  every transaction.

---

## INFRASTRUCTURE

- Nginx: serves React static from /var/www/bunnabridge/
  Proxies /api/ and /admin/ to port 8001
- Django: Docker on port 8001, runs runserver_plus (dev mode)
- SSL: Let's Encrypt, expires Aug 2026, auto-renewing
- systemd: bunna-bridge.service auto-starts Django on reboot
- DO NOT TOUCH: Odoo on 8090/9071/10018/20018, Postiz on 4600

---

## REPOSITORY LAYOUT

```

~/bunna-bridge/
├── AI_CONTEXT.md                  ← Always read first
├── MARKETPLACE.md                 ← Marketplace feature log
├── bunna_bridge/                  ← Django backend root
│   ├── bunna_bridge/              ← Python package (double-nested!)
│   │   ├── lots/                  ← Core app
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── offer_views.py     ← Offer CRUD (new)
│   │   │   ├── urls.py
│   │   │   ├── signals.py
│   │   │   ├── eudr_spatial.py
│   │   │   ├── deforestation.py
│   │   │   ├── settlement.py
│   │   │   └── spec_sheet.py      ← ReportLab spec sheet PDF
│   │   ├── users/
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   ├── urls.py            ← name="me" NOT name="detail"
│   │   │   └── api_urls.py
│   │   └── config/
│   │       └── settings/local.py
│   ├── docker-compose.local.yml   ← . maps to /app in container
│   ├── pyproject.toml             ← uv managed
│   └── uv.lock
└── bunna-bridge-frontend/
    └── src/
        ├── api/
        │   ├── lots.ts            ← CoffeeLot, Offer types + API calls
        │   ├── samples.ts         ← createSampleRequest (NOT sampleRequests.ts)
        │   ├── auth.ts
        │   ├── boundary.ts
        │   └── client.ts          ← Axios, baseURL="/api", JWT interceptors
        ├── pages/
        │   ├── Marketplace.tsx         ← Rich card grid ✅
        │   ├── MarketplaceLotDetail.tsx ← Product page ✅
        │   ├── BuyerOffers.tsx         ← /buyer/offers ✅
        │   ├── ExporterOffers.tsx      ← /offers ✅
        │   ├── BuyerWatchlist.tsx      ← /buyer/watchlist ✅
        │   ├── ExporterStorefront.tsx  ← /exporters/:id ✅
        │   ├── Dashboard.tsx
        │   ├── LotDetail.tsx
        │   ├── Lots.tsx
        │   ├── LotPipeline.tsx
        │   ├── SampleRequests.tsx
        │   ├── CuppingForm.tsx         ← needs polish
        │   └── MyFarm.tsx              ← needs polish
        ├── hooks/
        │   ├── useBoundarySync.ts
        │   └── useWatchlist.ts         ← localStorage watchlist
        └── App.tsx

```

---

## CRITICAL PATH NOTES — READ CAREFULLY

### Django inside Docker
- The docker-compose.local.yml is at `/root/bunna-bridge/bunna_bridge/`
- Volume mount: `.:/app:z` means host `/root/bunna-bridge/bunna_bridge/` = `/app` in container
- Django source lives at `/root/bunna-bridge/bunna_bridge/bunna_bridge/` (double-nested)
- ALL model/view/serializer files are at the double-nested path
- To run Django commands always use:
  `cd /root/bunna-bridge/bunna_bridge && docker compose -f docker-compose.local.yml run --rm django python manage.py <cmd>`
- makemigrations app label is `lots` (not `bunna_bridge.lots`)
- NEVER use pip — always `/root/.local/bin/uv add <pkg>` then `uv sync` then rebuild Docker

### Writing files
- Backend files go to: `/root/bunna-bridge/bunna_bridge/bunna_bridge/<app>/`
- Frontend files go to: `/root/bunna-bridge-frontend/src/`
- Always write complete files using `cat > /path/file << 'ENDOFFILE' ... ENDOFFILE`
- Never write partial files or ask the user to merge

### Frontend deploy (ALWAYS this exact sequence)
```bash
cd ~/bunna-bridge/bunna-bridge-frontend
npm run build 2>&1 | tail -8
# Only deploy if build is clean:
sudo rm -rf /var/www/bunnabridge/* && \
sudo cp -r dist/* /var/www/bunnabridge/ && \
sudo chown -R www-data:www-data /var/www/bunnabridge && \
echo "✅ Deployed"
```

---

## TECH STACK

### Backend
- Django 6.0.4 + DRF + GeoDjango + PostGIS
- Python 3.14 in Docker
- uv package manager (NOT pip)
- Celery + Redis
- ReportLab — PDF generation (EUDR DDS + Spec Sheet)
- djangorestframework-gis, simplejwt, django-filter, django-jazzmin

### Frontend
- React 18 + TypeScript + Vite 8
- @tanstack/react-query, react-router-dom v6, axios
- Leaflet + @types/leaflet
- Tailwind v4 via @tailwindcss/vite — NO tailwind.config.js
- lucide-react — ALL icons, no emoji anywhere

---

## DATA MODEL — EXACT FIELD NAMES

### CoffeeLot (key fields)
```
id (UUID PK) | lot_id (human-readable, e.g. YRG-2025-0847)
name | status: draft/listed/contracted/exported
exporter (FK User) | region | altitude_m | processing | grade
varietal | kebele | washing_station | harvest_date
volume_kg | price_per_kg | sca_score | flavor_notes
farm_location (PointField) | boundary (PolygonField geography=True)

# Marketplace fields (added June 2026)
flavor_tags (JSONField) | farm_photos (JSONField)
available_qty_kg | fob_price_usd | min_order_kg
delivery_window | lot_type: spot/forward/reserve
is_organic | is_fair_trade | is_rainforest_alliance
tasting_notes | farm_story

# Compliance gates (all BooleanField)
deforestation_free | gps_verified | phyto_cert_uploaded
ecta_license_active | nbe_fx_declared | cta_floor_met | eudr_dds_ready

# Methods
compliance_score() → int (0-7)
is_eudr_ready() → bool
green_passport_ready (property) → bool
export_ready (property) → bool
```

### Offer (new June 2026)
```
id (UUID PK) | lot (FK CoffeeLot) | buyer (FK User)
quantity_kg | price_per_kg_usd | delivery_window | notes
status: pending/countered/accepted/rejected/withdrawn
counter_price | counter_qty | exporter_notes
created_at | updated_at
```

### CuppingScore
```
id (UUID) | lot (FK) | grader (FK User)
status: pending/confirmed/disputed
fragrance_aroma | flavor | aftertaste | acidity | body
balance | uniformity | clean_cup | sweetness | overall
defects | flavor_notes | notes | cupping_date
total_score (property) | write-once after confirmed
```

### SampleRequest
```
id (UUID) | lot (FK) | buyer (FK User)
status: pending/approved/rejected/shipped/received
quantity_g (default 200) | message | response
shipping_address | tracking_number
```

---

## ALL API ENDPOINTS

```
# Auth
POST   /api/v1/auth/register/
POST   /api/auth/token/
POST   /api/auth/token/refresh/
GET    /api/v1/auth/me/
PATCH  /api/v1/auth/me/
GET    /api/v1/auth/users/           admin only
GET    /api/v1/auth/farmer/profile/
PATCH  /api/v1/auth/farmer/profile/
GET    /api/v1/auth/farmer/lots/
GET    /api/v1/auth/exporters/<id>/        public exporter profile
GET    /api/v1/auth/exporters/<id>/lots/   exporter's lots

# Lots
GET/POST   /api/v1/lots/
GET/PATCH  /api/v1/lots/<uuid>/
GET        /api/v1/lots/<uuid>/compliance-check/
GET/POST   /api/v1/lots/<uuid>/cupping-scores/
POST       /api/v1/lots/<uuid>/cupping-scores/<id>/confirm/
POST       /api/v1/lots/<uuid>/settlement/
PATCH      /api/v1/lots/<uuid>/status/
GET        /api/v1/lots/<uuid>/eudr-dds/
GET        /api/v1/lots/<uuid>/spec-sheet/
PATCH      /api/v1/lots/<uuid>/boundary/
POST       /api/v1/lots/<uuid>/boundary/inherit/

# Sample Requests
GET/POST   /api/v1/sample-requests/
POST       /api/v1/sample-requests/<uuid>/respond/

# Notifications
GET    /api/v1/notifications/
GET    /api/v1/notifications/unread-count/
POST   /api/v1/notifications/<id>/read/
POST   /api/v1/notifications/read-all/

# Offers (new June 2026)
GET/POST   /api/v1/offers/
GET        /api/v1/offers/<uuid>/
POST       /api/v1/offers/<uuid>/respond/    action: accept|reject|counter
POST       /api/v1/offers/<uuid>/withdraw/
POST       /api/v1/offers/<uuid>/accept-counter/
```

---

## USER ROLES

```
admin    → everything
exporter → own lots CRUD, offer inbox, samples, pipeline, compliance
buyer    → marketplace read, make offers, request samples, watchlist
farmer   → farm profile, linked lots (read), lot map
qgrader  → all lots (read), submit cupping scores
```

## DEMO ACCOUNTS
```
admin@bunnabridge.com   / BunnaAdmin2026!
dawit@addiscoffee.et    / Bunna2026!   (exporter)
sarah@nordicros.de      / Bunna2026!   (buyer)
abebe@kochere.et        / Bunna2026!   (farmer)
tigist@scaethiopia.et   / Bunna2026!   (qgrader)
```

---

## MARKETPLACE FEATURE STATUS (June 2026)

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Offer model + marketplace fields on CoffeeLot + demo data | ✅ |
| 2 | Marketplace rich cards + lot product page (radar chart, EUDR gates, offer modal) | ✅ |
| 3 | Buyer offer management (/buyer/offers) + Exporter offer inbox (/offers) | ✅ |
| 4 | Buyer watchlist (localStorage, /buyer/watchlist, heart icon on cards) | ✅ |
| 5 | Exporter storefront (/exporters/:id, public profile + lot list) | ✅ |
| 6 | Spec sheet PDF (ReportLab, /api/v1/lots/<id>/spec-sheet/) | ✅ |

---

## BRAND DESIGN

### Colors
```
#1A0F07  Espresso      page background
#1E1208  Deep Roast    sidebar, inner cards
#2C1810  Roast         card backgrounds, TopBar
#4A2515  Mahogany      deep borders, upload zones
#C1440E  Terracotta    CTAs, errors, FAIL
#D4824A  Amber         active nav, secondary
#C9952A  Gold          SCA scores, pricing, pending
#1E3A2F  Forest        compliance PASS, EUDR verified
#4A7C59  Sage          secondary green
#A8C5A0  Mist          success, confirmed
#F5EDD8  Cream         primary text
#EDE0C4  Parchment     secondary text
```

### Typography
```
Cormorant Garamond  page titles, lot names, large numbers (300-500)
DM Mono             IDs, labels, badges, prices, dates, metadata
Instrument Sans     body, nav, form inputs, buttons
```

### Rules
- Tailwind v4 — no config file, all in index.css via @theme + @layer
- Inline styles for Leaflet components (PolygonCaptureWidget, FarmMapDisplay)
- lucide-react for ALL icons — no emoji anywhere in UI
- Border radius: 4-8px on cards, 4px on inputs/buttons

---

## WHAT STILL NEEDS BUILDING (priority order)

1. **CuppingForm polish** — SCA 10-attr sliders, live total, radar preview
2. **MyFarm polish** — consistent styling with rest of app
3. **CreateLot marketplace fields** — add flavor_tags, fob_price, tasting_notes,
   farm_story inputs to the CreateLot form
4. **EditLot marketplace fields** — same fields in EditLot form
5. **CTA floor price widget** — weekly price display + lot validation
6. **NBE rate admin-configurable** — move 59.85 from settlement.py to Django admin
7. **Real deforestation data** — `python manage.py load_deforestation_data --clear --source=gfw`
8. **PWA manifest + service worker** — make Walk Boundary installable on Android
9. **Offer notifications** — wire Notification model to offer status changes via signals
10. **Farmer microfinance profile** — credit score from export history
11. **Carbon credit infrastructure** — GPS polygon area → Verra/Gold Standard pathway

---

## HOW TO ASSIST

1. Always give complete copy-paste bash commands
2. Write files using `cat > path << 'ENDOFFILE' ... ENDOFFILE`
3. Never ask the user to manually edit files
4. After backend changes: check `docker compose logs django --tail=15`
5. After frontend changes: always `npm run build 2>&1 | tail -8` before deploy
6. Group related commands into single bash blocks
7. All icons from lucide-react — no emoji
8. When patching files surgically, use Python scripts with exact string matching
9. The user runs commands on the VPS and pastes output back to you
10. Always verify with build/logs before declaring something done
11. Inline styles for Leaflet components only — everything else uses Tailwind classes
12. If you're unsure about current state, ask the user to `cat` the relevant file

---

## COMMON ERRORS AND FIXES

| Error | Fix |
|-------|-----|
| "No changes detected" on makemigrations | Check app label — use `lots` not `bunna_bridge.lots` |
| "doesn't declare explicit app_label" in shell | Use `manage.py shell` not direct Python — Django not initialized |
| SyntaxError in urls.py | Delete __pycache__, restart container |
| latest_sca_score is null on list response | Falls back to sca_score field (string, wrap with parseFloat) |
| createSampleRequest import fails | File is api/samples.ts not api/sampleRequests.ts |
| Container not picking up file changes | Delete __pycache__ dirs, restart container |
| "coffeelot_set doesn't exist" | Use CoffeeLot.objects.filter(exporter=obj) directly |
