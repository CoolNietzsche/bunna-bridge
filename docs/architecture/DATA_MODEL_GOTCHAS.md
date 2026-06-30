# Beersheba Platform Data Model Gotchas

This document highlights critical data model design decisions, potential pitfalls, and specific implementation details that deviate from common patterns or require special attention. Understanding these "gotchas" is crucial for maintaining data integrity, preventing bugs, and ensuring correct feature development.

## 1. `User` Model and Farmer Representation

**Gotcha:** There is **NO separate `Farmer` model or `FarmerProfile` model** [1, 2].

**Detail:** Farmer-specific attributes, such as `farm_name`, `farm_region`, `farm_kebele`, `farm_altitude_m`, `farm_size_ha`, `cooperative`, `gps_lat`, `gps_lng`, and `boundary` (PolygonField), are directly integrated into the `User` model (`bunna_bridge/bunna_bridge/users/models.py`). A user is identified as a farmer by their `role` field being set to `"farmer"`.

**Implication:** When querying or updating farmer-related information, developers must interact directly with the `User` model and filter by `role="farmer"`. Any legacy documentation or code snippets referencing a `FarmerProfile` model are outdated and should be disregarded or updated.

## 2. `CoffeeLot` Primary Key and Identifiers

**Gotcha:** The primary key (`PK`) for `CoffeeLot` is a `UUID`, not an integer [1, 3].

**Detail:** The `id` field of the `CoffeeLot` model (`bunna_bridge/bunna_bridge/lots/models.py`) is a `UUIDField`. Additionally, each `CoffeeLot` has a human-readable `lot_id` (e.g., `YRG-2025-0847`) which is a `CharField` and is unique and indexed.

**Implication:** Always use the `lot.id` (UUID string) for internal API calls and database lookups. The `lot_id` is primarily for human-readable display and external communication. Ensure that frontend and backend interactions correctly handle UUIDs for primary identification.

## 3. Geospatial Fields and `farm_polygon` Obsolescence

**Gotcha:** The `farm_polygon` field has been **removed** and is obsolete [1, 3].

**Detail:** Geospatial boundaries for `CoffeeLot` and `User` (farmer) models are now stored in a `boundary` field, which is a `PolygonField(geography=True)`. The `farm_location` field (PointField) is used for smaller farms (< 4ha) or as a centroid.

**Implication:** Any code or documentation referencing `farm_polygon` is outdated and must be updated to use `boundary`. The `PolygonField` is configured with `geography=True` and `srid=4326` for accurate spatial operations.

## 4. `DeforestationZone` Model Location

**Gotcha:** The `DeforestationZone` model is defined in `bunna_bridge/bunna_bridge/lots/deforestation.py`, not in `models.py` [1, 4].

**Detail:** This model, crucial for EUDR compliance checks, resides in a separate file to logically group related geospatial compliance logic. Its `Meta` class explicitly sets `app_label = 'lots'` to ensure it is correctly associated with the `lots` Django app.

**Implication:** When importing or referencing `DeforestationZone`, ensure the correct import path (`from bunna_bridge.lots.deforestation import DeforestationZone`) is used.

## 5. Django Admin URL Naming Conflict

**Gotcha:** The `users/urls.py` must use `name="me"` for the current user endpoint, not `name="detail"` [1, 5].

**Detail:** Using `name="detail"` for the user profile endpoint in `users/urls.py` can cause conflicts with Django admin internals.

**Implication:** Always verify that the URL configuration for user-related endpoints adheres to this naming convention to avoid unexpected routing issues within the Django admin interface.

## 6. Frontend Theming with Tailwind CSS v4

**Gotcha:** Tailwind CSS v4 is used without a `tailwind.config.js` file [1, 6].

**Detail:** Theme tokens, including brand colors and typography, are defined directly within `bunna-bridge-frontend/src/index.css` using CSS variables within an `@theme` block. Tailwind utilities are primarily for layout.

**Implication:** Customizing the theme requires editing `index.css` directly. Developers should not expect to find or create a `tailwind.config.js` file for theme configuration.

