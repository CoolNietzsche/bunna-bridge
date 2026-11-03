# 11 — Market Research, Workflow Coverage & Gap Analysis

_Researched 2026-11-03. Web sources are listed at the end; company figures are their own claims unless noted. Code facts were checked against the repository at `e513b21`._

**Purpose:** before deploying, understand (1) how established companies in Ethiopian / specialty green coffee and EUDR compliance deliver their services, (2) the real-world workflow of every user type Beersheba serves, and (3) exactly what Beersheba covers today and what is missing. The plan built from this is in [12-roadmap-and-tasks.md](12-roadmap-and-tasks.md).

---

## Part A — Executive summary

1. **The deadline is real and close.** EUDR applies to coffee from **30 December 2026** for large and medium operators, **30 June 2027** for micro/small. The Commission has said no further delay is planned. Soluble coffee follows from 30 December 2027.
2. **Ethiopia is "standard risk".** EU importers cannot use simplified due diligence for Ethiopian coffee. They must collect plot geolocation, assess risk and mitigate it, and about 3% of standard-risk shipments get checked. EU buyers have already shifted volume away from Ethiopia because of traceability doubts (Dutch agricultural attaché report). **This is Beersheba's core opportunity:** make Ethiopian lots easy to buy without compliance risk.
3. **Since the 2025 amendment, the DDS is filed only by the operator who first places coffee on the EU market**, normally the EU importer, not the Ethiopian exporter. Downstream roasters only keep and pass on the DDS **reference number**. Beersheba's job is therefore to hand the importer a complete, valid **due-diligence evidence package** and to carry the reference number downstream. Today we generate a PDF *called* a DDS and let the *exporter* type a TRACES reference, which is the wrong actor. This must be reframed.
4. **Ethiopia now has a national system (ECTMS).** ECTA and GIZ handed it over on 27 March 2026. It has farm registration with geolocation, a unique Farm ID and QR system, batch-level traceability, shipment tracking and a regulator dashboard. ECTA plans to require regions to centralise geolocation data in it. Beersheba should **interoperate with ECTMS** (store and import ECTMS farm IDs, export in compatible formats), not compete with it as the national registry.
5. **The biggest structural gap is aggregation.** Ethiopian lots are blends of many smallholders (about 4 million farms, mostly under 2 ha), yet our `CoffeeLot` has **one farmer and one boundary**. EUDR needs the geolocation of *every* plot that contributed. Until a lot can hold many plots with their volumes, the platform can't produce a valid package for most real Ethiopian lots.
6. **Competitors split into four camps,** and none covers the whole chain for Ethiopia:
   - importers that do everything with their own people (Belco, Cafe Imports, Royal Coffee);
   - marketplaces that leave compliance to the seller (Algrano);
   - EUDR software sold to traders, not exporters (Koltiva, TraceX, Enveritas);
   - national infrastructure with no commercial layer (ECTMS).

   Beersheba's defensible position is **"the export operating system for Ethiopian exporters, with a compliant marketplace on top"**.
7. **Ethiopian rules got stricter in 2025–26.** Exporter capital minimums rose to Birr 15–20 million, and every exporter needs an ECTA-certified lab and a certified taster (ECTA Directive 1106/2025). Minimum export prices are set by ECTA (weekly or biweekly, by grade, process and region) and selling below them is punishable. Goods exporters still convert 50% of FX proceeds at once (the 2026 directive gave 100% retention to *service* exporters only). These shape features: lab/taster records, floor prices by region, and the NBE calculator.

---

## Part B — Regulatory ground truth (what the product must satisfy)

