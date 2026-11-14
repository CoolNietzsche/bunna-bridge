# 13 — Getting ready to register real farmers

Plan written 2026-11-14. Goal: a field team can register farmers and map their plots in a real kebele,
every record passes the EUDR checks, and the data can be handed to ECTA and to EU importers.

"Ready" means:
- a field agent with an Android phone registers a farmer, records consent and maps the plot, with or without signal;
- each plot is checked against forest-loss data and the EU 2020 forest map on the live server;
- a supervisor reviews what the agent captured before it counts;
- duplicate farmers and overlapping plots are caught;
- the data can be exported in the form ECTA asks for.

## What already works

| Area | Built | Where |
|---|---|---|
| Producer records | Name, phone, gender, SMS language, region/zone/woreda/kebele, cooperative, ECTMS ID, own reference | Producers & Plots, producer page |
| Plots | GPS point (≤ 4 ha) or boundary polygon (required > 4 ha), tenure, declared and measured area, photo, EU geometry rules (TRACES) | Producer page, field app |
| Forest checks | Every plot checked against forest-loss data; EU 2020 forest map check when that layer is loaded | `traceability/geo.py`, `recheck_plots` |
| Consent | Per purpose (EU data sharing; public story page), method, photo of the paper form, withdrawal | Producer page, field app |
| Field app | Offline queue, sync later, English / Amharic / Afaan Oromo, GPS point and boundary walk (ignores fixes worse than 30 m) | `/field` |
| Bulk work | Spreadsheet import of producers, GeoJSON / KML / Shapefile import of plots, ECTMS file import | Producers & Plots |
| Intake | Cherry deliveries, payments, SMS receipts (sending not switched on) | Cherry intake |
| Teams | Field-agent role in the organisation | Team & Compliance |

## Must-do before the first real farmer (blockers)

| ID | Task | Who | Size |
|---|---|---|---|
| R-1 | **Load the forest data on the live server**: forest-loss areas (Hansen) and the EU 2020 forest map (JRC GFC2020), then run `recheck_plots`. Today the live database has neither, so every plot shows "no reference data". | Claude prepares, founder runs | M |
| R-2 | **Data protection**: register with the Ethiopian Communications Authority as a data controller; privacy notice in Amharic, Afaan Oromo and English; lawyer reviews the consent wording; decide hosting (the live server is outside Ethiopia; Proclamation 1321/2024 limits sending personal data abroad). | Founder + lawyer | M |
| R-3 | **Printable consent forms** in three languages, with a version number, so the signed paper matches the wording recorded in the system. Store which version each farmer agreed to. | Claude | S |
| R-4 | **Native-speaker review** of the field app text (Amharic, Afaan Oromo). | Founder finds reviewers | S |
| R-5 | **SMS**: choose the gateway (Ethio Telecom or Safaricom bulk SMS, registered sender name) or launch the pilot without SMS receipts and say so. | Founder decides | S |
| R-6 | **Field kit**: phone spec (Android 10+, GPS, 3 GB RAM), field-agent accounts, a one-page guide and short video in Amharic, and a no-signal test before the pilot. | Claude writes the guide, founder tests | S |

## Gaps to close (product work)

| ID | Gap | What we add | Size |
|---|---|---|---|
| G-1 | **Duplicate farmers.** Only "same reference in the same organisation" is blocked. The same farmer registered twice by two agents, or by a cooperative and an exporter, is not caught. | Warning on likely duplicates (similar name + same phone or kebele, or same national ID); a merge tool that keeps plots, deliveries and consents. | M |
| G-2 | **National ID.** No field for the Fayda national ID. | Optional Fayda ID field, format check, hidden from everyone but the owning team. Used for duplicate detection. | S |
| G-3 | **Overlapping plots.** Two farmers' plots covering the same land are not detected. This is a classic way unknown coffee gets mixed in. | Overlap check between plots (same organisation and, without revealing details, across organisations); a risk on the lot when it happens. | M |
| G-4 | **GPS quality.** Accuracy is shown to the agent but not stored. Under forest canopy a single reading can be 20–50 m off. | Store accuracy for each point and boundary corner; average several readings for a point; flag plots where the measured area is far from the declared area. | M |
| G-5 | **Supervisor review.** Anything a field agent syncs counts straight away. | "Waiting for review" status on new producers and plots, a review queue for supervisors (approve or send back with a reason), and per-agent counts and error rates. | M |
| G-6 | **Place names are typed freely.** "Yirgachefe", "Yirgacheffe" and "Yrgacheffe" become three places. | Region / zone / woreda / kebele picked from a list with official codes; existing records matched to it. | M |
| G-7 | **Export to ECTA.** We import from ECTMS but cannot hand data back. ECTA plans to require all geolocation data to go through its system. | Export in ECTMS's file format now; API submission once ECTA grants access; ECTA's validation status shown on each plot. | M |
| G-8 | **Volume plausibility.** A delivery bigger than its plot could produce goes unnoticed. EU buyers expect this check. | Estimated yield per hectare (by region and process); a warning when a farmer's deliveries exceed what their plots can produce; a risk on the lot. | S |
| G-9 | **No map for the agent offline.** The agent cannot see where they are or which plots are already mapped nearby. | Cache satellite tiles for the kebele before going out; show already-mapped plots so agents do not map the same land twice. | M |
| G-10 | **Farmer card.** Finding the farmer at the washing station means searching by name. | Printable farmer card with a code and QR; scanning it at intake picks the farmer and plot instantly. | S |

## Enhancements (after the pilot)

- **Farmer self-check by SMS or USSD**: the farmer sends their code and gets back their deliveries and payments. This builds trust and catches recording mistakes.
- **Household and farm details**: trees, age of trees, shade cover, other crops. Useful for yield estimates and the impact score.
- **Progress dashboard**: a map of each kebele showing farmers registered, plots mapped and plots checked, by agent and by day.
- **Correction history on screen**: who changed a plot, when and why, visible on the producer page. Changes are recorded today but not shown.
- **Bulk consent capture**: one cooperative meeting, many signatures, recorded quickly with a photo per form.

## Rollout

1. **Prepare (2–3 weeks)**: R-1 to R-6, plus G-2, G-4, G-5 and G-6, which change how data is captured and are cheaper before real data exists.
2. **Pilot (2 weeks)**: one kebele, two field agents, about 50 farmers. Measure farmers per agent per day, plots needing a re-visit, review rejections and sync failures.
3. **Fix**: what the pilot shows, plus G-1 and G-3 (duplicates and overlaps matter once there is volume).
4. **Scale**: more kebeles and cooperatives; G-7 export to ECTA; G-8, G-9 and G-10.

## Decisions for the founder

1. Pilot area and partner: which kebele and which cooperative or washing station?
2. Hosting: keep the server in Germany with a lawyer's sign-off, or move farmer data to a server in Ethiopia?
3. SMS: which gateway, or pilot without SMS?
4. National ID: collect Fayda IDs, or leave them out of the pilot?
5. Who supervises the field agents (the review step in G-5)?
