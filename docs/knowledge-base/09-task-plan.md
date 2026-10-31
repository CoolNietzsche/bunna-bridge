# 09 — Task Plan (from 2026-10-31)

Ordered by risk first, then by what makes the core promise ("automated EUDR + export compliance") true, then growth. Issue IDs (SEC-, BUG-, OPS-) are defined in [07-known-issues.md](07-known-issues.md).
Size: **S** ≤ half a day · **M** 1–3 days · **L** a week or more. Every backend task ships with a pytest test; every frontend task passes `npm run lint && npm run build`.

---

## Phase 0 — Stop the bleeding (this week, before any new feature or customer)

| # | Task | Fixes | Size | Done when |
|---|---|---|---|---|
| 0.1 | **Automated backups**: nightly `pg_dump` of the Postgres container + tar of `bunna_bridge/bunna_bridge/media/`, 14-day rotation, copied off the VPS (e.g. object storage). Do one restore test into a scratch DB. | OPS-1 | S | Backup file appears daily off-box; restore test documented |
| 0.2 | **Lock `role`**: make `role` read-only in `UserSerializer`; in `RegisterSerializer` allow only `exporter`, `buyer`, `farmer`, `roaster` (`qgrader`/`admin` assigned by staff). Then on the VPS list all users with `role in (admin, qgrader)` and confirm each is legitimate. | SEC-1 | S | Tests: register as admin → 400; PATCH /me role → unchanged |
| 0.3 | **Make `status` read-only** on `CoffeeLotListSerializer`; status only changes via `/lots/<id>/status/` and offer acceptance. | SEC-2 | S | Test: PATCH status=exported → status unchanged |
| 0.4 | **Fix DDS endpoint**: scope lot to owner/admin; refuse unless `deforestation_free is True` and `gps_verified`; print the real deforestation result; store the generated PDF in `eudr_dds_file` with a timestamp. | SEC-3 | M | Tests for buyer → 404, failing lot → 400, owner → PDF stored |
| 0.5 | **Scope settlement & spec-sheet** to lots in the caller's `get_queryset()` (owner, or marketplace-visible). | SEC-4 | S | Test: buyer on draft lot → 404 |
| 0.6 | **Verify VPS config** (founder runs read-only commands): `systemctl cat bunna-bridge`, `docker ps`, `ss -tlnp` for 5555/5432/6379/8001 exposure, `DJANGO_ALLOWED_HOSTS`, `DJANGO_ADMIN_URL`. | OPS-2 | S | Findings written into `CODEBASE_HOSTING_OVERVIEW.md` |
| 0.7 | **Beersheba prototype**: make sure no real account uses the demo passwords in `server.ts`; archive the repo / make private. | — | S | Repo archived |

## Phase 1 — Hardening (next ~2 weeks)

| # | Task | Fixes | Size |
|---|---|---|---|
| 1.1 | DRF throttling (`AnonRateThrottle`, `UserRateThrottle`, stricter scope on token/register); generic "invalid email or password" message | SEC-5 | S |
| 1.2 | Add `rest_framework_simplejwt.token_blacklist`, `BLACKLIST_AFTER_ROTATION`, a `/auth/logout/` endpoint; frontend calls it; only remove auth keys (not `localStorage.clear()`) | SEC-6 | S |
| 1.3 | Call `validate_password` in registration | SEC-7 | S |
| 1.4 | Offer rules: only buyer/roaster, only `listed` lots, not own lot, qty ≥ `min_order_kg` and ≤ `available_qty_kg`; on accept, decrement `available_qty_kg` and auto-reject other open offers when qty hits 0 — inside a transaction with `select_for_update` | SEC-8 | M |
| 1.5 | Sample requests: only on listed lots, `status`/`response`/`tracking_number` read-only on the serializer, explicit transitions (pending→approved/rejected, approved→shipped, shipped→received by buyer) | SEC-9 | S |
| 1.6 | Scope `/cupping-scores/` (graders: own; owners: own lots; others: confirmed scores on marketplace lots) | SEC-10 | S |
| 1.7 | Remove `farmer/lots` kebele/region heuristic (one-off admin data fix to link legacy lots to farmers first) | SEC-11 | S |
| 1.8 | Validate writable FKs on lots: `washing_station_facility` must be owned by caller; `farmer` must have role farmer | SEC-12 | S |
| 1.9 | Admin map: escape strings, load zones as a vector/bbox-limited layer instead of all 72k | SEC-13 | M |
| 1.10 | Make the test suite green (fix or delete broken cookiecutter tests), add a frontend lint+build job to CI | BUG-12, OPS-5 | S |
| 1.11 | Sentry (backend + frontend) and a real transactional email provider (Mailgun/SES/Brevo) so password reset and notifications can email | OPS-3 | M |
| 1.12 | `scripts/deploy.sh`: pull → build image → migrate → collectstatic → `npm ci && npm run build` → rsync dist → restart → smoke-check `/api/v1/lots/` | OPS-4 | M |

## Phase 2 — Make the compliance engine true (≈ 3–5 weeks) — the core product

