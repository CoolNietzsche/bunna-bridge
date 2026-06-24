# Beersheba Platform Backend Audit

This document provides a technical audit of the Beersheba platform's backend architecture, focusing on data persistence, API integrity, compliance engine implementation, and identified areas for improvement.

## 1. File-Level Ground Truth Map

The backend is built on Django and Django REST Framework (DRF), structured primarily within the `bunna_bridge/lots/` and `bunna_bridge/users/` applications.

*   **`lots/models.py`**: Contains the core domain models: `CoffeeLot`, `CuppingScore`, `SampleRequest`, `Notification`, and `Offer`. It encapsulates critical business logic, including the 7-gate compliance flags and geospatial fields (`PointField`, `PolygonField`).
*   **`lots/serializers.py`**: Defines data serialization, including `CoffeeLotListSerializer` (shallow), `CoffeeLotDetailSerializer` (GeoJSON integration), and `CuppingScoreSerializer` (with SCA validation).
*   **`lots/views.py`**: Houses the primary API endpoints. The `CoffeeLotViewSet` is a monolithic viewset handling standard CRUD operations and custom `@action` endpoints for compliance checks, cupping scores, and status updates. It also includes the `EudrDdsView` for PDF generation.
*   **`lots/eudr_spatial.py`**: Manages the integration with PostGIS for spatial deforestation checks.
*   **`lots/deforestation.py`**: Defines the `DeforestationZone` model, separated from the main `models.py` to isolate geospatial compliance data.
*   **`lots/settlement.py`**: Contains the logic for calculating the NBE 50/50 currency split (Gate 6).
*   **`users/models.py`**: Defines the custom `User` model, which incorporates role-based access control and farmer-specific profile fields directly, eliminating the need for a separate `FarmerProfile` model.

## 2. Compliance Engine & Gate Architecture Status

The 7-Gate EUDR Compliance Engine is currently implemented directly within the `CoffeeLot` model properties (`export_ready`, `green_passport_ready`) and the `CoffeeLotViewSet.compliance_check` action.

| Gate | Name | Codebase State | Technical Reality |
| :--- | :--- | :--- | :--- |
| **Gate 1** | Deforestation Free | [FULLY OPERATIONAL] | Spatial check against `DeforestationZone` using PostGIS. |
| **Gate 2** | GPS Verified | [FULLY OPERATIONAL] | Checks for presence of `farm_location` or `boundary`. |
| **Gate 3** | EUDR DDS Ready | [FULLY OPERATIONAL] | `EudrDdsView` generates valid PDF; blocked if GPS unverified. |
| **Gate 4** | Phytosanitary Cert | [FULLY OPERATIONAL] | `phyto_cert_file` upload triggers `phyto_cert_uploaded` in `models.py:save()`. |
| **Gate 5** | ECTA Export License | [ACTIVE SPRINT] | `ecta_license_active` is a manual Boolean; relies on exporter profile data. |
| **Gate 6** | NBE Settlement | [FULLY OPERATIONAL] | `nbe_fx_declaration_file` upload triggers `nbe_fx_declared`. Settlement logic exists in `settlement.py`. |
| **Gate 7** | CTA Floor Price Met | [ACTIVE SPRINT] | `cta_floor_met` is a manual Boolean; requires integration with live CTA pricing data. |

**Architectural Note:** The compliance logic is currently tightly coupled to the `lots` app. A future architectural improvement should involve migrating this logic to the dedicated `compliance` app to create a centralized `ComplianceService`.

## 3. Data Persistence & API Payload Integrity

*   **Schema Integrity**: The `CoffeeLot` model utilizes `UUIDField` for primary keys, enhancing security and distributed system compatibility. Geospatial data is correctly managed using `django.contrib.gis` fields (`PointField`, `PolygonField` with `geography=True`).
*   **Write Rules**:
    *   Critical compliance properties like `export_ready` and `green_passport_ready` are evaluated server-side and exposed as `ReadOnlyField` in serializers, preventing client-side manipulation.
    *   The `CuppingScore` model enforces a **Write-Once** policy: the `save()` method raises a `ValueError` if an edit is attempted on a score with a `confirmed` status.
*   **File Uploads**: File uploads (e.g., `phyto_cert_file`, `eudr_dds_file`) utilize standard Django `FileField`.
*   **Integrity Gap (Identified)**: The `CoffeeLotViewSet` currently lacks explicit `parser_classes` definitions. It defaults to JSON parsing, which can cause `415 Unsupported Media Type` errors when the frontend attempts to send `multipart/form-data` (e.g., uploading a phytosanitary certificate while simultaneously updating JSON fields like the boundary). This requires hardening by explicitly adding `MultiPartParser` and `JSONParser`.

## 4. Identified Technical Debt and Refactoring Needs

1.  **Stale Code Paths**:
    *   `EudrDdsView` (`lots/views.py`) references the obsolete `lot.farm_polygon` field. This must be updated to use `lot.boundary`.
    *   `LotBoundaryInheritView` (`lots/views.py`) attempts to import a non-existent `FarmerProfile` model. This logic must be refactored to interact directly with the `User` model where `role="farmer"`.
2.  **Hardcoded Values**: The NBE exchange rate (e.g., 59.85) is hardcoded in `settlement.py`. This should be moved to Django settings or an admin-configurable model.
3.  **Monolithic ViewSet**: The `CoffeeLotViewSet` is becoming overly complex. Consider breaking out specific actions (like compliance checks or settlement calculations) into dedicated API views or services.
4.  **Missing Parser Classes**: As noted in the Integrity Gap section, `MultiPartParser` must be explicitly added to views handling file uploads to ensure robust API interaction.
