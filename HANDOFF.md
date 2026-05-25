# BUNNA BRIDGE — AI Agent Handoff Prompt v3
# Updated: May 2026

## WHO I AM
I am building "Bunna Bridge" (ቡና ብሪጅ) — an Ethiopian D2C specialty
coffee export compliance marketplace. I work at Paperless Technology PLC,
an Ethiopia-based IT solutions company. I am not deeply technical but work
with AI to build and debug the platform step by step via command line on a
VPS. Always give me complete copy-paste ready commands. Never give me a
command and then say it won't work — only give commands you are confident
about.

## WHAT BUNNA BRIDGE IS
A compliance-native platform connecting Ethiopian smallholder farmers and
licensed exporters directly to global specialty roasters (EU, US, Asia).

Core features:
- Digital Birth Certificates for every coffee lot (GPS, farmer KYC,
  processing, varietal)
- EUDR 2026 compliance automation (EU Deforestation Regulation — mandatory
  for all coffee entering EU by Dec 30, 2025/2026)
- 7-gate compliance engine — Export button hard-blocked until all pass:
  GPS verified, deforestation free, EUDR DDS ready, phytosanitary cert,
  ECTA license, NBE FX declared, CTA floor price met
- SCA Quality Ledger — write-once cupping scores by certified Q-Graders
- Buyer Marketplace — EUDR-verified lot browser with inline sample request
- NBE Settlement Calculator — 50/50 USD/ETB split (NBE Directive FXD/53/2021)
- EUDR DDS PDF generator — reportlab A4 document
- Sample Request flow — buyer requests, exporter responds
- GPS Farm Boundary system — 3 capture methods + PostGIS spatial engine
- Lot Pipeline kanban — Draft→Listed→Contracted→Exported

## VPS & ACCESS
- VPS IP: 91.107.204.59
- OS: Ubuntu 22.04
- User: root
- Project root: ~/bunna-bridge/
- Django backend: ~/bunna-bridge/bunna_bridge/
- React frontend: ~/bunna-bridge/bunna-bridge-frontend/
- Django runs on port 8001 (Docker)
- React (Vite) runs on port 5173 (screen session "vite")
- Domain: bunnabridge.pro.et (Nginx + SSL configured)
- GitHub repo: git@github.com:CoolNietzsche/bunna-bridge.git (master)

## TECH STACK

Backend:
- Django 6.0.4 + Django REST Framework
- GeoDjango + PostGIS (spatial/GPS data)
- djangorestframework-gis (GeoJSON serializers)
- djangorestframework-simplejwt (JWT auth)
- django-cors-headers, django-filter
- Celery + Redis (installed, not yet used for app tasks)
- Jazzmin (Django admin theme)
- reportlab 4.5.1 (EUDR DDS PDF generation)
- uv (package manager — NEVER use pip)
- Python 3.14 inside Docker

Database:
- PostgreSQL 16 + PostGIS extension
- Docker container: bunna_bridge_local_postgres

Frontend:
- React 18 + TypeScript + Vite 8 (requires Node 22+)
- @tanstack/react-query (server state)
- react-router-dom (routing)
- axios (API calls with JWT interceptors)
- Leaflet 1.9.4 (maps)
- lucide-react (icons)
- Tailwind v4 + inline styles for brand colors

## HOW THE PROJECT IS RUN

Docker Compose manages the backend:
  cd ~/bunna-bridge/bunna_bridge
  docker compose -f docker-compose.local.yml up -d
  docker compose -f docker-compose.local.yml logs django --tail=20
  docker compose -f docker-compose.local.yml restart django
  docker compose -f docker-compose.local.yml run --rm django python manage.py <command>
  docker compose -f docker-compose.local.yml build django  # after adding packages

Vite (dev server):
  screen -dmS vite bash -c 'cd ~/bunna-bridge/bunna-bridge-frontend && npm run dev > /tmp/vite.log 2>&1'
  tail /tmp/vite.log

Kill all vite screens:
  screen -ls | grep vite | awk '{print $1}' | xargs -I{} screen -S {} -X quit

Adding Python packages (ALWAYS use uv):
  cd ~/bunna-bridge/bunna_bridge && /root/.local/bin/uv add <package>
  Then rebuild: docker compose -f docker-compose.local.yml build django

