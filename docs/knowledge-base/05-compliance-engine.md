# 05 — Compliance Engine (updated after the 2026-10-31 release)

All seven gates are derived in `CoffeeLot.save()` by `lots/compliance.py::apply_gates()` — there is no API, admin form or management command that can set a gate directly. Every change is written to the append-only, SHA-256 hash-chained `ComplianceEvent` log (`ComplianceEvent.verify_chain(lot)` detects tampering). `gate_report(lot)` produces the per-gate reason/next-step shown in the UI.

## The 7 gates

| # | Field | Derived from | Notes |
|---|---|---|---|
| 1 | `gps_verified` | `boundary` or `farm_location` present | EUDR needs polygons for plots > 4 ha — surfaced as guidance, not enforced |
| 2 | `deforestation_free` | PostGIS intersect with `DeforestationZone` (year > 2020); boundary, or a 500 m metric buffer around a point (EPSG:32637) | Re-run on every geometry change; reset to False when geometry is removed; if no zone data is loaded the previous value is kept |
| 3 | `eudr_dds_ready` | stored `eudr_dds_file` **and** gates 1 + 2 pass | DDS is generated only by the owner and only when 1 + 2 pass; changing geometry clears the stored DDS |
| 4 | `phyto_cert_uploaded` | file present and `phyto_cert_expiry` not past | |
| 5 | `ecta_license_active` | exporter's license file + expiry ≥ today + `ecta_license_verified_at` set by staff | Editing the license clears verification; saving the user re-derives all their lots |
| 6 | `nbe_fx_declared` | file present | |
| 7 | `cta_floor_met` | `fob_price_usd` (else `price_per_kg`) ≥ most specific active `FloorPrice` | **No floor configured ⇒ fails**; saving a FloorPrice re-derives all open lots |

`export_ready` = all 7. The only way to reach `exported` is `PATCH /lots/<id>/status/` from `contracted`, which re-derives gates first and returns the failing gate names.

Daily job `lots.tasks.daily_compliance_refresh` (beat 06:17): re-derives open lots, recomputes certification badges, sends 30/7/1/0-day expiry reminders. Run on demand with `manage.py refresh_compliance`.

## Deforestation data

- `DeforestationZone`: 72,530 polygons from **Hansen Global Forest Change v1.12 (2024)**, Ethiopia, loss years 2021–2024, ~24,839 ha, loaded by `manage.py load_deforestation_data --source=gfw` from `/tmp/hansen/ethiopia_deforestation.geojson` (the preprocessing that produced that GeoJSON is not in the repo — document/script it).
- `region` is always "Ethiopia" (no zone/woreda breakdown).
- Hansen alone is a tree-cover-loss dataset; EUDR due diligence normally also considers a forest-cover baseline for 2020 (e.g. JRC Global Forest Cover 2020, which the EU itself publishes) and degradation. Coffee is often grown under forest canopy in Ethiopia — consider how shade/forest coffee is classified.
- The admin map (`/admin/lots/map/`) embeds **all** 72k zones into one HTML page — will be extremely slow.

## EUDR DDS PDF (`EudrDdsView`)

Generated on the fly with ReportLab: operator, HS 0901, quantity, lot details, geolocation (point coords or polygon vertex count — **not the actual polygon**), quality record, gate table. Header still says "BUNNA BRIDGE".
Real EUDR submissions go into the **EU Information System (TRACES)** and need the geolocation as GeoJSON per plot. The PDF is a helpful summary, not the legal DDS. Next step: export a TRACES-compatible GeoJSON per lot and store a reference number.

## Spec sheet (`lots/spec_sheet.py`)

A4 ReportLab PDF: lot details, pricing, cupping profile bars, 7-gate checklist, farm story, branding. Any authenticated user can download any lot's sheet (including drafts).

## NBE settlement (`lots/settlement.py`)

```
gross       = volume_kg × price_per_kg            (or total_usd override)
fee         = gross × 2.5 %
net         = gross − fee
etb_portion = net × 50 %   → etb_amount = etb_portion × nbe_rate
usd_retained = net − etb_portion
milestones  = 20 % / 30 % / 50 % of gross
```
Rate: request `nbe_rate` → else `settings.NBE_DEFAULT_FX_RATE` (env, default 59.85).
The widget sends the typed rate (blank = server default). The 50/50 rule and rate still need re-validating against current NBE directives.

## Cupping (quality ledger)

Write-once after confirmation (enforced in `CuppingScore.save()`). Not hash-chained or signed yet. Live DB had 0 cupping rows at the July audit — every displayed score was a manually typed `sca_score`, which exporters can still edit freely via PATCH.

## Still to do

- JRC Global Forest Cover 2020 baseline alongside Hansen loss; script the Hansen preprocessing into the repo.
- Store the TRACES reference number returned after submission (`eudr_dds_reference` field exists; add it to the edit form).
- Enforce polygons for plots > 4 ha once farm sizes are reliable.
