# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Beersheba (aka Bunna Bridge, ቡና ብሪጅ) — an Ethiopian D2C specialty coffee export compliance marketplace (EUDR 2026 compliance automation). Django/DRF backend + React/Vite frontend, deployed on a single VPS. Full context: `@docs/ai/AI_WORKFLOW.md`.

The primary user is a non-technical solo founder who runs commands on a VPS and pastes output back. Give complete, copy-paste-ready bash commands and full file contents — never partial snippets or "fill in the blank" instructions.

## Backend: Docker Compose only, never the host — this is not optional

`bunna_bridge/` is a Django 6 / DRF / Celery project managed with `uv`, but **`uv` and `manage.py` must never be run directly on the host.** The container mounts the project at `/app`, not the host path. Running `uv add`/`uv sync` on the host previously baked host-only absolute paths into `.venv` shebangs and crash-looped `celeryworker`/`celerybeat` in production (`docs/development/session-logs/2026-06-30-infra-fix-and-audit-cleanup.md`). Always go through the Docker Compose wrapper:

```bash
cd bunna_bridge
docker compose -f docker-compose.local.yml run --rm django python manage.py <command>
docker compose -f docker-compose.local.yml run --rm django uv add <package>
docker compose -f docker-compose.local.yml build django   # rebuild after adding deps
docker compose -f docker-compose.local.yml run --rm django pytest
```

A `justfile` wraps the same compose file (`just manage <args>`, `just up`, `just build`, `just logs`). Either form is fine as long as it goes through Docker.

Other backend gotchas:
- The actual Django package is double-nested: `bunna_bridge/bunna_bridge/` (apps: `lots`, `users`, `config`), not `bunna_bridge/`.
- `makemigrations` app label is `lots`, not `bunna_bridge.lots`.
- Use `manage.py shell` for interactive sessions, not bare `python`.
- The `bunna_bridge/README.md` is unmodified cookiecutter-django boilerplate and shows bare `uv run ...` commands — those are stale and wrong for this project; the Docker-wrapper rule above overrides it.
- Data model specifics (UUID PKs, no `Farmer` model, `boundary` vs. removed `farm_polygon`, etc.): `@docs/architecture/DATA_MODEL_GOTCHAS.md`.

## Frontend

`bunna-bridge-frontend/` is React 19 + TypeScript + Vite + Tailwind v4, run directly on the host (not dockerized): `npm run dev`, `npm run build` (`tsc -b && vite build`), `npm run lint`.

- **No `tailwind.config.js` exists.** Tailwind v4 theme tokens (colors, typography) live in the `@theme` block of `src/index.css`. Don't look for or create a config file.
- Inline styles using CSS variables are acceptable only for Leaflet components (`PolygonCaptureWidget`, `FarmMapDisplay`), since Leaflet renders outside the React tree.
- Icons must come from `lucide-react` only. No emojis in the UI.

## Code style (deviations from defaults)

- Ruff (backend): `isort.force-single-line = true` — one import per line. `S101` (assert) and `RUF012` are allowed.
- djlint (Django templates): 2-space indent, max line length 119.
- `.editorconfig`: 4-space indent for `.py`/`.rst`/`.ini`; 2-space for `.html`/`.css`/`.scss`/`.json`/`.yml`/`.toml`.

## Trust but verify

Docs under `docs/` can drift from the actual code — a prior audit had stale claims caught only by reading the real source (same session log as above). When a doc's claim matters, check it against the current code rather than citing the doc directly. Several docs also exist in near-duplicate at both `docs/X.md` and `docs/subdir/X.md`; if in doubt which is canonical, prefer the more recently modified one or ask.

Note: `.github/workflows/ci.yml` triggers on `main`, but the repo's actual default branch is `master` — CI is likely not firing on pushes as configured.
