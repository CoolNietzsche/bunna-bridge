# Beersheba Platform Domain Model

This document outlines the core domain models of the Beersheba platform, detailing their attributes, relationships, and key business logic. It serves as a foundational reference for understanding the system's data architecture.

## 1. Core Entities

### 1.1. `User` Model

Represents all users of the Beersheba platform, with roles defining their permissions and access. Farmer-specific profile information is directly integrated into this model.

**Location:** `bunna_bridge/bunna_bridge/users/models.py`

| Attribute           | Type                               | Description                                                                  |
| :------------------ | :--------------------------------- | :--------------------------------------------------------------------------- |
| `id`                | UUID (PK)                          | Unique identifier for the user.                                              |
| `email`             | EmailField                         | User's email address, used for login.                                        |
| `role`              | CharField (Choices)                | Defines user permissions: `admin`, `exporter`, `buyer`, `farmer`, `qgrader`. |
| `company_name`      | CharField                          | Company name for exporters/buyers.                                           |
| `phone`             | CharField                          | User's contact phone number.                                                 |
| `country`           | CharField                          | User's country of residence/operation.                                       |
| `bio`               | TextField                          | Short biography or company description.                                      |
| `is_verified`       | BooleanField                       | Indicates if the user's account has been verified.                           |
| `farm_name`         | CharField (Farmer-specific)        | Name of the farmer's farm.                                                   |
| `farm_region`       | CharField (Farmer-specific)        | Region of the farmer's farm.                                                 |
| `farm_kebele`       | CharField (Farmer-specific)        | Kebele (sub-district) of the farmer's farm.                                  |
| `farm_altitude_m`   | IntegerField (Farmer-specific)     | Altitude of the farm in meters.                                              |
| `farm_size_ha`      | DecimalField (Farmer-specific)     | Size of the farm in hectares.                                                |
| `cooperative`       | CharField (Farmer-specific)        | Name of the cooperative the farmer belongs to.                               |
| `gps_lat`           | DecimalField (Farmer-specific)     | Latitude of the farm's centroid.                                             |
| `gps_lng`           | DecimalField (Farmer-specific)     | Longitude of the farm's centroid.                                            |
| `boundary`          | PolygonField (Farmer-specific)     | Geospatial polygon defining the farm's boundary.                             |
| `ecta_license_number` | CharField (Exporter-specific)      | Export Coffee Trade Authority license number.                                |
| `ecta_license_file` | FileField (Exporter-specific)      | Uploaded ECTA license document.                                              |
| `ecta_license_expiry` | DateField (Exporter-specific)      | Expiry date of the ECTA license.                                             |

**Key Business Rules:**
*   There is **no separate `Farmer` or `FarmerProfile` model**. Farmers are `User` instances with `role="farmer"` [1].
*   `User` model inherits from `AbstractUser` for standard Django authentication features.

### 1.2. `CoffeeLot` Model

Represents a single lot of coffee available on the platform, encompassing its origin, quality, compliance status, and commercial details.

**Location:** `bunna_bridge/bunna_bridge/lots/models.py`

