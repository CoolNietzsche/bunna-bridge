# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Beersheba (aka Bunna Bridge, ቡና ብሪጅ) — an Ethiopian D2C specialty coffee export compliance marketplace (EUDR 2026 compliance automation). Django 6 / DRF / Celery backend + React 19 / Vite frontend, deployed on a single VPS. Full context: `@docs/ai/AI_WORKFLOW.md`.

The primary user is a non-technical solo founder who runs commands on a VPS and pastes output back. Give complete, copy-paste-ready bash commands and full file contents — never partial snippets or "fill in the blank" instructions.

## Repository layout

```
bunna-bridge/
├── bunna_bridge/                 # Django project root (cookiecutter-django based)
│   ├── bunna_bridge/             # Actual Python package (double-nested — see gotcha below)
│   │   ├── lots/                 # Core domain app: CoffeeLot, offers, cupping, samples, EUDR
│   │   ├── users/                # Custom User (roles) + farmer/exporter profiles + JWT auth API
│   │   ├── contrib/, templates/, static/
│   │   └── conftest.py
│   ├── config/                   # Django settings, root urls.py, celery_app.py, wsgi.py
│   │   └── settings/             # base.py, local.py, production.py, test.py
│   ├── compose/                  # Docker build contexts (local/ + production/)
│   ├── docker-compose.local.yml  # Dev stack: django, postgres(PostGIS), redis, celery{worker,beat}, flower
│   ├── docker-compose.production.yml
│   ├── justfile                  # Thin wrapper over docker compose
│   └── pyproject.toml            # uv-managed deps, ruff/mypy/pytest config
├── bunna-bridge-frontend/        # React 19 + TS + Vite + Tailwind v4 (run on host, NOT dockerized)
│   └── src/{api,components,pages,context,hooks,styles,lib}
├── docs/                         # Architecture, business, AI-workflow, audit docs (can drift — verify)
└── .github/workflows/ci.yml      # pre-commit linter + pytest, on master
```

## Backend: Docker Compose only, never the host — this is not optional

`bunna_bridge/` is a Django 6 / DRF / Celery project managed with `uv`, but **`uv` and `manage.py` must never be run directly on the host.** The container mounts the project at `/app`, not the host path. Running `uv add`/`uv sync` on the host previously baked host-only absolute paths into `.venv` shebangs and crash-looped `celeryworker`/`celerybeat` in production (`docs/development/session-logs/2026-06-30-infra-fix-and-audit-cleanup.md`). Always go through the Docker Compose wrapper:

```bash
cd bunna_bridge
docker compose -f docker-compose.local.yml run --rm django python manage.py <command>
docker compose -f docker-compose.local.yml run --rm django uv add <package>
docker compose -f docker-compose.local.yml build django   # rebuild after adding deps
docker compose -f docker-compose.local.yml run --rm django pytest
```

A `justfile` wraps the same compose file (`just manage <args>`, `just up`, `just down`, `just build`, `just logs`). Either form is fine as long as it goes through Docker.

The dev stack (`docker compose -f docker-compose.local.yml up`) runs Django (`runserver_plus`) on host port **8001** (mapped to container 8000), plus PostGIS, Redis, Celery worker/beat, and Flower. The `start` script runs `migrate` automatically on boot.

Other backend gotchas:
- The actual Django package is double-nested: `bunna_bridge/bunna_bridge/` (apps: `lots`, `users`; `config` lives one level up at `bunna_bridge/config/`), not `bunna_bridge/`.
- `makemigrations` app label is `lots`, not `bunna_bridge.lots`.
- Use `manage.py shell` for interactive sessions, not bare `python`.
- The DB is **PostGIS** (`django.contrib.gis`); models use `PointField`/`PolygonField` (SRID 4326). GDAL/GEOS come from the container image — another reason not to run backend tooling on the host.
- The `bunna_bridge/README.md` is unmodified cookiecutter-django boilerplate and shows bare `uv run ...` commands — those are stale and wrong for this project; the Docker-wrapper rule above overrides it.
- Seed/data commands live in `lots/management/commands/`: `seed_lots`, `load_deforestation_data`.
- Data model specifics (UUID PKs, no `Farmer` model, `boundary` vs. removed `farm_polygon`, etc.): `@docs/architecture/DATA_MODEL_GOTCHAS.md`.

## Data model (backend/`lots` + `users`)

