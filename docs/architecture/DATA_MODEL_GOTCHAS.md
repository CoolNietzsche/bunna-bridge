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

## 8. Hardcoded NBE Exchange Rate

**Gotcha:** The NBE (National Bank of Ethiopia) exchange rate is hardcoded in `settlement.py` [1].

**Detail:** The `settlement.py` module, responsible for calculating the 50/50 USD/ETB split, contains a hardcoded exchange rate (e.g., `59.85 ETB/USD`).

**Implication:** This value needs to be updated manually if the exchange rate changes. For a production system, consider externalizing this value to a configuration setting or fetching it from an external API to ensure accuracy and reduce maintenance overhead.

## 9. Stale Code Paths Identified

**Gotcha:** Some code paths reference superseded models or fields, indicating potential for bugs or outdated logic.

**Detail:**
*   `EudrDdsView` in `lots/views.py` (lines 345-350) still references `lot.farm_polygon`, which no longer exists [7].
*   `LotBoundaryInheritView` in `lots/views.py` (lines 551-563) attempts to import/use a `FarmerProfile` model, which is not present in the current `users/models.py` [7].

**Implication:** These instances represent technical debt and potential sources of error. They should be refactored to use the correct `boundary` field and to interact directly with the `User` model for farmer data. This also highlights the importance of keeping documentation synchronized with the codebase.

## References

[1] `pasted_content.txt` - User-provided project brief and AI context.
[2] `bunna_bridge/bunna_bridge/users/models.py` - User model definition.
[3] `bunna_bridge/bunna_bridge/lots/models.py` - CoffeeLot model definition.
[4] `bunna_bridge/bunna_bridge/lots/deforestation.py` - DeforestationZone model definition.
[5] `bunna_bridge/bunna_bridge/users/urls.py` - User URL configuration.
[6] `bunna-bridge-frontend/src/index.css` - Frontend stylesheet.
[7] `bunna_bridge/bunna_bridge/lots/views.py` - Lot-related views.
