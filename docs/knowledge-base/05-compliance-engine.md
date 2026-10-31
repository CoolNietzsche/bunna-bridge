# 05 — Compliance Engine (as it really works on 2026-10-31)

The selling point is a "7-gate" export-readiness engine. This is the verified behaviour after the 2026-07-27 fix commit `6543886` (which locked gates against exporter PATCH).

## The 7 gates

| # | Gate (field) | How it becomes `True` today | Automated? | Honest status |
|---|---|---|---|---|
| 1 | `deforestation_free` | PostGIS `ST_Intersects` of lot `boundary` (or a ~500 m buffer around `farm_location`) against `DeforestationZone` rows with `year > 2020`. Runs on boundary PATCH, boundary inherit, and `compliance-check`. Read-only via API. | **Yes** | Real and strong. Gaps: not re-run when zones are reloaded; point buffer is in degrees (`buffer(0.005)` on a 4326 point); returns `None` if no geometry/data so the flag simply stays at its old value. |
| 2 | `gps_verified` | `CoffeeLot.save()`: `bool(boundary or farm_location)` | Yes (presence only) | Means "has coordinates", not "coordinates verified". No check that the point is in Ethiopia, the polygon is valid, or area matches `farm_size_ha`. EUDR requires polygons for plots > 4 ha — not enforced. |
| 3 | `eudr_dds_ready` | Set `True` by `GET /lots/<id>/eudr-dds/` after the PDF is built | Yes, but flawed | ⚠ Any authenticated user (incl. a buyer) can trigger it on any lot; it's set even if `deforestation_free` is `False`; the PDF text **always says "Deforestation Free: Yes"** (`lots/views.py:542`); the PDF isn't stored, so there's no record of what was attested. |
| 4 | `phyto_cert_uploaded` | `save()`: `bool(phyto_cert_file)` | Yes (presence) | Expiry (`phyto_cert_expiry`) is ignored. No review that the file is really a phyto cert. |
| 5 | `ecta_license_active` | Only Django admin can set it | **No** | Data to automate exists: exporter's `ecta_license_file` + `ecta_license_expiry`. |
| 6 | `nbe_fx_declared` | `save()`: `bool(nbe_fx_declaration_file)` | Yes (presence) | |
| 7 | `cta_floor_met` | Only Django admin can set it | **No** | No floor-price table exists anywhere. Needs a configurable minimum (by grade/processing/period) compared to `fob_price_usd`/`price_per_kg`. |

`export_ready` = all 7. `LotStatusUpdateView` blocks `→ exported` unless `export_ready` — **but** the generic `PATCH /lots/<id>/` accepts `status` and bypasses that check (see 07 §1.2).

Also present but not part of `export_ready`: `ecex_permit_file/number/expiry`, `customs_declaration_file/id`, `eudr_dds_file`.

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
⚠ The frontend widget shows an editable NBE rate field but never sends it (`SettlementWidget.tsx:21` calls `calculateSettlement(lotId, usd)` without the rate), so the default is always used. The 50/50 rule and rate need re-validating against current NBE directives.

## Cupping (quality ledger)

Write-once after confirmation (enforced in `CuppingScore.save()`). Not hash-chained or signed yet. Live DB had 0 cupping rows at the July audit — every displayed score was a manually typed `sca_score`, which exporters can still edit freely via PATCH.

## Where to take it (summary — details in 09)

1. Close the bypasses (status PATCH, DDS trigger by non-owners, DDS claiming "Yes" when false).
2. Automate gate 5 from license expiry, gate 7 from a floor-price table, gate 4 with expiry.
3. Add a per-lot **compliance audit log** (who/what/when changed each gate, with the evidence) — the foundation for the "tamper-evident ledger" promise.
4. TRACES-ready GeoJSON export + stored DDS reference.
5. Re-run deforestation checks in a Celery task when data is reloaded; add expiry alerts via Celery beat.
