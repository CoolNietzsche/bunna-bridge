# 12 — Roadmap and Task Plan (from market research, 2026-11-03)

Built from [11-market-research-and-gap-analysis.md](11-market-research-and-gap-analysis.md). It supersedes Phases 3–5 of [09-task-plan.md](09-task-plan.md); 09's Phase 0 operational items (backups, VPS checks) still apply and are repeated in Phase 0 here.

**North star:** _every Ethiopian lot on Beersheba is due-diligence-ready for its EU importer, provably, and easy to buy._

**Hard date:** EUDR applies to coffee placed on the EU market by large and medium operators from **30 December 2026** (about 8 weeks away). Phase 1 is scoped to fit before then; everything else follows.

Sizes: **S** ≤ 1 day · **M** 2–4 days · **L** 1–2 weeks · **XL** > 2 weeks (one developer). Every backend task ships with tests; every UI task passes `npm run build` and the e2e smoke script.

---

## Decisions needed from the founder first

| # | Decision | Why it matters | Recommendation |
|---|---|---|---|
| D1 | **Hosting / data residency**: is a German server acceptable for Ethiopian farmer personal data under Proclamation 1321/2024? | Secondary sources report a localisation duty; the planned VPS is Hetzner, Falkenstein (DE) | Get a short legal opinion now. Meanwhile deploy, but keep farmer **personal** data minimal (names, phones) until confirmed; plan an Ethiopian-hosted option |
| D2 | Who pays? | Shapes onboarding and pricing work | Exporter subscription (compliance and export OS) + 2.5% marketplace commission; importers free at first |
| D3 | Do we integrate with ECTMS or run our own farm registry? | ECTMS is becoming the national source of truth | Integrate: store ECTMS farm IDs now; approach ECTA ICT (Hawi Atomsa Daba) about data exchange |
| D4 | Physical services (EU stock, consolidation, logistics) | Roasters want small quantities from EU stock | Partner with one importer or warehouse (Antwerp/Hamburg) rather than build |
| D5 | Satellite verification depth | Hansen loss alone is weaker than leaders' 0.5 m + ground truth | Add the JRC 2020 forest baseline now; evaluate an Enveritas-type partner for disputed plots |
| D6 | Launch markets / first customers | Focus | 3–5 design-partner exporters + 2 EU importers before broad marketing |

---

## Phase 0 — Safe go-live (this week)

| ID | Task | Size | Acceptance |
|---|---|---|---|
| P0-1 | Deploy to 91.107.204.59 with an isolated Docker stack (own project name, ports bound to 127.0.0.1, no public Flower), host nginx site file only, TLS; nothing of Odoo/other apps touched | M | Site live; `ss -tlnp` shows no new public ports except via nginx; other services unchanged |
| P0-2 | Lock the six accounts whose passwords were in old builds (SEC-15) | S | Lock script output reviewed |
| P0-3 | Nightly Postgres + media backups, copied off-server; one test restore | S | Restore test documented |
| P0-4 | Enter current ECTA floor prices; verify exporter licences | S | No lot fails gate 7 for lack of a floor |
| P0-5 | Real email delivery (Mailgun/SES/Brevo) + Sentry | S | Password reset email arrives; test error shows in Sentry |
| P0-6 | Legal opinion on D1 (data residency, consent) | — (founder) | Written answer |

---

## Phase 1 — EUDR-ready lots (Nov–Dec 2026, before 30 Dec)

> **Status 2026-11-04: built.** E-1 to E-10 and E-13 are done (backend, UI and tests). E-11 is built in code, but the JRC 2020 forest data still has to be loaded on the server. E-12 is partly done: the GeoJSON property names still need checking against the official EU guidance. Details are in [/DONE.md](../../DONE.md).

The aggregation backbone and the importer evidence package. This is the product-defining phase.

