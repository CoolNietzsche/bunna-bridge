---
title: Beersheba (Bunna Bridge)
type: project
area: venture
status: active
stage: building
priority: 1
last_touched: 2026-11-15
needs_review: true
repo: https://github.com/CoolNietzsche/bunna-bridge
links: https://bunnabridge.pro.et · https://bunnabridge.pro.et/story/bc285f1b-37d5-43e9-88ca-39bd9233a15c · docs/knowledge-base/README.md · https://claude.ai/artifact/YPXPhBRjupi8TCQNuJYcPa · https://claude.ai/artifact/W811KmabCerf2qs6gL4fNE · https://claude.ai/artifact/XriMsNKVr4dhoDz26pVuuR
---
# Beersheba (Bunna Bridge)
**One-liner:** An online marketplace and compliance tool for Ethiopian specialty coffee. Exporters and cooperatives use it to record farms, plots and forest checks, so coffee sold to EU buyers meets the EU deforestation rules (EUDR).

## Why it matters
- From 30 Dec 2026, large and medium EU buyers must prove their coffee didn't come from land cleared of forest after 2020 (verified: docs/knowledge-base/12-roadmap-and-tasks.md).
- Ethiopian exporters need the farm and forest evidence to keep selling to the EU (inferred).
- Public story pages and QR codes let hotels and roasters show where their coffee comes from (from conversation).

## Status now (2026-11-15)
- **Live:** HTTPS at bunnabridge.pro.et on the old VPS, a fresh deployment from the latest code (from conversation).
- **Live:** demo accounts and the Bensa story page, checked live (from conversation).
- **Built and tested:** all five build phases; 240 backend tests passed, 66 end-to-end checks passed (verified: commits 5b86833, 377e949).
- **Not done:** forest data isn't loaded on the live server, so plots show "no reference data" (verified: docs/knowledge-base/13-farmer-registration-readiness.md R-1).
- **Unknown:** whether nightly backups are switched on, and whether the server's exchange-rate setting was updated to 160.92 (from conversation).
- **Branch:** all work is on branch `ccr-709966e3-02iu4g`, not merged into `master` (verified: git log).

## Done so far
- **Phase 1:** EUDR traceability. Farmers, plots, forest checks, risk register and evidence packages (verified: DONE.md).
- **Phase 2:** organisations and teams, washing-station intake, SMS, ECTMS import, and an offline field app in English, Amharic and Afaan Oromo (verified: commit 62605c5).
- **Phase 3:** trade. Contracts, ECTA registration, shipments, payments, messages (verified: commits 1c7935d, c3c909c).
- **Phase 4:** quality. Cupping, physical analysis, blind sessions (verified: commits d2a8953, 17ffe27).
- **Phase 5:** marketplace. Select auction, EU stock, scores, learn hub (verified: commits face8d2, 225b44a).
- **Deploy:** kit in `deploy/server` (verified: commit 5805dfc); the Telecloud attempt was abandoned because ghcr.io was blocked (from conversation).
- **Website and email:** public website with a lead form, and outgoing email over SMTP (verified: commits 7ab9dac, 2c38d5d).
- **Story page:** premium redesign from Abeni's notes (verified: commit 377e949).
- **Exchange rate:** default set to 160.92 birr per dollar (verified: commit 5b86833).
- **Plans written:** farmer readiness, workspaces and subscriptions, the Guji Hambela pilot (verified: commits 3277bdd, 6751afb).
- **Word template:** letterhead and a Markdown-to-Word converter (verified: commit 344d6dd).
- **Shared outside the repo:** platform guide, slide deck and QR design as artifacts (from conversation).

## Next 3 actions
1. Write the missing forest-data preparation script and guide (`scripts/forest_baseline/`) for Hambela.
2. Prepare the Hambela forest files off the server; the founder loads them and runs `recheck_plots`.
3. Confirm on the server that nightly backups and the 160.92 rate are in place (`deploy/server/status.sh`).

## Roadmap
- **Now:** forest data, then the remaining pilot preparation (S-2 to S-5): place list, GPS accuracy, supervisor review, consent forms.
- **Next:** the Guji Hambela pilot (60–100 farmers, about 10 field days); merge the branch into master.
- **Later:** workspaces and subscriptions (W-1 to W-7), data export to ECTA, email features, payment gateway.

## Deadlines and dates
- 30 Dec 2026: EUDR applies to large and medium operators.
- 30 Jun 2027: EUDR applies to micro and small operators.
- Pilot field work should start by early December, during the harvest (guess, from plan 15).

## People and stakeholders
- **Founder:** non-technical; runs the server commands.
- **Abeni:** co-founder; wrote the story page notes.
- **Partners:** Skylight Hotel × Eset Coffee Roastery, on the demo story page (role ?).
- **Authorities:** ECTA (ECTMS), the woreda and kebele offices for the pilot, and the communications authority for data registration.

## Stack, environments and access
- **Backend:** Django 6.0.4 with PostGIS, Celery and Python 3.14; it runs only through Docker Compose.
- **Frontend:** React 19, Vite and Tailwind v4.
- **Server:** the old VPS, shared with other projects. Files are in `/opt/beersheba` (app, media, backups); the website is in `/var/www/beersheba`; the stack is `docker-compose.server.yml`.
- **Accounts:** `superadmin@beersheba.com`; the demo logins end in `@demo.beersheba.et` (passwords are not stored here).
- **Claude access:** Claude can't reach the VPS directly; the founder pastes server output back.

## Decisions made (and why)
- **Fresh deployment:** old `/root/bunna-bridge` retired, to start from clean, current code.
- **Old VPS, not Telecloud:** Telecloud blocked the container download.
- **One shared database** with each record tagged by its client, because trade between clients is the value.
- **Forest data processed off the server:** the server's disk is 90% full.
- **Farmers' share hidden when over 100%:** the share showed 186% when the exchange rate was out of date.

## Risks, blockers and open questions
- **Hosting:** a server outside Ethiopia may conflict with Proclamation 1321/2024; a lawyer's view is needed.
- **Satellite map:** Esri satellite images need a licence (free ArcGIS key, Mapbox, or no satellite).
- **Undecided:** SMS gateway; pilot washing station; prices and plan names.
- **Auction:** terms need legal review; the reserve price must be at least the ECTA minimum.
- **Pilot area:** security in Guji needs checking before each trip.

## Where things live
- **Code:** `bunna_bridge/bunna_bridge/` (apps: lots, traceability, trade, quality, market, orgs) and `bunna-bridge-frontend/src/`.
- **Docs:** `docs/knowledge-base/` (01–15), `DONE.md`, `deploy/server/README.md`, `docs/templates/`.

## Resume here
1. Open the repo and check out `ccr-709966e3-02iu4g`; read `CLAUDE.md`, then `docs/knowledge-base/README.md`.
2. Read `docs/knowledge-base/13-` and `15-`, then the forest loaders: `load_forest_baseline` (traceability) and `load_deforestation_data` (lots).
3. Ask the founder to run `sudo bash /opt/beersheba/app/deploy/server/status.sh` and paste the output, then start the forest-data script.