| Topic | Current rule (Nov 2026) | Implication for Beersheba |
|---|---|---|
| EUDR dates | Large/medium: 30 Dec 2026; micro/small: 30 Jun 2027 (Reg. (EU) 2025/2650) | Phase "EUDR-ready" must ship before the end of December |
| Who files the DDS | Only the operator first placing on the EU market (the importer). Downstream operators and traders keep the upstream reference number; everyone keeps supplier/customer records for **5 years** | Produce an **importer evidence package**; let the *importer* record the DDS reference; propagate it to roasters; keep 5-year history |
| Ethiopia risk tier | **Standard** risk (Impl. Reg. (EU) 2025/1093); Kenya/Rwanda/Burundi low; Uganda/Tanzania standard. First review due in 2026 | Full due diligence: information + **risk assessment + mitigation** evidence, not just a map |
| Geolocation format | GeoJSON in WGS-84 with ≥6 decimal places; plots ≤4 ha may be a point, **>4 ha must be a polygon** (≥4 non-aligned points, no self-intersection, one polygon per plot); about 25 MB per DDS | Validate every plot on save; enforce polygon for >4 ha; generate TRACES-ready GeoJSON for *all* plots in a lot; split large lots |
| Legality | Coffee must also comply with producing-country law (land use, labour, tax, etc.) | Legality evidence section: exporter licence, ECTA contract registration, land/tenure attestation, labour attestation |
| ECTMS | National farm ID + QR, batch tracking, shipment tracking, regulator dashboard; geolocation centralisation directive planned | Store `ectms_farm_id`; import ECTMS exports; design for API integration when available |
| ECX | Most export coffee still blended at ECX auctions, making plot traceability "nearly impossible" for those lots | Mark lots by **channel** (direct / vertically integrated / ECX); ECX lots cannot be EUDR-ready unless traced |
| ECTA exporter rules | Directive 1106/2025 (Sept 2025): capital Birr 15M private / 20M companies; ECTA-certified lab and a certified taster per exporter (one taster per exporter) | Exporter profile: lab certificate and taster credentials; the taster can be a platform Q-grader seat |
| Minimum export price | Set by ECTA with NBE, by grade, process and **region**; published weekly/biweekly; selling below is punishable; contracts are registered with ECTA before export | `FloorPrice` needs a **region** dimension and period; record the ECTA **contract registration** number per sale |
| FX | Goods exporters: 50% to a retention account, 50% converted to birr at once at a negotiated rate (FXD/01/2024, as amended) | The calculator's 50/50 rule is correct; replace the static rate with daily bank-rate input; record actual conversion |
| Personal data | **Proclamation 1321/2024** (Ethiopia): opt-in, purpose-specific consent; data minimisation; controller registration; enforced by the Ethiopian Communications Authority. Secondary sources report a **data-localisation requirement** (personal data collected in Ethiopia stored on servers in Ethiopia) | Record consent per farmer/purpose; minimise data; **get legal advice on hosting**: the planned server (91.107.204.59) is a Hetzner machine in Falkenstein, Germany (verified via IP lookup 2026-11-03), which may not satisfy localisation for farmer data |
| Quality cupping | SCA adopted the **Coffee Value Assessment (CVA)** in late 2024, replacing the 2004 form; Q-grader certification moved to CVA in 2025; CoE keeps its own form | Add a CVA cupping mode (descriptive and affective) alongside the legacy 100-point form |

---

## Part C — How the industry delivers these services

### C1. Belco (France) — vertically integrated specialty importer

- **What they are:** family-owned French importer of specialty green coffee (and cocoa), about 90 people, serving 1,000+ independent European roasters. They also sell roasting and brewing equipment (50+ brands, 1,200+ products) and run a coffee school.
- **Origin presence:** their own agencies at origin. **Belco Ethiopia covers East Africa**, alongside Colombia and El Salvador, with sourcers, agronomists, Q-graders and agroforestry researchers. There are three origin labs plus a quality hub in France, using an 8-step physical and sensory protocol with up to 5 analyses per sample, and quality sheets online 24/7.
- **How they sell:** 150–300 coffees all year (volume to microlots) through contracts, **spot**, Direct Trade and FOB purchases. Prices are updated in real time on belco.fr. Customers get an online account with order history, invoices and preferential pricing; sales are relationship-led.
- **Differentiators:** the **Impact Score** (each coffee rated on 24 sustainability criteria), sail-shipped coffee, agroforestry ranges ("Café de Forêt"), "Le Lab" Q-grader calibration app, a green-coffee comparison tool, quarterly sourcing webinars, an Ethiopian Day event, marketing kits for roasters, and **EUDR compliance support**.
- **Lesson for Beersheba:** roasters buy *confidence* (quality data, impact story, compliance) plus *convenience* (spot stock near them, small quantities, invoices, support). Belco provides it with staff on the ground. Beersheba must provide the same confidence through **software and data**, and partner for physical services (warehousing, logistics).

