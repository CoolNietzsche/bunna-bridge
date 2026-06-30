# Session Log — 2026-06-30: Infra Fix + Backend Audit Cleanup

## Summary
Fixed a broken Celery infrastructure issue, then worked through the backend
technical debt items from `TECHNICAL_AUDIT.md`. Key finding: **the audit docs
had drifted from actual code state** — two of four flagged items were already
fixed or never actually broken as described. Always verify against source
before acting on audit/doc claims; this session is a case study in why.

## 1. Infra Fix: Celery containers crash-looping
**Symptom:** `bunna_bridge_local_celeryworker` and `_celerybeat` stuck in
`Restarting (127)` with error `watchfiles: cannot execute: required file not found`.
**Root cause:** `.venv` had been created by running `uv sync` directly on the
host VPS at some point, which hardcoded absolute host paths
(`/root/bunna-bridge/bunna_bridge/.venv/bin/python3`) into every script's
shebang line. The container mounts the project at `/app`, not the host path,
so those shebangs pointed nowhere inside the container.
**Fix:** `rm -rf .venv` then rebuilt it via
`docker compose -f docker-compose.local.yml run --rm django uv sync` (i.e.
inside the container, not on the host). New shebangs correctly point to
`/app/.venv/bin/python3`.
**Rule going forward:** NEVER run `uv add`/`uv sync` directly on the host.
Always use the Docker Compose wrapper. `.venv` is gitignored (confirmed).

## 2. Backend Audit Item: Stale code paths — CONFIRMED REAL, FIXED
Both of these were genuinely broken and have been verified fixed:
*   `EudrDdsView` (`lots/views.py`): used nonexistent `lot.farm_polygon`.
    `CoffeeLot` only has `farm_location` (Point) and `boundary` (Polygon) —
    confirmed by reading the actual model. Fixed to use `lot.boundary`.
    This would have thrown `AttributeError` for any lot with a polygon
    boundary but no point location (e.g. farms ≥4ha per the geospatial
    convention in this codebase).
*   `LotBoundaryInheritView` (`lots/views.py`): imported a `FarmerProfile`
    model that does not exist in `users/models.py`. The import was wrapped
    in a bare `try/except Exception`, so the `ImportError` was silently
    swallowed and the endpoint **always returned 404** — not flaky, fully
    dead. Fixed to query `User.objects.filter(role="farmer", ...)` directly,
    since farmer data lives on the `User` model (no separate Farmer model
    exists, per `DATA_MODEL_GOTCHAS.md` §1).
*   **Open limitation, not fixed:** `CoffeeLot` has no FK to a farmer (only
    `exporter`). So "inherit boundary from the farmer" has no way to
    identify which farmer belongs to a given lot. Current fix is a
    best-effort heuristic (self if requester is a farmer; any farmer with a
    boundary if requester is admin) — this was the original code's intent
    per its own comments, just reimplemented against the real `User` model.
    A correct fix needs a new `farmer` FK on `CoffeeLot` — out of scope for
    this session, flagged for roadmap.
**Verification method:** Read actual model/view source first (not just the
audit doc). Tested via Django shell against real production-like data
(lot `SDM-2025-0298`, user `abebe@kochere.et`) without mutating the DB
(in-memory field clearing only). Live curl test against the running
`EudrDdsView` endpoint confirmed `200` + valid PDF for the point-based path.
Committed to git.

## 3. Backend Audit Item: `CoffeeLotViewSet` missing `parser_classes` — AUDIT WAS WRONG
The audit claimed this was missing. Reading the actual viewset showed
`parser_classes = [MultiPartParser, FormParser, JSONParser]` already present.
Live-tested anyway via curl multipart upload (not just trusting the line was
correct) — got a real `400` validation error (missing required field), then
a real `201 Created` once the field was added. Conclusion: this was never
broken, or was fixed in a previous session without the audit being updated.
**No code change made.** Audit doc corrected to reflect this.

## 4. Backend Audit Item: Hardcoded NBE FX rate — CONFIRMED REAL, FIXED, WRONG LOCATION IN AUDIT
Audit said the hardcoded rate was in `settlement.py`. Reading that file showed
`nbe_rate` is a required parameter there with no hardcoded default — the
actual hardcoded `"59.85"` literal was in `lots/views.py`, in
`SettlementView.create()`.
**Fix:** Added `NBE_DEFAULT_FX_RATE = env("NBE_DEFAULT_FX_RATE", default="59.85")`
to `config/settings/base.py` (matching existing `django-environ` convention
in this codebase). Updated `SettlementView` to read
`settings.NBE_DEFAULT_FX_RATE` instead of the inline literal. Added the var
to both `.envs/.local/.django` and `.envs/.production/.django`.
**Verified:** curl test with no `nbe_rate` in the request body returns
`59.85` (sourced from env); curl test with `nbe_rate: "65.00"` correctly
overrides and flows through the full calculation.
**New tech debt found (not fixed, flagged for later):** `SettlementView`
duplicates the settlement math inline instead of calling the shared
`calculate_settlement()` function in `settlement.py`. Two implementations
of the same business logic risk drifting apart. Recommend consolidating in
a future session.

## Lessons for next session
1.  **Docs/audits drift from code.** Two of four flagged backend issues in
    `TECHNICAL_AUDIT.md` were either already fixed or misattributed to the
    wrong file. Always read the actual source before trusting an audit claim,
    exactly as the user instinct in this session correctly insisted on.
2.  **Don't run `uv sync` on the host.** Always use the Docker wrapper.
3.  **Remaining open items from the audit**, in rough priority order:
    *   Compliance Gate 5 (ECTA license) and Gate 7 (CTA floor price) are
        still manual booleans, not real integrations.
    *   `CoffeeLotViewSet` is a monolithic viewset — consider splitting.
    *   `SettlementView` duplicates logic from `settlement.py` — consolidate.
    *   `CoffeeLot` has no `farmer` FK — needed for a correct (non-heuristic)
        implementation of `LotBoundaryInheritView`.
    *   Frontend rebranding is incomplete (one page per session rule).
