# 03 — Data Model

All apps live under `bunna_bridge/bunna_bridge/`. App labels for `makemigrations`: `lots`, `users`, `roasting`.

## Entity map

```
User (role: admin|exporter|buyer|farmer|qgrader|roaster)
 ├─< CoffeeLot.exporter        (PROTECT, related_name="lots")        — owner/seller
 ├─< CoffeeLot.farmer          (SET_NULL, related_name="lots_produced", role=farmer)
 ├─< Certification.holder      (CASCADE, related_name="certifications")
 ├─< WashingStation.owner      (CASCADE, related_name="washing_stations", exporter|roaster)
 ├─< CuppingScore.grader       (PROTECT)
 ├─< SampleRequest.buyer       (PROTECT)
 ├─< Offer.buyer               (CASCADE, related_name="offers_made")
 ├─< Notification.recipient    (CASCADE)
 ├─< RoastEquipment.roaster / RoastBatch.roaster
CoffeeLot
 ├─< CuppingScore.lot     (PROTECT, related_name="cupping_scores")
 ├─< SampleRequest.lot    (PROTECT, related_name="sample_requests")
 ├─< Offer.lot            (CASCADE, related_name="offers")
 ├─< RoastBatchLot.lot    (PROTECT, related_name="roast_batch_uses")
 └─> WashingStation       (washing_station_facility, SET_NULL)
RoastBatch ─< RoastBatchLot (blend lines) ; RoastBatch ─> RoastEquipment
DeforestationZone (standalone reference data, Hansen GFC)
```

## `users.User` (`users/models.py`)

`AbstractUser` with **integer** PK. One table for every role.

- Common: `role` (default `exporter`), `company_name`, `phone`, `country`, `bio`, `is_verified` (read-only via API; no flow sets it).
- Farmer: `farm_id` (auto `BSB-ETH-<REGION3>-<seq6>`, generated once in `save()`, never regenerated), `farm_name`, `farm_region`, `farm_kebele`, `farm_altitude_m`, `farm_size_ha`, `cooperative`, `gps_lat`, `gps_lng`, `boundary` (Polygon, geography).
- Exporter: `ecta_license_number`, `ecta_license_file` (validated pdf/jpg/png ≤10 MB), `ecta_license_expiry`.
- Roaster: `roastery_type`, `roastery_monthly_capacity_kg`, `roastery_roast_styles`, `roastery_preferred_origins`, `roastery_established_year`, `roastery_website`.

## `users.Certification`

UUID PK. `holder`, `cert_type` (organic, fair_trade, rainforest_alliance, utz, q_arabica, iso, haccp, other), `issuing_body`, `cert_number`, `issue_date`, `expiry_date`, `file`. `is_expired` property.
Signal (`users/signals.py`): on save/delete, recomputes `is_organic` / `is_fair_trade` / `is_rainforest_alliance` on **all** the holder's lots. The daily `lots.tasks.daily_compliance_refresh` job also recomputes them, so badges drop when a certificate expires.

## `lots.CoffeeLot` (`lots/models.py`) — the core entity

UUID PK `id` (use this in URLs) + human `lot_id` (unique string, e.g. `YRG-2026-001`).

| Group | Fields |
|-------|--------|
| Identity / lifecycle | `lot_id`, `name`, `status` (`draft → listed → contracted → exported`), `exporter`, `farmer`, `lot_type` (spot/forward/reserve) |
| Origin | `region` (choices: yirgacheffe, sidama, guji, jimma, harrar, limu, nekemte, other), `kebele`, `washing_station` (text, legacy), `washing_station_facility` (FK; its name overwrites the text on save), `altitude_m`, `processing`, `grade` (G1–G3), `varietal`, `harvest_date` |
| Geo | `farm_location` (Point, 4326), `boundary` (Polygon, geography). `farm_polygon` **no longer exists** |
| Quality | `sca_score` (Decimal 4,1 — set manually or by a confirmed cupping), `flavor_notes`, `cupping_date`, `q_grader_name`, `q_grader_cert_id` |
| Compliance gates | `deforestation_free`, `gps_verified`, `eudr_dds_ready`, `phyto_cert_uploaded`, `ecta_license_active`, `nbe_fx_declared`, `cta_floor_met` (see doc 05) |
| Documents | `phyto_cert_file` + `phyto_cert_expiry`, `ecex_permit_file` + `_number` + `_expiry`, `nbe_fx_declaration_file`, `customs_declaration_file` + `customs_declaration_id`, `eudr_dds_file` — all validated pdf/jpg/jpeg/png ≤10 MB |
| Commercial | `volume_kg`, `price_per_kg`, `available_qty_kg`, `fob_price_usd`, `min_order_kg` (default 60), `delivery_window` |
| Marketing | `flavor_tags` (JSON list), `farm_photos` (JSON list of public media URLs, max 8), `tasting_notes`, `farm_story`, `is_organic`/`is_fair_trade`/`is_rainforest_alliance` (derived from certs) |