### C2. Algrano (Switzerland) — direct-trade marketplace

- **Model:** B2B marketplace connecting roasters (Europe, US) directly with producers, cooperatives and exporters. Sellers list lots, set their own price and negotiate directly. Algrano earns **fees only on successful trades** (commission).
- **Roaster experience:** browse lots with clear pricing and volumes, follow and talk to producers, order samples, buy **from full containers down to 5 bags**. The community's small orders are consolidated into full containers. Contracts are in local currency, and the existing direct-trade relationships of a roaster can be run through Algrano (contracts, shipping, logistics, financing). About 90% of 2024 volume was between partners with relationships of more than a year.
- **Seller experience:** a **Verified Seller** programme, reviewed by Algrano's sourcing team (the seller must be able to quote an FOB price and explain post-harvest processing); "Market access services"; **Grower Capital** pre-financing of **up to 70% of the contracted FOB value up to 6 months before shipment**, underwritten from platform data (retention, delays, claims), at about 1%/month.
- **EUDR:** planned plot-level geodata on all lots; does not assume certified coffee is compliant.
- **Lesson:** price transparency, small-lot consolidation, relationship continuity and **data-driven pre-finance** are what make a marketplace stick. Our platform-data advantage (compliance, delivery, cupping history) can underwrite finance the same way.

### C3. Specialty importers — Cafe Imports, Royal Coffee (and peers such as Trabocca, Nordic Approach)

- **Inventory states:** **spot** (in an EU/US warehouse), **afloat** (in transit), **open/forward** (contracted at origin, not yet shipped).
- **Samples:** free 300 g green samples (Cafe Imports); pre-shipment samples (PSS) approved before loading; arrival samples on landing.
- **Physical services:** warehousing (Antwerp, London/Vollers, US ports), storage priced per month, delivery arranged.
- **Credit:** **net-30 terms after 3 completed orders**; replacement if the coffee doesn't match the approved sample.
- **Origin offices:** Royal Coffee opened an **Addis Ababa office (April 2025)** with a cupping lab and Q-grader QC, logistics oversight (milling, containers, document checks) and more smallholder sourcing now that smallholders can export under their own names.
- **Lesson:** the importer is the **customer of the evidence package** and the bridge to small roasters. Beersheba should treat importers as a first-class user type (separate from "buyer"), and either partner with importers for EU stock or show "available in Antwerp" inventory.

### C4. Marketplaces, auctions and trading hubs

- **Cropster Hub → V-Hub (Vollers, 2021):** seller storefronts, add-to-cart, coffee in warehouse / in transit / at origin, sample-request links. Auctions now run as **V-Auction** (took over Cup of Excellence auctions in 2025).
- **M-Cultivo:** auction and e-commerce for producer groups, with integrated payment and lot management. Ran the ACE "Ethiopia Select" direct-to-roaster marketplace (2022, curated by the CoE national jury, exported via Bagersh). Still powers premium auctions (Best of Rwanda, Panama…).
- **Lesson:** auctions and curated "select" programmes are proven ways to sell top Ethiopian microlots at high prices. A periodic **Beersheba Select** (jury-cupped, EUDR-ready lots) is a strong marketing and revenue lever.

### C5. EUDR and traceability technology