| Attribute               | Type                               | Description                                                                  |
| :---------------------- | :--------------------------------- | :--------------------------------------------------------------------------- |
| `id`                    | UUID (PK)                          | Unique identifier for the coffee lot.                                        |
| `lot_id`                | CharField (Unique, db_index)       | Human-readable unique identifier (e.g., YRG-2025-0847).                      |
| `name`                  | CharField                          | Descriptive name of the lot.                                                 |
| `status`                | CharField (Choices)                | Current status: `draft`, `listed`, `contracted`, `exported`.                 |
| `exporter`              | ForeignKey (`User`)                | The user (exporter) responsible for this lot.                                |
| `region`                | CharField (Choices)                | Geographic region of origin (e.g., `yirgacheffe`, `sidama`).                 |
| `kebele`                | CharField                          | Sub-district of origin.                                                      |
| `washing_station`       | CharField                          | Name of the processing station.                                              |
| `altitude_m`            | IntegerField                       | Altitude of the farm in meters.                                              |
| `processing`            | CharField (Choices)                | Processing method: `washed`, `natural`, `honey`, `anaerobic`, `other`.     |
| `grade`                 | CharField (Choices)                | Coffee grade: `G1`, `G2`, `G3`.                                              |
| `varietal`              | CharField                          | Coffee varietal (default: "Ethiopian Heirloom").                             |
| `harvest_date`          | DateField                          | Date of coffee harvest.                                                      |
| `farm_location`         | PointField (GIS)                   | Geographic point of the farm (for farms < 4ha).                              |
| `boundary`              | PolygonField (GIS, geography=True) | Geospatial polygon defining the lot's farm boundary.                         |
| `sca_score`             | DecimalField                       | SCA cupping score (derived from confirmed `CuppingScore`).                   |
| `flavor_notes`          | CharField                          | Publicly visible flavor notes.                                               |
| `cupping_date`          | DateField                          | Date of the last confirmed cupping.                                          |
| `q_grader_name`         | CharField                          | Name of the Q-Grader who scored the lot.                                     |
| `q_grader_cert_id`      | CharField                          | Certification ID of the Q-Grader.                                            |
| `deforestation_free`    | BooleanField                       | Compliance flag: `True` if lot is deforestation-free.                        |
| `gps_verified`          | BooleanField                       | Compliance flag: `True` if farm GPS data is verified.                        |
| `phyto_cert_uploaded`   | BooleanField                       | Compliance flag: `True` if phytosanitary certificate is uploaded.            |
| `ecta_license_active`   | BooleanField                       | Compliance flag: `True` if exporter's ECTA license is active.                |
| `nbe_fx_declared`       | BooleanField                       | Compliance flag: `True` if NBE FX declaration is made.                       |
| `cta_floor_met`         | BooleanField                       | Compliance flag: `True` if price meets CTA floor.                            |
| `eudr_dds_ready`        | BooleanField                       | Compliance flag: `True` if EUDR DDS can be generated.                        |
| `phyto_cert_file`       | FileField                          | Uploaded phytosanitary certificate PDF.                                      |
| `phyto_cert_expiry`     | DateField                          | Expiry date of the phytosanitary certificate.                                |
| `ecex_permit_file`      | FileField                          | Uploaded ECEX permit document.                                               |
| `ecex_permit_number`    | CharField                          | ECEX permit number.                                                          |
| `ecex_permit_expiry`    | DateField                          | Expiry date of the ECEX permit.                                              |
| `customs_declaration_id`| CharField                          | Customs declaration ID.                                                      |
| `customs_declaration_file`| FileField                        | Uploaded customs declaration document.                                       |
| `nbe_fx_declaration_file`| FileField                         | Uploaded NBE FX declaration document.                                        |
| `eudr_dds_file`         | FileField                          | Generated EUDR Due Diligence Statement PDF.                                  |
| `volume_kg`             | DecimalField                       | Total volume of the lot in kilograms.                                        |
| `price_per_kg`          | DecimalField                       | Price per kilogram (USD).                                                    |
| `flavor_tags`           | JSONField                          | List of flavor tags for marketplace display.                                 |
| `farm_photos`           | JSONField                          | List of URLs/paths to farm photos.                                           |
| `available_qty_kg`      | DecimalField                       | Available quantity of the lot in kilograms.                                  |
| `fob_price_usd`         | DecimalField                       | Free On Board price in USD.                                                  |
| `min_order_kg`          | DecimalField                       | Minimum order quantity in kilograms.                                         |
| `delivery_window`       | CharField                          | Expected delivery timeframe.                                                 |
| `lot_type`              | CharField (Choices)                | Type of lot: `spot`, `forward`, `reserve`.                                   |
| `is_organic`            | BooleanField                       | `True` if the lot is certified organic.                                      |
| `is_fair_trade`         | BooleanField                       | `True` if the lot is Fair Trade certified.                                   |
| `is_rainforest_alliance`| BooleanField                       | `True` if the lot is Rainforest Alliance certified.                          |
| `tasting_notes`         | TextField                          | Detailed tasting notes.                                                      |
| `farm_story`            | TextField                          | Narrative about the farm and its producers.                                  |
| `created_at`            | DateTimeField                      | Timestamp of lot creation.                                                   |
| `updated_at`            | DateTimeField                      | Timestamp of last update.                                                    |

