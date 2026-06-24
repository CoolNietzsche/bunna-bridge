# Actual Implemented Features Report — Bunna Bridge
**Generated:** May 2026

## 1. Database Models & Fields

### CoffeeLot (`bunna_bridge/lots/models.py`)
- `id` (UUID): Primary key.
- `lot_id` (CharField): Unique identifier (e.g., YRG-2025-0847).
- `name` (CharField): Descriptive name of the lot.
- `status` (CharField): Choice: `draft`, `listed`, `contracted`, `exported`.
- `exporter` (ForeignKey): Links to the `User` who owns the lot.
- `region` (CharField): Choice: `yirgacheffe`, `sidama`, `guji`, `jimma`, `harrar`, `limu`, `nekemte`, `other`.
- `kebele` (CharField): Sub-district location.
- `washing_station` (CharField): Name of the processing station.
- `altitude_m` (IntegerField): Elevation in meters.
- `processing` (CharField): Choice: `washed`, `natural`, `honey`.
- `grade` (CharField): Choice: `G1`, `G2`, `G3`.
- `varietal` (CharField): Coffee variety (default: Ethiopian Heirloom).
- `harvest_date` (DateField): Date of harvest.
- `farm_location` (PointField): GIS point of the farm.
- `boundary` (PolygonField): GIS polygon of the farm/lot.
- `sca_score` (DecimalField): Quality score (set from confirmed cupping).
- `flavor_notes` (CharField): Descriptive flavor notes.
- `cupping_date` (DateField): Date of last confirmed cupping.
- `q_grader_name` (CharField): Name of the Q-Grader who scored the lot.
- `q_grader_cert_id` (CharField): Certification ID of the Q-Grader.
- `deforestation_free` (BooleanField): EUDR Gate 1 flag.
- `gps_verified` (BooleanField): EUDR Gate 2 flag.
- `eudr_dds_ready` (BooleanField): EUDR Gate 3 flag.
- `phyto_cert_uploaded` (BooleanField): Compliance flag.
- `ecta_license_active` (BooleanField): Compliance flag.
- `nbe_fx_declared` (BooleanField): Compliance flag.
- `cta_floor_met` (BooleanField): Compliance flag.
- `phyto_cert_file` (FileField): PDF of phytosanitary certificate.
- `eudr_dds_file` (FileField): Generated EUDR DDS document.
- `volume_kg` (DecimalField): Total weight of the lot.
- `price_per_kg` (DecimalField): Price in USD.
- `created_at` / `updated_at`: Timestamps.

### CuppingScore (`bunna_bridge/lots/models.py`)
- `id` (UUID): Primary key.
- `lot` (ForeignKey): Links to `CoffeeLot`.
- `grader` (ForeignKey): Links to `User` (Q-Grader).
- `status` (CharField): Choice: `pending`, `confirmed`, `disputed`.
- `fragrance_aroma` to `overall` (DecimalFields): SCA protocol 6-10 scores.
- `defects` (DecimalField): Penalty points.
- `flavor_notes` (CharField): Public notes.
- `notes` (TextField): Private Q-Grader notes.
- `cupping_date` (DateField): Date of cupping session.
- `cupping_location` (CharField): Where the cupping took place.

### SampleRequest (`bunna_bridge/lots/models.py`)
- `id` (UUID): Primary key.
- `lot` (ForeignKey): Links to `CoffeeLot`.
- `buyer` (ForeignKey): Links to `User` (Buyer).
- `status` (CharField): Choice: `pending`, `approved`, `rejected`, `shipped`, `received`.
- `quantity_g` (IntegerField): Sample size (default 200g).
- `message` (TextField): Buyer message.
- `response` (TextField): Exporter response.
- `shipping_address` (TextField): Destination address.
- `tracking_number` (CharField): Courier tracking ID.

### User (`bunna_bridge/users/models.py`)
- `role` (CharField): Choice: `admin`, `exporter`, `buyer`, `farmer`, `qgrader`.
- `company_name` (CharField).
- `phone` (CharField).
- `country` (CharField).
- `bio` (TextField).
- `is_verified` (BooleanField).
- `farm_name` (CharField) [Farmer only].
- `farm_region` (CharField) [Farmer only].
- `farm_kebele` (CharField) [Farmer only].
- `farm_altitude_m` (IntegerField) [Farmer only].
- `farm_size_ha` (DecimalField) [Farmer only].
- `cooperative` (CharField) [Farmer only].
- `gps_lat` / `gps_lng` (DecimalField) [Farmer only].
- `boundary` (PolygonField) [Farmer only].

