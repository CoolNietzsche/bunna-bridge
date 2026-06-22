# BUNNA BRIDGE — AI_CONTEXT.md
# Single Source of Truth · Engineering Reference
# Last updated: June 2026
# ─────────────────────────────────────────────────────────────────────

## 1. PROJECT IDENTITY

Name:        Bunna Bridge (ቡና ብሪጅ)
Domain:      https://bunnabridge.pro.et
VPS:         91.107.204.59 (Hetzner, Ubuntu 22.04)
VPS User:    root
Git:         git@github.com:CoolNietzsche/bunna-bridge.git
Branch:      master

What it is: An Ethiopian D2C specialty coffee export compliance
marketplace. Connects smallholder farmers and licensed exporters
to global specialty roasters. Core value: EUDR 2026 compliance
automation — GPS farm mapping, deforestation checks, 7-gate
export validator — embedded into every transaction.

---

## 2. REPOSITORY LAYOUT

~/bunna-bridge/
├── AI_CONTEXT.md                    ← THIS FILE (always read first)
├── bunna_bridge/                    ← Django backend root
│   ├── bunna_bridge/                ← Python package
│   │   ├── lots/                    ← Core coffee lot app
│   │   │   ├── models.py            ← CoffeeLot, CuppingScore,
│   │   │   │                           SampleRequest, DeforestationZone
│   │   │   ├── deforestation.py     ← DeforestationZone model +
│   │   │   │                           check_deforestation_overlap()
│   │   │   ├── eudr_spatial.py      ← Spatial EUDR checks
│   │   │   ├── views.py             ← All ViewSets:
│   │   │   │                           CoffeeLotViewSet,
│   │   │   │                           CuppingScoreViewSet,
│   │   │   │                           SampleRequestViewSet,
│   │   │   │                           SettlementView,
│   │   │   │                           LotStatusUpdateView,
│   │   │   │                           EudrDdsView,
│   │   │   │                           LotBoundaryView,
│   │   │   │                           LotBoundaryInheritView
│   │   │   ├── serializers.py       ← CoffeeLotListSerializer,
│   │   │   │                           CoffeeLotDetailSerializer,
│   │   │   │                           CuppingScoreSerializer,
│   │   │   │                           SampleRequestSerializer,
│   │   │   │                           LotStatusUpdateSerializer
│   │   │   ├── urls.py              ← Router + manual paths
│   │   │   ├── admin.py             ← GISModelAdmin + inlines +
│   │   │   │                           custom map view
│   │   │   ├── admin_views.py       ← /admin/lots/coffeelot/map/
│   │   │   └── settlement.py        ← NBE 50/50 calculator
│   │   ├── users/
│   │   │   ├── models.py            ← Custom User model (5 roles)
│   │   │   │                           + farmer fields + boundary
│   │   │   ├── serializers.py       ← EmailTokenObtainPair,
│   │   │   │                           UserSerializer,
│   │   │   │                           RegisterSerializer
│   │   │   ├── views.py             ← Register, Me, UserList,
│   │   │   │                           FarmerProfileView,
│   │   │   │                           farmer_lots
│   │   │   ├── urls.py              ← users namespace (name="me",
│   │   │   │                           NOT name="detail")
│   │   │   └── api_urls.py          ← /api/v1/auth/ routes
│   │   └── compliance/              ← Stub app (future use)
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py              ← INSTALLED_APPS, DRF, JWT,
│   │   │   │                           CORS, GeoDjango, PostGIS
│   │   │   └── local.py             ← ALLOWED_HOSTS includes
│   │   │                               localhost, 91.107.204.59,
│   │   │                               bunnabridge.pro.et
│   │   └── urls.py                  ← Root URL conf
│   ├── compose/local/django/
│   │   ├── Dockerfile               ← Python 3.14,
│   │   │                               GDAL + GEOS + PROJ installed,
│   │   │                               libpango + libcairo for PDF
│   │   └── start                    ← migrate + runserver_plus
│   ├── .envs/.local/
│   │   ├── .django                  ← JWT secret, CORS origins,
│   │   │                               Redis URL, Celery config
│   │   └── .postgres                ← DB credentials
│   ├── docker-compose.local.yml     ← Services: django (8001),
│   │                                   postgres/postgis, redis,
│   │                                   celery worker+beat, flower
│   ├── pyproject.toml               ← Python deps (uv managed)
│   └── uv.lock                      ← Lockfile (committed)
│
└── bunna-bridge-frontend/           ← React 18 + Vite 8 + TS
    ├── src/
    │   ├── api/
    │   │   ├── client.ts            ← Axios, baseURL="/api",
    │   │   │                           JWT interceptors pre-wired
    │   │   ├── auth.ts              ← login, register, getMe
    │   │   ├── lots.ts              ← getLots, getLot, createLot,
    │   │   │                           getComplianceCheck,
    │   │   │                           downloadEudrDds
    │   │   ├── cupping.ts           ← getCuppingScores,
    │   │   │                           submitCuppingScore,
    │   │   │                           confirmCuppingScore
    │   │   ├── settlement.ts        ← calculateSettlement
    │   │   ├── farmer.ts            ← getFarmerProfile,
    │   │   │                           updateFarmerProfile,
    │   │   │                           getFarmerLots
    │   │   ├── samples.ts           ← getSampleRequests,
    │   │   │                           createSampleRequest,
    │   │   │                           respondToSample,
    │   │   │                           updateLotStatus
    │   │   └── boundary.ts          ← setLotBoundary,
    │   │                               inheritLotBoundary,
    │   │                               setFarmBoundary,
    │   │                               calcAreaHa,
    │   │                               offline queue helpers
    │   ├── components/
    │   │   ├── AppLayout.tsx        ← Root layout: sidebar +
    │   │   │                           topbar + main content
    │   │   ├── Sidebar.tsx          ← Collapsible, role-based nav,
    │   │   │                           bg #1E1208, user strip
    │   │   ├── TopBar.tsx           ← Search, notifications,
    │   │   │                           profile dropdown
    │   │   ├── PageWrapper.tsx      ← Thin AppLayout wrapper
    │   │   ├── ProtectedRoute.tsx   ← Auth guard → /login
    │   │   ├── RoleBadge.tsx        ← Role color pill
    │   │   ├── ComplianceBadge.tsx  ← Pass/fail badge
    │   │   ├── StatusPill.tsx       ← Lot status pill
    │   │   ├── CuppingHistory.tsx   ← Score list + confirm btn
    │   │   ├── SettlementWidget.tsx ← NBE 50/50 calculator
    │   │   ├── SampleRequestWidget.tsx ← Buyer sample form
    │   │   ├── PolygonCaptureWidget.tsx ← 3-mode GPS capture
    │   │   │                             (click, walk, import)
    │   │   └── FarmMapDisplay.tsx   ← Read-only Leaflet polygon
    │   ├── context/
    │   │   └── AuthContext.tsx      ← Auth state + role,
    │   │                               stored as user_data in
    │   │                               localStorage
    │   ├── hooks/
    │   │   └── useBoundarySync.ts   ← Flushes offline polygon
    │   │                               queue on window.online
    │   ├── lib/
    │   │   └── utils.ts             ← cn() class merger
    │   ├── pages/
    │   │   ├── Login.tsx            ← Email+pw + demo autofill
    │   │   ├── Register.tsx         ← Role selector form
    │   │   ├── Dashboard.tsx        ← Role-aware stats + actions
    │   │   ├── Lots.tsx             ← Table, filters, pagination
    │   │   ├── LotDetail.tsx        ← Full lot: gates, maps,
    │   │   │                           cupping, settlement, DDS
    │   │   ├── CreateLot.tsx        ← 4-step form
    │   │   ├── EditLot.tsx          ← Edit existing lot
    │   │   ├── Marketplace.tsx      ← Buyer card grid
    │   │   ├── CuppingForm.tsx      ← SCA 10-attr sliders
    │   │   ├── MyFarm.tsx           ← Farmer profile + boundary
    │   │   ├── FarmerLotsMap.tsx    ← Leaflet map all boundaries
    │   │   ├── LotPipeline.tsx      ← Kanban status board
    │   │   └── SampleRequests.tsx   ← Sample inbox
    │   ├── index.css                ← Tailwind v4 @import,
    │   │                               @theme brand tokens,
    │   │                               @layer components classes
    │   └── App.tsx                  ← All routes
    ├── vite.config.ts               ← Tailwind plugin + proxy
    │                                   /api → localhost:8001
    └── package.json

