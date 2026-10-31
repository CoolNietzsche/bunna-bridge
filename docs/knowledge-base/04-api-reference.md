# 04 — API Reference

Base: `/api/`. Auth: `Authorization: Bearer <access>` (SimpleJWT). Default permission is `IsAuthenticated` unless noted. List endpoints paginate (`?page=`, 20/page) unless noted. The frontend axios client uses `baseURL: "/api"`, so frontend paths start at `/v1/...` or `/auth/...`.

Legend — **Who**: Anon = no login; Auth = any logged-in user; Owner = the lot's `exporter`; "admin" = `role == "admin"` (not necessarily Django staff).

## Auth & users (`config/urls.py`, `users/api_urls.py`)

| Method & path | Who | Notes |
|---|---|---|
| POST `/api/auth/token/` | Anon | `{email, password}` → `{access, refresh, user}`. No rate limit. |
| POST `/api/auth/token/refresh/` | Anon | Rotates refresh token (old one stays valid — no blacklist). |
| POST `/api/v1/auth/register/` | Anon | Accepts `role` — ⚠ including `admin` (see 07 §1). |
| GET/PATCH `/api/v1/auth/me/` | Auth | Own profile, multipart OK. ⚠ `role` writable. |
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
| GET `/api/v1/lots/` | **Anon** | Anon/buyer: listed+contracted+exported. Exporter: own. Roaster: own + marketplace. Farmer: linked. Admin/staff/qgrader: all. Filters: `region, grade, processing, status, deforestation_free, eudr_dds_ready`; `search`; `ordering`. Prices masked for anon. |
| GET `/api/v1/lots/<uuid>/` | **Anon** | GeoJSON Feature. Document URLs only for owner/admin. |
| POST `/api/v1/lots/` | exporter/roaster/admin | `exporter` = caller. |
| PATCH/PUT/DELETE `/api/v1/lots/<uuid>/` | Owner/admin/staff | Gate flags read-only. ⚠ `status` writable here (bypasses gate checks). |
| GET `/api/v1/lots/<uuid>/compliance-check/` | Auth in queryset | Re-runs deforestation check (may update the flag), returns gates + `failed_gates`. |
| GET/POST `/api/v1/lots/<uuid>/cupping-scores/` | GET: Auth; POST: qgrader/admin/staff | |
| POST `/api/v1/lots/<uuid>/cupping-scores/<score_id>/confirm/` | Grader or staff | Locks score, copies onto lot. |
| PATCH `/api/v1/lots/<uuid>/status/` | Owner (exporter/roaster) or admin | `{status}`; no forward skipping; `exported` requires `export_ready`. Backward moves unrestricted. |
| POST `/api/v1/lots/<uuid>/settlement/` | Auth (⚠ any lot) | `{nbe_rate?, total_usd?}` → fee, NBE split, ETB amount, milestones. |
| GET `/api/v1/lots/<uuid>/eudr-dds/` | Auth (⚠ any lot) | Builds DDS PDF; requires `gps_verified`; sets `eudr_dds_ready=True`. Not stored. |
| GET `/api/v1/lots/<uuid>/spec-sheet/` | Auth (⚠ any lot) | ReportLab spec sheet PDF. |
| PATCH `/api/v1/lots/<uuid>/boundary/` | Owner/admin | `{boundary: GeoJSON Polygon}` → saves, runs deforestation check. |
| POST `/api/v1/lots/<uuid>/boundary/inherit/` | Owner/admin | Copies linked farmer's boundary (admin: kebele/region guess). |
| POST/DELETE `/api/v1/lots/<uuid>/photos/` | Owner/farmer/admin | jpeg/png/webp, ≤5 MB, ≤8. Photos are public media. |
| GET `/api/v1/lots/<uuid>/documents/<field>/` | Owner/admin/staff | field ∈ phyto_cert_file, ecex_permit_file, nbe_fx_declaration_file, customs_declaration_file, eudr_dds_file |
| GET `/api/v1/lots/<uuid>/story/` | **Anon** | Public whitelist serializer; listed+ lots only. |
| GET `/api/v1/cupping-scores/` | Auth | ⚠ Every score on every lot. Filters `lot, status, grader`. |

## Samples, offers, notifications

| Method & path | Who | Notes |
|---|---|---|
| GET/POST `/api/v1/sample-requests/` | Auth | Buyer sees own; exporter sees on own lots; roaster both; admin all. ⚠ Create doesn't check lot status/role; `status` writable on create/PATCH. |
| POST `/api/v1/sample-requests/<uuid>/respond/` | Lot owner/admin | `{status: approved\|rejected\|shipped, response, tracking_number}` |
| GET/POST `/api/v1/offers/` | Auth | Buyer: own offers; exporter/admin: offers on own lots; roaster: both. ⚠ Create: any role, any lot status, even your own lot. |
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
- `/accounts/` (allauth), `/users/` (cookiecutter user pages — dead code duplicating `/me/`), `/` and `/about/` Django templates (unused: nginx serves the SPA at `/`).
- `/media/` — served by Django `static()` in all modes; nginx blocks compliance-doc subpaths.

## Conventions

- Always relative URLs in the frontend (`/api/...`).
- Upload-capable views declare `MultiPartParser, FormParser, JSONParser`.
- Object scoping is done in `get_queryset()` → out-of-scope objects 404 (good pattern; follow it).
