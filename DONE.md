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

---

## 2026-11-04 — Phase 2: origin onboarding at scale

Built before deployment, as requested. Backend tests: **190 pass** (49 of them new). End-to-end browser test: **39 of 39 checks pass, no page errors** (8 of them new).

### O-1 Organisations and team accounts — done
- New app `bunna_bridge/orgs/`. Every business account (exporter, importer, buyer, roaster, cooperative) belongs to an organisation. Existing accounts got one automatically through a data migration.
- Team roles and what each can do:

  | Role | Can do |
  |---|---|
  | Owner, Administrator | Everything, including inviting and removing teammates |
  | Sales | Lots, offers, samples |
  | Quality | Lots and supply records |
  | Logistics | Lots, documents, compliance profile, supply records |
  | Field agent | Producers, plots, consent, deliveries — but not lots or offers |
  | Viewer | Read-only |

- Lots, producers, plots, offers, samples, washing stations and roast batches are now shared across the team. About 35 access checks were updated.
- **Team & Compliance** page (`/settings/team`):
  - invite by email; the app creates a join link (email sending is not connected yet, so you copy the link);
  - change a member's role, or remove them;
  - an organisation always keeps at least one owner.
- Invitation page `/invite/<link>`:
  - a new person signs up straight into the team;
  - an existing user signs in and accepts.

### O-7 Exporter compliance profile (ECTA Directive 1106/2025) — done
- Upload the three required documents, with numbers, holder or amount, and dates:
  - certified quality laboratory;
  - certified taster;
  - paid-up capital attestation.
- Each document shows as Missing, Awaiting verification, Verified, Expired or Rejected.
- Admins verify or reject documents on the **License Reviews** page.
- Reminders go out 30, 7, 1 and 0 days before a document expires.
- This profile does not block any export gate yet.

### O-3 Cherry intake — done
- **Cherry Intake** page (`/intake`), for each delivery: farmer, plot, station, form (cherry, parchment, dried cherry), receipt number, weight, price, and payment (amount, date, telebirr or bank reference).
- Totals at the top: weight received, owed to farmers, paid.
- **Allocate to a lot:** each plot gets its green-coffee weight added to the lot's supply sources.
  - Default yields: cherry 5:1, dried cherry 2:1, parchment 1.25:1. You can override this with your measured out-turn.
  - A delivery is locked once it is in a lot.
- **Farmers see their own deliveries and payments** on My Farm, in Amharic, Afaan Oromo or English.

### O-2 Cooperative / union role — done
- A new self-service account type: **Cooperative / union**. Cooperatives can:
  - register members and plots;
  - record intake;
  - use the field app.
- **Sales to exporters** (`/supply`):
  - the cooperative picks deliveries and offers them to an exporter;
  - every farmer included must have given data-sharing consent;
  - the same delivery cannot be sold twice.
- The exporter accepts or rejects under **From Cooperatives**. Once accepted, the members' plots can be used as lot sources and the deliveries can be allocated to the exporter's lots, so the farm-level origin travels with the coffee.

### O-6 SMS to farmers — done (test mode until a gateway is contracted)
- New app `bunna_bridge/messaging/`. Farmers automatically get an SMS:
  - receipt when coffee is delivered;
  - confirmation when they are paid;
  - confirmation when they give consent.
- Messages go in the farmer's language (Amharic, Afaan Oromo or English) and are listed on the producer's page.
- Ethiopian mobile numbers are cleaned up automatically (09…, 07…, +251…); messages without a valid number are recorded as not sent.
- Gateways: `log` (the default — messages are stored and nothing is sent), Africa's Talking, or any HTTP gateway. These are chosen with `SMS_BACKEND` and set in `.env`.

### O-8 ECTMS integration — done (file import); live lookup waits for ECTA
- Import an ECTMS export (CSV) under **Producers & Plots → Import → ECTMS export**.
  - Farmers are matched on their ECTMS farmer ID and farms on their ECTMS farm ID, so re-importing updates records instead of duplicating them.
  - A "check file" step comes first.
- A lookup client is ready, switched on by `ECTMS_API_URL` and `ECTMS_API_TOKEN`. The API shape is a guess until ECTA shares its specification (decision D3).

