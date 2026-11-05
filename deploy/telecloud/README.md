# Deploying Beersheba on the Telecloud VPS

Server: `ecs-28b1`, Ubuntu 24.04, public IP 196.189.51.169, login `hmg` (sudo).
The server also runs the live call centre (agent.mereq.tech, admin.mereq.tech).

## What Beersheba adds to the server, and what it leaves alone

| Adds | Leaves alone |
|---|---|
| `/opt/beersheba/` — code, uploads, backups | `/var/www/mereq_*`, PM2, Node |
| `/var/www/beersheba/` — built website; `/var/www/beersheba-acme/` — certificate checks | existing nginx sites |
| Docker (Ubuntu packages, installed with `--no-upgrade`) | no `apt upgrade`, no reboot |
| 5 containers, about 550 MB of memory in total, each with a memory cap | no host database or Redis is used |
| one port, `127.0.0.1:8100` (not reachable from the internet) | ports 80/443 stay with nginx |
| `/etc/nginx/sites-available/beersheba` + link in `sites-enabled` | the 03:15 renewal job (our certificate simply joins it) |
| `/etc/cron.d/beersheba-backup` (02:40 nightly) | other cron jobs |

nginx is only ever **reloaded**, never restarted, and only after `nginx -t` passes. A reload lets
open connections finish, so agents' pages keep working. Calls go browser → PBX and do not pass
through this server.

No security-group change is needed: Beersheba uses the existing ports 80 and 443.

## Before you start

1. Choose the domain (for example `beersheba.example.com`).
2. At your DNS provider, add an **A record** for it pointing to `196.189.51.169`.

## Steps (each prints a report; paste it back to Claude)

```bash
# 1. Download the code and look at the server (read-only)
sudo mkdir -p /opt/beersheba
sudo git clone -b ccr-709966e3-02iu4g https://github.com/CoolNietzsche/bunna-bridge.git /opt/beersheba/app
sudo bash /opt/beersheba/app/deploy/telecloud/check.sh YOUR-DOMAIN

# 2. Install Docker (skips itself if already there)
sudo bash /opt/beersheba/app/deploy/telecloud/install-docker.sh

# 3. Backend: settings, images, database, start (10-20 min the first time)
sudo bash /opt/beersheba/app/deploy/telecloud/setup.sh YOUR-DOMAIN

# 4. Website
sudo bash /opt/beersheba/app/deploy/telecloud/frontend.sh

# 5. Put it online with HTTPS (needs the DNS record from "Before you start")
sudo bash /opt/beersheba/app/deploy/telecloud/nginx.sh

# 6. Your admin account, then nightly backups
cd /opt/beersheba/app/bunna_bridge
sudo docker compose -f docker-compose.server.yml run --rm django python manage.py createsuperuser
sudo bash /opt/beersheba/app/deploy/telecloud/backup.sh --install
```

The Django admin address is in the settings file and is not printed anywhere. To see it:
`sudo grep DJANGO_ADMIN_URL /opt/beersheba/app/bunna_bridge/.envs/.server/.django`
(open `https://YOUR-DOMAIN/` followed by that value).

## Later

```bash
sudo bash /opt/beersheba/app/deploy/telecloud/status.sh   # health check, changes nothing
sudo bash /opt/beersheba/app/deploy/telecloud/update.sh   # backup, pull, rebuild, migrate, restart
sudo bash /opt/beersheba/app/deploy/telecloud/backup.sh   # backup now
```

Run any Django command through Docker:

```bash
cd /opt/beersheba/app/bunna_bridge
sudo docker compose -f docker-compose.server.yml run --rm django python manage.py <command>
sudo docker compose -f docker-compose.server.yml logs -f django
```

## Undo (removes Beersheba only)

```bash
sudo rm /etc/nginx/sites-enabled/beersheba && sudo nginx -t && sudo systemctl reload nginx
cd /opt/beersheba/app/bunna_bridge && sudo docker compose -f docker-compose.server.yml down
sudo rm -f /etc/cron.d/beersheba-backup
```

Data stays in Docker volumes and `/opt/beersheba` until you delete them on purpose.

## Secrets

`setup.sh` generates the database password, the Django secret key and the admin address on the
server, in `bunna_bridge/.envs/.server/` (readable by root only, never in git, never printed).
Mailgun and SMS keys go in the same `.django` file when you have them, followed by
`sudo docker compose -f docker-compose.server.yml up -d` from `/opt/beersheba/app/bunna_bridge`.
