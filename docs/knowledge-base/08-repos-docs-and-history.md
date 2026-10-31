# 08 — Repositories, Docs Map & History

## The two repositories

### `CoolNietzsche/bunna-bridge` — **the real platform** (default branch `master`)
Everything in this KB describes this repo. Django + React monorepo, deployed to bunnabridge.pro.et. PR-based workflow since late July (PRs #11–#24).

### `CoolNietzsche/Beersheba` — **a UI prototype, not production** (default branch `main`)
- Created 2026-06-21/22 in **Google AI Studio** ("Run and deploy your AI Studio app"), 3 commits, untouched since.
- Frontend copy of the bunna-bridge SPA at that time (same `src/api`, `pages`, `components` names) plus a **mock backend** `server.ts` (Express + `db.json`) that imitates the Django API paths (`/api/v1/lots/`, offers, samples, cupping…).
- Was used to explore the rebrand (forest/linen palette, `ThemeProvider` dark mode, `jsPDF` client-side PDFs, a richer Dashboard/Lots page). Those ideas have since been re-implemented — differently — in bunna-bridge (Highland Editorial redesign, Gentelella admin, its own `ThemeContext`).
- Contains leftover unrelated AI-Studio template components (`ServicesTab`, `UploaderTab`, `DocsTab` with "mesh router" simulations) and unused `@google/genai` dependency.
- ⚠ `server.ts` hardcodes demo accounts with plaintext passwords (`admin@bunnabridge.com` / `BunnaAdmin2026!`, others `Bunna2026!`). If any real account on bunnabridge.pro.et uses those passwords, change them. If the repo is public, make it private or archive it.
- **Recommendation:** archive Beersheba (read-only) and add a README line pointing to bunna-bridge. Nothing in it needs porting.

## Docs map (bunna-bridge `docs/`)

| Doc | Status | Use it for |
|---|---|---|
| `docs/knowledge-base/*` | **Current (2026-10-31)** | Start here |
| `CLAUDE.md` (repo root) | Current (CI note and KB pointer updated 2026-10-31) | AI workflow rules |
| `docs/audits/GROUND_TRUTH_AUDIT_2026-07-27.md` | Accurate at date; many items fixed | History of what was broken and why |
| `docs/architecture/CODEBASE_HOSTING_OVERVIEW.md` | Accurate 2026-09-06; DEBUG item since fixed | VPS layout |
| `docs/architecture/DATA_MODEL_GOTCHAS.md`, `API_CONVENTIONS.md`, `DOMAIN_MODEL.md` | Partly stale — no roaster, certifications, washing stations, roasting | Background |
| `docs/business/EUDR_COMPLIANCE.md`, `USER_ROLES.md` | Stale (pre-lockdown gate behaviour, no roaster) | Intent |
| `docs/development/FEATURE_ROADMAP.md` | Stops at June (marketplace phase 6) | History |
| `docs/ai/AI_WORKFLOW.md` | **Stale infra** (Hetzner IP `91.107.204.59`, runserver, `bunnabridge.com`) | Interaction rules only |
| `docs/THEMING.md` = `docs/architecture/THEMING.md` | Stale palette (pre-Highland Editorial) | — |
| `docs/BEERSHEBA_AI_CONTEXT.md` = `docs/ai/…`; `docs/BEERSHEBA_TASK_LIBRARY.md` ≈ `docs/development/…`; `docs/DEPLOYMENT.md` = `docs/development/…` | Duplicates at two paths | Delete root copies |
| `docs/development/DEPLOYMENT.md` | Wrong (`docker compose build backend/frontend` — no such services) | — |
| `docs/archive/*` | Archived | History only |
| `mds/feature-registry.md`, `feature-tailoring-brief.md`, `agriveri-analysis.md`, `analyst-additions.md`, `Beersheba audit.md` | Strategy & wishlist | Product direction |
| `mds/The feature tailoring brief.md` | Near-duplicate of `feature-tailoring-brief.md` | Delete one |
| `audit/01..07` | Empty templates, never filled | Delete or fill |
| `beersheba_docs_v2.zip` | June snapshot of docs | Delete |

## Timeline

| Date (2026) | Milestone |
|---|---|
| ≤ Jun 4 | Core: lots, 7 gates, cupping, samples, boundaries, deforestation zones, notifications |
| Jun 6–7 | Marketplace phases 2–6: lot page, offers, watchlist, exporter storefront, spec-sheet PDF |
| Jun 20–24 | Rebrand Bunna Bridge → Beersheba; AI Studio prototype (Beersheba repo); docs reorganised |
| Jun 30–Jul 5 | Infra fix after host `uv` crash-loop; NBE rate externalised; stale code paths fixed |
| Jul 15–21 | Token migration of Lots page, CI path/branch fix, dead `compliance` app removed |
| Jul 27 | Ground-truth audit + fixes: gates locked, documents protected, Farm IDs + farmer FK, public Lot Story, lot photos, farmer dashboard, offer→contracted |
| Aug 1–3 | Highland Editorial redesign, Gentelella back-office, donut/stat widgets, landing photography, **Roaster role** (profile, certifications, washing stations, roast equipment/batches/blends, dashboard), public marketplace + cert badges, public photo gallery |
| Sep 9 | Production switched to gunicorn + production settings; hosting overview doc |
| Oct 31 | This knowledge base + task plan |