### O-4 Offline field app — done
- **Field App** (`/field`), designed for phones with large buttons:
  - register a farmer;
  - read the consent text aloud and record it (a paper form needs a photo);
  - record the farm with "Use my location" or by walking the boundary (GPS points every 5 m, poor fixes ignored, hectares shown);
  - take a farm photo;
  - record cherry deliveries.
- **Works with no network:** everything is saved on the phone and sent automatically when the connection comes back.
  - Retrying never creates duplicates.
  - Items that fail show the reason and can be removed.
- The app can be added to the phone's home screen and opens without network after the first visit.

### O-5 Amharic and Afaan Oromo — done (needs native-speaker review)
- The field app and the farmer's deliveries view switch between Amharic, Afaan Oromo and English. The choice is remembered on the phone.
- SMS texts exist in all three languages.
- **Before go-live:** ask native speakers to review `bunna-bridge-frontend/src/i18n/am.ts`, `om.ts` and the SMS texts in `bunna_bridge/bunna_bridge/messaging/service.py`. I wrote them, and they are first drafts.

### New demo accounts (password `Beersheba-Demo-2026`)
- `sales@demo.beersheba.et` — Sales role in Highland Exports.
- `agent@demo.beersheba.et` — Field agent in Highland Exports; open **Field App**, ideally on a phone.
- `cooperative@demo.beersheba.et` — Sidama Highlands Union: 3 members, deliveries, and a sale offered to Highland.
- The exporter account now also has:
  - three teammates;
  - an open invitation;
  - two verified compliance documents and one awaiting review;
  - five cherry deliveries, some paid and some unpaid.
- `farmer@demo.beersheba.et` sees his deliveries and payments on My Farm.

### To run on the VPS when deploying (Docker only)
```bash
cd bunna_bridge
docker compose -f docker-compose.local.yml run --rm django python manage.py migrate
docker compose -f docker-compose.local.yml run --rm django pytest
```
Then rebuild the frontend (`npm ci && npm run build`), because two new packages were added: `i18next` and `react-i18next`.

### Still open
- O-5: native-speaker review of the Amharic and Afaan Oromo text.
- O-6: choose an SMS gateway, then set `SMS_BACKEND` and its keys on the server.
- O-8: ECTMS API access from ECTA.
- Team invitations and expiry reminders go out as in-app notifications only, because no email provider is connected yet (roadmap item 1.11).

---

## 2026-11-04 — Phase 3: trade execution

Built before deployment, as requested. Backend tests: **208 pass** (18 of them new). End-to-end browser test: **46 of 46 checks pass, no page errors** (7 of them new).

New Django app: `bunna_bridge/trade/`. New screens: **Contracts**, **Contract detail**, **Messages**, and **Minimum Prices** (admin).

### T-1 Contracts — done
- An accepted offer now creates a **draft contract** automatically, numbered `BB-2026-0001` and so on.
- Terms the exporter's sales team sets:
  - quantity (shown in 60 kg bags) and price;
  - Incoterm (FOB Djibouti by default; also FCA, CFR, CIF, DAP);
  - shipment period;
  - payment terms (cash against documents, letter of credit, advance, or part advance);
  - general terms (ECF, GCA or custom), quality specification, destination;
  - whether a pre-shipment sample is required.
- **Signing:** the exporter signs and sends; the buyer countersigns.
  - Each signature records the exact terms as a fingerprint.
  - If the terms change after sending, both signatures are cancelled and the buyer must review again.
  - A buyer signing an out-of-date version is refused.
- **Contract PDF** with parties, goods, price, delivery, payment, the EUDR division of roles, and the signatures with their fingerprint.
- **Cancelling:** possible before both parties sign. The quantity goes back to the lot and the lot returns to the marketplace. After both have signed, cancelling needs the Beersheba team.

### T-2 ECTA contract registration — done
- Minimum prices can now be set **per region**, as well as grade, process and validity period. The most specific rule wins (region first, then grade, then process).
- **Minimum Prices** admin page (`/admin/floor-prices`): import the ECTA table from CSV (with a check-only step), export the current table, and view all rules.
- The contract page shows whether the price meets the ECTA minimum for the coffee's grade, process and region on the signing date.
- **Registration is blocked below the minimum.** The ECTA registration number, date and the minimum that applied are recorded on the contract.

