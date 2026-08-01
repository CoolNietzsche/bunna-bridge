# AgriVeri Competitor Intelligence Report
## For Bunna Bridge (ቡና ብሪጅ) — Strategic Product Analysis

---

## 1. WHAT THEY DO

**Core Product & Value Proposition**

AgriVeri Services PLC is an Ethiopian agricultural compliance and traceability services firm founded in 2022, headquartered in Addis Ababa with operational reach into Germany. Their stated mission is to "bridge the gap between Ethiopian producers and global markets by ensuring compliance with standards such as the EUDR." They are not a software-native marketplace — they are primarily a **professional services company that uses technology as an enabler**, not as the product itself.

Their core value proposition is: *we handle your EUDR compliance end-to-end, as a managed service, using satellite + blockchain + human capacity building.*

**Who Their Customers Are**

The pitch deck explicitly lists: agricultural cooperatives, exporters, smallholder farmers, multinational corporations, and development agencies (UNDP, GIZ partnerships mentioned by name). The Concept Note makes clear that their primary deployment model is **project-based B2B/B2NGO** — they appear to be pitching NGOs and development agencies to fund large-scale farmer mapping programs, not selling SaaS subscriptions to exporters or roasters.

**Which Markets/Origins They Serve**

Their technology team (the German trio — Caroline Busse, Hyeonmin Kang, Marco Eberle) shows footprints in 13 countries across Latin America and Africa: Colombia, DRC, Ecuador, Ghana, Guinea, Indonesia, Ivory Coast, Liberia, Peru, Sierra Leone, Togo, Uganda, Vietnam. Their client logos include ETG, Beyond Beans, S&D Sucden, Stella Bernrain, Original Beans, WWF, Weleda, Goodcarbon, Open Forest Protocol — a mix of commodity traders, specialty buyers, conservation NGOs, and carbon finance players. **Critically, Ethiopia is not yet a proven operational market for their tech side** — the Concept Note frames Ethiopia as a new pilot target, not an existing deployment.

---

## 2. FEATURE INVENTORY

**Listed Features (from Concept Note "Technology Features" slide)**

| Feature | Status Assessment |
|---|---|
| Geospatial monitoring & satellite mapping (Planet Labs / Copernicus) | Claimed, outsourced to German tech team |
| Farm boundary digital mapping / polygon creation | Core stated capability; outsourced |
| Unique digital farm IDs for traceability | Claimed, rough — no product demo shown |
| Blockchain for tamper-proof supply chain records | Claimed, no implementation detail |
| QR code on-product consumer verification | Claimed |
| IoT sensors (soil moisture, weather) | Aspiration — listed but no evidence of deployment |
| Drone field monitoring | Aspiration — listed without deployment evidence |
| Farmer profile platform (mobile app) | Planned, "deploy state-of-the-art platform" language signals not yet built |
| Compliance reporting tools (EUDR due diligence docs) | Core service; appears human-assisted |
| Carbon sequestration measurement | Claimed via satellite |
| NDVI crop health monitoring | Claimed via satellite |
| Custom dashboards for buyers | Claimed |
| Training / e-learning modules | Partially deployed; 5,000+ farmers trained cited as achievement |
| Export readiness auditing | Core service; human-led |
| Supply chain structuring (farmer → exporter → buyer linkage) | Professional services offering |
| Sales contract administration & banking communications | Managed services, notably human-led |
| Market linkage / long-term contract facilitation | Aspiration, trade fair participation cited |
| Carbon credit monetization | Aspirational |

**What is Polished:** The human consulting/professional-services layer — farm auditing, certification readiness, capacity building, and export management logistics. Their 5,000+ farmers trained and 100+ cooperatives certified claim is the most credible achievement cited.

**What is Rough/Aspirational:** Almost everything technology-specific. The language throughout is "we will deploy," "we will establish," "we aim to." There is no product screenshot, no live platform demo, no API, no onboarding flow shown anywhere in either document. The tech team is the German co-founding trio (with WWF/Celonis/Siemens backgrounds) who are clearly the credible technology side, but the Ethiopia deployment via that tech is still being piloted.

**What is Missing vs. Bunna Bridge:**
- No quality scoring layer (no SCA cupping, no Q-grader certification integration)
- No export compliance gate engine — they address EUDR but not the full 7-gate Ethiopian export regulatory stack (ECX, ECEX, NBE, customs, phytosanitary, etc.)
- No NBE foreign currency settlement calculator or USD/ETB compliance logic
- No specialty coffee lot-level differentiation — they treat coffee as a commodity crop like cocoa or soy
- No buyer-facing marketplace where roasters can discover, cup, and transact on specific lots
- No write-once quality ledger