**Key Business Logic & Properties:**
*   `green_passport_ready` (Property): Returns `True` if `deforestation_free`, `gps_verified`, and `eudr_dds_ready` are all `True`.
*   `export_ready` (Property): Returns `True` if `green_passport_ready`, `phyto_cert_uploaded`, `ecta_license_active`, `nbe_fx_declared`, and `cta_floor_met` are all `True`. This property gates the transition to the `exported` status.
*   `compliance_score()` (Method): Calculates the number of passed compliance gates (out of 7).
*   `is_eudr_ready()` (Method): Returns `True` if all 7 compliance gates are passed.
*   `save()` (Method): Overridden to automatically set `phyto_cert_uploaded` and `nbe_fx_declared` based on file presence.

### 1.3. `CuppingScore` Model

Records the quality assessment of a `CoffeeLot` by a Q-Grader.

**Location:** `bunna_bridge/bunna_bridge/lots/models.py`

| Attribute           | Type                | Description                                                                  |
| :------------------ | :------------------ | :--------------------------------------------------------------------------- |
| `id`                | UUID (PK)           | Unique identifier for the cupping score.                                     |
| `lot`               | ForeignKey (`CoffeeLot`)| The coffee lot being scored.                                                 |
| `grader`            | ForeignKey (`User`) | The Q-Grader who performed the cupping.                                      |
| `status`            | CharField (Choices) | `pending`, `confirmed`, `disputed`. Confirmed scores cannot be edited.       |
| `fragrance_aroma`   | DecimalField        | SCA score component.                                                         |
| `flavor`            | DecimalField        | SCA score component.                                                         |
| `aftertaste`        | DecimalField        | SCA score component.                                                         |
| `acidity`           | DecimalField        | SCA score component.                                                         |
| `body`              | DecimalField        | SCA score component.                                                         |
| `balance`           | DecimalField        | SCA score component.                                                         |
| `uniformity`        | DecimalField        | SCA score component.                                                         |
| `clean_cup`         | DecimalField        | SCA score component.                                                         |
| `sweetness`         | DecimalField        | SCA score component.                                                         |
| `overall`           | DecimalField        | SCA score component.                                                         |
| `defects`           | DecimalField        | Penalty points for defects.                                                  |
| `flavor_notes`      | CharField           | Public flavor notes from the cupping.                                        |
| `notes`             | TextField           | Private notes for the Q-Grader.                                              |
| `cupping_date`      | DateField           | Date the cupping was performed.                                              |
| `cupping_location`  | CharField           | Location where the cupping took place.                                       |
| `created_at`        | DateTimeField       | Timestamp of score creation.                                                 |

**Key Business Logic & Properties:**
*   `total_score` (Property): Calculates the sum of SCA components minus defects.
*   `save()` (Method): Overridden to prevent editing of `confirmed` scores and to update the associated `CoffeeLot`'s `sca_score`, `flavor_notes`, `cupping_date`, `q_grader_name`, and `q_grader_cert_id` upon confirmation.

### 1.4. `SampleRequest` Model

Manages requests for coffee samples from buyers to exporters.

**Location:** `bunna_bridge/bunna_bridge/lots/models.py`

| Attribute           | Type                | Description                                                                  |
| :------------------ | :------------------ | :--------------------------------------------------------------------------- |
| `id`                | UUID (PK)           | Unique identifier for the sample request.                                    |
| `lot`               | ForeignKey (`CoffeeLot`)| The coffee lot for which the sample is requested.                            |
| `buyer`             | ForeignKey (`User`) | The buyer making the request.                                                |
| `status`            | CharField (Choices) | `pending`, `approved`, `rejected`, `shipped`, `received`.                    |
| `quantity_g`        | IntegerField        | Requested sample quantity in grams (default: 200).                           |
| `message`           | TextField           | Message from the buyer.                                                      |
| `response`          | TextField           | Response from the exporter.                                                  |
| `shipping_address`  | TextField           | Shipping address for the sample.                                             |
| `tracking_number`   | CharField           | Tracking number for shipped samples.                                         |
| `created_at`        | DateTimeField       | Timestamp of request creation.                                               |
| `updated_at`        | DateTimeField       | Timestamp of last update.                                                    |

