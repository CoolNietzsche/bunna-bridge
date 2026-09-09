# Codebase, Repo & Hosting Overview

Written 2026-09-06, verified **directly on the live VPS** (this Claude Code session runs on it — hostname `Paperless`). Supersedes the first draft of this doc, which trusted `docs/ai/AI_WORKFLOW.md`'s claims (Hetzner IP `91.107.204.59`, domain `bunnabridge.com`, Traefik/`docker-compose.production.yml` stack) — **that doc is stale and does not describe what's actually deployed.**

## The VPS is shared, not dedicated to Beersheba

This box hosts several unrelated client projects side by side: Cal.com, an ERPNext/Frappe stack, Stirling PDF, two Odoo instances, an NSLP app, an NSDPSTI landing page — as well as Beersheba/Bunna Bridge. Keep that in mind before assuming any host-level resource (ports, nginx, cron, systemd) belongs exclusively to this project.

There are also **two full copies of the Beersheba repo on disk**: `/root/bunna-bridge/` (the one this session and git operate in) and `/root/bb2/` (untouched since May 3, appears to be an old/abandoned copy — not verified further, don't assume it's live). Plus leftover deploy artifacts at `/root/`: `bunna-bridge-deploy.sh`, `-v3`, `-fixed` shell scripts, `bunna-bridge.zip`, `bunna-bridge-uploads/` — signs of manual, ad-hoc deploys rather than a repeatable pipeline.

## What's actually running (verified via `docker ps`, `systemctl`, `ss -tlnp`, nginx configs)

**Backend — running, but as the *local* dev stack, not `docker-compose.production.yml`:**

- systemd unit `bunna-bridge.service` (`/etc/systemd/system/bunna-bridge.service`) runs `docker compose -f docker-compose.local.yml up -d` from `/root/bunna-bridge/bunna_bridge`, `WantedBy=multi-user.target` (auto-starts on boot). Active since 2026-07-27.
- Running containers: `bunna_bridge_local_django` (port `8001→8000`), `bunna_bridge_local_postgres` (`postgis/postgis:16-3.4`), `bunna_bridge_local_redis`, `bunna_bridge_local_celeryworker`, `bunna_bridge_local_celerybeat`, `bunna_bridge_local_flower` (port `5555`).
- **`docker-compose.production.yml` (Traefik, custom prod Postgres/Django/nginx images) is not deployed anywhere on this box.** No `traefik`, no `production_*` containers exist.
- **Django is running in debug/dev mode in production**: `manage.py`'s default `DJANGO_SETTINGS_MODULE` is `config.settings.local` (only `config/wsgi.py` defaults to `production`, but the container's `start` script calls `manage.py runserver_plus` directly, which picks up `local`), and `config/settings/local.py:9` has `DEBUG = True`. The container command is literally `python manage.py runserver_plus 0.0.0.0:8000` — the Django development server, not Gunicorn. This means real user traffic on the live domain is currently served by Django's debug dev server with `DEBUG = True` (verbose tracebacks, no whitenoise compression, debug toolbar available). **This is worth fixing** — it's a meaningful security/perf gap versus what the compose files and docs imply is the setup.

**Reverse proxy — host-level nginx (not Traefik), two vhosts, only one appears functional:**

| vhost | Config | What it does |
|---|---|---|
| `bunnabridge.pro.et` | `/etc/nginx/sites-available/bunnabridge.pro.et` | **This looks like the real production entry point.** Serves the built React app as static files straight from `/var/www/bunnabridge` (`try_files ... /index.html`, an SPA fallback) — confirmed identical/same-mtime as `bunna-bridge-frontend/dist` (last built 2026-08-03). Proxies `/api/`, `/admin/`, `/static/`, `/media/` to `127.0.0.1:8001` (the Django container). Has a hand-written nginx-level `deny all` regex block for compliance-document media paths (phyto/ECEX/NBE/customs/DDS certs) as defense-in-depth on top of Django's own auth checks. TLS via Certbot/Let's Encrypt. |
| `bunnabridge.messeret.com` | `/etc/nginx/sites-available/bunnabridge.messeret.com` | Proxies `/` to `127.0.0.1:5173` (a Vite dev server) plus `/api/`, `/admin/` to `:8001`. **Nothing is currently listening on port 5173** — no vite/npm process running — so this vhost is currently dead/500ing, likely a staging alias left over from active frontend development that isn't running right now. |

Neither `bunnabridge.com` (the domain the stale doc names) nor Traefik/Let's Encrypt-via-Docker are in play at all — that's entirely aspirational/outdated documentation.

## Database

- **Engine:** PostgreSQL + PostGIS, `django.contrib.gis.db.backends.postgis` (`config/settings/base.py:51`) — needed for the lot `boundary` geospatial field (EUDR deforestation checks).
- **What's actually serving production data:** the `bunna_bridge_local_postgres` container (`postgis/postgis:16-3.4`, stock Docker Hub image), volume `bunna_bridge_local_postgres_data`. There is no separate "production" Postgres — the so-called local database *is* the production database on this deployment.
- No managed/external DB service, no backup volume actually in use (the `_backups` volume defined in `docker-compose.production.yml` is irrelevant since that compose file isn't running) — **worth checking whether *any* backup job exists** (`crontab -l` for root came back empty, so no cron-based backup either, at least not for root's crontab).
- Credentials/host via `DATABASE_URL` env, `.envs/.local/.postgres` for this stack.

## Practical implications / recommended next steps

1. **DEBUG=True in production is the top thing to fix.** Anyone hitting a Django error on `bunnabridge.pro.et` currently gets a full debug traceback. Either point the container at `config.settings.production` (and supply everything that settings module requires — `DJANGO_ALLOWED_HOSTS`, `DJANGO_SECRET_KEY`, etc. via env) and run Gunicorn, or accept local-settings-in-prod deliberately but flip `DEBUG` off — but the former is the better fix long-term since `docker-compose.production.yml` already exists and was clearly designed for this.
2. **No verified backup strategy.** The DB lives in one Docker volume on one shared VPS with no confirmed backup automation.
3. **Clarify `/root/bb2/`** — confirm with the founder whether it's safe to delete or archive; don't touch it without checking first since it wasn't created this session.
4. **`bunnabridge.messeret.com` is currently broken** (proxies to a port nothing is listening on) — either intentional (inactive staging alias) or an oversight; worth confirming which.
5. Fix `.github/workflows/ci.yml` triggering on `main` when the repo's default branch is `master` (noted in CLAUDE.md already) — CI is very likely not running on pushes.
