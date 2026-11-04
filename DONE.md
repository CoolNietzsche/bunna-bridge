# DONE — Phase 1 work log

Log of completed roadmap work. Task IDs are from
[docs/knowledge-base/12-roadmap-and-tasks.md](docs/knowledge-base/12-roadmap-and-tasks.md).
Newest entries at the bottom.

---

## 2026-11-04 — Phase 1 backend: EUDR traceability backbone

New Django app: `bunna_bridge/bunna_bridge/traceability/`, registered in
`config/settings/base.py`, with its API mounted under `/api/v1/`.

### E-1 Producer and Plot registry — done
- Models `Producer` and `Plot` (`traceability/models.py`).
  - A producer is owned by the exporter who registers them. Most smallholders never log in; a linked farmer login is optional.
  - Fields: ECTMS farmer and farm IDs, region / zone / woreda / kebele, cooperative, and land tenure per plot.
- API:
  - `GET/POST /api/v1/traceability/producers/` and `/producers/<id>/` (search with `?search=`).
  - `GET/POST /api/v1/traceability/plots/` and `/plots/<id>/` (filter with `?producer=` or `?status=`). Geometry is sent as GeoJSON.
  - `POST /plots/<id>/recheck/` re-runs the forest checks.
- Only exporters, roasters and admins can manage producers and plots, and each exporter sees only their own.

### E-2 Geolocation rules (EU Information System format) — done
- `traceability/geo.py` checks, on every save and in the API:
  - geometry must be inside Ethiopia, which catches swapped latitude and longitude;
  - a polygon needs at least 4 distinct points, must not cross itself and must have real area;
  - an area over 5,000 ha is rejected as implausible;
  - a plot over 4 ha needs a polygon — a point alone is not enough.
- Area is calculated from the polygon itself (UTM projection).
- Each plot is checked for forest loss after 2020: points get a 500 m radius, polygons are checked as drawn.
- GeoJSON export rounds coordinates to 6 decimals and splits files to stay under 20 MB.

### E-3 Lots built from many plots — done
- New `LotSource` model: one row per plot in a lot, with the kg delivered, the delivery receipt number and the date.
- New `CoffeeLot.channel` field: direct / vertical / union / ecx / unknown.
- API:
  - `GET/POST /api/v1/lots/<id>/sources/` and `PATCH/DELETE /sources/<id>/`.
  - `POST /sources/convert-legacy/` turns an existing lot's single farm point or polygon into a registered producer, plot and source.

### E-5 Gates across all plots — done
- `lots/compliance.py`: for a lot with sources, the location gate and the deforestation gate must pass for every plot.
- Older lots without sources keep their previous single-geometry behaviour.
- Lot gates recalculate automatically whenever a plot, source or consent record changes (`traceability/signals.py`).

### E-7 Risk register, mitigation and sign-off — done
- `traceability/due_diligence.py` raises risks automatically:

  | Risk | Severity |
  |---|---|
  | Ethiopia is a standard-risk country | low |
  | Coffee bought through ECX | high |
  | Supply channel not stated | medium |
  | No supply plots | high |
  | Plot missing a location | high |
  | Plot over 4 ha with only a point | high |
  | Plot overlaps forest loss | high |
  | Plot not yet checked | medium |
  | Plot inside 2020 forest | medium |
  | Producer has not given consent | high |
  | Legality information incomplete (ECTA licence, ECEX permit, land tenure) | medium |
  | Part of the lot volume untraced | high |
  | Volume mismatch | medium |

- How risks change:
  - A risk resolves itself when the data is fixed.
  - A mitigated risk re-opens if new plots or producers are affected.
  - High risks can only be mitigated, and only with a recorded action and evidence.
  - Medium and low risks can be accepted, but need a written justification.
- Sign-off is refused while any risk is open. It becomes invalid the moment the risk register changes.
- API:
  - `GET /lots/<id>/due-diligence/`
  - `POST /lots/<id>/risks/` (add a manual risk)
  - `PATCH /lots/<id>/risks/<id>/`
  - `POST /lots/<id>/risks/<id>/mitigations/`
  - `POST /lots/<id>/sign-off/`