`save()` always recomputes: `phyto_cert_uploaded = bool(phyto_cert_file)`, `nbe_fx_declared = bool(nbe_fx_declaration_file)`, `gps_verified = bool(boundary or farm_location)`, and syncs `washing_station` text.

Computed: `green_passport_ready` (deforestation + GPS + DDS), `export_ready` (all 7), `compliance_score()` (0–7), `is_eudr_ready()`.

## Other `lots` models

- **WashingStation**: UUID, `owner`, `name`, `region`, `location`, `capacity_kg_per_day`.
- **CuppingScore**: UUID, `lot`, `grader`, `status` (pending/confirmed/disputed), 10 SCA components (Decimal 4,2, validated 6–10) + `defects`, notes, `cupping_date`, `cupping_location`. `total_score` = sum − defects (a float). Saving a **confirmed** score raises `ValueError` (write-once); confirming copies score/notes/grader onto the lot. Uses the classic SCA 100-pt form, not the 2024 CVA.
- **SampleRequest**: UUID, `lot`, `buyer`, `status` (pending/approved/rejected/shipped/received), `quantity_g` (200), `message`, `response`, `shipping_address`, `tracking_number`. Signal creates notifications.
- **Offer**: UUID, `lot`, `buyer`, `quantity_kg`, `price_per_kg_usd`, `delivery_window`, `notes`, `status` (pending/countered/accepted/rejected/withdrawn), `counter_price`, `counter_qty`, `exporter_notes`.
- **Notification**: int PK, `recipient`, `notification_type` (lot_status/sample_request/eudr_alert/offer), `title`, `message`, `link`, `is_read`.
- **DeforestationZone** (`lots/deforestation.py`, `app_label='lots'`): MultiPolygon geography, `year`, `source`, `region` (always "Ethiopia" in live data), `area_ha`. Live: 72,530 rows, Hansen GFC v1.12, years 2021–2024.

## `roasting` models

- **RoastEquipment**: roaster-owned machine (drum/fluid_bed/hybrid/other), capacity, install date.
- **RoastBatch**: `batch_code` (unique per roaster), `equipment`, `status` (queued → roasting → resting → qc → packaged → shipped), roast curve key points, `output_weight_kg`, `qc_score`, notes. `input_weight_kg` / `weight_loss_pct` are computed. Cannot move to `packaged` without output weight.
- **RoastBatchLot**: blend line (`batch`, `lot`, `quantity_kg`). Eligible lots = lots the roaster exports + lots with an accepted offer by them.

## Gotchas

- DRF serializes model `DecimalField`s as **strings** (`"82.0"`); `SerializerMethodField` decimals and `total_score` come out as **numbers**. The frontend `CoffeeLot.sca_score` and `CuppingScore` component types are still declared `number` — wrong; always `Number(...)`.
- List endpoint returns plain JSON; lot **detail** returns a GeoJSON Feature (`GeoFeatureModelSerializer`, `geo_field=farm_location`) — the frontend `getLot` unwraps `properties`.
- The list serializer includes `farm_location` plus derived `gps_lat`/`gps_lng`.
- Use `CoffeeLot.objects.filter(exporter=u)` or `u.lots` — never `coffeelot_set`.
- `available_qty_kg` defaults to `volume_kg` for new lots and is decremented when an offer is accepted.
- New in 2026-10-31: `FloorPrice` (gate 7 table), `ComplianceEvent` (append-only hash-chained gate log), `CoffeeLot.eudr_dds_generated_at` / `eudr_dds_reference`, `User.ecta_license_verified_at`.
- Migrations: lots 0001–0015, users 0001–0010, roasting 0001.