- **`users.User`** (custom `AUTH_USER_MODEL`, extends `AbstractUser`): a single user table with a `role` field (`admin`, `exporter`, `buyer`, `farmer`, `qgrader`). **There is no separate `Farmer` model** — farmers are Users with `role="farmer"`, and farm/exporter profile fields (farm_id, boundary, ECTA license, etc.) live directly on `User`. A permanent `farm_id` (`BSB-ETH-<REGION>-<seq>`) is auto-generated on save for farmer accounts.
- **`lots.CoffeeLot`** (UUID PK, human `lot_id`): the central entity. Owns geospatial (`farm_location` Point, `boundary` Polygon), quality, EUDR/export compliance flags + document uploads, and marketplace fields. `exporter` is a required FK; `farmer` is an optional FK (`limit_choices_to={"role": "farmer"}`). `save()` derives some compliance booleans; `compliance_score()`/`is_eudr_ready()`/`green_passport_ready`/`export_ready` gate export readiness.
- **`lots.CuppingScore`**: SCA cupping components; confirmed scores are immutable and write back onto the lot's `sca_score`.
- **`lots.SampleRequest`**, **`lots.Offer`** (negotiation w/ counter-offers), **`lots.Notification`**: marketplace workflow.

## API (DRF)

- All app endpoints are under `/api/v1/` (see `config/urls.py` → `lots/urls.py`, `users/api_urls.py`).
- Auth is **JWT** (`rest_framework_simplejwt`): `POST /api/auth/token/` and `/api/auth/token/refresh/`. Default DRF permission is `IsAuthenticated`; default auth class is JWT.
- `lots/urls.py` uses a DRF `DefaultRouter` for `lots`, `cupping-scores`, `sample-requests`, plus explicit paths for settlement, status, EUDR DDS, boundary (+inherit), photos, document download, notifications, offers, spec-sheet, and a **public** lot-story endpoint.
- Convention reference: `docs/architecture/API_CONVENTIONS.md` (verify against code).

## Frontend

`bunna-bridge-frontend/` is React 19 + TypeScript + Vite + Tailwind v4, run directly on the host (not dockerized): `npm run dev`, `npm run build` (`tsc -b && vite build`), `npm run lint` (`eslint .`).

- **No `tailwind.config.js` exists.** Tailwind v4 theme tokens (colors, typography) live in the `@theme` block of `src/index.css`. Don't look for or create a config file.
- Vite dev server runs on port **5173** and proxies `/api` and `/media` to the backend at `http://localhost:8001`. The axios client (`src/api/client.ts`) uses `baseURL: "/api"`, stores JWTs in `localStorage`, and auto-refreshes on 401.
- Structure: `src/api/*` (one module per resource), `src/pages/*` (route components), `src/components/*` (shared UI), `src/context/AuthContext.tsx`, `src/hooks/*`, `src/styles/{tokens,components}.ts`. Routes are declared in `src/App.tsx`; most are wrapped in `<ProtectedRoute>`, except the public `/story/:id`, `/login`, `/register`.
- Inline styles using CSS variables are acceptable only for Leaflet components (`PolygonCaptureWidget`, `FarmMapDisplay`), since Leaflet renders outside the React tree.
- Icons must come from `lucide-react` only. No emojis in the UI.

## Testing

- Backend tests are pytest (`pytest-django`), run through Docker: `docker compose -f docker-compose.local.yml run --rm django pytest`. Settings module is `config.settings.test` (configured via `addopts` in `pyproject.toml`, with `--reuse-db`). App tests live in `lots/tests.py` and `users/tests/`.
- Frontend has no test runner configured; `npm run build` (with `tsc -b`) and `npm run lint` are the checks.

## Code style (deviations from defaults)

- Ruff (backend): `isort.force-single-line = true` — one import per line. `S101` (assert) and `RUF012` are allowed/ignored.
- djlint (Django templates): 2-space indent, max line length 119.
- `.editorconfig`: 4-space indent for `.py`/`.rst`/`.ini`; 2-space for `.html`/`.css`/`.scss`/`.json`/`.yml`/`.toml`.
- pre-commit runs the linters in CI (`.github/workflows/ci.yml`), working directory `bunna_bridge`.

## Trust but verify

Docs under `docs/` can drift from the actual code — a prior audit had stale claims caught only by reading the real source (`docs/development/session-logs/2026-06-30-infra-fix-and-audit-cleanup.md`). When a doc's claim matters, check it against the current code rather than citing the doc directly. Several docs also exist in near-duplicate at both `docs/X.md` and `docs/subdir/X.md` (e.g. `THEMING.md`, `DEPLOYMENT.md`, `BEERSHEBA_TASK_LIBRARY.md`); if in doubt which is canonical, prefer the more recently modified one (usually the one nested under a subdirectory) or ask.

## CI / branches

- The repo's default branch is **`master`**. `.github/workflows/ci.yml` now correctly triggers on `master` for both push and pull_request (with `paths-ignore: docs/**`) — the earlier `main`-vs-`master` mismatch was fixed in commit `7803a56`.
- CI runs two jobs: `linter` (pre-commit over all files) and `pytest`.
