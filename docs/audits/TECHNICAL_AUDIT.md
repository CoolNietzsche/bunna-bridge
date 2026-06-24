# Beersheba Platform Technical Audit

This document provides a comprehensive technical audit of the Beersheba platform, integrating insights from both backend and frontend perspectives. It highlights architectural decisions, implementation status of key features, compliance engine details, and identifies areas for improvement and technical debt.

## 1. Platform Overview

The Beersheba platform is an Ethiopian D2C specialty coffee export compliance marketplace. It is built with a Django backend (Django 6 + GeoDjango + PostGIS) and a React frontend (React 18 + Vite + TypeScript), with a strong emphasis on EUDR 2026 compliance automation.

## 2. Backend Audit

### 2.1. Architecture and Core Components

The backend is primarily structured around Django applications within `bunna_bridge/lots/` and `bunna_bridge/users/` [1].

*   **Models (`lots/models.py`, `users/models.py`, `lots/deforestation.py`)**: Define the core data entities including `CoffeeLot`, `CuppingScore`, `SampleRequest`, `User` (with integrated farmer profiles), `Notification`, `Offer`, and `DeforestationZone`. Key features include UUID primary keys, geospatial fields (`PointField`, `PolygonField`), and compliance flags.
*   **Views (`lots/views.py`, `users/views.py`)**: Implement the API endpoints using Django REST Framework. The `CoffeeLotViewSet` is a central component handling various lot-related operations, including custom actions for compliance checks and PDF generation.
*   **Serializers (`lots/serializers.py`, `users/serializers.py`)**: Handle data serialization and deserialization for API interactions.
*   **Geospatial Integration**: Heavy reliance on GeoDjango and PostGIS for managing farm boundaries and deforestation checks, with `DeforestationZone` being a separate model for logical grouping.

### 2.2. Compliance Engine Implementation

The 7-Gate EUDR Compliance Engine is integrated into the `CoffeeLot` model and related views [2].

| Gate | Name | Backend Implementation Status | Notes |
| :--- | :--- | :---------------------------- | :---- |
| **1** | Deforestation Free | FULLY OPERATIONAL             | Spatial check against `DeforestationZone` using PostGIS. |
| **2** | GPS Verified | FULLY OPERATIONAL             | Checks for presence of `farm_location` or `boundary`. |
| **3** | EUDR DDS Ready | FULLY OPERATIONAL             | `EudrDdsView` generates valid PDF; blocked if GPS unverified. |
| **4** | Phytosanitary Cert | FULLY OPERATIONAL             | `phyto_cert_file` upload triggers `phyto_cert_uploaded` in `models.py:save()`. |
| **5** | ECTA Export License | ACTIVE SPRINT                 | `ecta_license_active` is a manual Boolean; relies on exporter profile data. |
| **6** | NBE Settlement | FULLY OPERATIONAL             | `nbe_fx_declaration_file` upload triggers `nbe_fx_declared`. Settlement logic exists in `settlement.py`. |
| **7** | CTA Floor Price Met | ACTIVE SPRINT                 | `cta_floor_met` is a manual Boolean; requires integration with live CTA pricing data. |

**Architectural Recommendation:** Consider migrating compliance logic to a dedicated `compliance` app with a `ComplianceService` for better modularity and maintainability.

### 2.3. Data Persistence & API Integrity

*   **Schema**: `CoffeeLot` uses `UUIDField` for primary keys. Geospatial fields (`PointField`, `PolygonField`) are correctly implemented with `geography=True`.
*   **Write Rules**: `export_ready` and `green_passport_ready` are `ReadOnlyField` in serializers. `CuppingScore` enforces a write-once policy for `confirmed` scores.
*   **File Uploads**: Standard Django `FileField` is used.
*   **Integrity Gap**: `CoffeeLotViewSet` lacks explicit `parser_classes`, potentially causing `415 Unsupported Media Type` errors during `multipart/form-data` uploads when combined with JSON data [1]. This needs to be addressed by explicitly adding `MultiPartParser` and `JSONParser`.

