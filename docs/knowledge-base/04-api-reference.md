# 04 — API Reference

Base: `/api/`. Auth: `Authorization: Bearer <access>` (SimpleJWT). Default permission is `IsAuthenticated` unless noted. List endpoints paginate (`?page=`, 20/page) unless noted. The frontend axios client uses `baseURL: "/api"`, so frontend paths start at `/v1/...` or `/auth/...`.

Legend — **Who**: Anon = no login; Auth = any logged-in user; Owner = the lot's `exporter`; "admin" = `role == "admin"` (not necessarily Django staff).

## Auth & users (`config/urls.py`, `users/api_urls.py`)

| Method & path | Who | Notes |
|---|---|---|
| POST `/api/auth/token/` | Anon (10/min) | `{email, password}` → `{access, refresh, user}`; generic error message. |
| POST `/api/auth/token/refresh/` | Anon | Rotates the refresh token; the old one is blacklisted. |
| POST `/api/v1/auth/logout/` | Anon | `{refresh}` → blacklists it. |
| GET `/api/v1/auth/license-reviews/`, POST `…/<id>/` | Staff/admin | ECTA license review (`{"approve": true|false}`). |
| POST `/api/v1/auth/register/` | Anon (throttled) | `role` ∈ exporter, buyer, farmer, roaster. Runs Django password validators; rejects duplicate emails. |
| GET/PATCH `/api/v1/auth/me/` | Auth | Own profile, multipart OK. `role`, `is_verified`, `farm_id`, `ecta_license_verified_at` read-only. |
| GET `/api/v1/auth/users/` | Django staff | All users. |
| GET/PATCH `/api/v1/auth/farmer/profile/` | Auth (GET farmer/staff) | Same serializer as `/me/`. |
| GET `/api/v1/auth/farmer/lots/` | Auth | Lots linked to caller as farmer, plus unlinked lots matching their kebele/region (heuristic). Unpaginated. |
| GET `/api/v1/auth/farmers/` | exporter/admin/staff | Farmer picker for lot creation. |
| GET/PATCH `/api/v1/auth/roaster/profile/` | Auth (GET roaster/staff) | |
| GET `/api/v1/auth/exporters/<int:pk>/` | Auth | Public storefront profile + stats. |
| GET `/api/v1/auth/exporters/<int:pk>/lots/` | Auth | That exporter's listed/contracted/exported lots. |
| GET `/api/v1/auth/exporters/<int:pk>/ecta-license/` | That exporter / admin / staff | File download. |
| GET/POST `/api/v1/auth/certifications/`, GET/PATCH/DELETE `…/<uuid>/` | Auth (own records) | |

## Lots (`lots/urls.py`, `lots/views.py`)

| Method & path | Who | Notes |
|---|---|---|
| GET `/api/v1/lots/` | **Anon** | `?marketplace=1` = public catalogue for everyone. Otherwise: anon/buyer: listed+contracted+exported; exporter: own; roaster: own + marketplace; farmer: linked; admin/staff/qgrader: all. `?page_size=` up to 500. Filters: `region, grade, processing, status, deforestation_free, eudr_dds_ready`; `search`; `ordering`. Prices masked for anon. |
| GET `/api/v1/lots/<uuid>/` | **Anon** | GeoJSON Feature. Document URLs only for owner/admin. |
| POST `/api/v1/lots/` | exporter/roaster/admin | `exporter` = caller. |
| PATCH/PUT/DELETE `/api/v1/lots/<uuid>/` | Owner/admin/staff | Gates, `status`, `farm_photos` read-only. Document files are write-only here (multipart). |
| GET `/api/v1/lots/<uuid>/compliance-check/` | Auth in queryset | Re-derives gates, re-runs the satellite check; returns gates, `failed_gates`, `readiness_percent`, per-gate `report`. |
| GET `/api/v1/lots/<uuid>/compliance-events/` | Auth in queryset | Hash-chained gate audit log + `chain_valid`. |
| GET `/api/v1/lots/<uuid>/eudr-geojson/` | Owner/admin | Plot GeoJSON FeatureCollection for TRACES. |
| GET/POST `/api/v1/lots/<uuid>/cupping-scores/` | GET: Auth; POST: qgrader/admin/staff | |
| POST `/api/v1/lots/<uuid>/cupping-scores/<score_id>/confirm/` | Grader or staff | Locks score, copies onto lot. |
| PATCH `/api/v1/lots/<uuid>/status/` | Owner (exporter/roaster) or admin | `{status}`; no forward skipping; `exported` requires `export_ready`. Backward moves unrestricted. |
| POST `/api/v1/lots/<uuid>/settlement/` | Owner/admin | `{nbe_rate?, total_usd?}` → fee, NBE split, ETB amount, milestones. |
| GET `/api/v1/lots/<uuid>/eudr-dds/` | Owner/admin | Refuses unless GPS + deforestation pass; builds, stores (`eudr_dds_file`) and returns the PDF. |
| GET `/api/v1/lots/<uuid>/spec-sheet/` | Auth, lots they can see | ReportLab spec sheet PDF. |
| PATCH `/api/v1/lots/<uuid>/boundary/` | Owner/admin | `{boundary: GeoJSON Polygon}` → saves, runs deforestation check. |
| POST `/api/v1/lots/<uuid>/boundary/inherit/` | Owner/admin | Copies linked farmer's boundary (admin: kebele/region guess). |
| POST/DELETE `/api/v1/lots/<uuid>/photos/` | Owner/farmer/admin | jpeg/png/webp, ≤5 MB, ≤8. Photos are public media. |
| GET `/api/v1/lots/<uuid>/documents/<field>/` | Owner/admin/staff (buyer with accepted offer: `eudr_dds_file` only) | field ∈ phyto_cert_file, ecex_permit_file, nbe_fx_declaration_file, customs_declaration_file, eudr_dds_file |
| GET `/api/v1/lots/<uuid>/story/` | **Anon** | Public whitelist serializer; listed+ lots only. |
| GET `/api/v1/cupping-scores/` | Auth | Graders: own; owners: all on own lots; others: confirmed scores on visible lots. |