## 7. Package Management

**Gotcha:** The project exclusively uses `uv` for Python package management; `pip` is explicitly forbidden [1].

**Detail:** The `pyproject.toml` and `uv.lock` files confirm the use of `uv`. The recommended workflow for adding packages is `uv add <package>` followed by a Docker rebuild.

**Implication:** Always use `uv` commands (e.g., `uv add`, `uv sync`) for managing Python dependencies. Using `pip` can lead to inconsistencies and build failures.

## 8. Hardcoded NBE Exchange Rate — RESOLVED (2026-06-30)
**Status:** ✅ FIXED and verified live.
**Correction to original gotcha:** The hardcoded value was NOT in `settlement.py` (that module always took `nbe_rate` as a required parameter). The actual hardcoded default (`"59.85"`) was in `lots/views.py`, in `SettlementView.create()`, as the fallback for `request.data.get("nbe_rate", "59.85")`.
**What was fixed:** Added `NBE_DEFAULT_FX_RATE` setting in `config/settings/base.py` via `env("NBE_DEFAULT_FX_RATE", default="59.85")`, following the project's existing `django-environ` convention. Updated `SettlementView` to use `settings.NBE_DEFAULT_FX_RATE` instead of the inline literal.
**Verified:** Live curl test against `/api/v1/lots/<id>/settlement/` — confirms default pulls `59.85` from env, and explicit override (`{"nbe_rate": "65.00"}`) still works correctly and flows through the full calculation.
**Remaining tech debt (not in original scope, flagged for future session):** `SettlementView` in `views.py` duplicates settlement math inline (platform fee %, 50/50 split) instead of calling `calculate_settlement()` from `settlement.py`. The two implementations could drift out of sync if either is updated independently. Recommend consolidating onto the shared `settlement.py` function in a future session.

## 9. Stale Code Paths — RESOLVED (2026-06-30)
**Status:** ✅ FIXED and verified live. Previously: some code paths referenced superseded models or fields.
**What was fixed:**
*   `EudrDdsView` in `lots/views.py`: `lot.farm_polygon` (nonexistent field) replaced with `lot.boundary`. Verified via Django shell against a real polygon-only lot (`SDM-2025-0298`, 7 vertices) — branch now executes without AttributeError. Also verified live via curl against a point-based lot (200, valid 2-page PDF).
*   `LotBoundaryInheritView` in `lots/views.py`: dead `FarmerProfile` import (silently swallowed by a bare `except Exception`, causing the endpoint to ALWAYS return 404) replaced with a direct `User.objects.filter(role="farmer", boundary__isnull=False)` query. Verified against real data (`abebe@kochere.et`, 9-vertex boundary) for both the farmer-self-service and admin-fallback paths.
**Known limitation (not fixed, by design):** `CoffeeLot` has no FK to a farmer, only to `exporter`. `LotBoundaryInheritView` therefore cannot reliably determine "the" farmer for a specific lot — it uses a best-effort heuristic (self if requester is a farmer, otherwise any farmer with a boundary if requester is admin). A proper fix would require adding a `farmer` FK to `CoffeeLot`. Flagged as a TODO comment in the code.
**Commit:** `4432318` — "Fix stale code paths: EudrDdsView used nonexistent farm_polygon, LotBoundaryInheritView imported nonexistent FarmerProfile model".

## References

[1] `pasted_content.txt` - User-provided project brief and AI context.
[2] `bunna_bridge/bunna_bridge/users/models.py` - User model definition.
[3] `bunna_bridge/bunna_bridge/lots/models.py` - CoffeeLot model definition.
[4] `bunna_bridge/bunna_bridge/lots/deforestation.py` - DeforestationZone model definition.
[5] `bunna_bridge/bunna_bridge/users/urls.py` - User URL configuration.
[6] `bunna-bridge-frontend/src/index.css` - Frontend stylesheet.
[7] `bunna_bridge/bunna_bridge/lots/views.py` - Lot-related views.