| # | Task | Fixes | Size |
|---|---|---|---|
| 2.1 | **Compliance audit log**: new append-only `ComplianceEvent` (lot, gate, old→new, actor/system, evidence ref, timestamp, `prev_hash`, `hash`). Every gate change writes one. Show it as a timeline on the lot page. This is the MVP "tamper-evident ledger" from the strategy docs. | — | M |
| 2.2 | **Gate 5 automated**: `ecta_license_active` derived from exporter's ECTA file + `ecta_license_expiry ≥ today` + an admin "license verified" step (sets `is_verified`). Applied on save and by a daily task. | BUG-2, SEC-14 | M |
| 2.3 | **Gate 7 automated**: `FloorPrice` model (grade, processing, valid_from/to, USD/kg) managed in admin; `cta_floor_met = fob_price_usd ≥ floor`. Confirm the actual ECTA minimum-price rules with an advisor first. | BUG-2 | M |
| 2.4 | **Expiry enforcement**: phyto/ECEX/ECTA expiry dates required with the file and checked by the gates; Celery beat daily job → 30-day and 7-day notifications; recompute cert badges daily | BUG-4, BUG-5, OPS-7 | M |
| 2.5 | **Readiness UI**: per-gate green/amber/red with "what's blocking + upload slot + how to fix", 0–100 % readiness score on lot page and dashboard (from tailoring brief §1) | — | M |
| 2.6 | **Deforestation check v2**: metre-based buffer (geography or projected CRS), reset on geometry removal, Celery task to re-check all lots after data reload, script the Hansen preprocessing into the repo, evaluate adding JRC Global Forest Cover 2020 baseline, polygon validation (valid, inside Ethiopia, plausible area; require polygon when farm > 4 ha) | BUG-8 | L |
| 2.7 | **EUDR export**: per-lot GeoJSON of all source plots in the EU Information System format, store DDS reference number returned by TRACES on the lot | — | M |
| 2.8 | Lot status: forbid backward moves after `contracted` except by admin with a reason; notify on every status change; log to 2.1 | BUG-3 | S |
| 2.9 | Lock `sca_score` once a confirmed cupping exists; show "self-reported" vs "Q-grader verified" badge | BUG-9 | S |
| 2.10 | Rewrite `docs/business/EUDR_COMPLIANCE.md` to match reality (which gates are automated vs attested) — use it with investors/partners | — | S |

## Phase 3 — Complete the trade loop (≈ 3–4 weeks)

| # | Task | Fixes | Size |
|---|---|---|---|
| 3.1 | Settlement widget sends the typed rate; show rate source/date; admin-editable current NBE rate (model, not env) | BUG-1 | S |
| 3.2 | Fix TS decimal types and audit call sites | BUG-7 | S |
| 3.3 | Farmer map shows point-only farms (add coordinates to list serializer or a dedicated map endpoint) | BUG-6 | S |
| 3.4 | Contract record on accepted offer (terms PDF: parties, qty, price, Incoterm, delivery window) + contract → settlement link | — | M |
| 3.5 | Sample loop: buyer marks received and submits own cupping score against the lot (analyst addition #4) | — | M |
| 3.6 | Email + in-app notifications for offers, samples, expiries (depends on 1.11) | — | S |
| 3.7 | Server-side watchlist (sync across devices) | — | S |
| 3.8 | Performance: fix N+1 in list serializers (annotate/prefetch), add DB indexes on `status`, `exporter`, `farmer` combos | BUG-10 | S |

## Phase 4 — Growth features from the strategy docs (prioritise with the founder)

| # | Task | Size |
|---|---|---|
| 4.1 | **Public NBE settlement calculator** (no login) as an acquisition hook | S |
| 4.2 | **QR codes** for lot story pages (download PNG/SVG for bags; `qrcode` dep already installed) | S |
| 4.3 | **Amharic i18n** (react-i18next; farmer-facing screens Amharic-first) | L |
| 4.4 | **Offline-first field enrollment PWA** (service worker, IndexedDB queue — builds on `useBoundarySync`) for agents enrolling farmers & tracing polygons | L |
| 4.5 | Cooperative / union management + exporter supplier roster (many farmers → one lot) | L |
| 4.6 | Exporter trust score (response time, on-time shipments, cup consistency, compliance rate) on storefronts | M |
| 4.7 | Lot birth-certificate PDF for roasters (origin, map, score, certs, EUDR status) | M |
| 4.8 | Payments/escrow integration for the milestone model (needs legal/banking decision) | L |

## Phase 5 — Continuous hygiene (fit around the above)

- Finish the Tailwind token migration (≈56 files with inline styles, 18 with raw hex); rebrand Django admin, DDS PDF and admin map (BUG-11).
- Delete repo junk (OPS-8): transcript dumps, `output`, `beersheba_docs_v2.zip`, frontend `=`/`output.txt`/`response.txt`; add patterns to `.gitignore`.
- Docs cleanup: delete duplicate root copies, fix or remove `DEPLOYMENT.md`, refresh `AI_WORKFLOW.md` infra section to point at this KB, delete empty `audit/`, remove dead `users/urls.py` routes, replace frontend README.
- Remove unused deps (`mapbox-gl`); stop running Celery Flower publicly.
- Raise HSTS once HTTPS is confirmed stable; let nginx serve public media.

---

## Decisions needed from the founder

1. **Who may self-register as which role?** (Proposed: exporter/buyer/farmer/roaster self-serve; qgrader and admin by invitation; exporters unverified until ECTA license is checked.)
2. **Floor price source** for gate 7 — which ECTA/MoT rule and who updates it?
3. **NBE rules** — confirm current retention/conversion rule and rate source after Ethiopia's 2024 FX reform.
4. **Positioning of the gates** with buyers/investors until Phase 2 lands: "automated where marked, attested elsewhere".
5. **Beersheba repo** — OK to archive?
6. **Hosting** — stay on the shared VPS (with backups + monitoring) or move Beersheba to its own small server before onboarding paying customers?

## Suggested first sprint (copy into an issue tracker)

`0.1 backups` → `0.2 role lock` → `0.3 status read-only` → `0.4 DDS fix` → `0.5 scoping` → `0.6 VPS check` → `1.10 green tests + frontend CI` → `1.1 throttling` → `1.2 token blacklist`. One PR per task, each with its test.