Deploy frontend to production:
  cd ~/bunna-bridge/bunna-bridge-frontend && npm run build
  cp -r dist/* /var/www/bunnabridge/

Git workflow:
  cd ~/bunna-bridge && ./scripts/push.sh

## PROJECT STRUCTURE & WHAT EACH FILE DOES

~/bunna-bridge/
├── scripts/
│   ├── push.sh         ← Interactive commit + push
│   ├── status.sh       ← Repo status overview
│   ├── new-branch.sh   ← Create + push branch
│   ├── sync.sh         ← Rebase with master
│   └── undo.sh         ← Undo last commit
│
├── bunna_bridge/                        ← Django project root
│   ├── bunna_bridge/
│   │   ├── lots/
│   │   │   ├── models.py               ← CoffeeLot, CuppingScore, SampleRequest
│   │   │   ├── deforestation.py        ← DeforestationZone model (NOT in models.py)
│   │   │   ├── eudr_spatial.py         ← check_deforestation_overlap(), run_deforestation_check_for_lot()
│   │   │   ├── views.py                ← All API views + LotBoundaryView + EudrDdsView
│   │   │   ├── serializers.py          ← All serializers
│   │   │   ├── urls.py                 ← Router + manual endpoints
│   │   │   ├── admin.py                ← GISModelAdmin + boundary map view
│   │   │   ├── admin_views.py          ← Admin boundary overview map
│   │   │   ├── settlement.py           ← NBE 50/50 calculator (rate hardcoded at 59.85)
│   │   │   └── management/commands/
│   │   │       ├── seed_lots.py        ← Seeds 7 demo lots with GPS + boundaries
│   │   │       └── load_deforestation_data.py ← Loads GFW or sample deforestation zones
│   │   │
│   │   ├── users/
│   │   │   ├── models.py               ← Custom User (5 roles) + FarmerProfile (with boundary)
│   │   │   ├── serializers.py          ← EmailTokenObtainPairSerializer, RegisterSerializer
│   │   │   ├── views.py                ← RegisterView, MeView, FarmerProfileView, FarmerLotsView
│   │   │   └── api_urls.py             ← /api/v1/auth/ routes
│   │   │
│   │   ├── compliance/                 ← Stub app (models/views/urls empty)
│   │   │
│   │   └── config/
│   │       ├── settings/base.py        ← Main settings
│   │       ├── settings/local.py       ← Dev overrides
│   │       └── urls.py                 ← Root URL config
│   │
│   ├── compose/local/django/Dockerfile ← Python 3.14, GDAL/GEOS/PROJ
│   ├── .envs/.local/.django            ← Secrets (never commit)
│   ├── .envs/.local/.postgres          ← DB credentials (never commit)
│   └── pyproject.toml                  ← Python deps (uv)
│
└── bunna-bridge-frontend/
    ├── vite.config.ts                  ← Proxy /api → http://localhost:8001
    └── src/
        ├── api/
        │   ├── client.ts               ← Axios + JWT interceptor (token in localStorage)
        │   ├── auth.ts                 ← Login, register, getMe
        │   ├── lots.ts                 ← getLots, getLot, createLot, updateLot, downloadEudrDds
        │   ├── boundary.ts             ← setLotBoundary, setFarmBoundary, inheritLotBoundary, offline queue
        │   ├── cupping.ts              ← getCuppingScores, submitCuppingScore, confirmCuppingScore
        │   ├── settlement.ts           ← calculateSettlement
        │   ├── samples.ts              ← getSampleRequests, createSampleRequest, respondToSample, updateLotStatus
        │   └── farmer.ts               ← getFarmerProfile, updateFarmerProfile, getFarmerLots
        │
        ├── context/AuthContext.tsx     ← Auth state, role, login, logout
        │
        ├── components/
        │   ├── AppLayout.tsx           ← Root layout, mobile drawer state
        │   ├── Sidebar.tsx             ← Collapsible nav + mobile drawer
        │   ├── TopBar.tsx              ← Search, notifications, profile dropdown, hamburger
        │   ├── PageWrapper.tsx         ← Wraps AppLayout
        │   ├── ProtectedRoute.tsx      ← Auth guard
        │   ├── RoleBadge.tsx           ← Colored role label
        │   ├── ComplianceBadge.tsx     ← PASS/FAIL badge
        │   ├── StatusPill.tsx          ← Lot status pill
        │   ├── CuppingHistory.tsx      ← Score cards + confirm button
        │   ├── SettlementWidget.tsx    ← NBE calculator card
        │   ├── SampleRequestWidget.tsx ← Inline sample request form
        │   ├── PolygonCaptureWidget.tsx← 3-mode boundary capture (pin/walk/import)
        │   └── FarmMapDisplay.tsx      ← Read-only Leaflet polygon display
        │
        └── pages/
            ├── Login.tsx               ← Email + password + demo autofill
            ├── Register.tsx            ← Role selector + registration form
            ├── Dashboard.tsx           ← Role-aware stats + quick actions
            ├── Lots.tsx                ← Paginated lot table with filters
            ├── LotDetail.tsx           ← Full lot view + all widgets
            ├── CreateLot.tsx           ← 4-step lot creation form
            ├── EditLot.tsx             ← Pre-filled 4-step edit form
            ├── Marketplace.tsx         ← Buyer card grid + inline sample request
            ├── CuppingForm.tsx         ← SCA sliders + submit/confirm flow
            ├── MyFarm.tsx              ← Farmer profile + lots + boundary map
            ├── LotPipeline.tsx         ← 4-column kanban status board
            ├── SampleRequests.tsx      ← Sample request inbox (buyer + exporter)
            └── FarmerLotsMap.tsx       ← Full Leaflet map of all lots with polygons

## API ENDPOINTS

POST /api/auth/token/                              ← Login
POST /api/auth/token/refresh/                      ← Refresh JWT
GET  /api/v1/auth/me/                              ← Current user profile
POST /api/v1/auth/register/                        ← Create account
GET  /api/v1/auth/farmer/profile/                  ← Farmer profile
PATCH /api/v1/auth/farmer/profile/                 ← Update farmer profile
GET  /api/v1/lots/                                 ← List lots (role-filtered, paginated)
POST /api/v1/lots/                                 ← Create lot (exporter only)
GET  /api/v1/lots/{id}/                            ← Lot detail (GeoJSON wrapped)
PATCH /api/v1/lots/{id}/                           ← Update lot
GET  /api/v1/lots/{id}/compliance-check/           ← 7 gates + live spatial deforestation
GET  /api/v1/lots/{id}/cupping-scores/             ← Score history
POST /api/v1/lots/{id}/cupping-scores/             ← Submit score
POST /api/v1/lots/{id}/cupping-scores/{sid}/confirm← Lock score
POST /api/v1/lots/{lot_pk}/settlement/             ← NBE split calculator
PATCH /api/v1/lots/{lot_pk}/status/                ← Update lot status
GET  /api/v1/lots/{lot_pk}/eudr-dds/               ← Download EUDR DDS PDF
PATCH /api/v1/lots/{lot_pk}/boundary/              ← Set/update boundary polygon
POST /api/v1/lots/{lot_pk}/boundary/inherit/       ← Inherit boundary from farmer profile
GET  /api/v1/sample-requests/                      ← List sample requests
POST /api/v1/sample-requests/                      ← Create sample request (buyer)
POST /api/v1/sample-requests/{id}/respond/         ← Exporter responds

## USER ROLES & PERMISSIONS
admin    — sees everything, all permissions
exporter — sees only their own lots, can create/edit lots, responds to samples
buyer    — sees listed/contracted/exported lots, requests samples
qgrader  — sees all lots (read-only), submits cupping scores
farmer   — sees My Farm page only

## DEMO ACCOUNTS
admin@bunnabridge.com  / BunnaAdmin2026!  (admin)
dawit@addiscoffee.et   / Bunna2026!       (exporter)
sarah@nordicros.de     / Bunna2026!       (buyer)
abebe@kochere.et       / Bunna2026!       (farmer)
tigist@scaethiopia.et  / Bunna2026!       (qgrader)

## DEMO LOTS (7 seeded, all now have boundary polygons)
YRG-2025-0847 — Kochere Washed G1, Yirgacheffe (all gates pass, 0.54 ha)
GJI-2025-0391 — Hambela Washed G1, Guji (all gates pass, 0.91 ha)
HRR-2025-0055 — Harrar Longberry Natural (exported, 0.64 ha)
SDM-2025-0213 — Bensa Natural G1, Sidama (2 gates fail, 1.98 ha)
JMA-2025-0102 — Limu Washed G2, Jimma (deforestation overlap, 1.96 ha)
YRG-2025-0901 — Gedeb Honey G1, Yirgacheffe (deforestation overlap, 0.48 ha)
SDM-2025-0298 — Aleta Wondo G2, Sidama (all gates fail, 1.4 ha)

## BRAND COLORS
#1A0F07 — Espresso (page background)
#2C1810 — Dark Roast (card backgrounds)
#1E1208 — Deeper Roast (sidebar background)
#4A2515 — Mahogany (deeper cards)
#C1440E — Terracotta (CTAs, primary action, errors)
#D4824A — Amber (active nav, secondary accents)
#C9952A — Gold (SCA scores, pricing, pending states)
#1E3A2F — Forest (compliance pass, EUDR verified)
#4A7C59 — Sage (secondary green)
#A8C5A0 — Mist (light green, success)
#F5EDD8 — Cream (primary text)
#EDE0C4 — Parchment (secondary text)

Typography:
- Display: Cormorant Garamond (serif)
- Mono: DM Mono (data, labels, codes)
- Body: Instrument Sans (clean readable)

## CRITICAL GOTCHAS
- lot.farmer does NOT exist — only lot.exporter (ForeignKey to User)
- DeforestationZone is in bunna_bridge.lots.deforestation, NOT lots.models
- Tailwind v4 — no tailwind.config.js, everything in index.css @theme block
- Brand colors use inline styles — Tailwind only for layout utilities
- All API calls must use relative URLs (/api/...) never hardcode IP
- uv not pip — always /root/.local/bin/uv add <package> then rebuild Docker
- VPS ports 8090, 9071, 10018 are Odoo — never touch
- NBE rate hardcoded at 59.85 ETB/USD in settlement.py
- Leaflet marker icons broken in Vite — fix with delete L.Icon.Default.prototype._getIconUrl
- Django admin URL conflict fixed — users/urls.py uses name="me" not name="detail"
- PolygonCaptureWidget uses inline styles (Tailwind not available in Leaflet popups)
- FarmerProfile.boundary exists but CoffeeLot.farmer FK does not exist

## FEATURES STATUS
✅ Auth + JWT + 5 roles
✅ Coffee Lot Registry (CRUD)
✅ 7-gate compliance engine
✅ SCA Cupping Flow (write-once)
✅ EUDR DDS PDF generator
✅ Buyer Marketplace + inline sample request
✅ Sample Request Flow (full backend + frontend)
✅ NBE Settlement Calculator
✅ Lot Pipeline kanban
✅ Lot Edit page
✅ My Farm page
✅ GPS Farm Boundary (3 capture methods)
✅ PostGIS deforestation spatial check (18 regional zones)
✅ Farm Boundary Map page (/map)
✅ Admin boundary overview map
✅ Offline boundary queue
✅ Mobile responsive layout
✅ Production deployed on bunnabridge.pro.et with SSL

## NEXT STEPS (priority order)
1. Real GFW deforestation data — replace 18 sample zones with actual Hansen GFC data
2. Polygon editing — adjust individual boundary points without full redraw
3. UI overhaul — pages still use old inline styles inconsistently
4. Live NBE rate — admin-configurable instead of hardcoded 59.85
5. Phytosanitary certificate file upload UI
6. Password reset + email verification (allauth installed, not configured)
7. Notifications system (Celery ready, not wired)
8. CTA floor price widget
9. Lot pipeline mobile responsiveness
10. Compliance app (stub exists, needs models/views)

## LIVE ACCESS
Production:  https://bunnabridge.pro.et
Admin panel: https://bunnabridge.pro.et/WLlKdT1iUCMdB6C0MZ9KxeNGbu3Vrkpx/
VPS:         91.107.204.59 (root)
GitHub:      github.com/CoolNietzsche/bunna-bridge (master)
