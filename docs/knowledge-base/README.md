# Beersheba / Bunna Bridge — Knowledge Base

_Compiled 2026-10-31 by reading the source code of both repositories directly (`CoolNietzsche/bunna-bridge` @ `ba5a48f`, `CoolNietzsche/Beersheba` @ `0440b99`). Where an older doc disagrees with the code, this KB follows the code and says so._

This folder is the **single starting point** for anyone (human or AI) picking up the platform. Read in order:

| # | File | What it answers |
|---|------|-----------------|
| 1 | [01-product.md](01-product.md) | What the platform is, who uses it, the business model, the competitive picture |
| 2 | [02-architecture-and-hosting.md](02-architecture-and-hosting.md) | Stack, repo layout, how it actually runs on the VPS, how to run commands |
| 3 | [03-data-model.md](03-data-model.md) | Every model, field groups, relationships, gotchas |
| 4 | [04-api-reference.md](04-api-reference.md) | Every endpoint, who can call it, what it does |
| 5 | [05-compliance-engine.md](05-compliance-engine.md) | The 7 EUDR/export gates as they really work today, DDS, deforestation check, NBE settlement |
| 6 | [06-frontend.md](06-frontend.md) | Routes, folders, theming, conventions |
| 7 | [07-known-issues.md](07-known-issues.md) | Verified bugs and security gaps, with file:line and severity |
| 8 | [08-repos-docs-and-history.md](08-repos-docs-and-history.md) | The two repos, which docs are stale, stray files, project timeline |
| 9 | [09-task-plan.md](09-task-plan.md) | **The plan** — prioritized tasks for what comes next |

## Source-of-truth order

1. The code on the `master` branch (and what runs on the VPS).
2. This knowledge base (verified against code on 2026-10-31).
3. `docs/audits/GROUND_TRUTH_AUDIT_2026-07-27.md` and `docs/architecture/CODEBASE_HOSTING_OVERVIEW.md` (verified at their dates; some items since fixed).
4. Everything else in `docs/` and `mds/` — treat as background or intent, not fact.

## Five things to know before touching anything

1. **Backend commands only go through Docker Compose**, never bare `uv`/`manage.py` on the host (see `CLAUDE.md`). Running `uv` on the host once crash-looped Celery in production.
2. **The "local" Docker stack is production.** The VPS runs `docker-compose.local.yml` (plus `docker-compose.vps.yml` override since 2026-09-09). Its Postgres volume holds the only copy of real data. No verified backups exist.
3. **The VPS is shared** with other client projects (Odoo, ERPNext, Cal.com…). Don't touch host nginx, ports, cron or systemd for anything that isn't `bunna-bridge`.
4. **There are critical open security holes** (any user can make themselves `admin` through the API; lots can skip the compliance gate via a plain PATCH). See [07-known-issues.md](07-known-issues.md) §1 — fix these before onboarding real customers.
5. **The founder is non-technical** and runs commands on the VPS. Give complete copy-paste commands and full file contents.
