# Beersheba Platform Feature Roadmap

This document outlines the implemented features and the historical development phases of the Beersheba platform (formerly Bunna Bridge). It consolidates information from various development logs and feature reports to provide a comprehensive overview of the platform's evolution.

## 1. Core Platform Features (Initial Implementation)

The following features represent the foundational capabilities of the Beersheba platform, as detailed in the initial implementation reports [1].

### 1.1. Database Models & Fields

*   **`CoffeeLot`**: Core entity for coffee lots, including UUID primary key, unique `lot_id`, origin details (region, kebele, washing station, altitude), processing, grade, varietal, harvest date, geospatial data (`farm_location`, `boundary`), SCA cupping scores, compliance flags (7 gates), and document fields. Notably, it includes `exporter` as a ForeignKey to `User`, with no separate `Farmer` model.
*   **`CuppingScore`**: Records SCA cupping scores by Q-Graders, linked to `CoffeeLot` and `User` (Q-Grader). Includes detailed score components and status management.
*   **`SampleRequest`**: Manages requests for coffee samples from buyers to exporters, linked to `CoffeeLot` and `User` (Buyer/Exporter). Includes status, quantity, messages, and shipping details.
*   **`User`**: Custom user model with five roles (`admin`, `exporter`, `buyer`, `farmer`, `qgrader`). Farmer-specific profile fields (farm details, GPS, boundary) are directly on this model. Exporter license fields are also included.
*   **`DeforestationZone`**: Geospatial model defining deforestation areas, used for EUDR compliance checks. Located in `lots/deforestation.py`.
*   **`Notification`**: Handles in-app notifications for various events.
*   **`Offer`**: Manages offers and counter-offers between buyers and exporters for coffee lots.

### 1.2. Active API Endpoints

The API is versioned (`/api/v1/`) and organized by resource, with JWT authentication. Key endpoint groups include [2]:

*   **Authentication & Users (`/api/v1/auth/`)**: Register, login, token refresh, current user profile (`/me/`), user listing (admin), farmer profile management, farmer lot listing, public exporter profiles and their lots.
*   **Coffee Lots (`/api/v1/lots/`)**: List, create, retrieve (with GeoJSON), update, delete lots. Specific endpoints for compliance checks, cupping scores (list, submit, confirm), NBE settlement calculation, status updates, EUDR DDS generation, boundary management (save, inherit), and spec sheet download.
*   **Sample Requests (`/api/v1/sample-requests/`)**: List, create, and respond to sample requests.

### 1.3. Functional UI Views

The frontend provides role-aware views for various platform functionalities [1]:

*   **Dashboard**: Role-specific overview and quick actions.
*   **Lot Registry**: Paginated table of lots with filters.
*   **Lot Detail**: Comprehensive view of a lot with compliance badges, maps, and quality data.
*   **Create/Edit Lot**: Multi-step forms for lot registration.
*   **Marketplace**: Card grid for buyers to browse verified lots and request samples.
*   **Lot Pipeline**: Kanban board for tracking lot status.
*   **Sample Inbox**: Management interface for sample requests.
*   **My Farm**: Farmer-specific profile and boundary management.
*   **Cupping Form**: SCA protocol scoring interface for Q-Graders.
*   **Farmer Map**: Interactive Leaflet map showing all lot/farm boundaries.
*   **Login/Register**: Authentication entry points.

### 1.4. Compliance Engine (7-Gate Integration)

The EUDR compliance engine is a critical backend component, enforcing seven gates for export readiness [1, 3]:

1.  **GPS Verified**: Presence of `farm_location` or `boundary`.
2.  **Deforestation Free**: Spatial check against `DeforestationZone`.
3.  **EUDR DDS Ready**: DDS document generated.
4.  **Phytosanitary Cert**: Certificate file uploaded.
5.  **ECTA Export License**: Exporter's license active.
6.  **NBE FX Declared**: FX declaration document uploaded.
7.  **CTA Floor Price Met**: Lot price meets minimum.

Enforcement mechanisms include `LotStatusUpdateView` blocking `exported` status until `export_ready` is true, and `EudrDdsView` preventing PDF generation if GPS is not verified.

## 2. Marketplace Development Phases

The marketplace functionality has evolved through several distinct phases, as tracked in the development log [4].

### Phase 1: Data Foundation (✅ Deployed)

*   **Features:** Offer model, marketplace-specific fields on `CoffeeLot`, and demo data setup.