---

## 3. COMPLIANCE & TRACEABILITY

**How they handle traceability:** The Concept Note describes a "centralized digital platform to manage farmer profiles, traceability data, and certification processes" targeting 1 million hectares by 2028. In practice, the current approach is: satellite imagery cross-referenced with GPS ground coordinates to generate farm polygons, which then feed compliance reports. The QR code → product linkage is the consumer-facing output.

**EUDR:** This is their primary compliance hook and the centerpiece of the Concept Note. They articulate the problem correctly — Ethiopia has ~2 million hectares of coffee farmland but current manual mapping capacity (50 companies × 40 ha/day = 2,000 ha/day) would take 5.5 years to complete. They propose 1,000 ha/day via German satellite tech, with a pilot at 20,000 ha with ECTA. The Concept Note is essentially a **project proposal to secure funding** (likely from a development agency, GIZ, or similar) — not a commercial product pitch.

**Other regulations:** They mention GlobalGAP, Rainforest Alliance, Fair Trade, and Organic alongside EUDR. However, their approach is certification *facilitation* — they help farms become audit-ready, then rely on accredited third-party bodies for actual certification issuance.

**Certifications handled:** Rainforest Alliance, Fair Trade, Organic (through "certification readiness programs"), plus EUDR documentation. No mention of SCA, Q-grading, or cup score standards — confirming they are commodity-focused, not specialty-focused.

---

## 4. TECH & UX OBSERVATIONS

**What their data model seems to look like:**

The entity model appears to be: `Farm → Farmer Profile → Satellite Polygon → Compliance Record → Certificate`. Secondary linkages exist to cooperatives and exporters. There is no evidence of a lot-level or batch-level data model — they operate at the farm boundary level, not the processing/green coffee lot level that specialty buyers require.

**Workflows they support:**
1. Farm enrollment → GPS polygon creation → EUDR risk assessment → compliance documentation
2. Farmer training → certification readiness → third-party audit facilitation
3. Export readiness audit → supply chain structuring → contract administration → logistics
4. Buyer-seller introduction (claimed; no digital marketplace shown)

**Where UX seems strong:** Nowhere that is clearly evidenced. The pitch deck has clean visual design but zero product UI screenshots in either document. This is a major signal — a technology company pitching a platform with no interface shown either has nothing built yet, is deliberately hiding it, or considers the human service layer the actual product.