---

## 3. DATABASE GROUND TRUTHS

### CRITICAL — Read before touching any model

CoffeeLot primary key: UUID (not integer)
  → Always use lot.id (UUID string) in API calls
  → lot_id is the human-readable string (e.g. YRG-2025-0847)

CoffeeLot.exporter: ForeignKey → User
  → There is NO separate Farmer model
  → Farmers are Users with role="farmer"
  → Lots belong to exporters, not farmers

DeforestationZone lives in:
  bunna_bridge.lots.deforestation (NOT models.py)
  app_label = 'lots' must be in its Meta class

GPS fields on CoffeeLot:
  farm_location = PointField (for GPS point, farms < 4ha)
  boundary = PolygonField(geography=True) (farm boundary)
  NOTE: old farm_polygon field was REMOVED in migration 0004
  Do NOT reference farm_polygon anywhere

GPS fields on User (farmer profile):
  gps_lat, gps_lng = DecimalFields (point coords)
  boundary = PolygonField(geography=True)

All Django models using PolygonField MUST use:
  from django.contrib.gis.db import models
  NOT: from django.db import models

users/urls.py MUST use name="me" not name="detail"
  (name="detail" conflicts with Django admin internals)

Migration state (current):
  lots:  0001→0002→0003→0004→0005
  users: 0001→0002→0003→0004