| ID | Task | User(s) | Size | Depends | Acceptance |
|---|---|---|---|---|---|
| E-1 | **Producer and Plot models.** `Producer` (can exist without a login: managed by an exporter/cooperative/agent), `Plot` (geometry point/polygon, area from geodesy, `ectms_farm_id`, land-use notes). A user-farmer may own several plots. Migrate existing `User.boundary` into a Plot | Exporter, farmer, coop | L | — | Migration keeps all existing boundaries; one producer can hold N plots |
| E-2 | **Plot validation to TRACES rules**: WGS-84, ≥6 decimals stored, polygon required when area > 4 ha, ≥4 non-aligned points, no self-intersection, inside Ethiopia | Exporter | M | E-1 | Invalid plots rejected with a plain-language reason; tests per rule |
| E-3 | **Lot composition (`LotSource`)**: a lot draws from many plots/producers with kg (and optional washing-station delivery IDs); gates computed across *all* sources (GPS = every plot located; deforestation = every plot clear; DDS-package invalidated when sources change) | Exporter | L | E-1 | A 40-farmer lot computes gates correctly; one overlapping plot fails the lot and names the plot |
| E-4 | **Bulk import**: CSV producers; GeoJSON/KML/Shapefile plots; ECTMS export format (when obtained). Preview, row-level errors, dry run | Exporter, coop | L | E-1, E-2 | 1,000-plot file imports with an error report; nothing saved on dry run |
| E-5 | **Lot channel** field (direct / vertically integrated / union / ECX) and rule: ECX-sourced lots can't be "EUDR-ready" unless every source is traced | Exporter, importer | S | E-3 | Badge and gate reflect channel |
| E-6 | **Due-diligence evidence package** (replaces the "DDS PDF" concept): ZIP containing TRACES GeoJSON of all plots (auto-split under 25 MB), producer list CSV, risk-assessment report (country = standard risk; per-plot deforestation result + dataset/date; legality evidence list; mitigation log), supporting documents, compliance-chain hash. UI wording: "EUDR evidence package for your importer" | Exporter → importer | L | E-3, E-7 | Package for a 40-plot lot validates against TRACES GeoJSON rules; hash matches audit chain |
| E-7 | **Risk assessment & mitigation workflow**: per-lot risk register (missing polygons, overlap flags, ECX channel, missing legality docs, plots near forest edge); mitigation actions (field visit with photos/GPS, satellite re-check, third-party verification upload) and exporter sign-off | Exporter, admin | M | E-3 | Standard-risk lots cannot be marked ready with open high risks |
| E-8 | **Importer role + DDS reference flow**: new `importer` role (split from buyer); after contract, importer downloads the package, files in TRACES, then records the **DDS reference + verification number** on the lot/contract; roasters buying downstream see and store that reference | Importer, roaster | M | E-6 | Reference recorded by importer only; visible to downstream buyers; removed from exporter edit form |
| E-9 | **5-year record retention**: no hard deletes of lots, sources, contracts or compliance events; soft-delete + export of a counterparty record set | All | S | E-3 | Delete endpoints archive; retention documented |
| E-10 | **Producer consent records**: purpose-specific opt-in (EUDR sharing with named buyers, marketing story), who captured it, when, method (signature photo / SMS / in app) | Farmer, agent | M | E-1 | Package excludes producers without EUDR consent and says so |
| E-11 | **Forest baseline**: add JRC Global Forest Cover 2020 layer alongside Hansen loss; script the Hansen/JRC preprocessing into the repo | Platform | M | — | Re-check records which datasets were used |
| E-12 | **Verify GeoJSON property names** (`ProducerName`, `ProducerCountry`, `ProductionPlace`, `Area`) against the official TRACES documentation (was unreachable during research) | Platform | S | — | Test fixture matches the official example |
| E-13 | **Lot Trust Profile** (public): gates, audit-chain status, plots count, cup data, certifications, channel; replaces scattered badges | Buyer, roaster | M | E-3 | One shareable page; no personal data of farmers exposed |

**Phase 1 exit criteria:** a design-partner exporter can import their farmer list, assemble a multi-farm lot, produce an evidence package an EU importer accepts into TRACES, and the importer can record the DDS reference.

---

## Phase 2 — Origin onboarding at scale (Jan–Mar 2027)