**Where UX seems weak/absent:**
- No buyer-facing interface described
- No exporter dashboard shown
- No farmer-facing mobile app screenshot
- The "custom dashboards" for compliance monitoring are described conceptually only
- The "digital platform" for farmer profiling is a future objective stated in the Concept Note ("Deploy a state-of-the-art digital platform" as Objective #4), confirming it's not yet operational

**Technology architecture signals:** The tech team backgrounds (WWF/Celonis/iDiv/Siemens) suggest strong geospatial data science capabilities but likely a research-grade, GIS-heavy stack — not a consumer-grade SaaS platform. The likely stack is QGIS / Google Earth Engine / PostgreSQL with PostGIS, with possible ESRI integrations, and some form of blockchain layer (possibly Ethereum or Polygon given the "Open Forest Protocol" client connection).

---

## 5. BUSINESS MODEL

**How they make money:**

This is deliberately obscured. The Concept Note's cost structure section explicitly states: *"Price will be available upon request"* and *"The cost of each project will be determined by some key factors on the ground and may vary from region to region."*

The business model appears to be **project-based professional services fees**, structured as:
- Per-hectare fees for satellite mapping and EUDR compliance documentation
- Training program contracts (likely funded by development agencies, NGOs, or government)
- Certification facilitation fees
- Export management retainer or commission on facilitated transactions

**Who pays:** Based on the Concept Note framing as a proposal to an external funder (ECTA, UNDP, GIZ are cited), the primary payer is likely **development agencies and NGOs**, not the farmers or exporters themselves. The commercial client logos (ETG, S&D Sucden, Stella Bernrain) suggest some revenue from commodity trading companies paying for EUDR due diligence services on their supplier base.

**Pricing signals:** The only concrete number hinted at is a pilot covering 20,000 hectares. If industry EUDR mapping rates run $5–15/ha for satellite + documentation, a 20,000 ha pilot would be a $100K–$300K project contract. This is grant-funded services territory, not recurring SaaS revenue.

**No SaaS, no transaction fees, no marketplace take-rate evident.**

---

## 6. WHAT BUNNA BRIDGE CAN STEAL (Ethically)

**Features/Flows Worth Adapting:**

**Farmer Clustering Logic.** AgriVeri explicitly clusters farmers "based on location, zones and product origin for product branding purposes." This is smart — it's the digital analog of the kebele/woreda grouping that creates Yirgacheffe, Guji, Sidama origin identities. Bunna Bridge should build this clustering directly into lot creation — when a lot is assembled from farmers in the same GPS cluster, it auto-tags the recognized origin appellation, which goes directly onto the lot birth certificate.

**The "Export Readiness Audit" Framework.** Their five-step export readiness sequence (select → assess → audit → qualify → standardize) is a practical workflow that resonates with Ethiopian exporters. Bunna Bridge's 7-gate engine is the automated version of this — consider surfacing it in those terms in the UI: an "Export Readiness Score" displayed as a progress bar across the gates.

**Carbon Credit Angle.** AgriVeri explicitly monetizes forest coffee through carbon sequestration — they cite 1 million metric tons of CO2 by 2030, and client logos include Goodcarbon and Open Forest Protocol. Bunna Bridge should at minimum note carbon credit eligibility on lot birth certificates (Ethiopia's wild forest coffees are among the most carbon-dense agricultural systems on earth). This is a revenue layer Bunna Bridge could unlock for exporter-farmers with minimal additional data collection.

**QR Code Consumer-Facing Verification.** The QR → sustainability credentials → farm details flow is simple but genuinely valued by roasters marketing to third-wave consumers. Bunna Bridge's lot birth certificate should have a public-facing QR-scannable URL that roasters can put on retail bags, showing the GPS origin, cup score, and farmer cooperative — this is a free marketing tool for your buyers that costs Bunna Bridge nothing to build.

**"Backward Integration" Framing.** Their concept of starting with EU buyer requirements and working backward to farmer practices is a powerful narrative. Bunna Bridge should use similar language: "Built from the buyer's requirements backward to the farm."

**Development Agency Positioning.** AgriVeri is clearly pursuing GIZ/UNDP/ECTA as funders. Bunna Bridge should consider whether any of those same agencies would fund Bunna Bridge's farmer onboarding costs — essentially using grant money to subsidize supply-side enrollment while charging exporters and roasters on the demand side.

---

## 7. WHERE BUNNA BRIDGE WINS

**Gap 1: No specialty coffee quality layer whatsoever.**
AgriVeri treats coffee as an undifferentiated commodity crop alongside cocoa, soybeans, and rubber. Their "market linkage" slide mentions both "commercial and specialty coffee markets" but there is zero specialty-specific infrastructure: no SCA cupping protocol, no Q-grader integration, no cup score data model, no lot-level quality differentiation. This is Bunna Bridge's most decisive structural advantage. A Yirgacheffe natural processed at 88 points is worth 3x a commercial grade lot — and AgriVeri has no mechanism to capture, certify, or monetize that difference.

**Gap 2: No Ethiopian export regulatory specificity.**
AgriVeri is a general-purpose compliance firm operating across 13 countries. They address EUDR well, but there is no mention anywhere of: ECX (Ethiopian Commodity Exchange) licensing, ECEX export licensing, NBE foreign currency regulations, the 50/50 USD/ETB repatriation requirement, phytosanitary certificates from the Ministry of Agriculture, or customs documentation specific to Ethiopia. Bunna Bridge's 7-gate engine covers exactly this stack. For an Ethiopian exporter, these gates are far more immediately operational than EUDR compliance.

**Gap 3: No marketplace — no buyer discovery, no transaction rails.**
AgriVeri connects buyers and sellers via "trade fair participation" and human relationship-building. There is no digital marketplace where a roaster in Hamburg can search available Ethiopian lots by origin, process, cup score, and EUDR status, and initiate a purchase. Bunna Bridge is building this. The difference is the difference between a consulting firm and a platform.

**Gap 4: Technology is borrowed, not owned.**
AgriVeri's satellite capability is entirely dependent on a German partner company (likely the technology team themselves are that company — Caroline Busse/Hyeonmin Kang/Marco Eberle appear to be co-founders of the German tech entity). Their blockchain is unspecified. Their farmer platform "will be deployed." Bunna Bridge's compliance engine, ledger, and NBE calculator are purpose-built for Ethiopian specialty coffee. This is proprietary depth vs. generic licensed technology.

**Gap 5: No financial settlement layer.**
The NBE settlement calculator — splitting payment into 50% USD / 50% ETB, calculating the exporter's forex allocation, generating the required bank documentation — is a Bunna Bridge exclusive. AgriVeri's "export management" mentions "banking communications" as a human-managed service. Bunna Bridge automates it.

**Gap 6: Write-once quality ledger.**
AgriVeri's blockchain is described as preventing tampering on supply chain records. But it's focused on *compliance* data (deforestation-free status). Bunna Bridge's SCA cupping ledger is a write-once quality record certified by Q-graders — a fundamentally different type of trust signal that directly affects price. No competitor in this space appears to have this.

---

## 8. STRATEGIC RECOMMENDATIONS

**Recommendation 1: Launch a "EUDR Fast Track" module explicitly named and marketed as such.**

AgriVeri's Concept Note reveals that the EUDR farm polygon mapping crisis is real and acute — Ethiopia needs to map 2 million hectares but current capacity gets there in 5.5 years, not 11 months. Bunna Bridge should build a dedicated EUDR module that, for each lot, automatically generates the required due diligence statement, pulls the farm GPS polygon data, cross-references it against the December 2020 deforestation baseline, and packages it into the EU format. Market this as "EUDR-ready in minutes, not months." This directly attacks AgriVeri's core service with automation that undercuts their human-hours cost model.

**Recommendation 2: Pursue the German tech team's clients as Bunna Bridge's first international roaster partners.**

AgriVeri's client logos include Beyond Beans, Original Beans, and Stella Bernrain — all specialty or ethical-positioned European importers that also buy Ethiopian coffee. These buyers already believe in transparency and are paying for EUDR compliance services. Bunna Bridge should specifically target them with a pitch: *"Get EUDR compliance AND specialty quality certification AND direct lot discovery in one platform — instead of paying AgriVeri for compliance and managing quality separately."*

**Recommendation 3: Build an origin clustering → lot birth certificate pipeline.**

Take AgriVeri's clustering idea and make it automatic. When exporters assemble a lot in Bunna Bridge, the system should auto-assign: GPS cluster → recognized origin appellation (Yirgacheffe, Guji, Sidama, Jimma, Kaffa, etc.) → forest coffee flag (wild/garden/semi-forest) → carbon credit eligibility flag. These fields on the birth certificate are worth premium pricing signals to buyers that AgriVeri simply cannot generate.

**Recommendation 4: Pursue GIZ/UNDP/ECTA as a parallel funding channel for farmer onboarding costs.**

AgriVeri is pitching development agencies to fund their 20,000 ha pilot. Bunna Bridge should do the same — frame the Bunna Bridge farmer enrollment (GPS profiling, digital ID creation, EUDR polygon) as a public good that qualifies for development finance. The goal: get development agency money to pay for supply-side onboarding while Bunna Bridge charges exporters and roasters on the commercial side. This removes the chicken-and-egg problem of getting farmers onto the platform.

**Recommendation 5: Differentiate positioning as "compliance-native marketplace" vs. AgriVeri's "compliance consultancy with technology."**

AgriVeri's messaging is services-first: "we do compliance for you." Bunna Bridge's positioning should be the inverse: "compliance is built into every transaction — you don't hire us to do compliance, compliance just happens when you trade on Bunna Bridge." This is a fundamentally different value proposition — one that scales without headcount, and one that AgriVeri's professional-services model structurally cannot replicate. The tagline should emphasize the embedded, automatic nature: something like *"Every lot, export-ready by design."* or *"Ethiopian coffee's compliance layer, built in."*

---

**Summary Assessment:** AgriVeri is a real competitor in the sense that they are pursuing the same Ethiopian EUDR problem with some of the same buyers. But they are a **services company pretending to be a tech company** — their platform is aspirational, their tech is outsourced, their pricing is project-based, and they have no specialty coffee DNA. Bunna Bridge's defensible moat is the combination of (a) Ethiopian regulatory specificity no foreign team can easily replicate, (b) specialty quality infrastructure they are not building, and (c) a marketplace model that scales without proportional headcount. Treat AgriVeri seriously as a signal of market demand validation, but not as a near-term platform competitor.