### T-3 Samples and claims — done
- The exporter records samples sent (pre-shipment, arrival or type) with courier and tracking number.
- The buyer marks a sample received, approved or rejected, with cup score, moisture and notes; a rejection needs a reason.
- **Loading is blocked** until the buyer approves the pre-shipment sample, if the contract requires one.
- **Claims** after shipment (quality, weight, moisture, delay):
  - the buyer raises a claim with evidence;
  - the exporter accepts or rejects it, giving a reason;
  - either side marks it settled;
  - an accepted claim reduces the amount due.

### T-4 Shipments — done
- New self-service account type: **Freight forwarder**. The exporter assigns one to a shipment by email, and the forwarder then sees that contract under **Shipments**.
- Shipment details: booking, container, seal, shipping line, vessel, voyage, bill of lading, ports, bags, net weight, departure and arrival dates.
- Milestones: booked, stuffed, trucked, at Djibouti, customs cleared, loaded, departed, transshipped, arrived, delivered, delayed.
  - The exporter's team or the forwarder records them.
  - Both buyer and exporter are notified of each one.
- When the vessel departs, the contract becomes **Shipped**, and the lot becomes **Exported** if all its gates pass. When delivered, the contract is **Completed**.

### T-5 Export document checklist — done
- Each shipment gets a checklist, with who is responsible for each document:

  | Document | Responsible |
  |---|---|
  | ECTA quality certificate | Exporter |
  | Phytosanitary certificate | Exporter |
  | Certificate of origin | Exporter |
  | ICO marks | Exporter |
  | Commercial invoice | Exporter |
  | Packing list | Exporter |
  | Customs declaration | Forwarder |
  | Bill of lading | Forwarder |
  | Weight certificate | Forwarder |

- Upload, mark as not needed, or download each document. The buyer checks each one or asks for a correction.
- Loading is blocked until the ECTA quality certificate, phytosanitary certificate and certificate of origin are uploaded and none needs correction.

### T-6 Payments and FX — done
- The exporter records each payment received (advance, balance, letter of credit, adjustment) with bank, reference and date.
- For each payment, the exporter also records the **NBE conversion**: USD converted, the bank's rate, and the date.
- The contract shows:
  - contract value, accepted claims, received, outstanding;
  - converted to Birr, average rate, and USD kept;
  - a flag showing whether the **50% conversion rule** is met, and the shortfall if not.
- The buyer sees the same summary.

### T-7 Messaging — done
- One conversation per lot between a buyer and the exporter's whole team. Buyers start it with **Message the exporter** on any marketplace lot.
- The **Messages** page shows an inbox with unread counts and the conversation, including file attachments.
- The contract page shows the conversation for that contract.
- New messages also create an in-app notification; email waits for item 1.11.

### New demo data (password `Beersheba-Demo-2026`)
- `forwarder@demo.beersheba.et` — Red Sea Freight Logistics, the forwarder on the Harrar shipment.
- **Harrar contract** with Hamburg Green Coffee:
  - signed and registered with ECTA;
  - pre-shipment sample approved;
  - container at sea on the Maersk Gironde, with milestones from booking to departure;
  - most documents uploaded, some already checked by the buyer;
  - 30% advance received, half of it converted to Birr.
- **Bensa contract** with Nordic Green Imports: the exporter has signed; log in as `buyer@demo.beersheba.et` to countersign it.
- A buyer–exporter conversation about Kochere.
- A region-specific minimum price: Yirgacheffe G1 washed, $5.60/kg.

### To run on the VPS when deploying (Docker only)
```bash
cd bunna_bridge
docker compose -f docker-compose.local.yml run --rm django python manage.py migrate
docker compose -f docker-compose.local.yml run --rm django pytest
```

### Still open
- Import the real ECTA minimum-price tables (Minimum Prices page, or CSV).
- Email delivery for notifications and messages (roadmap 1.11).
- Electronic signatures are simple click-to-sign records with a terms fingerprint. If a buyer or bank needs a qualified e-signature (for example eIDAS in the EU), that requires an integration partner.

---

## 2026-11-04 — Phase 4: quality data

Built before deployment, as requested. Backend tests: **219 pass** (11 of them new). End-to-end browser test: **51 of 51 checks pass, no page errors** (5 of them new).

New Django app: `bunna_bridge/quality/`. New screens: **Cup this lot (CVA)**, **Cupping sessions**, and **Session detail**. New cards on the lot, marketplace, contract and exporter pages.