| Provider | What it does | How delivered | Relevance |
|---|---|---|---|
| **ECTMS** (ECTA + GIZ, Vulcan ICT) | National farm registry, Farm ID + QR, batch and shipment tracking, deforestation risk, regulator dashboard | Government DPI with mobile app for geodata | **Integrate**: becomes the authoritative farm ID |
| **Koltiva / KoltiTrace** | Farmer registration, polygon mapping, inputs, post-harvest logistics; auto-generates DDS, risk assessments, producer lists | Field agents and extension officers on mobile; MIS dashboard; claims 475k producers; active in Ethiopia | Closest functional competitor on the farm side; sold to large traders |
| **Enveritas** | EUDR verification: 0.5 m imagery + AI + ground truthing; field visits for disputed cases; 2M+ checked polygons | Service with 1–2 day onboarding | Potential **verification partner** for risk mitigation evidence |
| **TraceX, osapiens, Satelligence, Sourcemap** | SaaS for DDS preparation, GeoJSON validation, risk dashboards | Subscription to importers/traders | Competitors for importers; partners or targets for API export |
| **farmer connect** | Consumer and B2B traceability (pilots, e.g. Rwanda with ITC/OLAM) | Blockchain-based platform | Low overlap |
| **AgriVeri** (Ethiopia) | EUDR compliance as a managed service (people-led) | Projects funded by NGOs and development agencies | Potential channel partner for field mapping |

**Common delivery patterns** across the leaders:
- field agents with offline mobile apps for farm mapping;
- bulk import of existing farmer lists and polygons (CSV/KML/GeoJSON/Shapefile);
- automatic GeoJSON validation before DDS;
- risk scoring from satellite layers, with a field-visit escalation;
- a producer list, risk assessment and DDS draft as the "package";
- a dashboard showing the share of volume that is compliant.

### C6. What customers expect, summarised

| Capability | Belco | Algrano | Importers | EUDR SaaS | ECTMS | **Beersheba today** |
|---|---|---|---|---|---|---|
| Curated lot catalogue with real-time prices | ✓ | ✓ | ✓ (offer sheets) | — | — | ✓ |
| Samples (green, PSS, arrival) | ✓ | ✓ | ✓ | — | — | Partial (samples only; no PSS/arrival) |
| Small quantities / EU stock | ✓ | ✓ (5 bags, consolidation) | ✓ (spot) | — | — | ✗ |
| Contracts and terms (spot/forward, incoterm, payment) | ✓ | ✓ | ✓ | — | — | ✗ (offers only) |
| Logistics and warehousing | ✓ | ✓ | ✓ | — | Shipment tracking | ✗ |
| Financing (pre-finance / credit terms) | — | ✓ (Grower Capital) | ✓ (net 30) | — | — | ✗ |
| Quality lab data and protocol | ✓ (8 steps) | Partial | ✓ | — | — | Partial (cupping only) |
| Impact / sustainability score | ✓ (24 criteria) | Partial | Partial | — | — | ✗ (certs only) |
| Farm mapping at scale (field agents, offline) | Staff | — | Staff | ✓ | ✓ | ✗ (one farmer draws own polygon) |
| Multi-plot lot traceability | ✓ | Planned | Varies | ✓ | ✓ | ✗ |
| EUDR evidence package for importer | ✓ (support) | Planned | ✓ | ✓ | Partial | Partial (single-plot PDF + GeoJSON) |
| Export documentation (ECTA, NBE, phyto, ICO, B/L) | Origin team | — | Origin office | — | Partial | Partial (uploads only) |
| Education and community | ✓ (school, webinars) | ✓ (blog) | ✓ | — | — | ✗ |

---

## Part D — User types: real workflows vs. Beersheba coverage

Legend: **Covered** = works end to end today · **Partial** = exists but incomplete · **Missing** = not built.

### D1. Exporter (licensed Ethiopian exporter; includes unions and vertically integrated farms)