---


## 3.1 EXACT DATABASE MODEL FIELDS (MAY 2026 AUDIT)

### CoffeeLot (`bunna_bridge/lots/models.py`)
- id (UUID, PK) | lot_id (CharField, Unique) | name (CharField) | volume_kg (DecimalField) | price_per_kg (DecimalField)
- status: Choice('draft', 'listed', 'contracted', 'exported')
- region: Choice('yirgacheffe', 'sidama', 'guji', 'jimma', 'harrar', 'limu', 'nekemte', 'other')
- processing: Choice('washed', 'natural', 'honey') | grade: Choice('G1', 'G2', 'G3')
- kebele, washing_station, varietal (default: Ethiopian Heirloom), altitude_m, flavor_notes
- farm_location (PointField) | boundary (PolygonField)
- sca_score (DecimalField) | cupping_date (DateField) | q_grader_name, q_grader_cert_id
- Compliance Flags: deforestation_free, gps_verified, eudr_dds_ready, phyto_cert_uploaded, ecta_license_active, nbe_fx_declared, cta_floor_met (All Booleans)
- Files: phyto_cert_file (FileField, PDF) | eudr_dds_file (FileField, PDF)

### CuppingScore (`bunna_bridge/lots/models.py`)
- id (UUID) | lot (FK CoffeeLot) | grader (FK User, Q-Grader)
- status: Choice('pending', 'confirmed', 'disputed')
- SCA protocol 6-10 fields: fragrance_aroma to overall (DecimalFields) | defects (DecimalField)
- flavor_notes (CharField) | notes (TextField, Private) | cupping_date, cupping_location

### SampleRequest (`bunna_bridge/lots/models.py`)
- id (UUID) | lot (FK CoffeeLot) | buyer (FK User)
- status: Choice('pending', 'approved', 'rejected', 'shipped', 'received')
- quantity_g (IntegerField, default: 200) | message, response, shipping_address, tracking_number

### DeforestationZone (`bunna_bridge/lots/deforestation.py`)
- geometry (MultiPolygonField) | year (IntegerField) | source, region, area_ha

## 4.1 ENFORCEMENT ENGINE INVARIANTS
- Pipeline State Guard: LotStatusUpdateView explicitly blocks transition to 'exported' unless lot.export_ready is True (evaluates all 7 gates).
- PDF Generator Guard: EudrDdsView explicitly fails generation requests if gps_verified is False.

## 4. USER ROLES & PERMISSIONS