### Phase 2: Marketplace UI (✅ Deployed)

*   **Features:** Implementation of lot cards and the detailed lot page (`/marketplace/:id`).
*   **Fixes:** Corrected `MarketplaceLotDetail` import, `sampleRequests` to `samples` import, added default `quantity_g` and `shipping_address` to `createSampleRequest`, and handled `sca_score` as a string by using `parseFloat()`.
*   **Notes:** List endpoint returns plain JSON, detail endpoint returns GeoJSON Feature (handled by `getLot` unwrapping). `latest_sca_score` is often `null` on list responses, falling back to `sca_score` string field.

### Phase 3: Offer Management (✅ Deployed)

*   **Features:** Buyer offers page (`/buyer/offers`) and Exporter offers inbox (`/offers`).
    *   **Buyer Offers:** Lists own offers with status pills, includes accept counter-offer and withdraw pending offer buttons, links to lot product page.
    *   **Exporter Offers:** Displays incoming offers grouped by lot, with inline accept/reject/counter actions and a counter modal for price, quantity, and notes.
*   **Routes:** `/buyer/offers` (buyer role) and `/offers` (exporter/admin role) added to `App.tsx`.
*   **Sidebar Navigation:** "My Offers" (buyers) and "Offers" (exporters + admin) added.
*   **Fixes:** Corrected `getOffers` return type (`Offer[]` instead of `{ results: Offer[] }`) and added explicit TypeScript types for `reduce()` callbacks.

### Phase 4: Watchlist & Discovery (✅ Deployed)

*   **Features:** Buyer watchlist functionality.
    *   **`useWatchlist.ts` Hook:** LocalStorage-based hook for adding/removing lot UUIDs from a watchlist, persisting across sessions.
    *   **Buyer Watchlist Page (`/buyer/watchlist`)**: Lists watched lots with details, CTAs for making offers and requesting samples, and a remove button. Includes an empty state.
*   **Changes:** Heart icon added to marketplace cards (buyer only) to toggle watchlist status.
*   **Routes:** `/buyer/watchlist` (buyer only) added.
*   **Sidebar Navigation:** "Watchlist" (Heart icon) added for buyers.
*   **Decision:** LocalStorage was chosen for watchlist persistence over a backend model for ephemeral buyer preference, with future migration to backend possible.

### Phase 5: Exporter Storefront (✅ Deployed)

*   **Features:** Public exporter storefront pages.
    *   **Backend Work:** `ExporterPublicSerializer`, `ExporterProfileView`, and `ExporterLotsView` added to `users/serializers.py` and `users/views.py`. Routes `GET /api/v1/auth/exporters/<id>/` and `GET /api/v1/auth/exporters/<id>/lots/` added to `api_urls.py`.
    *   **Frontend Work:** `ExporterStorefront.tsx` page at `/exporters/:id` displaying profile hero (avatar, company, stats), and a full list of the exporter's active lots. Exporter names on Marketplace cards now link to their storefront.
*   **Fixes:** Corrected URL file for routes (`users/api_urls.py` instead of `users/urls.py`). Addressed `coffeelot_set` reverse relation issue by directly filtering `CoffeeLot.objects`.

### Phase 6: Spec Sheet PDF (✅ Deployed)

*   **Features:** Generation and download of Lot Spec Sheet PDFs.
    *   **Backend Work:** `lots/spec_sheet.py` (ReportLab A4 PDF generator) with lot details, pricing, SCA cupping profile, 7-gate EUDR compliance checklist, farm story, and branding. `LotSpecSheetView` at `GET /api/v1/lots/<id>/spec-sheet/`.
    *   **Fixes:** Corrected `cuppingscores` to `cupping_scores` and `prefetch_related` usage in the view.
    *   **Frontend Work:** `downloadSpecSheet(lotId, lotCode)` function available in `lots.ts`. Download Spec Sheet button added to `MarketplaceLotDetail.tsx`, visible to all authenticated users.

## References

[1] `IMPLEMENTED_FEATURES.md` - Original Implemented Features Report. (Archived in `docs/archive/`)
[2] `API_CONVENTIONS.md` - Beersheba Platform API Conventions.
[3] `EUDR_COMPLIANCE.md` - Beersheba Platform EUDR Compliance Engine.
[4] `MARKETPLACE_LOG.md` - Bunna Bridge Marketplace Session Log. (Archived in `docs/archive/`)