### Q-1 CVA cupping — done
- **Cup this lot** (`/lots/<id>/cup`) now uses the SCA **Coffee Value Assessment** (2024):
  - **Liking:** each of 8 attributes (fragrance, aroma, flavour, aftertaste, acidity, sweetness, mouthfeel, overall) is rated 1–9.
  - **Description:** intensity 0–15 per attribute, up to 5 flavour categories, main acid, mouthfeel and tasting notes.
  - Non-uniform and defective cups are counted.
  - The **100-point score updates live** as you rate: 0.65625 × sum of the 8 ratings + 52.75 − 2 per non-uniform cup − 4 per defective cup. All 9s give 100; all 7s give 89.5.
- The **2004 form still works** at `/lots/<id>/cup/classic`.
- **Who can do what:**
  - a licensed Q-grader can confirm a CVA, which locks it and makes it the score buyers see;
  - the exporter's own lab team can record CVAs as internal records, which do not change the public score.
- The lot score shown everywhere is now the **newest confirmed score** from any of: the 2004 form, a CVA, or a published panel score. The method used is shown with it.

### Q-2 Physical (green) analysis — done
- A **Green analysis** card on the lot page records:
  - moisture, water activity, free-settled density;
  - screen-size distribution (20 down to below 14), shown as a bar;
  - defect counts per SCA defect type in a 350 g sample, and quakers;
  - odour, colour, the ECTA grade and ECTA certificate number.
- **Calculated automatically:**
  - full-defect equivalents (primary and secondary), using SCA conversion ratios;
  - the **SCA green grade**: Specialty (no primary defects and up to 5 full defects), Premium (up to 8), Exchange (up to 23), or Below standard.
- **Warnings:** moisture outside 10–12%, water activity above 0.70, low density, and screen percentages that don't add up to 100%.
- Buyers who can see a lot also see its latest analysis.

### Q-3 Cupping sessions — done
- **Cupping sessions** (`/cupping-sessions`). Exporters, roasters, Q-graders, buyers, importers and cooperatives can organise them.
- The organiser:
  - adds lots or other samples, and each cup gets a **random 3-digit code**;
  - invites graders by email;
  - closes scoring, then **reveals** the results.
- **Graders in a blind session see only codes** until the reveal. Each grader fills a CVA per cup, can update it while the session is open, and moves to the next unscored cup automatically.
- **Results for each cup:**
  - panel mean, spread (standard deviation, minimum and maximum) and number of graders;
  - attribute averages and the combined tasting notes.
- **Grader calibration:**
  - each grader's **bias** (how far above or below the panel they score on average) and average deviation;
  - a grader is marked Calibrated (bias within ±1.5 and deviation of 2 points or less) or Review.
- **Use as lot score:** the organiser can publish a panel mean (2 or more graders) to their own lot. It shows as "Panel of N".

### Q-4 Pre-shipment vs arrival, and exporter track record — done
- On a contract, both buyer and exporter can add a **lab analysis** to any sample (pre-shipment or arrival).
- A **Pre-shipment vs arrival** card on shipped contracts compares, for each sample:
  - cup score, moisture, water activity, density, screen 18+ share and full defects.
  - Large changes are flagged: cup score down more than 2 points, moisture changed more than 1 point, density down more than 30 g/L, screen 18+ down more than 10 points, or full defects changed by more than 3.
- An **exporter track record** card appears on the exporter's storefront, on marketplace lots and on the buyer's contract view:
  - contracts and shipments;
  - share shipped on time (vessel departed by the end of the shipment period);
  - claims and claim rate;
  - share of pre-shipment samples approved first time;
  - average cup-score change from pre-shipment sample to arrival.
- This record is the basis for the exporter reliability score in Phase 5 (M-6).

### Demo data (password `Beersheba-Demo-2026`)
- New Q-graders: `qgrader2@demo.beersheba.et` and `qgrader3@demo.beersheba.et`.
- **Kochere:**
  - lab analysis: moisture 10.6%, water activity 0.54, density 742 g/L, Specialty grade, ECTA G1;
  - a confirmed CVA by Tigist Bekele, 87.5 points.
- **"Harvest calibration — Gedeo & Guji":** revealed. 4 blind cups, 3 graders; one grader scores higher than the panel and one lower.
- **"Pre-shipment check — Harrar & Kochere":** open. Log in as `qgrader@demo.beersheba.et` to score the two coded cups, then as the exporter to reveal.