### E-10 Producer consent (Proclamation 1321/2024) — done
- `ProducerConsent` records consent per purpose (sharing data for EUDR, public story) and how it was given (in app, paper, SMS, witnessed).
- Paper consent requires a photo or scan of the signed form.
- A newer record replaces older ones; recording "not granted" withdraws consent.
- Missing consent is a high risk, and it also blocks the evidence package.

### E-6 Evidence package for the importer — done
- `traceability/package.py` builds a ZIP containing:
  - README and `manifest.json` (SHA-256 of every file);
  - plot GeoJSON (6 decimals, split under 20 MB);
  - `producers.csv` and `plots.csv`;
  - `due-diligence-summary.pdf`;
  - `legality/` (ECTA licence, ECEX permit, phytosanitary certificate);
  - the hash-chained compliance log.
- Generation requires every plot located and clear, every producer's consent, a valid sign-off, and no open high risk.
- The package goes stale as soon as any source, plot location or check result changes.
- The `eudr_dds_ready` gate now means: a current package plus a valid sign-off. Its label is now "EUDR due-diligence evidence".
- The old DDS PDF endpoint still works as a summary document, but it no longer passes the gate.
- API:
  - `POST /lots/<id>/evidence-packages/`
  - `GET /lots/<id>/evidence-packages/<id>/download/`

### E-8 Importer role and DDS reference — done
- New self-service role `importer` (an EU operator). It is treated like a buyer for offers and samples.
- A buyer or importer with an accepted offer can download the package and record the DDS reference and verification number: `POST /lots/<id>/dds-references/`.
- The exporter cannot record the reference. Under EUDR the importer files the DDS.
- The `eudr_dds_reference` field on lots can no longer be written by exporters.

### E-9 Five-year retention — done
- Deleting a lot that has any history (offers, sources, packages, DDS references, or a status other than draft) archives it instead. A bare draft can still be deleted.
- Deleting a producer or plot also archives it.
- Archived lots are hidden from browsing.
- `GET /api/v1/traceability/records-export/` downloads a CSV of every lot source: lot, producer, plot, kg, check result, package hash and DDS references.

### E-4 Bulk import — done
- `POST /traceability/producers/import/` takes a CSV of producers.
  - Optional latitude/longitude/area columns create a point plot.
  - Optional consent columns record consent.
- `POST /traceability/plots/import/` takes GeoJSON, KML/KMZ or a zipped Shapefile. Each plot is matched to a producer by reference or name; unknown producers are created.
- Both imports support `dry_run=1`, and save nothing if any row has an error. Errors are reported by row number.

### E-11 2020 forest baseline (JRC GFC2020) — done (code); data load pending
- New `ForestBaseline2020` model. Every plot now reports the percentage of its area that was forest in 2020; 10% or more raises a medium risk.
- Commands:
  - `manage.py load_forest_baseline <file> --tile <name> [--recheck]`
  - `manage.py recheck_plots`
- **Pending (needs the server):** download, vectorise and load the JRC tiles for the coffee regions.

### E-12 Check the GeoJSON property names — partly done
- Property names are kept in one place: `TRACES_PROPERTIES` in `traceability/geo.py`.
  - The ZIP README and manifest list them so the importer can check.
- **Still open:** confirm them against the official EU Information System GeoJSON guidance. That page returned 503 during research.

### E-13 Public trust profile — done (API)
- The public lot story now includes a `trust_profile`:
  - ECTA licence verified;
  - supply channel;
  - number of producers and plots, polygon count, plots clear of forest loss, traced kg;
  - risk sign-off date, package date, and whether the importer has filed a DDS.
- It contains no producer names and no plot locations.
- The lot detail endpoint also returns a `due_diligence` summary.

### Also
- `seed_demo`:
  - new demo importer: `importer@demo.beersheba.et`, Hamburg Green Coffee GmbH;
  - Kochere: 6 smallholder plots, signed off, package ready;
  - Hambela: one producer missing consent, so a high risk is open;
  - Bensa: union lot, mapped and consented, not yet signed off;
  - Harrar: estate lot, exported, DDS reference recorded by the importer.
- Django admin pages for every new model.
- Migrations: `lots/0016`, `users/0011`, `traceability/0001`.
- Tests: `traceability/tests.py` adds 37 tests. Three older tests were updated for the new DDS rule. Full suite: **141 passed**.

