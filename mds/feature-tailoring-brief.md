
---

# Bunna Bridge: Feature Tailoring Brief
### Designed around the Ethiopian Licensed Exporter · EUDR-first · Early MVP context

---

## 1. COMPLIANCE REPORTING TOOLS
*Highest priority — design this one to be definitively better than anything AgriVeri offers.*

**The AgriVeri version:** Human-assisted document preparation. Someone at AgriVeri assembles land titles, production dates, and supply chain maps into a compliance package. Slow, expensive, unscalable.

**The Bunna Bridge version: Auto-generated, gate-keyed compliance packets.**

Every time an exporter finalizes a lot in Bunna Bridge, the system should auto-assemble a compliance packet containing:

- **EUDR Due Diligence Statement** — pre-filled from lot data: farm GPS polygons, operator name, country of origin (Ethiopia), commodity (coffee / HS code 0901), quantity, and a deforestation-free attestation linked to the satellite baseline check
- **Ethiopian Export Gate Summary** — a single-page status view across all 7 gates (ECX license status, ECEX permit, phytosanitary, NBE settlement calculation, customs declaration readiness, quality certificate, EUDR status). Green/amber/red per gate. Exporters currently have to track these across 4–6 different government offices — Bunna Bridge consolidates it into one view
- **SCA Quality Certificate** — pulled from the write-once cupping ledger, Q-grader signed, lot number stamped
- **Lot Birth Certificate PDF** — the shareable document roasters actually want: origin, process, GPS cluster, cup score, certifications, EUDR status, farmer cooperative, harvest date

**What to build for MVP specifically:**

Don't try to automate all document generation on day one. Instead, build a **compliance checklist dashboard** for the exporter where each of the 7 gates has: current status, what's missing, and a document upload slot. The system calculates an "Export Readiness Score" (0–100%) in real time. When all gates hit green, the compliance packet auto-generates. This gives exporters immediate value even before full automation is complete.

**Critical UX detail:** Show the exporter *exactly* which document is blocking which gate. The current experience for Ethiopian exporters is opaque — they don't know they're missing a phytosanitary certificate until they're at the port. Bunna Bridge surfaces this 3 weeks earlier.

---

## 2. BLOCKCHAIN FOR TAMPER-PROOF SUPPLY CHAIN RECORDS

**The AgriVeri version:** Generic blockchain claim. No chain specified, no implementation shown, used primarily as a marketing phrase.

**The Bunna Bridge version: Write-once ledger for two specific, high-value record types.**

Don't build a general-purpose blockchain. That's over-engineered for MVP and under-valuable to your exporter. Instead, use blockchain selectively for the two records where immutability is a genuine commercial requirement:

**Record Type 1 — The SCA Cup Score Entry**
When a Q-grader submits a cupping score for a lot, that entry is written to the ledger and cannot be modified. The lot number, score, Q-grader license number, date, and cupping location are all hashed. This is your write-once quality ledger. Roasters paying a premium for an 88-point Guji lot need to know that score wasn't edited after the fact.

**Record Type 2 — The EUDR Deforestation-Free Attestation**
When a farm polygon passes the satellite baseline check (confirmed forest-free as of December 2020), that result is written to the ledger linked to the farm ID. This is the tamper-proof compliance anchor that EU buyers and auditors can verify independently.

**Everything else** (lot assembly, logistics updates, document uploads) can live in a standard database. Reserve blockchain for what genuinely requires it.

**For MVP specifically:** You don't even need a public blockchain yet. Use a **private append-only ledger** (PostgreSQL with immutable audit logging, or a simple Hyperledger Fabric instance) to simulate the trust properties. Market it as "cryptographically signed, write-once records." Migrate to a public chain later when roasters start asking for independent verification — which they will, but probably not in month 1.

---

## 3. GEOSPATIAL MONITORING & SATELLITE MAPPING
*(Planet Labs / Copernicus)*

**The AgriVeri version:** Their German tech team does this as a managed service. They physically map farms using satellite imagery + ground truth. Expensive, slow, requires field teams.

**The Bunna Bridge version: Don't build satellite infrastructure. Build the integration layer and the data product on top of free/cheap sources.**

Your exporter doesn't need you to fly satellites. They need a farm polygon attached to each lot that passes the EUDR deforestation baseline check. Here's how to deliver that without building AgriVeri's stack:

**Step 1 — Use Google Earth Engine (free tier) + Copernicus Global Land Cover**
The EUDR cutoff date is December 31, 2020. The Hansen Global Forest Change dataset and Copernicus land cover data are free and already establish the baseline. For each farm polygon uploaded by an exporter or cooperative, run an automated check: does this polygon overlap with forest that was cleared after 2020? Return a pass/fail with a confidence score.

**Step 2 — Farm polygon input via two pathways:**
- **Upload pathway:** Exporter or cooperative uploads a KML/GeoJSON file from a field survey (ODK Collect, KoboToolbox, or similar mobile tools their field agents already use)
- **Draw pathway:** A simple web map (Mapbox or Leaflet.js) lets an exporter draw farm boundaries manually using satellite base imagery. This covers situations where no prior polygon exists

**Step 3 — Display on the lot birth certificate**
Every lot shows a small embedded map with the farm cluster GPS pins and polygon boundaries. This is the visual that roasters actually want to see — proof of origin, not just a coordinate number.

**What NOT to build for MVP:** Real-time crop health monitoring (NDVI), drone integration, carbon stock measurement. AgriVeri lists these — they're aspirational for them too. For Bunna Bridge MVP, the only geospatial question that matters is: *is this farm polygon deforestation-free since 2020?* Answer that reliably and you've matched AgriVeri's core EUDR geo-claim.

---

## 4. FARM BOUNDARY DIGITAL MAPPING / POLYGON CREATION

**The AgriVeri version:** Field teams with GPS devices physically walk farm perimeters. Their Concept Note admits this takes 5.5 years to complete at current capacity across Ethiopia.

**The Bunna Bridge version: Mobile-first, cooperative-led enrollment with exporter as the data sponsor.**

Your exporter is the entry point. They already have relationships with 5–50 cooperatives or farmer unions. Build the enrollment flow around the exporter sponsoring their supplier farmers onto the platform.

**The enrollment flow:**
1. Exporter creates a "supplier group" in Bunna Bridge and enters cooperative names
2. Bunna Bridge generates a **mobile enrollment link / QR code** per cooperative
3. A cooperative field agent (or extension worker) opens the link on any smartphone, walks the farm perimeter with GPS on, and the app traces the polygon automatically
4. The polygon is submitted for the EUDR satellite baseline check
5. Farm gets a **Bunna Bridge Farm ID** — a permanent digital identity (e.g., `BB-ETH-YRGL-004821`) that follows that farm forever

**What makes this better than AgriVeri's approach:**
- No field team from Bunna Bridge required
- The exporter's existing cooperative relationships do the data collection
- Each enrolled farm immediately generates EUDR compliance value, which incentivizes the exporter to enroll more farms
- The Farm ID links to every future lot that farmer produces — building longitudinal traceability without extra work

**MVP scope:** Build the web-based polygon draw tool and the GPS trace tool as a progressive web app (works on basic Android phones without app store download). Target enrollment of 500 farms in the first pilot region — enough to cover 2–3 exporter supplier bases.

---

## 5. SUPPLY CHAIN STRUCTURING (Farmer → Exporter → Buyer Linkage)

**The AgriVeri version:** Human-managed. They physically introduce parties, structure contracts, attend trade fairs. This doesn't scale and creates dependency on AgriVeri staff.

**The Bunna Bridge version: The linkage is the platform. Every transaction on Bunna Bridge IS the supply chain structure.**

The data model does the work that AgriVeri's consultants do manually:

```
Farmer / Cooperative
        ↓  (enrollment + GPS polygon + Farm ID)
    Lot Assembly
        ↓  (processing method, harvest date, weight, cup score)
  Export Compliance Pack
        ↓  (7-gate check, EUDR attestation, NBE calculation)
   Marketplace Listing
        ↓  (origin, process, score, price, certifications)
     Roaster Discovery
        ↓  (filter, sample request, purchase, contract)
   Settlement & Delivery
```

Each arrow in that chain is a Bunna Bridge workflow step. The supply chain isn't something Bunna Bridge *structures* for the exporter — it's something that **emerges automatically** as the exporter uses the platform.

**For the exporter specifically, build these three linkage features for MVP:**

**Supplier Roster** — a structured list of the exporter's cooperatives and farmers, each with Farm ID, GPS polygon, EUDR status, and last harvest record. This replaces the spreadsheet every Ethiopian exporter currently uses.

**Lot Assembly Wizard** — exporter selects farms from their roster, assigns processing batch, enters weight and harvest date, system auto-calculates lot origin cluster and pulls cup score from the ledger. Output: a draft lot ready for compliance checking.