| Real-world step | Beersheba today | Status |
|---|---|---|
| Register company; ECTA licence; capital and lab/taster compliance (Dir. 1106/2025) | Licence upload + staff verification gate | Partial (no lab/taster records, no capital attestation) |
| Build supplier base: farmers, washing stations, collectors | Washing stations; farmer picker of self-registered farmers | Partial (no bulk import, no roster, no collectors) |
| Map farms or import ECTMS data | Draw one polygon per lot / inherit from one farmer | Partial |
| **Assemble a lot from many farms** (cherry intake → parchment → green) | One `farmer` + one `boundary` per lot | **Missing** |
| Process and mill; yields and moisture | — | Missing |
| Grade at ECTA inspection centre; internal lab cupping | Q-grader cupping (SCA 2004 form) | Partial (no physical analysis, no ECTA grade record, no CVA) |
| Price above ECTA minimum (grade/process/region, current period) | Floor price by grade/process | Partial (no region) |
| Market the lot (offer list, photos, story, spec sheet) | Listing, photos, story page with QR, spec-sheet PDF | Covered |
| Samples to buyers (offer samples, PSS) | Sample requests with tracking | Partial (no PSS approval step) |
| Negotiate and accept offer | Offers, counter, atomic accept | Covered |
| **Sales contract** (incoterm FOB Djibouti, shipment period, payment CAD/LC, ECF/GCA terms) | — | **Missing** |
| **Register contract with ECTA**; NBE export permit via bank | — | Missing |
| Export documents: ECTA quality cert, phyto (MoA), certificate of origin, ICO marks, customs (eSW) | Upload slots for phyto, ECEX, NBE, customs | Partial |
| Logistics: trucking to Djibouti, container booking, B/L, vessel ETA | — | Missing |
| Payment collection; 50% FX conversion | Settlement calculator | Partial (no actual payment/FX record) |
| **EUDR evidence package to the importer** | 7 gates, single-plot DDS PDF, GeoJSON, audit log | Partial (single plot; no risk assessment; wrong DDS actor) |
| Team access (sales, QC, logistics staff) | One login per company | Missing |

### D2. Farmer / producer (smallholder or estate)

| Real-world step | Beersheba today | Status |
|---|---|---|
| Registration (often done *for* them by a cooperative or field agent; low literacy; Amharic/Afaan Oromo) | Self-registration in English; Farm ID auto-generated | Partial |
| Consent to data sharing | — | Missing (opt-in consent required by Proclamation 1321/2024 and needed for EUDR data flows to EU buyers) |
| Map one or more plots | One boundary per farmer | Partial (no multiple plots, no offline) |
| Sell cherry to washing station; see weight, price, second payment | — | Missing |
| See where their coffee went and the price it fetched | Linked lots, dashboard, photos | Partial |
| Receive premiums / payments | — | Missing |
| Phone access (feature phones, SMS) | Web only | Missing |

### D3. Buyer — importer / trader (EU "operator")

| Real-world step | Beersheba today | Status |
|---|---|---|
| Discover lots (filters, compliance, cert badges) | Marketplace with filters | Covered |
| Request and evaluate samples (green, PSS, arrival) | Sample request lifecycle | Partial |
| Offer / counter / contract | Offers; no contract | Partial |
| **Due diligence:** collect geolocation of all plots, producer list, legality evidence; **risk assessment & mitigation** (standard-risk origin) | Single-plot GeoJSON, DDS PDF after accepted offer | Partial |
| **File DDS in TRACES; get reference number; pass it downstream** | Exporter-entered reference field (wrong actor) | **Missing** |
| Shipment tracking, documents (B/L, invoice, certificates) | — | Missing |
| Arrival QC, claims | — | Missing |
| Team accounts; 5-year records | — | Missing |
| Distinct role from roasters (stock, resale, small-lot allocation) | Single "buyer" role | Missing |

### D4. Roaster