### To verify before relying on it commercially
- The CVA formula and the SCA defect conversion and grading tables were written from the SCA standards as I know them. Check them against the current official SCA documents (the CVA protocol and the green-coffee grading handbook). The constants are all in `bunna_bridge/quality/scoring.py`.
- The ECTA grade is entered as ECTA's liquoring centre issues it. The platform does not calculate ECTA grades, because ECTA's point tables were not available to check.

### To run on the VPS when deploying (Docker only)
```bash
cd bunna_bridge
docker compose -f docker-compose.local.yml run --rm django python manage.py migrate
docker compose -f docker-compose.local.yml run --rm django pytest
```

## 2026-11-04 — Phase 5: marketplace growth

All seven Phase 5 tasks (M-1 to M-7) are built: backend, screens, demo data and tests.
- Backend tests: 228 pass.
- End-to-end browser test: 61 of 61 checks pass, including 10 new Phase 5 checks.
- New backend app: `bunna_bridge/market/`. Its API is under `/api/v1/market/`.

### M-1 Beersheba Select (curated programme and timed auction) — done
- Page: `/select`. The admin creates a programme with a season, a nominations deadline and a minimum jury score (default 86).
- **Steps:** taking nominations → jury cupping → catalogue published → auction live → closed.
- **Nominations:** exporters and roasters nominate their own listed lots, with quantity, starting price and an optional hidden reserve. A lot is ineligible (with the reason shown) when it is not EUDR-ready or not traced to the farm.
- **Jury:** "Send eligible lots to the jury" creates a **blind cupping session** (Phase 4). After the reveal, "Publish catalogue" ranks the lots by panel mean and selects those at or above the minimum score.
- **Auction:** each selected lot shows the jury score, high bid, number of bids and a countdown.
  - Bids must beat the high bid by the minimum step (default $0.10/kg).
  - A bid in the last 3 minutes extends that lot's close by 3 minutes (stops last-second sniping).
  - Exporters cannot bid on their own lots.
  - Bidders see "You are the highest bidder" or "You were outbid". The page refreshes every 8 seconds.
- **Closing:** a background task runs every 2 minutes. The winning bid becomes an accepted offer, which creates the draft contract (Phase 3). Lots below the reserve are marked unsold.

### M-2 Availability states — done
- Every lot is **Spot** (in Ethiopia, ready now), **Forward** (current harvest, not ready yet), **Afloat** (on the water) or **EU stock**, with an expected-ready or arrival date.
- Set on the lot create and edit forms. Shown as a badge on marketplace cards. Buyers can filter by it.

### M-3 EU warehouse stock — done
- Page: `/eu-stock`.
- **Importers** list stock of a lot they bought (an accepted offer is required): warehouse (Antwerp, Hamburg, Trieste, Le Havre or other), bag size, number of bags, price in EUR/kg, minimum bags, landing date and DDS reference. The lot's availability changes to EU stock.
- **Buyers, roasters and importers** order by the bag. One order comes from one importer and one warehouse (a single release); the cart says so if you mix them.
- The importer **confirms** (bags are reserved), then marks the order **released**. Either side can cancel a requested order; only the importer can cancel a confirmed one, and the bags go back into stock. Both sides are notified.

### M-4 Saved searches, alerts and watchlist — done
- On the marketplace, "Save search & alert me" saves the current filters.
- When a lot is listed that matches, the buyer gets a notification.
- Saved searches are listed on the watchlist page, where alerts can be switched off or the search deleted.
- The watchlist is now stored on the server, so it follows the buyer across devices. A list saved in the browser before this change is merged in once.

### M-5 Impact and transparency score — done
- Shown on every lot page, including the marketplace. Each point is explained:
  - farmers' share of the export price (30 points), from recorded cherry prices converted to green coffee;
  - farmer payments on record (15);
  - traced to the farm (20);
  - forest-safe origin (15);
  - women producers (10), using a new optional gender field on the producer profile;
  - certifications (10).
- Criteria without data are shown as "no data" and left out of the score, not counted as zero. The card says what share of the criteria the score is based on.

### M-6 Exporter reliability score — done
- Shown on the exporter storefront and on marketplace lots, next to the Phase 4 track record. Built from that record:
  - ships on time (35 points);
  - few accepted claims (25);
  - pre-shipment samples approved first time (20);
  - arrives as sampled (10);
  - answers offers quickly (10).