Role        | API Access                    | Frontend Nav
------------|-------------------------------|---------------------------
admin       | Everything                    | All links
exporter    | Own lots only (CRUD)          | Lots, Pipeline, Samples,
            | Sample request responses      | Compliance, Lot Map
buyer       | Listed/contracted/exported    | Marketplace, Samples
            | lots (read-only)              |
            | Create sample requests        |
farmer      | Own farm profile              | My Farm, Lot Map
            | Linked lots (read-only)       |
qgrader     | All lots (read-only)          | Lots, Lot Map
            | Submit cupping scores         |

---

## 5. ALL API ENDPOINTS

### Auth  /api/v1/auth/
POST   /register/              Create account (any role)
POST   /token/                 Login → JWT tokens + user object
POST   /token/refresh/         Refresh access token
GET    /me/                    Current user profile
PATCH  /me/                    Update profile
GET    /users/                 List all users (admin only)
GET    /farmer/profile/        Farmer profile
PATCH  /farmer/profile/        Update farmer profile
GET    /farmer/lots/           Lots matched to farmer kebele/region

### Lots  /api/v1/lots/
GET    /                       List (role-filtered)
POST   /                       Create (exporter only)
GET    /{id}/                  Detail (GeoJSON format)
PATCH  /{id}/                  Update
DELETE /{id}/                  Delete
GET    /{id}/compliance-check/ 7 gates + live spatial deforestation
GET    /{id}/cupping-scores/   List scores
POST   /{id}/cupping-scores/   Submit score (qgrader only)
POST   /{id}/cupping-scores/{score_id}/confirm/  Lock score
POST   /{id}/settlement/       NBE 50/50 calculator
PATCH  /{id}/status/           Pipeline advance
GET    /{id}/eudr-dds/         Download DDS JSON
PATCH  /{id}/boundary/         Save GIS polygon
POST   /{id}/boundary/inherit/ Inherit from farmer profile

### Sample Requests  /api/v1/sample-requests/
GET    /                       List (role-filtered)
POST   /                       Create (buyer only)
POST   /{id}/respond/          Respond (exporter: approve/reject/ship)

---

## 6. BRAND DESIGN PALETTE

### Colors (EXACT HEX — never approximate)
--espresso:    #1A0F07   Page background
--deep-roast:  #1E1208   Sidebar background (darker than cards)
--roast:       #2C1810   Card backgrounds, TopBar
--mahogany:    #4A2515   Deeper cards, secondary surfaces
--terracotta:  #C1440E   Primary CTAs, errors, compliance FAIL
--amber:       #D4824A   Active nav, warmth, secondary accents
--gold:        #C9952A   SCA scores, pricing, pending states
--forest:      #1E3A2F   Compliance PASS, EUDR verified
--sage:        #4A7C59   Secondary green
--mist:        #A8C5A0   Light green, success states
--cream:       #F5EDD8   Primary text on dark
--parchment:   #EDE0C4   Secondary text
--border:      rgba(245,237,216,0.08)   Default border
--border-strong: rgba(245,237,216,0.15) Hover border

### Typography
Display:  Cormorant Garamond — serif, weight 300-500
          Use for: page titles, lot names, section headers
Mono:     DM Mono — monospace
          Use for: lot IDs, GPS coords, compliance codes,
                   prices, dates, labels, badges
Body:     Instrument Sans — readable sans-serif
          Use for: body copy, nav items, form inputs,
                   dropdown menus, descriptions

### Styling Rules
- Tailwind v4 is active. @theme block in index.css defines
  all brand colors as Tailwind utilities (text-gold, bg-terracotta/10 etc)
- @layer components in index.css defines: card, card-title,
  btn-primary, btn-ghost, input, label, page-title,
  page-subtitle, table-row, border-border, border-border-strong
- PolygonCaptureWidget and FarmMapDisplay MUST use inline styles
  (Leaflet popups render outside React, Tailwind classes unavailable)
- All other components: prefer Tailwind classes over inline styles
- Never use purple, blue, or generic SaaS color palettes

---

## 7. COMMAND REFERENCE

### Daily startup
cd ~/bunna-bridge/bunna_bridge
docker compose -f docker-compose.local.yml up -d