### To run on the VPS when deploying (Docker only)
```bash
cd bunna_bridge
docker compose -f docker-compose.local.yml run --rm django python manage.py migrate
docker compose -f docker-compose.local.yml run --rm django pytest
```

---

## 2026-11-04 — Phase 1 frontend, end-to-end tests, demo data

### New screens
- **Producers & Plots** (`/producers`), in the sidebar for exporters, roasters and admins:
  - summary tiles: producers, consent given, plots mapped, polygons, plots clear, plots needing attention;
  - a map of every plot, coloured by forest-loss check result;
  - a searchable producer table;
  - **Bulk import**: supplier-list CSV, or plot maps as GeoJSON / KML / KMZ / zipped Shapefile. "Check file" runs a dry run and lists errors by row number;
  - **Records export**: a CSV covering 5 years of records.
- **Producer detail** (`/producers/:id`):
  - Plots: click the map to add a GPS point, type a GPS reading, or click the corners to draw a polygon. Plots over 4 ha are blocked unless drawn as a polygon. Each plot shows its forest-check result and can be re-checked or archived.
  - Consent: record or withdraw consent per purpose and method; paper consent needs the signed-form photo.
  - Editable producer details, and archiving.

### Lot page (exporter)
- **Supply sources** card:
  - a map of the plots in the lot;
  - per plot: kg, location validity, forest check, consent;
  - percentage of the lot's kg that is traced to plots;
  - add a plot from the registry, or "Use current farm location as a plot" for older lots.
- **EUDR due diligence** card:
  - a 5-step checklist: plots, risks, sign-off, evidence package, DDS filed by the importer;
  - risk register: record a mitigation with evidence, or accept a medium/low risk with a justification; add a manual risk;
  - sign off the conclusion, generate or regenerate the evidence package, download the ZIPs, see the importer's DDS reference.
- The export-readiness panel:
  - the gate is relabelled "Due diligence";
  - the old "Generate EUDR DDS" button is now "Download summary (PDF)". The PDF itself is retitled "EUDR due-diligence summary".
- Create and edit lot forms have a **Supply channel** field.

### Marketplace, importer and public pages
- New self-service sign-up option **EU importer**, with its own role badge and sidebar.
- Marketplace lot page:
  - a **Traceability** summary (counts only, no personal data);
  - a buyer or importer with an accepted offer gets the **EUDR due diligence** card: download the package and record the DDS reference and verification number;
  - the old "Download EUDR DDS" button is removed.
- Public lot story (`/story/:id`): a **Traceable to the farm** section with kg traced, plots, producers and four checks. It contains no producer names and no plot locations.

### Demo accounts (password `Beersheba-Demo-2026`)
- New: `importer@demo.beersheba.et` — Hamburg Green Coffee GmbH, which filed the DDS for the Harrar lot.
- For a walk-through, log in as `exporter@demo.beersheba.et` and open:
  - **Producers & Plots**;
  - lot YRG-2026-0847 (6 smallholders, evidence ready);
  - GUJ-2026-0311 (high risk open: one producer without consent);
  - SDM-2026-0213 (ready to sign off).

### Verification
- Backend: **141 tests pass**.
- Frontend: `tsc -b` and `npm run build` succeed.
- New files pass ESLint. The two remaining ESLint errors were already in `MarketplaceLotDetail.tsx` before this work.
- `scripts/e2e-smoke.js` now has **31 checks, all passing, with no page errors**. 12 of them are new for Phase 1:
  - producer, plot and consent created in the UI;
  - swapped latitude/longitude rejected;
  - sign-off refused while a high risk is open;
  - evidence package generated, then the lot exported;
  - importer downloads the ZIP and sees the DDS reference;
  - a buyer without an accepted offer is refused;
  - the public story shows the trust profile and hides producer names.

### Still open (needs the server or outside input)
- E-11: load the JRC GFC2020 forest tiles on the server (`load_forest_baseline`, then `recheck_plots`).
- E-12: check the GeoJSON property names against the official EU Information System guidance; if they differ, update `TRACES_PROPERTIES` in `traceability/geo.py`.
- Deploy: run `migrate` on the VPS through Docker Compose (commands are in the backend section above).