- Marked **Provisional** until the exporter has 3 contracts on Beersheba.

### M-7 Education hub — done
- Pages: `/learn` (public, no login needed) and `/learn/<name>`.
- Kinds: origin guides, harvest updates, buyer guides and webinars (with date and video link).
- The Beersheba admin writes and publishes articles on the site. The text is plain: a blank line starts a new paragraph and a line beginning with "## " is a heading. No HTML is accepted, so articles cannot carry harmful code.

### Navigation
- A new **Market** group in the side menu: Beersheba Select, EU Stock (buyers, roasters, importers, admin) and Learn.
- The top bar gained Select and EU Stock for buyers, a menu for importers, and Learn for visitors.

### Demo data (password `Beersheba-Demo-2026`)
- **"Beersheba Select 2026/27"** with the auction live for two days:
  - Kochere: jury 88.19; three bids, buyer leading at $8.10/kg.
  - Hambela: jury 87.06; importer bid $7.00/kg.
  - Bensa: not selected (84.31).
- **EU stock:** the importer holds 20 × 30 kg bags of Harrar in Hamburg at €12.80/kg. The buyer has a confirmed order for 4 bags.
- **Availability:** Bensa is Forward and Kaffa is Afloat.
- **Saved searches:**
  - the buyer: "Washed Yirgacheffe 86+", with alerts on;
  - the importer: one with alerts off.
- **Articles:** 4 (Yirgacheffe origin guide, harvest update, EUDR buying guide, a webinar).
- **Producer genders:** recorded for the exporter's producers.