| Real-world step | Beersheba today | Status |
|---|---|---|
| Source green (often small quantities from EU stock) | Marketplace (FOB origin lots only) | Partial |
| Samples, offers, purchase | Samples, offers | Covered |
| Keep upstream DDS reference + supplier records (downstream operator) | — | Missing |
| Roast ops: equipment, batches, blends, QC | Roasting module | Covered |
| Tell the story at retail (QR on bags) | Public story page with QR | Covered |
| Roast-profile tools (Cropster/Artisan import) | — | Missing |
| Watchlist / alerts for new lots | Browser-only watchlist | Partial |

### D5. Q-grader / quality

| Real-world step | Beersheba today | Status |
|---|---|---|
| Cup and score | SCA 2004 10-attribute form, confirm-and-lock | Partial |
| **CVA** descriptive + affective forms | — | Missing |
| Blind cupping sessions (sample codes, multiple lots, calibration) | — | Missing |
| Physical analysis: moisture, water activity, density, screen size, defect count (ECTA grading inputs) | — | Missing |
| PSS / arrival comparison | — | Missing |

### D6. Platform admin (Beersheba staff)

| Need | Beersheba today | Status |
|---|---|---|
| Verify exporters' licences | License Reviews page + Django action | Covered |
| Maintain floor prices | Django admin `FloorPrice` | Partial (no region; no bulk import of ECTA tables) |
| Users, disputes, moderation | Django admin | Partial |
| Operational analytics (compliant volume, GMV, funnels) | Dashboards per role only | Missing |
| Email/SMS delivery | Console backend (not sent) | Missing |
| Backups, monitoring | — | Missing |

### D7. User types that don't exist yet but the workflow needs

| New role | Why it's needed | Priority |
|---|---|---|
| **Cooperative / union manager** | Most smallholder coffee flows through cooperatives; they register members, aggregate cherry, sell to unions and exporters | High |
| **Field agent / enumerator** | Maps farms offline, registers farmers on their behalf, records consent | High (EUDR) |
| **Washing station operator** | Records cherry intake per farmer (the link from plots to lots) | High (EUDR) |
| **Importer** (split from buyer) | Files DDS, holds stock, sells on to roasters | High |
| Logistics / freight forwarder | Updates shipment milestones and documents | Medium |
| Financier / bank | Pre-finance and trade finance from platform data | Later |
| Verifier / auditor | Third-party risk-mitigation evidence (e.g. Enveritas-style) | Later |
| Regulator view (ECTA) | Read-only compliance dashboard; data exchange with ECTMS | Later (partnership) |

---

## Part E — Strategic conclusions

1. **Reframe the core promise** from "we generate your DDS" to **"we make every Ethiopian lot due-diligence-ready for the EU importer, with evidence they can file in minutes"**. This is legally accurate and maps to what importers pay for.
2. **Build the aggregation backbone first:** Plot → Cherry delivery → Lot, with volumes. Everything else (EUDR packages, farmer payments, impact data, ECTMS sync) depends on it.
3. **Lead with the exporter as the paying customer** (a SaaS subscription for compliance and export operations). Grow the marketplace on top (commission, 2.5% already modelled). Add finance later, underwritten by platform data, like Algrano.
4. **Partner rather than build** for physical services: EU warehousing and consolidation (importers, Vollers), satellite verification (Enveritas, or Hansen + JRC in-house), field mapping capacity (AgriVeri, cooperatives).
5. **Win trust with transparency** the way Belco does with its Impact Score: a public, explainable **Beersheba Trust Profile** per lot (compliance gates, audit chain, cup data, impact metrics, price transparency to the farmer).
6. **Localise for origin users:** Amharic and Afaan Oromo, offline mobile, SMS. Without this, farmer and cooperative onboarding won't scale.
7. **Settle data residency before onboarding farmers at scale.** If Proclamation 1321/2024's localisation rule applies, farmer personal data may need to live on an Ethiopian server (e.g. an Ethio Telecom or local data-centre VPS), with only the data needed for EUDR (plot geometry, producer name, country) shared with EU buyers under recorded consent.

