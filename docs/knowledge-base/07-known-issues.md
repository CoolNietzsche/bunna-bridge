# 07 — Known Issues Register

First compiled 2026-10-31 by reading the code at `ba5a48f`. **Updated the same day after the hardening release** (commits `93bda4e`, `b85398d`, `d6ac312`): every item marked **Fixed** has a regression test in `bunna_bridge/bunna_bridge/lots/test_security_and_compliance.py` and was also exercised through the real UI with an automated browser run (18/18 flows passing).

Paths are relative to `bunna_bridge/bunna_bridge/` unless they start with `bunna-bridge-frontend/`.

## 1. Security & integrity

| ID | Sev | Issue | Status |
|---|---|---|---|
| SEC-1 | Critical | Anyone could register as `admin`/`qgrader` or PATCH their own `role` | **Fixed** — `role` read-only on profiles; registration limited to exporter/buyer/farmer/roaster |
| SEC-2 | Critical | `status` writable on generic lot PATCH → skip the export gate | **Fixed** — read-only; changes only via `/status/` or offer acceptance |
| SEC-3 | High | DDS endpoint: any user, any lot, flipped gate 3, always printed "Deforestation Free: Yes" | **Fixed** — owner/admin only, refuses unless location + deforestation pass, prints the real result, stores the PDF |
| SEC-4 | High | Settlement / spec sheet readable for any lot | **Fixed** — settlement owner-only; spec sheet limited to lots the caller can see |
| SEC-5 | High | No rate limiting; login revealed which emails exist | **Fixed** — DRF throttling (login/register 10/min, env `DRF_THROTTLE_*`), one generic login error |
| SEC-6 | Medium | No token revocation on logout | **Fixed** — JWT blacklist, `/auth/logout/`, rotation stores the new refresh token. Tokens still live in `localStorage` (open: move to httpOnly cookies) |
| SEC-7 | Medium | Weak passwords accepted | **Fixed** — Django validators run at registration |
| SEC-8 | Medium | Offers on any lot by anyone; no stock or min-order checks | **Fixed** — buyer/roaster only, listed lots, not own lot, min order + stock; atomic accept closes competing offers |
| SEC-9 | Medium | Sample status self-settable; no state machine | **Fixed** — no generic PATCH; pending→approved/rejected→shipped (tracking required)→received |
| SEC-10 | Medium | All cupping scores visible to everyone | **Fixed** — graders: own; owners: own lots; others: confirmed scores on visible lots |
| SEC-11 | Medium | `farmer/lots` kebele heuristic leaked drafts | **Fixed** — only lots linked by FK |
| SEC-12 | Medium | Could link another owner's washing station / a non-farmer | **Fixed** — validated |
| SEC-13 | Low | Admin map XSS + loaded 72k zones | **Fixed** — escaped; only zones within 5 km of lots (max 3,000) |
| SEC-15 | **Critical** | The sign-in page shipped a "Demo accounts — click to autofill" panel containing **plaintext passwords** (including an Admin account) in the production JavaScript | **Fixed in code 2026-11-01** — panel only exists in local dev builds and uses `seed_demo` accounts; production bundle verified credential-free. **Live action still required:** change the passwords of `admin@bunnabridge.com`, `dawit@addiscoffee.et`, `sarah@nordicros.de`, `james@brooklynroastery.com`, `abebe@kochere.et`, `tigist@scaethiopia.et` on the live site (or deactivate them) — the old passwords are public in every previously deployed build |
| SEC-14 | Low | No license verification | **Fixed for ECTA** — staff verify via `/admin/licenses` (SPA) or Django admin action; changing the license clears verification. Email verification for API sign-ups still open |

## 2. Correctness / functional bugs

| ID | Issue | Status |
|---|---|---|
| BUG-1 | Settlement NBE rate input ignored | **Fixed** |
| BUG-2 | Gates 5 and 7 admin-only, so exporters could never export | **Fixed** — gate 5 from verified, unexpired license; gate 7 from the `FloorPrice` table |
| BUG-3 | Status could move backward freely, no notifications | **Fixed** — owners may only unlist (listed→draft); contracted requires an accepted offer; every change notifies |
| BUG-4 | Cert badges never expired | **Fixed** — daily Celery job |
| BUG-5 | Document expiry dates ignored | **Fixed** — phyto expiry enforced in gate 4; 30/7/1/0-day alerts for phyto, ECEX, ECTA, certifications |
| BUG-6 | Point-only farms missing on map | **Fixed** — list API includes `farm_location` / `gps_lat` / `gps_lng` |
| BUG-7 | Decimal fields typed as numbers | **Fixed** — typed as strings; caught a real sort bug in `lib/catalog.ts` |
| BUG-8 | Degree buffer; flag not reset; no re-check | **Fixed** — 500 m metric buffer, reset when geometry removed, check re-runs on every geometry change; DDS invalidated when geometry changes |
| BUG-9 | `sca_score` editable after confirmed cupping | **Fixed** |
| BUG-10 | N+1 queries in lot list | **Fixed** (prefetch) |
| BUG-11 | Old "Bunna Bridge" branding in admin/PDFs | **Fixed** |
| BUG-12 | Broken cookiecutter tests | **Fixed** — suite is 104 passing, 0 failing |
| BUG-13 | Document uploads via the lot form were silently dropped (fields missing from serializer) | **Fixed** (found during this pass) |
| BUG-14 | Boundary area shown as negative hundreds of hectares | **Fixed** — geodesic area |
| BUG-15 | Lot detail two-column layout never applied (invalid CSS) | **Fixed** |
| BUG-16 | List endpoints truncated at 20 lots on marketplace/dashboard | **Fixed** — `?page_size=` up to 500 |

## 3. Still open

| ID | Sev | Issue |
|---|---|---|
| OPS-1 | **Critical** | **No database or media backups** (deliberately out of scope this round) |
| OPS-2 | High | VPS configuration not re-verified (systemd override, exposed ports, `ALLOWED_HOSTS`, admin URL) |
| OPS-3 | High | No error monitoring; email backend is console, so no emails are actually delivered (notifications are in-app only) |
| OPS-4 | Medium | Manual deploys — see [10-release-2026-10-31.md](10-release-2026-10-31.md) for exact commands |
| OPS-6 | Medium | HSTS 60 s; Django serves media |
| OPS-8 | Low | Repo junk: transcript dumps, `output`, `beersheba_docs_v2.zip`, `bunna-bridge-frontend/{=,output.txt,response.txt}` |
| LINT | Low | 52 pre-existing ESLint errors (CI reports them without blocking) and ~550 pre-existing ruff findings (CI's pre-commit job was already failing before this work) |
| AUTH | Medium | JWT in `localStorage`; no email verification for API registrations |
| DATA | Medium | Floor prices must be entered by an admin (gate 7 fails for every lot until they are); Hansen preprocessing script not in repo; no JRC 2020 forest baseline |
| UX | Low | No Amharic; no offline PWA; old inline-style components still to migrate to tokens |