### Before go-live
- **Auction terms:** have a lawyer agree the auction terms (buyer's premium, payment deadline, what happens if a winner does not pay) before the first real auction.
- **EU warehouse partner:** sign the first partner. Prices shown are ex-warehouse, before VAT.
- **Impact score cut-offs:** the farmer-share bands (40–70%) and the green-coffee conversion rates (cherry 20%, dry cherry 50%, parchment 80%) are reasonable defaults. Check them with your own station data. They are in `bunna_bridge/market/scores.py`.

### To run on the VPS when deploying (Docker only)
```bash
cd bunna_bridge
docker compose -f docker-compose.local.yml run --rm django python manage.py migrate
docker compose -f docker-compose.local.yml run --rm django pytest
docker compose -f docker-compose.local.yml restart celerybeat celeryworker
```
The restart picks up the new task that closes auctions every 2 minutes.

## 2026-11-05 — Deployment kit for the new Telecloud VPS

The new server (`ecs-28b1`, 196.189.51.169) also runs the live call centre, so Beersheba is packaged to stay out of its way. Guide and scripts: `deploy/server/README.md`.

- **Production image fixed.** It was missing the map libraries (GDAL, GEOS, PROJ) the app needs, so it could not start. The old VPS worked around this by running the development image.
- **New `bunna_bridge/docker-compose.server.yml`:**
  - code built into the image; Gunicorn with 2 workers, a Celery worker and a scheduler, PostGIS and Redis;
  - each container has a memory cap; about 550 MB in use in total;
  - one port, on `127.0.0.1` only; no Traefik and no Flower.
- **Scripts.** Each prints a report to paste back:
  - `check.sh` looks at the server and changes nothing;
  - `install-docker.sh` uses Ubuntu packages and stops if anything installed would be upgraded;
  - `setup.sh` creates the secrets on the server, never printed;
  - `frontend.sh` builds the website in a container capped at 1.2 GB;
  - `nginx.sh` adds Beersheba's own nginx file and certificate. It reloads nginx only after a passing config test, and rolls back if the test fails;
  - `backup.sh` backs up nightly, keeping 14 days; `update.sh` deploys new code; `status.sh` is a health check.
- **Uploaded files.** Only lot photos and certificates are publicly served. Export documents, consent forms, plot photos, contracts and evidence packages return 404 and are only served through logged-in views. The old server used a block-list instead.
- **Rehearsed here** on a fresh clone with Docker and nginx 1.24 (the server's version):
  - setup, website build, backup with a full restore test, and update;
  - all routes; HTTP→HTTPS redirect; admin; private files blocked;
  - a browser test of login, marketplace, Select, EU stock, Learn and contracts: no errors, and all lot photos loaded.
- **Not yet done:** running it on the server itself. That needs the domain and DNS record, and is done step by step with the founder.

### Test mode on port 8090 (added 2026-11-05)
- There is no domain yet, so `setup.sh 196.189.51.169` sets Beersheba up for plain HTTP, and `nginx.sh` serves it at `http://196.189.51.169:8090`. Ports 80/443 are not touched. Inbound TCP 8090 must be allowed in the Telecloud security group.
- Running `setup.sh` again with the domain switches to HTTPS and keeps all settings and data.
- Over HTTP, GPS capture, the field app's offline mode and admin login stay off until HTTPS is set up. The Team page's "Copy link" button now shows the link instead of failing.
- Any failing command now stops the scripts with a clear STOP message.
- Rehearsed here: setup, website build, nginx 1.24 on 8090, all routes, private files blocked, and a browser test of login and the main pages.

### Fresh deployment on the old VPS instead (2026-11-05)
- The Telecloud server could not reach `ghcr.io`, where the image's build tools come from. The founder chose a fresh deployment from the latest code on the old VPS (`91.107.204.59`) instead.
- Scripts moved to `deploy/server/` and made server-independent: they detect the server's own IP addresses rather than having Telecloud's written in.
- If the old Beersheba nginx file still serves the domain, `nginx.sh` stops and prints the exact command to switch it off.
- The old `/root/bunna-bridge` deployment is not used. Its systemd unit should be disabled once the new site works.
- Handoff for the session on the VPS: `docs/development/session-logs/2026-11-05-deployment-handoff.md`.

## 2026-11-12 — Public lot story page: premium redesign (from Abeni's notes)

The page behind a lot's QR code (`/story/<id>`) is redesigned for guests and coffee drinkers: dark, with gold and white accents.
- Backend tests: 240 pass (8 new).
- End-to-end browser test: 66 of 66 checks pass (5 new).

### What the page shows
- **Partner header** above the lot name, e.g. "Skylight Hotel × Eset Coffee Roastery", and the line **"Verified by Beersheba"**.
- **Top picture:** an uploaded forest or farm photo. Without one, the page shows the farm itself on a satellite map, with the boundary drawn in gold.
- **Place line and elevation**, e.g. "Bensa, Sidama Highlands", "Elevation 2,180 MASL".
- **Coffee specs card:**
  - lot reference (a partner's own, e.g. SKY-SID-001, or the Beersheba lot ID);
  - variety, process, grade, elevation, harvest, cup score;
  - the growers' names (only with consent, below) and the exporter;
  - the tasting notes.
- **Beersheba Climate Covenant:** a checklist worked out from the lot's own records, never typed in:
  - zero deforestation since 31 December 2020;
  - checked against the EU 2020 satellite forest map;
  - traced to mapped farm plots;
  - payments to the growers on record;
  - exported under a verified ECTA licence.

  Anything not yet shown by the records is marked "Not yet", rather than ticked.
- **Partner statements:** claims Beersheba cannot check, such as forest canopy or roasting technology. They appear under the partner's name, with the note "Beersheba has not verified them", never with a tick.
- **Two buttons:**
  - **Order** (e.g. "Take Ethiopia home · 250 g souvenir box · $20"). It opens the partner's shop or WhatsApp link if one is set. Otherwise a short order request goes to the Beersheba enquiry inbox and is emailed to the team.
  - **Explore the GPS farm boundary map:** a full-screen satellite or street map.
- **Grower privacy:** names and plot shapes appear only for growers who have given the "story" consent (show farm story on public lot pages).

### Where it is edited
A new **Public story page** card on the lot page, for the lot's team. It sets the partner header, place line, reference, top picture, order button, partner statements and whether to name the growers.

### Demo data
Bensa Honey G2 (Sidama) is set up as the example: Skylight Hotel × Eset Coffee Roastery, SKY-SID-001, variety 74112, 2,180 m. Its growers are Tadesse Wolde and Aster Hailu, both with story consent and paid deliveries.

### To check
- **Exchange rate:** `NBE_DEFAULT_FX_RATE` still defaults to 59.85 birr per dollar, the rate before the birr was floated in 2024. That makes the farmers' share of the export price come out too high. The story page hides the figure when it is over 100%, but the server should set the current rate.
- **Satellite imagery:** it comes from Esri's World Imagery service, credited on the page. Check Esri's terms for commercial use, or switch to a licensed provider.