### DeforestationZone (`bunna_bridge/lots/deforestation.py`)
- `geometry` (MultiPolygonField): GIS area.
- `year` (IntegerField): Year of detection.
- `source` (CharField): e.g., "Hansen GFC".
- `region` (CharField).
- `area_ha` (FloatField).

---

## 2. Active API Endpoints

### Authentication & Users (`/api/v1/auth/`)
- `POST /register/`: Create new user with role.
- `GET /me/`: Get current user profile.
- `PATCH /me/`: Update current user profile.
- `GET /users/`: List all users (Admin only).
- `GET /farmer/profile/`: Get farmer-specific profile.
- `GET /farmer/lots/`: Get lots matched to farmer's region/kebele.

### Coffee Lots (`/api/v1/lots/`)
- `GET /`: List lots (filtered by role/permissions).
- `POST /`: Create a new lot (Exporter only).
- `GET /{id}/`: Get lot details (GeoJSON format).
- `PATCH /{id}/`: Update lot.
- `GET /{id}/compliance-check/`: Live 7-gate compliance status + spatial deforestation check.
- `GET /{id}/cupping-scores/`: List scores for a lot.
- `POST /{id}/cupping-scores/`: Submit a new score (Q-Grader only).
- `POST /{id}/cupping-scores/{score_id}/confirm/`: Finalize a score and update lot quality data.
- `POST /{id}/settlement/`: Calculate NBE 50/50 USD/ETB split.
- `PATCH /{id}/status/`: Progress lot through pipeline (`draft` → `listed` → `contracted` → `exported`).
- `GET /{id}/eudr-dds/`: Generate and download EUDR Due Diligence Statement PDF.
- `PATCH /{id}/boundary/`: Save GIS polygon for the lot.
- `POST /{id}/boundary/inherit/`: Inherit polygon from linked farmer profile.

### Sample Requests (`/api/v1/sample-requests/`)
- `GET /`: List requests (Buyer sees their own, Exporter sees requests for their lots).
- `POST /`: Create a sample request (Buyer only).
- `POST /{id}/respond/`: Exporter response (Approve/Reject/Ship).

---

## 3. Functional UI Views

- **Dashboard** (`/dashboard`): Role-aware overview, stats, and quick actions.
- **Lot Registry** (`/lots`): Paginated table of lots with filters.
- **Lot Detail** (`/lots/:id`): Full lot view with compliance badges, maps, and quality data.
- **Create/Edit Lot** (`/lots/new`, `/lots/:id/edit`): Multi-step forms for lot registration.
- **Marketplace** (`/marketplace`): Card grid for buyers to browse verified lots and request samples.
- **Lot Pipeline** (`/pipeline`): Kanban board for tracking lot status.
- **Sample Inbox** (`/samples`): Management interface for sample requests.
- **My Farm** (`/farm`): Farmer-specific profile and boundary management.
- **Cupping Form** (`/lots/:id/cup`): SCA protocol scoring interface for Q-Graders.
- **Farmer Map** (`/map`): Interactive Leaflet map showing all lot/farm boundaries.
- **Login/Register** (`/login`, `/register`): Authentication entry points.

---

## 4. Compliance Engine (7-Gate Integration)

The compliance engine is hard-coded into the backend logic to ensure regulatory adherence:

1.  **GPS Verified:** Checks if `gps_verified` flag is true (requires `farm_location` or `boundary`).
2.  **Deforestation Free:** Live spatial intersection check using PostGIS against the `DeforestationZone` model.
3.  **EUDR DDS Ready:** Checks if `eudr_dds_ready` flag is set.
4.  **Phytosanitary Cert:** Checks if certificate file is uploaded (`phyto_cert_uploaded`).
5.  **ECTA Export License:** Checks if exporter's license is active (`ecta_license_active`).
6.  **NBE FX Declared:** Verifies currency declaration with National Bank of Ethiopia (`nbe_fx_declared`).
7.  **CTA Floor Price Met:** Ensures the lot price is at or above the CTA minimum (`cta_floor_met`).

**Enforcement:**
- **Export Block:** The `LotStatusUpdateView` explicitly prevents moving a lot to the `exported` status unless `lot.export_ready` (all 7 gates) is `True`.
- **DDS Generation:** The `EudrDdsView` prevents generating the PDF if GPS is not verified.
- **Visual Feedback:** Frontend components (`ComplianceBadge`, `LotDetail`) show live PASS/FAIL status for each gate.
