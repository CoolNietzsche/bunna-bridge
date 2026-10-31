# 02 — Architecture & Hosting

## Stack

| Layer | Tech |
|-------|------|
| Backend | Django 6, Django REST Framework, djangorestframework-gis, SimpleJWT, django-filter, django-allauth (cookiecutter-django template), Jazzmin admin, ReportLab (PDFs) |
| Database | PostgreSQL 16 + PostGIS 3.4 (`postgis/postgis:16-3.4` image) |
| Async | Celery worker + beat (DB scheduler), Redis, Flower — **no real tasks are defined yet** (only the cookiecutter sample `users/tasks.py`) |
| Python deps | `uv` (`pyproject.toml`, `uv.lock`) — run only inside the container |
| Frontend | React 19, TypeScript, Vite, Tailwind v4 (tokens in `src/index.css` `@theme`, no `tailwind.config.js`), TanStack Query, axios, react-router 7, Leaflet (+ mapbox-gl dep), Radix UI, qrcode |
| Proxy | Host-level nginx (shared with other sites), Let's Encrypt via certbot |
| CI | GitHub Actions `.github/workflows/ci.yml` on `master`: pre-commit lint + backend pytest in Docker. **No frontend build/lint in CI.** |

## Repository layout (`CoolNietzsche/bunna-bridge`, default branch `master`)

```
bunna-bridge/
├── CLAUDE.md                     # AI rules (authoritative for workflow)
├── bunna_bridge/                 # Django project root (mounted at /app in container)
│   ├── config/                   # settings/{base,local,production,test}.py, urls.py, celery_app.py
│   ├── bunna_bridge/             # Python package (DOUBLE-NESTED)
│   │   ├── lots/                 # CoffeeLot, CuppingScore, SampleRequest, Offer, Notification,
│   │   │                         # WashingStation, DeforestationZone (deforestation.py), PDFs, settlement
│   │   ├── users/                # User (all roles), Certification, auth/profile API
│   │   ├── roasting/             # RoastEquipment, RoastBatch, RoastBatchLot
│   │   └── templates/            # cookiecutter allauth templates (mostly unused; SPA is the UI)
│   ├── compose/{local,production}/   # Dockerfiles + start scripts
│   ├── docker-compose.local.yml      # THE stack that runs on the VPS
│   ├── docker-compose.vps.yml        # override: production settings + gunicorn (2026-09-09)
│   ├── docker-compose.production.yml # Traefik stack — NOT used anywhere
│   └── justfile                       # wrappers: just up / just manage ... / just logs
├── bunna-bridge-frontend/        # Vite SPA, run on host with npm
├── docs/                         # docs (mixed freshness — see 08)
├── mds/                          # product strategy docs
├── audit/                        # empty audit prompt templates (never filled in)
└── scripts/                      # git helper scripts for the founder (push.sh, sync.sh, …)
```

## How production actually runs (VPS)

Verified 2026-09-06 (`docs/architecture/CODEBASE_HOSTING_OVERVIEW.md`), updated by commit `62d8233` (2026-09-09):

- Shared VPS (hostname `Paperless`), project at `/root/bunna-bridge/`. An old copy at `/root/bb2/` — unknown status, don't touch without asking.
- systemd `bunna-bridge.service` runs `docker compose -f docker-compose.local.yml [-f docker-compose.vps.yml] up -d` in `/root/bunna-bridge/bunna_bridge`.
  - Containers: `bunna_bridge_local_{django,postgres,redis,celeryworker,celerybeat,flower}`. Django on host port **8001**, Flower on **5555**.
  - Since 2026-09-09 the override runs **gunicorn with `config.settings.production`** (DEBUG off). **To confirm on the VPS**: that the systemd unit really includes `-f docker-compose.vps.yml` (`systemctl cat bunna-bridge`), and that Flower on 5555 is not publicly reachable.
- nginx vhost `bunnabridge.pro.et`: serves the built SPA from `/var/www/bunnabridge/` (copied from `bunna-bridge-frontend/dist`), proxies `/api/`, `/admin/`, `/static/`, `/media/` to `127.0.0.1:8001`, and **denies direct access** to compliance-document media paths (phyto/ecex/nbe/customs/dds, ECTA). Those files are only served through authenticated Django views.
- Second vhost `bunnabridge.messeret.com` proxies to a Vite dev server on 5173 that normally isn't running → dead staging alias.
- Database = the `bunna_bridge_local_postgres_data` Docker volume. **No backup job found** (root crontab empty).
- Data volume at audit time: ~7 lots, 6 offers, 9 sample requests, 0 cupping scores, 72,530 Hansen GFC deforestation polygons.
- Email: Mailgun not configured → console backend (no emails are actually sent).

## Everyday commands (run on the VPS)

```bash
# Backend (always via Docker)
cd ~/bunna-bridge/bunna_bridge
docker compose -f docker-compose.local.yml run --rm django python manage.py migrate
docker compose -f docker-compose.local.yml run --rm django python manage.py makemigrations lots
docker compose -f docker-compose.local.yml run --rm django python manage.py shell
docker compose -f docker-compose.local.yml run --rm django pytest
docker compose -f docker-compose.local.yml run --rm django uv add <package>
docker compose -f docker-compose.local.yml build django
sudo systemctl restart bunna-bridge
docker compose -f docker-compose.local.yml logs -f django

# Frontend (on host)
cd ~/bunna-bridge/bunna-bridge-frontend
npm ci && npm run lint && npm run build      # build = tsc -b && vite build (fails loudly on type errors)
sudo rsync -a --delete dist/ /var/www/bunnabridge/
```

Management commands: `load_deforestation_data` (Hansen GFC import), `seed_lots` (demo data).

## Settings worth knowing

- `config/settings/base.py`: `ATOMIC_REQUESTS=True`; DRF default permission `IsAuthenticated`, page size 20; JWT access 2 h / refresh 7 d, rotation on, **no blacklist app**; `TOKEN_OBTAIN_SERIALIZER` = email login; CORS allowlist from env; `NBE_DEFAULT_FX_RATE` env; `TIME_ZONE=Africa/Addis_Ababa`.
- `production.py`: `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS` (default `bunnabridge.com` — must be overridden to `bunnabridge.pro.et`), SSL redirect + HSTS (60 s), Mailgun→console fallback, whitenoise non-manifest storage.
- Env files live in `bunna_bridge/.envs/` on the VPS only (git-ignored). Never commit them.
