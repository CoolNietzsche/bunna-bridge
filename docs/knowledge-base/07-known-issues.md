# 07 — Known Issues Register

Verified by reading the code at `ba5a48f` on 2026-10-31 (not by live testing — confirm each with a test when fixing). Paths are relative to `bunna_bridge/bunna_bridge/` unless they start with `bunna-bridge-frontend/`. IDs are referenced from [09-task-plan.md](09-task-plan.md).

Severity: **Critical** = exploitable now / undermines the core promise · **High** = real risk or data wrong · **Medium** = should fix before scale · **Low** = hygiene.

## 1. Security & integrity

| ID | Sev | Issue | Where | Impact |
|---|---|---|---|---|
| SEC-1 | **Critical** | **Privilege escalation via `role`.** `RegisterSerializer` accepts any `role` incl. `admin`; `UserSerializer` (used by `/me/`, `/farmer/profile/`, `/roaster/profile/`) does not mark `role` read-only. | `users/serializers.py:13,23,34` | Anyone can register as, or PATCH themselves to, `admin` → read every lot (incl. drafts/prices), edit/delete any lot (`CanManageLotOrReadOnly` trusts `role=="admin"`), download every compliance document (`LotDocumentDownloadView`), act as admin on samples. Also lets any user turn into `qgrader` and post cupping scores. |
| SEC-2 | **Critical** | **Compliance bypass via `status` PATCH.** `status` is a writable field on `CoffeeLotListSerializer`, used by `PATCH /lots/<id>/`. | `lots/serializers.py:87` | Owner can jump `draft → exported` with all gates failing; skips the pipeline rule, the `export_ready` check and notifications. Breaks the core promise. |
| SEC-3 | High | **DDS endpoint: any user, any lot, flips a gate.** `EudrDdsView` doesn't scope the lot to the caller, sets `eudr_dds_ready=True`, and prints "Deforestation Free: Yes" regardless of the flag. | `lots/views.py:417,542,573` | Buyers can generate DDS for others' draft lots (data leak) and mark gate 3 passed; a lot that *failed* the deforestation check gets a PDF saying it passed. |
| SEC-4 | High | Settlement and spec-sheet endpoints don't scope lots. | `lots/views.py:241` (SettlementView), `LotSpecSheetView` | Any user can read volume/price of any draft lot via settlement output or spec sheet. |
| SEC-5 | High | No rate limiting anywhere (login, register, uploads). Login error reveals whether an email exists. | `config/settings/base.py` REST_FRAMEWORK; `users/serializers.py:61` | Brute force & account enumeration. |
| SEC-6 | Medium | No JWT blacklist; logout is client-side only; refresh tokens valid 7 d after logout/rotation. Tokens in `localStorage`. | settings `SIMPLE_JWT`; `bunna-bridge-frontend/src/api/client.ts` | Stolen tokens stay valid. |
| SEC-7 | Medium | Registration skips Django password validators (`validate_password` never called). | `users/serializers.py` `RegisterSerializer` | `aaaaaaaa` accepted. |
| SEC-8 | Medium | Offers: anyone (farmer, qgrader, exporter) can offer on any lot in any status, including their own lot or a draft; accepting one offer doesn't reject/close others; `available_qty_kg` never decremented; no check offer qty ≥ `min_order_kg`. | `lots/offer_views.py:42` | Inconsistent deals; multiple "accepted" offers on one lot. |
| SEC-9 | Medium | Sample requests: create on any lot (drafts too); `status` writable on create and via generic PATCH by the buyer (`approved`/`shipped` self-set); `respond` has no state machine. | `lots/serializers.py` `SampleRequestSerializer`, `lots/views.py` `SampleRequestViewSet` | Fake status, notifications spam. |
| SEC-10 | Medium | `/cupping-scores/` lists every score on every lot to any user, including drafts and pending scores. | `lots/views.py:212` | Data leak of unreleased quality data. |
| SEC-11 | Medium | `farmer/lots/` heuristic: any user can set `farm_kebele` on their own profile and then see unlinked lots matching it (any status, with prices). | `users/views.py:67-71` | Draft-lot leak. Remove heuristic now that `CoffeeLot.farmer` FK exists. |
| SEC-12 | Medium | Lot `farmer` and `washing_station_facility` FKs are writable with unscoped querysets — an exporter can attach another owner's washing station. | `lots/serializers.py` | Wrong provenance data. |
| SEC-13 | Low | Admin map injects lot names into HTML/JS unescaped (stored XSS in admin) and loads all 72k zones. | `lots/admin_views.py` | Admin-only XSS; page hangs. |
| SEC-14 | Low | `is_verified` exists but nothing sets it; no email verification for API registrations; no KYC of exporter ECTA license. | `users/` | Anyone can claim to be a licensed exporter. |