## Samples, offers, notifications

| Method & path | Who | Notes |
|---|---|---|
| GET/POST `/api/v1/sample-requests/` | Auth | Buyer sees own; exporter sees on own lots; roaster both; admin all. Create: buyer/roaster, listed lots, not own lot. No PUT/PATCH/DELETE. `POST …/<id>/received/` by the requester once shipped. |
| POST `/api/v1/sample-requests/<uuid>/respond/` | Lot owner/admin | `{status: approved\|rejected\|shipped, response, tracking_number}` |
| GET/POST `/api/v1/offers/` | Auth | Buyer: own; exporter: on own lots; roaster: both; admin: all. Create: buyer/roaster, listed lot, not own, ≥ min order, ≤ available. Accept is atomic, decrements stock, contracts the lot and closes competing offers. |
| GET `/api/v1/offers/<uuid>/` | Buyer or lot owner | |
| POST `/api/v1/offers/<uuid>/respond/` | Lot owner | `{action: accept\|reject\|counter, counter_price, counter_qty, exporter_notes}`. Accept → lot `contracted`. |
| POST `/api/v1/offers/<uuid>/withdraw/` | Buyer | pending/countered only |
| POST `/api/v1/offers/<uuid>/accept-counter/` | Buyer | → accepted, lot contracted |
| GET `/api/v1/notifications/` | Auth | Last 50, unpaginated |
| GET `/api/v1/notifications/unread-count/` | Auth | |
| POST `/api/v1/notifications/read-all/`, `…/<int:id>/read/` | Auth | |

## Washing stations & roasting

| Method & path | Who | Notes |
|---|---|---|
| GET/POST `/api/v1/washing-stations/`, GET/PATCH/DELETE `…/<uuid>/` | Auth (own) | Note: not under `/lots/` (would collide with the router). |
| `/api/v1/roasting/equipment/` (+ `<uuid>/`) | roaster/staff | own records |
| `/api/v1/roasting/batches/` (+ `<uuid>/`) | roaster/staff | own records, blend lines nested |
| PATCH `/api/v1/roasting/batches/<uuid>/status/` | roaster/staff | no forward skip; `packaged` needs output weight |
| GET `/api/v1/roasting/available-lots/` | roaster/staff | own lots + accepted-offer lots |

## Non-API routes

- `/admin/` (path from `DJANGO_ADMIN_URL`) — Jazzmin Django admin; custom farm-boundary map at `/admin/lots/map/`.
- `/accounts/` (allauth), `/` and `/about/` Django templates (unused: nginx serves the SPA at `/`). The cookiecutter `/users/` pages were removed.
- `/media/` — served by Django `static()` in all modes; nginx blocks compliance-doc subpaths.

## Conventions

- Always relative URLs in the frontend (`/api/...`).
- Upload-capable views declare `MultiPartParser, FormParser, JSONParser`.
- Object scoping is done in `get_queryset()` → out-of-scope objects 404 (good pattern; follow it).