---

## Sources

- EU Access2Markets — [Delay until December 2026 and other developments in the implementation of the EUDR](https://trade.ec.europa.eu/access-to-markets/en/news/delay-until-december-2026-and-other-developments-implementation-eudr-regulation)
- EY Tax News — [EUDR application postponed to 30 December 2026](https://taxnews.ey.com/news/2026-0237-eu-deforestation-regulation-application-postponed-to-30-december-2026)
- European Coffee Federation — [EUDR page](https://www.ecf-coffee.org/european-union-deforestation-regulation-eudr/)
- Coolset — [EUDR: what businesses need to do now (Sept 2026)](https://www.coolset.com/academy/the-eu-deforestation-regulation-eudr-what-businesses-need-to-know-and-do)
- EUR-Lex — [Implementing Regulation (EU) 2025/1093 (country benchmarking)](https://eur-lex.europa.eu/eli/reg_impl/2025/1093/oj)
- ExportReady Africa — [EUDR country risk classification explained](https://exportready.africa/eudr-compliance/eudr-country-risk-classification-explained/); Team Prometheus — [EUDR for coffee: origin risk tiers](https://teamprometheus.net/eudr/coffee); EUDR Guide — [Country list](https://eudrguide.com/countries/)
- EFI — [Geolocation factsheet 2026](https://efi.int/sites/default/files/files/flegtredd/Sustainable-cocoa-programme/Factsheets/Geolocation_FactSheet-2026.pdf); TraceX — [EUDR geolocation requirements](https://tracextech.com/eudr-geolocation-requirements/); EU — [TRACES GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
- StoneX — [EUDR enters a new phase](https://www.stonex.com/en/insights/eudr-enters-a-new-phase-as-coffee-industry-shifts-from-preparation-to-execution/)
- Ecofin Agency — [Ethiopia completes coffee traceability system](https://www.ecofinagency.com/news-agriculture/3003-54240-ethiopia-completes-coffee-traceability-system-as-eu-deforestation-deadline-nears); EthioCoffee — [ECTMS handover](https://www.ethiocoffee.co/ethiopia-coffee-export-news/ectms-handover-ecta-giz-traceability); Agile DPI Summit — [Building Ethiopia's National Coffee Traceability System (ECTA, Vulcan ICT)](https://agiledpisummit.thecosa.org/wp-content/uploads/2026/01/Agile-Data-DPI-SUMMIT-DPI-Group-4-From-Policy-to-Practice-Building-Ethiopias-National-Coffee-Traceability-System.pdf); InfoPlate — [Ethiopia coffee exports and the EUDR test](https://infoplatemedia.com/briefs/coffee-eudr-test-oct-2026/)
- Agroberichten Buitenland — [Ethiopia's coffee crisis: navigating EU regulations](https://www.agroberichtenbuitenland.nl/actueel/nieuws/2024/08/20/as11-ethiopias-coffee-crisis-navigating-eu-regulations-amid-sustainability-challenges)
- Food Business MEA — [Ethiopia tightens coffee export rules (Dir. 1106/2025)](https://www.foodbusinessmea.com/ethiopia-tightens-coffee-export-rules-with-higher-capital-thresholds-stricter-quality-standards/); The Reporter — [New coffee directive sets strict minimum price](https://www.thereporterethiopia.com/article/new-coffee-directive-sets-strict-minimum-price); Algrano — [Ethiopia harvest 2024 (ECTA minimum registration prices)](https://algrano.com/learn/ethiopia-coffee-harvest-2024)
- National Bank of Ethiopia — [FX FAQ](https://nbe.gov.et/fx/); Capital Ethiopia — [NBE forex liberalisation (Feb 2026)](https://capitalethiopia.com/2026/02/11/nbe-rolls-out-major-forex-liberalization-100-retention-for-service-exporters-higher-bureau-limits/); Legal500 — [Ethiopia's forex liberalisation continues](https://www.legal500.com/intelligence/ethiopia/finance-and-banking/ethiopia's-forex-liberalization-continues-highlights-of-the-new-amendment-directive)
- Belco — [belco.fr](https://www.belco.fr); Flatchr — [Belco business developer posting](https://careers.flatchr.io/vacancy/gv4a8d0bgm29kxjr-business-developer-cafes-de-specialite); TOWT — [Belco: we make another coffee possible](https://oldsite01.towt.eu/belco-we-make-another-coffee-possible/?lang=en); Standart — [Where sourcing meets the art of coffee](https://standartmag.com/blogs/news/where-sourcing-meets-the-art-of-coffee-and-innovation)
- Algrano — [algrano.com](https://algrano.com); [How it works](https://algrano.com/es/how-it-works); [Verified seller program](https://algrano.com/verified-seller-program); [Grower capital](https://algrano.com/grower-capital); [EUDR post](https://algrano.com/post/eu-deforestation-free-products-regulation); Daily Coffee News — [Algrano US launch](https://dailycoffeenews.com/2023/04/10/direct-trade-green-coffee-platform-algrano-makes-us-launch); Comunicaffe — [Algrano interview, Dec 2025](https://www.comunicaffe.com/?p=200699)
- Cafe Imports — [FAQ (Europe)](https://www.cafeimports.com/europe/blog/?p=53804); [Working with us](https://www.cafeimports.com/working-with-us)
- PRWeb — [Royal Coffee opens Addis Ababa office](https://www.prweb.com/releases/royal-coffee-opens-new-sourcing--logistics-office-in-addis-ababa-ethiopia-302435696.html)
- Vollers — [Cropster Hub acquisition](https://www.vollers.com/news/details/green-coffee-marketplace-with-a-future-logistics-company-vollers-group-purchases-green-coffee-marketplace-cropster-hub); Daily Coffee News — [ACE & M-Cultivo Ethiopia Select](https://dailycoffeenews.com/2022/08/08/ace-and-m-cultivo-launch-ethiopia-select-direct-to-roaster-marketplace); [CoE moves to V-Auction](https://dailycoffeenews.com/2025/03/26/__trashed-3)
- Enveritas — [EUDR](https://enveritas.org/for-business/eudr/); Koltiva — [Coffee traceability in Africa](https://www.koltiva.com/post/brewing-africa-s-future-how-koltiva-powers-coffee-traceability-and-participates-at-theafrica-coffee); Vietnam News — [farmer connect pilots](https://vietnamnews.vn/economy/1785357/coffee-exporters-enhance-traceability-ahead-of-eu-rules.html)
- Daily Coffee News — [SCA adopts CVA](https://dailycoffeenews.com/2024/11/05/sca-officially-adopts-new-cupping-forms-and-standards/); Perfect Daily Grind — [CVA Q-grader programme](https://perfectdailygrind.com/2025/05/cva-q-grader-programme-coffee-industry/)
- Ethiopia Proclamation 1321/2024 (personal data) — [English text](https://www.metaappz.com/References/ethiopian_laws/federal/pr_1321_2024/en/txt); Mondaq — [Business compliance guide](https://www.mondaq.com/privacy-protection/1766200/ethiopian-personal-data-protection-law-proclamation-13212024-business-compliance-guide); Digital Policy Alert — [Data localisation requirements](https://digitalpolicyalert.org/event/24922-implemented-personal-data-protection-proclamation-proclamation-no-13212024-including-data-localisation-requirements)
- Addis Fortune — [Authority relaxes coffee export restrictions](https://addisfortune.news/authority-relaxes-coffee-export-restrictions); Sustainable Harvest — [A new era for Ethiopian coffee](https://www.sustainableharvest.com/blog/a-new-era-for-ethiopian-coffee)