## 2. Correctness / functional bugs

| ID | Sev | Issue | Where |
|---|---|---|---|
| BUG-1 | High | NBE rate input in settlement widget is ignored — always default rate. | `bunna-bridge-frontend/src/components/SettlementWidget.tsx:21` |
| BUG-2 | High | Exporters can never reach `export_ready` on their own: gates 5 (`ecta_license_active`) and 7 (`cta_floor_met`) are admin-only with no automation or request flow. | `lots/serializers.py` read_only list; doc 05 |
| BUG-3 | Medium | Lot status can move backward any number of steps (exported → draft) with no reason/audit, and status changes via the status endpoint don't create notifications (only offers do). | `lots/views.py:375` |
| BUG-4 | Medium | Cert-derived lot badges never expire on their own (recomputed only on cert save/delete). | `users/signals.py` |
| BUG-5 | Medium | `phyto_cert_expiry`, `ecex_permit_expiry`, `ecta_license_expiry` stored but never enforced or alerted. | `lots/models.py`, `users/models.py` |
| BUG-6 | Medium | Point-only farms don't appear on the farmer map. | `bunna-bridge-frontend/src/pages/FarmerLotsMap.tsx:73` |
| BUG-7 | Medium | `sca_score` & cupping component TS types say `number`, API sends strings. | `bunna-bridge-frontend/src/api/lots.ts:18` |
| BUG-8 | Medium | Deforestation check: degree-based buffer for points; flag not reset when geometry removed; checks not re-run when zone data reloads. | `lots/eudr_spatial.py` |
| BUG-9 | Low | `sca_score` stays manually editable by the exporter even after a confirmed Q-grader score exists. | `lots/serializers.py` |
| BUG-10 | Low | N+1 queries: `latest_sca_score` / `certifications` per lot in list serializer; storefront stats query per call. | `lots/serializers.py`, `users/serializers.py` |
| BUG-11 | Low | Django admin, DDS PDF, admin map still branded "Bunna Bridge" with old palette. | `config/settings/base.py:382`, `lots/views.py`, `lots/admin_views.py` |
| BUG-12 | Low | Backend test baseline has ~5 failing + 3 erroring cookiecutter boilerplate tests (per 2026-08-02 session), so CI is red/noisy. | `users/tests/` |

## 3. Infrastructure / operations

| ID | Sev | Issue |
|---|---|---|
| OPS-1 | **Critical** | **No database backups.** Single Docker volume on a shared VPS. Also media files (uploaded certificates, photos) not backed up. |
| OPS-2 | High | Production runs from `docker-compose.local.yml` + override; env files are the `.local` ones plus `.production/.django`. Confirm on VPS: systemd unit uses the vps override, `DJANGO_ALLOWED_HOSTS` = `bunnabridge.pro.et`, Flower (5555) and Postgres not publicly exposed, `DJANGO_ADMIN_URL` not `admin/`. |
| OPS-3 | High | No error monitoring (Sentry) and email backend is console → password resets/notifications by email impossible; 500s invisible. |
| OPS-4 | Medium | Manual deploys (git pull, npm build, copy dist, restart). No deploy script in repo, no rollback. |
| OPS-5 | Medium | CI: no frontend lint/build job (backend lint + pytest only, on `master`). |
| OPS-6 | Medium | HSTS only 60 s; media served by Django in production via `static()` (works, but nginx should serve public media directly). |
| OPS-7 | Low | Celery worker/beat run but have no real tasks — wasted RAM on a shared box, or put them to work (alerts, checks, PDFs). |
| OPS-8 | Low | Repo hygiene: ~8 MB of Claude transcript dumps committed (`session.txt`, `claudesession.txt`, `2026-08-02-*.txt`), `output`, `beersheba_docs_v2.zip`, `bunna-bridge-frontend/{=,output.txt,response.txt}`. |

## 4. Previously reported and now fixed (don't re-fix)

From the 2026-07-27 ground-truth audit: exporter self-certification of 5 gates via PATCH (now read-only, with tests); compliance documents visible to buyers and publicly downloadable (now owner/admin-only views + nginx deny); no file validation on documents (now pdf/jpg/png ≤10 MB); `gps_verified` manual (now derived); `eudr_dds_ready` manual (now set by DDS generation — but see SEC-3); spec-sheet `/v1` URL; `farm_polygon`/`FarmerProfile` stale references; offer accept not contracting the lot; DEBUG=True dev server in production (switched 2026-09-09).
