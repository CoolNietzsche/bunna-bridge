# 2026-11-05 — Deployment handoff: fresh deployment on the old VPS

For the next Claude Code session, running directly on the VPS. Read this, `DONE.md` (Phases 1–5
and the deployment kit) and `deploy/server/README.md` first.

## Decision

The founder wants a **fresh deployment from the latest code**, not the old setup:
- stack: `bunna_bridge/docker-compose.server.yml` (code baked into the image, GDAL in the production
  image, `127.0.0.1:8100` only, memory caps, no Flower), scripts in `deploy/server/`;
- everything under `/opt/beersheba/` (code in `/opt/beersheba/app`), a new database;
- the old `/root/bunna-bridge` folder is **not used**. The founder does not want it, but deleting it
  (and the old volume `bunna_bridge_local_postgres_data`) is a separate step to confirm with them
  once the new site works.

## Where things stand

- **Code:** branch `ccr-709966e3-02iu4g`: Phases 1–5 (228 pytest pass, 61/61 Playwright E2E
  checks locally) plus the deployment kit, rehearsed end to end with Docker and nginx 1.24.
  Not merged to `master`.
- **Server:** VPS `91.107.204.59` (hostname `Paperless`), shared with other projects. Claude Code is
  installed there. The old Beersheba containers are stopped. Old setup, for reference:
  `docs/knowledge-base/02-architecture-and-hosting.md` ("How production actually ran on the old VPS"):
  systemd `bunna-bridge.service`, ports 8001/5555, nginx vhost for `bunnabridge.pro.et` serving
  `/var/www/bunnabridge/`.
- **DNS:** `bunnabridge.pro.et` (ClouDNS, TTL 3600) was briefly pointed at the Telecloud server
  (196.189.51.169); the founder is switching it back to `91.107.204.59`. `nginx.sh` refuses to run
  until it resolves to this server.
- **Telecloud server** (`ecs-28b1`, live call centre): abandoned. `ghcr.io` timed out from it.
  Docker and `/opt/beersheba` are left there, unused; cleanup commands were given in chat.

## Next steps

1. `check.sh bunnabridge.pro.et`: read-only. Look especially at other projects' ports, the old
   `bunnabridge.pro.et` nginx file (is it the `default_server` on 80/443? removing it would change
   which site answers unknown names), the existing certificate, and free memory.
2. `install-docker.sh`: should report Docker already installed.
3. `setup.sh bunnabridge.pro.et` → `frontend.sh` → `nginx.sh` (run in the background with `setsid`,
   as in the README). `nginx.sh` will stop at the old vhost and print the `rm` for its
   `sites-enabled` link; confirm with the founder that it is the old Beersheba site first.
4. `createsuperuser`; ask about demo data (private password) vs empty; `backup.sh --install`.
5. After it works: `systemctl disable --now bunna-bridge.service`; ask before deleting the old folder or volume.

## Rules that still apply

`CLAUDE.md`: backend only via Docker Compose (never `uv`/`manage.py` on the host); never print
`.env` contents; don't touch other projects on the server; complete copy-paste commands for the
founder; commits end with the attribution lines; push to `ccr-709966e3-02iu4g`.