**Buyer Profile Pages** — when a roaster on the platform expresses interest in a lot, the exporter can see: the roaster's country, purchasing volume, preferred origins, and any past transactions on Bunna Bridge. This replaces the cold email introductions AgriVeri facilitates.

---

## 6. EXPORT READINESS AUDITING

**The AgriVeri version:** Physical audit conducted by AgriVeri staff. They visit farms, check records, produce a report. Expensive, takes weeks, doesn't update in real time.

**The Bunna Bridge version: Continuous digital audit state — the exporter always knows their readiness score.**

Reframe "audit" as a **live dashboard, not a periodic event.** The exporter's home screen in Bunna Bridge IS their audit state.

**The 7-Gate Readiness Engine (MVP version):**

| Gate | Data Source | Status Logic |
|---|---|---|
| ECX License | Manual upload + expiry date | Auto-alerts 30 days before expiry |
| ECEX Export Permit | Manual upload per shipment | Tied to lot, not global |
| Phytosanitary Certificate | Manual upload | Linked to specific lot + destination country |
| Quality Certificate | Auto-pulled from SCA cupping ledger | Green when Q-grader score recorded |
| EUDR Attestation | Auto-generated from satellite polygon check | Green when all farms in lot pass |
| NBE Settlement | Auto-calculated from invoice value | Shows exact ETB/USD split required |
| Customs Declaration | Checklist of required fields | Green when all fields populated |

**What makes this different from AgriVeri's audit:** It's not a one-time assessment — it's a live score that updates every time a document is uploaded, a certificate expires, or a new lot is assembled. The exporter doesn't need to hire AgriVeri to tell them they're compliant. They can see it themselves, in real time, on their phone.

**For MVP:** Implement gates 4, 5, and 6 with full automation (quality ledger, EUDR satellite check, NBE calculator). Gates 1, 2, 3, and 7 can be manual upload + checklist in MVP — full automation comes in V2 when you build government API integrations.

---

## 7. TRAINING / E-LEARNING MODULES

**The AgriVeri version:** In-person workshops for farmers on EUDR, sustainable practices, digital tools. They've trained 5,000+ farmers. High-touch, high-cost, doesn't scale.

**The Bunna Bridge version: Contextual, embedded micro-learning — not a separate LMS.**

Don't build a Learning Management System. Exporters and farmers don't want to take courses. They want to get their lot export-ready. Learning should happen *inside* the workflow, at the moment of confusion.

**Three specific implementations for Bunna Bridge:**

**In-product tooltips and explainers (immediate MVP)**
Every gate in the 7-gate engine has a "?" button. Clicking it opens a 3-sentence explanation of what that gate requires, why it exists, and exactly how to fulfill it — in English and Amharic. This is the minimum viable "training" — it answers the question the exporter has right now, in the context they have it.

**EUDR Explainer for Cooperative Field Agents (mobile-first)**
A short (5-screen) interactive guide in Amharic that explains: what EUDR is, why EU buyers require it, what a farm polygon is, and how to use the GPS trace tool. Field agents who enroll farms for exporters need this. It lives at the farm enrollment URL — they read it before they start tracing the first polygon. No separate app, no course enrollment.

**Exporter Onboarding Sequence (email/in-app)**
A 7-day onboarding sequence triggered on signup: Day 1 — complete your first farm enrollment. Day 3 — assemble your first lot. Day 5 — run the EUDR check. Day 7 — review your compliance packet. Each message is one task, one link, one outcome. This is the training program disguised as a product activation flow.

**What NOT to build:** Video courses, certification exams, discussion forums. Those belong in a later community product when you have 500+ active exporters. For MVP, training = confusion prevention inside the product itself.

---

## Priority Build Order for MVP

Given your stage and exporter-first focus, here's the recommended sequencing:

**Now (MVP hardening):**
Compliance checklist dashboard with 7-gate status → Export readiness score → EUDR satellite polygon check → Compliance packet PDF generation

**Next (MVP extension):**
Farm enrollment flow with GPS polygon tool → Farm ID system → Supplier roster → Lot assembly wizard → NBE settlement calculator

**After first 10 exporters are live:**
Write-once cup score ledger → Blockchain attestation layer → Buyer-facing lot discovery → In-product Amharic micro-learning

The through-line across all 7 features: **AgriVeri delivers compliance as a service. Bunna Bridge makes compliance the automatic output of doing business on the platform.** That's the positioning, and every feature should reinforce it.