### 2.4. Identified Technical Debt (Backend)

*   **Stale Code Paths**: `EudrDdsView` references the obsolete `lot.farm_polygon`. `LotBoundaryInheritView` attempts to import a non-existent `FarmerProfile` model. These require refactoring [1].
*   **Hardcoded Values**: The NBE exchange rate in `settlement.py` is hardcoded and should be externalized [1].
*   **Monolithic ViewSet**: The `CoffeeLotViewSet` is growing in complexity; consider breaking it down [1].

## 3. Frontend Audit

### 3.1. Architecture and Tooling

*   **Framework**: React 18 with TypeScript, built with Vite 8.
*   **Routing**: `react-router-dom` v6, with `ProtectedRoute` for access control.
*   **State Management**: `@tanstack/react-query` for server state, React Context (`AuthContext.tsx`) for global auth state, and `localStorage` for ephemeral preferences (e.g., watchlist) [3].
*   **API Client**: Axios with JWT interceptors for authentication [3].

### 3.2. Key Components and Pages

*   **Layout**: `AppLayout.tsx`, `Sidebar.tsx`, `TopBar.tsx` provide the application shell.
*   **Widgets**: `PolygonCaptureWidget.tsx` (Leaflet-based boundary drawing), `SettlementWidget.tsx` (NBE calculation), `CuppingForm.tsx` (SCA scoring interface) [3].
*   **Marketplace**: `Marketplace.tsx` (card grid), `MarketplaceLotDetail.tsx` (lot product page), `BuyerWatchlist.tsx` (user watchlist) [3].

### 3.3. Brand Architectural & Design Style Compliance

The frontend is transitioning to the Beersheba brand identity, moving to a light, premium agricultural aesthetic [4].

*   **Theming**: Tailwind CSS v4 is used without `tailwind.config.js`. Theme tokens are defined as CSS variables within `src/index.css` `@theme` block [4].
*   **Leaflet Exceptions**: Leaflet components correctly use inline styles with CSS variables due to rendering outside the React DOM [4].
*   **Audit Findings (Legacy Colors)**: Remnants of the old "Dark Roast" palette are present. A systematic review and migration to the new theme variables are required, following the "Migration Rule" (one page per session) [4].

### 3.4. Identified Technical Debt (Frontend)

*   **Incomplete Rebranding**: Full UI compliance with the new design system is pending [3].
*   **API Error Handling**: A standardized approach to displaying API errors across all components needs verification and enforcement [3].
*   **Type Safety**: Ensure strict TypeScript typing for all API responses [3].
*   **Leaflet Marker Icons**: The known issue with Vite and Leaflet marker icons requires consistent application of the workaround [3].

## 4. Overall Recommendations

1.  **Refactor Stale Code**: Address the identified references to obsolete fields (`farm_polygon`) and non-existent models (`FarmerProfile`) in the backend to improve code correctness and maintainability.
2.  **Centralize Compliance Logic**: Implement a `ComplianceService` in the dedicated `compliance` app to decouple compliance logic from the `lots` app.
3.  **Harden API File Uploads**: Explicitly define `parser_classes` in `CoffeeLotViewSet` to correctly handle `multipart/form-data` and JSON payloads simultaneously.
4.  **Complete UI Rebranding**: Conduct a thorough pass through the frontend to ensure all components adhere to the new Beersheba design system, replacing legacy color usages with CSS variables.
5.  **Externalize Hardcoded Values**: Move the NBE exchange rate from `settlement.py` to a configurable location.
6.  **Enhance Error Handling**: Implement a consistent and user-friendly API error display mechanism in the frontend.

## References

[1] `docs/audits/BACKEND_AUDIT.md` - Beersheba Platform Backend Audit.
[2] `docs/business/EUDR_COMPLIANCE.md` - Beersheba Platform EUDR Compliance Engine.
[3] `docs/audits/FRONTEND_AUDIT.md` - Beersheba Platform Frontend Audit.
[4] `docs/architecture/REBRANDING.md` - Beersheba Platform Rebranding Guide.
