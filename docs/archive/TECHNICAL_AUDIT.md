# Technical Status Audit — June 1, 2026
**Prepared for: Bunna Bridge Handoff**

### 1. FILE-LEVEL GROUND TRUTH MAP
The codebase follows a Django-REST backend and React (Vite) frontend structure.

**Backend: `bunna_bridge/bunna_bridge/lots/`**
- **`models.py`**: Core `CoffeeLot` (7-gate flags + geospatial fields), `CuppingScore` (SCA Ledger), and `SampleRequest`.
- **`serializers.py`**: `CoffeeLotListSerializer` (shallow), `CoffeeLotDetailSerializer` (GeoJSON), and `CuppingScoreSerializer` (with SCA validation).
- **`views.py`**: Monolithic `CoffeeLotViewSet` handling `@action` gates for `compliance_check`, `cupping_scores`, and `confirm_score`. Includes `EudrDdsView` for PDF generation.
- **`eudr_spatial.py`**: Integration with spatial checks for deforestation.
- **`settlement.py`**: Logic for Gate 6 (NBE 50/50 currency split).
- **`admin_views.py`**: Custom admin overrides for branding.

**Frontend: `bunna-bridge-frontend/src/`**
- **Active Router**: `App.tsx` manages routes for Dashboard, Lots, Marketplace, and Pipeline.
- **Key Pages**:
  - `LotDetail.tsx`: Exhaustive view of compliance gates and quality data.
  - `EditLot.tsx`: Handle file uploads for Phyto-Certs and boundary capture.
  - `LotPipeline.tsx`: Visual workflow for moving lots from `draft` to `exported`.
- **Component Structure**:
  - `SettlementWidget.tsx`: Reactive calculation of ETB/USD split.
  - `PolygonCaptureWidget.tsx`: Leaflet-based boundary drawing for EUDR.
  - `ComplianceBadge.tsx`: Reusable status indicator for the 7 gates.

---

### 2. COMPLIANCE ENGINE & GATE ARCHITECTURE STATUS
The 7-Gate Engine is partially centralized in `CoffeeLot.export_ready` and `CoffeeLotViewSet.compliance_check`.

| Gate | Name | Codebase State | Technical Reality |
| :--- | :--- | :--- | :--- |
| **Gate 1** | ECX License | [ACTIVE SPRINT] | `ecta_license_active` is a manual Boolean; no external API sync yet. |
| **Gate 2** | ECEX Export Permit | [STUB/MOCK] | No model field exists. Logic is currently collapsed into Gate 1. |
| **Gate 3** | Phytosanitary Cert | [FULLY OPERATIONAL] | `phyto_cert_file` upload triggers `phyto_cert_uploaded` in `models.py:save()`. |
| **Gate 4** | Quality Cert | [FULLY OPERATIONAL] | `CuppingScore` confirmed status updates `sca_score` on `CoffeeLot` via signals/save. |
| **Gate 5** | EUDR Attestation | [FULLY OPERATIONAL] | Spatial check in `eudr_spatial.py` + `EudrDdsView` generates valid PDF. |
| **Gate 6** | NBE Settlement | [FULLY OPERATIONAL] | `SettlementView` calculates 50% retention, 2.5% fee, and ETB conversion. |
| **Gate 7** | Customs Declaration | [STUB/MOCK] | No programmatic gate. Blocked by `status == "exported"` logic in `LotStatusUpdateView`. |

---

### 3. DATA PERSISTENCE & API PAYLOAD INTEGRITY
- **Schema**: `CoffeeLot` uses `UUIDField` IDs and `django.contrib.gis` fields (`PointField`, `PolygonField`).
- **Write Rules**: 
  - `export_ready` and `green_passport_ready` are `serializers.ReadOnlyField()`, preventing client-side bypass.
  - `CuppingScore` is **Write-Once**: `CuppingScore.save()` raises `ValueError` if an edit is attempted on a `confirmed` score.
- **File Uploads**: `phyto_cert_file` uses standard `FileField`. Frontend `EditLot.tsx` uses `multipart/form-data`.
- **Integrity Gap**: `CoffeeLotViewSet` lacks explicit `parser_classes`. It defaults to JSON, which may cause issues during Phyto-Cert uploads if the client doesn't set the boundary correctly.

---

### 4. BRAND ARCHITECTURAL & DESIGN STYLE COMPLIANCE
Branding is strictly enforced via `index.css` variables and inline styles.

- **Core Palette**:
  - **Deeper Roast (`#1E1208`)**: Applied to `Sidebar.tsx` and `TopBar.tsx` backgrounds.
  - **Mahogany (`#4A2515`)**: Used for card borders and the `PolygonCaptureWidget` UI.
  - **Parchment (`#EDE0C4`)**: Primary secondary text color.
  - **Cream (`#F5EDD8`)**: Global text color and Heading color in `LotDetail.tsx`.
- **Rogue Colors Flagged**:
  - `PolygonCaptureWidget.tsx:L258`: Uses `#1E3A2F` (Forest Green) — technically outside the "Roast" palette but used for "Online" status.
  - `PolygonCaptureWidget.tsx:L273`: Uses `#C1440E` (Burnt Orange) for active tabs — violates the 4-color luxury constraint.

---

### 5. NEXT-STEP ISOLATED MICRO-PROMPTS FOR THE AI AGENT

**Prompt 1: Compliance Logic Migration**
> "Migrate all compliance gate logic from `lots/views.py` and `lots/models.py` into the dedicated `compliance` app. Create a `ComplianceService` in `compliance/services.py` that evaluates the 7 gates for a `CoffeeLot`. Update the `CoffeeLot.export_ready` property to call this service. Ensure no breaking changes to the existing `compliance-check` API endpoint."

**Prompt 2: Gate 2 & 7 Schema Implementation**
> "Add `ecex_permit_number` (CharField) and `customs_declaration_id` (CharField) to the `CoffeeLot` model in `lots/models.py`. Update the `compliance_check` action in `lots/views.py` to verify these fields are not null. Modify the `LotStatusUpdateView` to ensure a lot cannot transition to 'exported' unless both new fields are populated and valid."

**Prompt 3: Multi-Part Parser Hardening**
> "Explicitly add `MultiPartParser` and `JSONParser` to `CoffeeLotViewSet` in `lots/views.py`. Update the `EditLot.tsx` frontend page to ensure the `phyto_cert_file` is sent as a `FormData` object. Fix the bug where patching the `boundary` (JSON) and uploading the `phyto_cert_file` (File) in the same request causes a 415 Unsupported Media Type error."