### Check Django logs
docker compose -f docker-compose.local.yml logs django --tail=30

### Run Django management command
docker compose -f docker-compose.local.yml run --rm django \
  python manage.py <command>

### Add Python package (ALWAYS uv, NEVER pip)
cd ~/bunna-bridge/bunna_bridge
/root/.local/bin/uv add <package-name>
# Then rebuild:
docker compose -f docker-compose.local.yml build django
docker compose -f docker-compose.local.yml up -d

### Sync host venv (run after uv add, before Docker rebuild)
cd ~/bunna-bridge/bunna_bridge
/root/.local/bin/uv sync

### Why host venv matters:
Docker bind-mounts ./ into /app — so the container uses
the HOST .venv at runtime, not the image-baked one.
Always run uv sync on the host after any package change.

### Makemigrations + migrate
docker compose -f docker-compose.local.yml run --rm django \
  python manage.py makemigrations <app>
docker compose -f docker-compose.local.yml run --rm django \
  python manage.py migrate

### Build frontend
cd ~/bunna-bridge/bunna-bridge-frontend
npm run build 2>&1 | tail -8
# NEVER deploy without a clean build first

### Deploy frontend to production
cd ~/bunna-bridge/bunna-bridge-frontend
npm run build && \
sudo rm -rf /var/www/bunnabridge/* && \
sudo cp -r dist/* /var/www/bunnabridge/ && \
sudo chown -R www-data:www-data /var/www/bunnabridge && \
echo "✅ Deployed to https://bunnabridge.pro.et"

### Start Vite dev server (optional, for local testing only)
screen -dmS vite bash -c \
  'cd ~/bunna-bridge/bunna-bridge-frontend && \
   npm run dev > /tmp/vite.log 2>&1'
tail -f /tmp/vite.log

### Nginx
sudo nginx -t && sudo systemctl reload nginx

### SSL cert status
certbot certificates

### Git
cd ~/bunna-bridge
git add -A && git commit -m "feat: <description>"
git push origin master

---

## 8. DEMO ACCOUNTS

Email                     Password          Role
admin@bunnabridge.com     BunnaAdmin2026!   admin
dawit@addiscoffee.et      Bunna2026!        exporter
sarah@nordicros.de        Bunna2026!        buyer
abebe@kochere.et          Bunna2026!        farmer
tigist@scaethiopia.et     Bunna2026!        qgrader

---

## 9. DEMO LOTS (seeded)

Lot ID          Name                      Region       Status     Gates
YRG-2025-0847   Kochere Washed G1         yirgacheffe  listed     all pass
GJI-2025-0391   Hambela Washed G1         guji         contracted all pass
HRR-2025-0055   Harrar Longberry Natural  harrar       exported   all pass
SDM-2025-0213   Bensa Natural G1          sidama       draft      2 fail
JMA-2025-0102   Limu Washed G2            jimma        draft      1 fail
YRG-2025-0901   Gedeb Honey G1            yirgacheffe  listed     all pass
SDM-2025-0298   Aleta Wondo G2            sidama       draft      all fail

---

## 10. NGINX CONFIG SUMMARY

File: /etc/nginx/sites-available/bunnabridge.pro.et
- Listens on 443 SSL (certbot managed)
- HTTP → HTTPS redirect (certbot managed)
- root /var/www/bunnabridge (React static files)
- location / { try_files $uri $uri/ /index.html; }  ← SPA routing
- location /api/ { proxy_pass http://127.0.0.1:8001; }
- location /admin/ { proxy_pass http://127.0.0.1:8001; }
- location /static/ { proxy_pass http://127.0.0.1:8001; }
- SSL cert: /etc/letsencrypt/live/bunnabridge.pro.et/
- Expires: 2026-08-09 (auto-renewing)

Other domains on this VPS (DO NOT TOUCH):
- erp.messeret.com       → Odoo port 10018
- odoo.messeret.com      → Odoo port 8075
- bunnabridge.messeret.com → old Bunna staging
- demo.odooerp.et        → Odoo port 8090
- postiz.messeret.com    → Postiz port 4600

---

## 11. SYSTEM SERVICES

bunna-bridge.service  → systemd, auto-starts Django on reboot
nginx.service         → auto-start
docker.service        → auto-start

VPS ports in use (DO NOT CONFLICT):
8001  Django (Bunna Bridge)
5555  Celery Flower
8090  Odoo 18 (production 2)
9071  Odoo 17 (test)
10018 Odoo 18 (production 1)
20018 Odoo 18 websocket
8075  Odoo (messeret)
4600  Postiz

---

## 12. KNOWN TECHNICAL GOTCHAS

1. uv not pip — /root/.local/bin/uv add, then uv sync, then
   docker build. Never pip install inside container.

2. Host .venv must stay in sync — Docker bind-mounts the
   project dir. Container uses host .venv at runtime.
   Run uv sync after every uv add.

3. Tailwind v4 — no tailwind.config.js. All config in
   index.css via @theme and @layer components.
   Custom color classes work because @theme is set up.

4. PolygonCaptureWidget + FarmMapDisplay — MUST use inline
   styles. Leaflet renders popups outside React tree,
   Tailwind classes unavailable inside them.

5. farm_polygon is GONE — removed in lots migration 0004.
   Use boundary (PolygonField geography=True) instead.

6. users/urls.py — name="me" not name="detail".
   "detail" conflicts with Django admin URL namespace.

7. DeforestationZone app_label — must have app_label='lots'
   in Meta class. Lives in deforestation.py not models.py.

8. Leaflet in Vite — default marker icons break.
   Fix: delete (L.Icon.Default.prototype as any)._getIconUrl
   + L.Icon.Default.mergeOptions({...}) already in widget.

9. GIS models — must import from django.contrib.gis.db
   not from django.db for spatial fields to work.

10. NBE rate hardcoded at 59.85 in settlement.py —
    should become admin-configurable (not yet done).

11. CTA floor prices — manually set via Django admin,
    not auto-fetched from CTA website (not yet done).

12. Chunk size warning — frontend bundle is ~625KB.
    Not an error. Can optimize with dynamic imports later.

---

## 13. FEATURE STATUS

✅ Done
- Infrastructure: Docker, PostGIS, Redis, Celery, Nginx, SSL
- Auth: JWT, 5 roles, register/login, email-based
- CoffeeLot model + CRUD + 7-gate compliance engine
- CuppingScore model + SCA flow + confirm/lock (write-once)
- SampleRequest model + buyer/exporter flow
- DeforestationZone model + spatial intersection check
- GPS boundary capture: PolygonCaptureWidget (3 methods)
- FarmMapDisplay: read-only Leaflet polygon view
- Offline boundary sync: useBoundarySync hook
- Settlement calculator: NBE 50/50 USD/ETB
- EUDR DDS JSON generator + download
- Buyer Marketplace
- My Farm page (farmer role)
- Lot Pipeline kanban board
- Sample Request flow (buyer → exporter)
- Farmer Lots Map (/map route)
- Admin boundary map (/admin/lots/coffeelot/map/)
- Mobile responsive layout
- Sidebar + TopBar shell (redesigned)
- index.css: Tailwind v4 @theme + @layer components
- Production deployed: https://bunnabridge.pro.et
- Auto-restart on VPS reboot (systemd)
- GitHub pushed: master branch

⏳ Pending
- UI page polish: Dashboard, Lots, LotDetail, Marketplace,
  CreateLot, LotPipeline, SampleRequests (shell done,
  pages need consistent Tailwind class adoption)
- Notifications system (Celery + polling or WebSockets)
- CTA floor price widget (weekly price + lot validation)
- EUDR DDS PDF upgrade (currently JSON, needs WeasyPrint
  + Docker rebuild with libpango/libcairo)
- Real deforestation data (GFW Hansen dataset via
  management command: load_deforestation_data --source=gfw)
- Offline PWA (manifest + service worker for walk-boundary)
- Farmer microfinance profile (credit score from history)
- Carbon credit infrastructure (polygon → Verra pathway)
- NBE rate as admin-configurable setting
- CTA floor price auto-fetch from CTA website
- Bundle optimization (dynamic imports, code splitting)
- Pan-African rules engine (Uganda, Kenya, Rwanda configs)

