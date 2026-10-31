# 01 — Product

## One-liner

**Beersheba** (brand formerly **Bunna Bridge**, ቡና ብሪጅ — "coffee bridge") is a direct-to-roaster marketplace for Ethiopian specialty green coffee whose differentiator is **automating export compliance** — above all the EU Deforestation Regulation (EUDR, Reg. 2023/1115), plus Ethiopian export requirements (ECTA license, phytosanitary cert, NBE foreign-exchange rules, minimum price).

Live at **https://bunnabridge.pro.et**. Run by a solo, non-technical founder.

## The problem it solves

- From the EUDR application date, EU importers must prove each coffee lot was grown on land **not deforested after 31 Dec 2020**, with GPS geolocation of the plots and a Due Diligence Statement (DDS).
- Ethiopian exporters also juggle 4–6 government offices (ECTA, ECX, MoA phyto, NBE, customs). They often learn a document is missing at the port.
- Roasters buying specialty lots have little trustworthy signal on quality (cup scores) or provenance.

Beersheba bundles: a lot registry with GPS boundaries → a satellite deforestation check → a 7-gate export checklist → auto-generated DDS / spec-sheet PDFs → a marketplace where roasters browse, request samples and make offers.

## Users (roles)

`User.role` is one field on the custom `User` model (`users/models.py`). There is no separate profile table.

| Role | Who | What they do in the app |
|------|-----|--------------------------|
| `exporter` (default) | Licensed Ethiopian exporter | Creates lots, uploads compliance docs, maps boundaries, lists on marketplace, answers samples/offers, calculates NBE settlement |
| `farmer` | Smallholder / cooperative | Gets an auto **Farm ID** (`BSB-ETH-XXX-000001`), draws farm boundary, sees lots linked to them, uploads farm photos |
| `buyer` | Importer / green buyer | Browses marketplace, watchlist (browser-only), requests samples, makes offers |
| `roaster` | Roastery (added 2026-08-02) | **Dual role**: buys like a buyer *and* can own/export lots, run washing stations, track roast equipment & batches, hold certifications |
| `qgrader` | Licensed Q-grader | Submits SCA cupping scores; confirming a score locks it and writes it onto the lot |
| `admin` | Platform operator | Sees everything via API; only role (plus Django staff) that can set the two manual gates |

## Core user journeys (as built)

1. **Exporter lists a lot**: Register → create lot (`/lots/new`) → link farmer / washing station → draw or inherit boundary (triggers deforestation check) → upload phyto / NBE / customs / ECEX docs → generate EUDR DDS → move `draft → listed` on the pipeline.
2. **Buyer/roaster sources**: Browse `/marketplace` (public, prices hidden when logged out) → lot page → request sample and/or make offer → exporter accepts/rejects/counters → accepted offer moves lot to `contracted`.
3. **Quality**: Q-grader cups at `/lots/:id/cup` → confirms → score becomes immutable and is copied to the lot.
4. **Public provenance**: `/story/:id` — shareable, no-login page (farm story, photos, map, score, certs). Intended for QR codes on retail bags.
5. **Roaster ops**: washing stations, certifications (drive Organic / Fair Trade / RA badges on lots), roast equipment, roast batches with multi-lot blends and a 6-stage pipeline.

## Business model (as coded)

- **2.5 % platform fee** on gross contract value (`lots/settlement.py: PLATFORM_FEE_PCT`).
- **Escrow milestones** modelled but not implemented as money movement: 20 % sample approved / 30 % export docs cleared / 50 % delivery confirmed.
- **NBE 50/50 rule**: 50 % of net USD proceeds converted to ETB at the NBE rate (`NBE_DEFAULT_FX_RATE` env, default `59.85`). Note: Ethiopia's FX regime changed in 2024; confirm the current retention rule and rate with an Ethiopian trade advisor before relying on this math.
- No payments, invoicing, or escrow integration exists yet.

## Competitive picture (from `mds/agriveri-analysis.md`)

- **AgriVeri Services PLC** (Addis, founded 2022) — EUDR compliance as a *managed service* (consultants + outsourced German geospatial team). Strong on farmer training and NGO/development-agency projects; technology mostly aspirational.
- Beersheba's positioning: **software-native, self-serve, exporter-first**, with automated checks instead of consultants, plus a marketplace AgriVeri doesn't have.
- Strategy docs push: Amharic-first farmer UI, offline-first GPS capture, NBE calculator as a free viral tool, exporter trust score, write-once (hash-chained) records for cup scores and EUDR attestations, QR codes on retail bags.

The full ~200-item wish list is `mds/feature-registry.md`; the reasoning is in `mds/feature-tailoring-brief.md` and `mds/analyst-additions.md`.

## Brand

- Name: **Beersheba**. Old name "Bunna Bridge" still appears in Django admin (Jazzmin), the DDS PDF header, admin map, code identifiers and the package name `bunna_bridge` — the package name should **not** be renamed.
- Palette — three generations exist; **the code is the truth** (`bunna-bridge-frontend/src/index.css` `@theme`):
  1. "Dark Roast" (espresso `#1A0F07`, gold `#C9952A`, terracotta `#C1440E`, sage `#4A7C59`) — deprecated, still in the admin map, DDS PDF and a few components.
  2. June 2026 rebrand (Forest `#1B4D35`, Linen `#FBF9F4`, Coffee `#7B4B2A`) — what `docs/THEMING.md` describes; superseded.
  3. **"Highland Editorial" (2026-08-01, current)**: forest `#123A2E`, forest-dark `#0C2A21`, forest-light `#E7EFEA`, amber `#D6892C`, clay/coffee `#B2532E`, matcha `#6E9A4B`, paper/linen `#F8F5EF`, stone `#EFEAE0`, ink `#1A1613`, slate `#6B6357`. Light/dark theme via `ThemeContext`.
- Fonts (current, `index.css`): Fraunces (display), Space Grotesk / Instrument Sans (UI), DM Mono (IDs, gates). Older docs say Playfair / Inter / JetBrains Mono — outdated.
- UI rules: `lucide-react` icons only, **no emojis**.
