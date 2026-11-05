# Deploying Beersheba on a server

A fresh, self-contained deployment from the latest code, on an Ubuntu server that already runs
nginx in front of other sites. Every step is one script that prints a report. Run them with
`sudo`, one at a time, and stop if one shows **STOP**.

Current target: the VPS at `91.107.204.59` (`Paperless`), domain `bunnabridge.pro.et`.
The scripts were first written for the Telecloud server; that attempt stopped because the
server could not reach `ghcr.io` (see `docs/development/session-logs/2026-11-05-deployment-handoff.md`).

## What Beersheba adds to the server, and what it leaves alone

| Adds | Leaves alone |
|---|---|
| `/opt/beersheba/` — code (`app/`), uploads (`media/`), backups (`backups/`) | other projects' folders, services and nginx sites |
| `/var/www/beersheba/` — built website; `/var/www/beersheba-acme/` — certificate checks | the existing certbot renewal job (our certificate just joins it) |
| 5 containers (project name `beersheba`), about 550 MB of memory, each with a cap | no database or Redis on the host is used |
| one port, `127.0.0.1:8100` (not reachable from the internet) | ports 80/443 stay with nginx |
| `/etc/nginx/sites-available/beersheba` + link in `sites-enabled` | |
| `/etc/cron.d/beersheba-backup` (02:40 nightly) | other cron jobs |

nginx is only ever **reloaded**, never restarted, and only after `nginx -t` passes; on a failed
test the Beersheba file is rolled back. Docker is installed only if missing, from Ubuntu's
packages, and never upgrades anything already installed.

## Steps

```bash
# 1. Download the code and look at the server (read-only)
sudo mkdir -p /opt/beersheba
sudo git clone -b ccr-709966e3-02iu4g https://github.com/CoolNietzsche/bunna-bridge.git /opt/beersheba/app
sudo bash /opt/beersheba/app/deploy/server/check.sh bunnabridge.pro.et

# 2. Docker (skips itself if already installed)
sudo bash /opt/beersheba/app/deploy/server/install-docker.sh

# 3-5. Backend, website, nginx + HTTPS — run in the background so a closed
#      terminal does not stop it; each step starts only if the previous one succeeded
sudo -v
sudo setsid bash -c 'bash /opt/beersheba/app/deploy/server/setup.sh bunnabridge.pro.et && bash /opt/beersheba/app/deploy/server/frontend.sh && bash /opt/beersheba/app/deploy/server/nginx.sh' > ~/beersheba-setup.log 2>&1 < /dev/null &
tail -f ~/beersheba-setup.log          # Ctrl+C stops watching, not the setup

# 6. Your admin account, then nightly backups
cd /opt/beersheba/app/bunna_bridge
sudo docker compose -f docker-compose.server.yml run --rm django python manage.py createsuperuser
sudo bash /opt/beersheba/app/deploy/server/backup.sh --install
```

If the terminal closes, log in again and run `tail -n 100 ~/beersheba-setup.log`.

### An old Beersheba site already uses the domain

`nginx.sh` stops if another enabled nginx file already serves the domain, and prints the exact
command to switch that file off (`sudo rm /etc/nginx/sites-enabled/<file>`; the file itself stays
in `sites-available`). Run that only if the file is the old Beersheba site, then run `nginx.sh`
again. If the domain already has a certificate on this server, it is reused.

### The old Beersheba setup on this VPS

The old deployment (`/root/bunna-bridge`, systemd unit `bunna-bridge.service`, Docker volume
`bunna_bridge_local_postgres_data`) is not used. Its containers are already stopped. Once the new
site works, so the old stack can't start again after a reboot:

```bash
sudo systemctl disable --now bunna-bridge.service
```

Removing the old folder and its data is a separate, deliberate step. Make a final backup of the old
database first if there is any chance you need it.

## Test mode (no domain yet)

`setup.sh <server-ip>` sets Beersheba up for plain HTTP, and `nginx.sh` then serves it at
`http://<server-ip>:8090/` (ports 80/443 untouched; open 8090 in any cloud firewall). Use test
passwords only; GPS capture, the field app's offline mode and admin login need HTTPS. Running
`setup.sh <domain>` and `nginx.sh` later switches to HTTPS and keeps all data.

## Later

```bash
sudo bash /opt/beersheba/app/deploy/server/status.sh   # health check, changes nothing
sudo bash /opt/beersheba/app/deploy/server/update.sh   # backup, pull, rebuild, migrate, restart
sudo bash /opt/beersheba/app/deploy/server/backup.sh   # backup now
```

Django commands always go through Docker:

```bash
cd /opt/beersheba/app/bunna_bridge
sudo docker compose -f docker-compose.server.yml run --rm django python manage.py <command>
sudo docker compose -f docker-compose.server.yml logs -f django
```

Demo data (optional; choose your own password, because the site is public):

```bash
sudo docker compose -f docker-compose.server.yml run --rm django python manage.py seed_demo --password 'PICK-A-LONG-PASSWORD'
```

## Secrets

`setup.sh` generates the database password, the Django secret key and the admin address on the
server, in `bunna_bridge/.envs/.server/` (root-only, never in git, never printed). The admin
address: `sudo grep DJANGO_ADMIN_URL /opt/beersheba/app/bunna_bridge/.envs/.server/.django`.
Add Mailgun / SMS keys to the same `.django` file, then
`sudo docker compose -f docker-compose.server.yml up -d` from `/opt/beersheba/app/bunna_bridge`.

## Undo (removes Beersheba only)

```bash
sudo rm /etc/nginx/sites-enabled/beersheba && sudo nginx -t && sudo systemctl reload nginx
cd /opt/beersheba/app/bunna_bridge && sudo docker compose -f docker-compose.server.yml down
sudo rm -f /etc/cron.d/beersheba-backup
```

Data stays in the Docker volumes and `/opt/beersheba` until you delete them on purpose.