> **Status 2026-11-04: built early, before deployment.** O-1 to O-7 are done (backend, UI and tests). Three parts still need outside input before go-live:
> - **O-5:** native speakers must review the Amharic and Afaan Oromo text.
> - **O-6:** real SMS sending needs a contract with an SMS gateway; until then messages are only logged.
> - **O-8:** ECTMS works through file import today; live lookup needs API access from ECTA.
>
> Details are in [/DONE.md](../../DONE.md).

| ID | Task | Size | Notes |
|---|---|---|---|
| O-1 | **Organisations and team accounts**: company → members with roles (owner, sales, QC, logistics, field agent); all lots/contracts owned by the organisation | L | Required by exporters, importers, cooperatives |
| O-2 | **Cooperative / union role**: member registry, cherry intake, sales to exporters | M | Uses E-1/E-3 |
| O-3 | **Washing-station intake**: cherry deliveries per producer (kg, price paid, date, receipt number), linking plots → lots | M | Enables farmer payment transparency |
| O-4 | **Field-agent offline PWA**: register producer, record consent, walk/pin plot polygon offline (IndexedDB queue, background sync), photo evidence | XL | Builds on existing `useBoundarySync` |
| O-5 | **Amharic and Afaan Oromo** (react-i18next; farmer/agent screens first) | L | Localised number/date formats |
| O-6 | **SMS notifications** (local gateway) for farmers and agents: delivery receipts, payments, consent confirmation | M | Feature-phone friendly |
| O-7 | **Exporter compliance profile** for ECTA Dir. 1106/2025: certified lab certificate, taster credentials (one taster per exporter), capital attestation; expiry alerts | S | Feeds gate 5 context |
| O-8 | **ECTMS integration**: farm-ID lookup/import, push lot-source data if ECTA opens an API | M–L | Depends on D3 talks |

---

## Phase 3 — Trade execution (Jan–Mar 2027)

| ID | Task | Size | Notes |
|---|---|---|---|
| T-1 | **Contract model** from accepted offers: incoterm (FOB Djibouti default), price, quantity, shipment period, payment terms (CAD/LC/advance), ECF/GCA terms reference; PDF contract | L | Replaces "offer accepted = deal" |
| T-2 | **ECTA contract registration** record + minimum-price check by **grade, process, region and period** (add region to `FloorPrice`; CSV import of ECTA tables) | M | Blocks registration below the floor |
| T-3 | **Pre-shipment sample (PSS) approval** step on contracts; arrival sample and claim flow | M | Mirrors importer practice |
| T-4 | **Shipment**: container/booking, trucking to Djibouti, vessel, B/L, ETD/ETA milestones; forwarder role can update | L | Notifications to buyer |
| T-5 | **Export document checklist per shipment**: ECTA quality certificate, phyto (MoA), certificate of origin, ICO marks, commercial invoice, packing list, customs declaration, B/L, with owner, status and expiry | M | Generalises current upload slots |
| T-6 | **Payment & FX record**: amounts received, bank, date, 50% conversion at actual rate; settlement calculator uses it | M | NBE reporting aid |
| T-7 | **Messaging** between buyer and exporter per lot/contract (replaces email back-and-forth) | M | Notifications + email |

---

## Phase 4 — Quality data (Feb–Apr 2027)

| ID | Task | Size | Notes |
|---|---|---|---|
| Q-1 | **CVA cupping mode** (descriptive + affective; 100-point conversion shown) alongside the legacy 2004 form | L | Q-graders moved to CVA in 2025 |
| Q-2 | **Physical analysis**: moisture, water activity, density, screen size distribution, primary/secondary defects, ECTA grade | M | Exporter lab per Dir. 1106/2025 |
| Q-3 | **Cupping sessions**: blind sample codes, multiple lots per session, calibration between graders | M | Like Belco's "Le Lab" |
| Q-4 | PSS vs arrival comparison report; claims history feeds exporter reliability | S | Uses T-3 |

---

## Phase 5 — Marketplace growth (Mar–Jun 2027)