### 1.5. `DeforestationZone` Model

Stores geospatial data representing known deforestation areas, used for EUDR compliance checks.

**Location:** `bunna_bridge/bunna_bridge/lots/deforestation.py`

| Attribute   | Type                | Description                                                                  |
| :---------- | :------------------ | :--------------------------------------------------------------------------- |
| `id`        | UUID (PK)           | Unique identifier for the deforestation zone.                                |
| `geometry`  | MultiPolygonField (GIS)| Geospatial multipolygon defining the deforestation area.                     |
| `year`      | IntegerField        | Year of deforestation detection.                                             |
| `source`    | CharField           | Source of the deforestation data (e.g., "Hansen GFC").                       |
| `region`    | CharField           | Geographic region of the deforestation zone.                                 |
| `area_ha`   | FloatField          | Area of the deforestation zone in hectares.                                  |

**Key Business Rules:**
*   This model is critical for the `deforestation_free` compliance gate. `CoffeeLot` boundaries are checked against these zones for overlap.
*   It is explicitly defined in `deforestation.py` and not `models.py`, with `app_label = 'lots'` in its `Meta` class [1].

### 1.6. `Notification` Model

Handles in-app notifications for users regarding various platform activities.

**Location:** `bunna_bridge/bunna_bridge/lots/models.py`

| Attribute           | Type                | Description                                                                  |
| :------------------ | :------------------ | :--------------------------------------------------------------------------- |
| `id`                | UUID (PK)           | Unique identifier for the notification.                                      |
| `recipient`         | ForeignKey (`User`) | The user who receives the notification.                                      |
| `notification_type` | CharField (Choices) | Type of notification: `lot_status`, `sample_request`, `eudr_alert`, `offer`. |
| `title`             | CharField           | Short title of the notification.                                             |
| `message`           | TextField           | Full content of the notification.                                            |
| `link`              | CharField           | Optional URL for the user to navigate to for more details.                   |
| `is_read`           | BooleanField        | `True` if the user has read the notification.                                |
| `created_at`        | DateTimeField       | Timestamp of notification creation.                                          |

### 1.7. `Offer` Model

Manages offers made by buyers on coffee lots, including counter-offers and status tracking.

**Location:** `bunna_bridge/bunna_bridge/lots/models.py`

| Attribute           | Type                | Description                                                                  |
| :------------------ | :------------------ | :--------------------------------------------------------------------------- |
| `id`                | UUID (PK)           | Unique identifier for the offer.                                             |
| `lot`               | ForeignKey (`CoffeeLot`)| The coffee lot the offer is made on.                                         |
| `buyer`             | ForeignKey (`User`) | The buyer making the offer.                                                  |
| `quantity_kg`       | DecimalField        | Offered quantity in kilograms.                                               |
| `price_per_kg_usd`  | DecimalField        | Offered price per kilogram in USD.                                           |
| `delivery_window`   | CharField           | Proposed delivery timeframe.                                                 |
| `notes`             | TextField           | Buyer's notes regarding the offer.                                           |
| `status`            | CharField (Choices) | `pending`, `countered`, `accepted`, `rejected`, `withdrawn`.                 |
| `counter_price`     | DecimalField        | Countered price per kilogram (if applicable).                                |
| `counter_qty`       | DecimalField        | Countered quantity in kilograms (if applicable).                             |
| `exporter_notes`    | TextField           | Exporter's notes regarding the offer/counter-offer.                          |
| `created_at`        | DateTimeField       | Timestamp of offer creation.                                                 |
| `updated_at`        | DateTimeField       | Timestamp of last update.                                                    |

## References

[1] `AI_CONTEXT_legacy.md` - Original AI Context document for Bunna Bridge. (Archived in `docs/archive/`)
[2] `bunna_bridge/bunna_bridge/users/models.py` - User model definition.
[3] `bunna_bridge/bunna_bridge/lots/models.py` - CoffeeLot, CuppingScore, SampleRequest, Notification, Offer model definitions.
[4] `bunna_bridge/bunna_bridge/lots/deforestation.py` - DeforestationZone model definition.
