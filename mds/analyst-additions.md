## Additions to the Feature Tailoring Brief

A few things worth adding before handing off:

---

### Addition 1: Amharic-First Data Entry

Every form in Bunna Bridge that a cooperative field agent or farmer touches needs to support Amharic input natively — not as an afterthought translation layer. Exporter-facing UI can be English-primary with Amharic toggle. Farmer/cooperative-facing UI should be Amharic-primary. This is a competitive moat AgriVeri's German tech team will never prioritize properly.

---

### Addition 2: Offline-First Mobile Experience for Farm Enrollment

Ethiopian coffee regions — Guji, Kaffa, Sidama, Yirgacheffe — have inconsistent mobile data coverage. The GPS polygon tracing tool must work offline and sync when connectivity returns. If this isn't built in from the start, field agents will abandon it after one failed upload in a remote kebele. AgriVeri's field teams face this exact problem and solve it with human workarounds. Bunna Bridge solves it with architecture.

---

### Addition 3: NBE Settlement Calculator as a Standalone Hook

The NBE 50/50 USD/ETB split calculator deserves to be treated as a **hero feature**, not just one gate among seven. Every Ethiopian exporter deals with this calculation on every shipment and currently does it manually or in Excel. Build it as a clean, shareable calculator — exporter enters invoice value, system outputs exact ETB amount, USD retention amount, bank transfer instructions template, and the NBE Form B fields pre-filled. Make it usable even without a full account. This becomes a word-of-mouth acquisition tool — exporters share the link with each other before they even sign up for Bunna Bridge.

---

### Addition 4: Lot Sample Request Workflow

Specialty roasters don't buy coffee they haven't cupped. Before any purchase, they want a 300–500g sample shipped to their roastery. Bunna Bridge needs a **sample request flow** — roaster clicks "Request Sample" on a lot listing, exporter gets notified, they confirm sample availability and shipping details, roaster receives sample with a QR code linking back to the lot's Bunna Bridge page. When the roaster cups the sample, they can submit their own cup score against the Q-grader score already on record. This closes the trust loop and turns the platform into the roaster's sourcing tool, not just a compliance database.

---

### Addition 5: Exporter Reputation Score

Over time, Bunna Bridge accumulates data that no single exporter has about themselves: on-time shipment rate, cup score consistency across lots, EUDR compliance rate, responsiveness to sample requests, buyer repeat rate. Package this as an **Exporter Trust Score** — visible to roasters on the marketplace. Exporters with high scores get better placement. This creates a flywheel: good exporters want to be on Bunna Bridge because it surfaces their reliability in a market where roasters currently have no signal other than personal relationships and word of mouth.

---

### Addition 6: The "Lot Story" Page

Every lot should have a public-facing, beautifully designed single-page URL — the lot's permanent home on the internet. It shows: origin map with GPS pins, farmer cooperative photo (if consented), harvest and processing dates, cup score with Q-grader name, EUDR attestation badge, certifications, and a short origin narrative. Roasters embed this link in their retail packaging QR codes. Consumers scan it and see the full story of their coffee. This is Bunna Bridge's brand in the world — every bag of Ethiopian specialty coffee becomes a Bunna Bridge touchpoint.

---
---

## Who Takes This Forward: The Handoff Chain

You asked who comes next after the product analyst. Here's the full sequence and what each person needs from this brief:

---

### 1. Product Manager (Next in Line)
**What they do with this:** Convert the feature tailoring brief into a structured product roadmap. They take the priority build order and turn it into epics, user stories, and acceptance criteria. They own the question: *what exactly does "done" mean for each feature?*

**What they need from you now:**
- Confirmation of the MVP priority stack (the build order outlined above)
- Access to 2–3 real Ethiopian exporters to validate the 7-gate workflow against their actual current process
- A decision on which gates are automated vs. manual-upload in V1

**Their first deliverable:** A prioritized product backlog with user stories written from the exporter's perspective, acceptance criteria per feature, and a release milestone plan.

---

### 2. UX/UI Designer
**What they do with this:** Translate user stories into wireframes, then into high-fidelity screens. They own the exporter's emotional experience of the product — the dashboard, the lot assembly flow, the compliance packet view, the Amharic toggle.

**What they need from you now:**
- The user journey map for the primary exporter workflow (signup → enroll farms → assemble lot → run compliance check → generate packet)
- Clarity on which screens must be Amharic-native vs. toggle
- The offline-first constraint for the mobile polygon tool
- The "Lot Story" page concept as a design brief

**Their first deliverable:** Wireframes for the exporter dashboard, the 7-gate compliance view, the lot assembly wizard, and the mobile farm enrollment flow. These go to user testing with real exporters before a single line of code is written.

---

### 3. Technical Architect / CTO
**What they do with this:** Make the infrastructure decisions that everything else depends on. Database schema, API design, blockchain implementation choice, satellite data pipeline, offline sync strategy.

**What they need from you now:**
- The data model decisions: Farm ID structure, lot schema, ledger write rules
- The blockchain scope decision (private append-only ledger for MVP, public chain later)
- The satellite pipeline decision (Google Earth Engine + Hansen dataset as recommended above)
- The offline-first mobile requirement for polygon tracing

**Their first deliverable:** A technical architecture document covering: data model, API surface, third-party integrations (GEE, Mapbox/Leaflet, NBE banking APIs if available), blockchain layer choice, cloud infrastructure, and mobile tech stack recommendation.

---

### 4. Compliance & Legal Advisor (Ethiopia-Specific)
**What they do with this:** Validate that every gate in the 7-gate engine reflects current Ethiopian export law accurately, and that the EUDR compliance packet meets the actual EU legal standard — not just the spirit of it.

**What they need from you now:**
- The 7-gate engine specification
- The EUDR due diligence statement template
- Confirmation of current NBE forex regulations (these change — the 50/50 split has shifted before)
- Any questions about whether Bunna Bridge itself needs an operating license to facilitate export transactions

**Their first deliverable:** A legal sign-off memo on the gate definitions, plus a reviewed EUDR statement template that would survive an EU customs audit.

---

### 5. Exporter Pilot Partners (2–3 Real Users)
**Not a role — a requirement.** Before the designer finishes wireframes and before the engineer writes the lot assembly module, you need 2–3 licensed Ethiopian exporters sitting in a room (or on a call) walking through their current process step by step. Record it. The product manager and designer should both be in that session.

**What you're listening for:**
- Where do they currently lose time in the export process?
- What documents do they scramble for at the last minute?
- How do they currently track which farms supply which lots?
- Have they had a shipment rejected or delayed due to a compliance gap?
- What does their current relationship with cooperatives look like digitally?

Their answers will reshape the feature priority order more than any analyst brief can.

---

### The Handoff Summary

```
Product Analyst (you are here)
        ↓
    Product Manager
    → Roadmap, epics, user stories
        ↓
    UX/UI Designer
    → Wireframes, flows, Amharic UI
        ↓  (parallel track)
    Technical Architect
    → Data model, infra, integrations
        ↓  (parallel track)
    Compliance Advisor
    → Gate validation, EUDR legal review
        ↓
    Exporter Pilot Partners
    → Reality check on all of the above
        ↓
    Engineering Team
    → Build
```

The single most important thing before engineering starts: **get the wireframes in front of real exporters and watch them try to use it.** Everything in this brief is a hypothesis until that happens.