| ID | Task | Size | Notes |
|---|---|---|---|
| M-1 | **Beersheba Select**: periodic curated programme of jury-cupped, EUDR-ready lots; optional timed auction | L | Proven by ACE/M-Cultivo Ethiopia Select |
| M-2 | **Forward / pre-harvest offers** (open / afloat / spot states, like importers' inventory) | M | |
| M-3 | **Importer partner stock**: show lots available in EU warehouse (Antwerp/Hamburg), small-bag orders, consolidation | L | Depends on D4 |
| M-4 | Saved searches, alerts, server-side watchlist | S | |
| M-5 | **Impact & transparency score** (Belco-style, explainable criteria: price share to farmer, gender, agroforestry, certifications, compliance) | M | Uses O-3 data |
| M-6 | **Exporter reliability score** (on-time shipment, PSS-to-arrival consistency, claims, response time) | M | Uses T/Q data |
| M-7 | Education hub (origin reports, harvest updates, webinars) | S | Content, not code-heavy |

---

## Phase 6 — Finance, business and ecosystem (H2 2027)

| ID | Task | Size | Notes |
|---|---|---|---|
| F-1 | **Pre-finance partnership**: share platform data (history, contracts, claims) with a lender to advance up to ~70% of contracted FOB pre-shipment (Algrano's Grower Capital model) | L | Partner-led, data-driven |
| F-2 | **Billing**: exporter subscriptions, marketplace commission invoicing | M | D2 |
| F-3 | Analytics: compliant volume, GMV, funnel, time-to-ready per lot | M | Admin + investor reporting |
| F-4 | Public API + webhooks (importer EUDR systems, Cropster) | L | |
| F-5 | Regulator read-only dashboard (ECTA) if partnership agreed | M | D3 |

---

## Sequencing at a glance

```
Nov 2026  P0 go-live ─┬─ E-1 Producer/Plot ─ E-2 validation ─ E-3 LotSource ─┬─ E-6 evidence package ─ E-8 importer ref
                      │                       E-4 bulk import ────────────────┤   E-7 risk/mitigation
                      └─ E-10 consent · E-11 JRC baseline · E-12 GeoJSON check┘   E-13 trust profile
30 Dec 2026  ▶ EUDR applies (large/medium)
Q1 2027   O-1 orgs · O-3 intake · O-4 field PWA · O-5 Amharic/Oromo  ║  T-1 contracts · T-2 ECTA reg · T-4 shipments
Q2 2027   Q-1 CVA · Q-2 physical  ║  M-1 Select · M-3 EU stock · M-5 impact score
30 Jun 2027  ▶ EUDR applies (micro/small)
H2 2027   F-1 pre-finance · F-2 billing · F-4 API · O-8/F-5 ECTMS & ECTA
```

## KPIs to track from Phase 1

| KPI | Definition | Target by 30 Jun 2027 |
|---|---|---|
| EUDR-ready volume | kg of listed lots with a complete evidence package / all listed kg | ≥ 80% |
| Mapped plots | Plots with valid geometry (and ECTMS ID where available) | 5,000+ across design partners |
| Time to ready | Median days from lot creation to evidence package | ≤ 7 days |
| Importer acceptance | Packages filed in TRACES without rework | ≥ 95% |
| Marketplace | Contracted kg through Beersheba | First 10 containers |
| Farmer transparency | Lots with producer price/premium recorded | ≥ 50% |

## Risks

- **Deadline risk:** Phase 1 is about 6 weeks of work for one developer. Mitigation: E-1/E-2/E-3/E-6 first; E-11, E-13 can slip into January without blocking filings.
- **Data residency (D1):** could force an Ethiopian-hosted deployment. Mitigation: legal answer this month; keep architecture host-agnostic (Docker).
- **ECTMS overlap:** if ECTA mandates its own app for mapping, our mapping becomes import-only. Mitigation: focus on aggregation, evidence packages and trade (where ECTMS doesn't go).
- **ECX blending:** lots bought at ECX can't be traced to plots. Mitigation: channel labelling (E-5); target direct/vertically integrated exporters first.
- **Accuracy of satellite checks:** Hansen loss at 30 m can miss or over-flag. Mitigation: JRC baseline (E-11), mitigation workflow (E-7), partner verification for disputes.
