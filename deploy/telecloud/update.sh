#!/usr/bin/env bash
# Deploy the latest code: backup, pull, rebuild, migrate, restart, rebuild the website.
#   sudo bash /opt/beersheba/app/deploy/telecloud/update.sh
# Only Beersheba containers restart. nginx and the call centre are not touched.
set -euo pipefail
. "$(dirname "$0")/common.sh"
need_root
load_conf

say "Memory before"
mem_report
[ "$(mem_available_mb)" -ge 1200 ] || die "Less than 1.2 GB memory available — try again later."

say "Backup first"
bash "$APP/deploy/telecloud/backup.sh"

say "Pulling $BRANCH"
before=$(git -C "$APP" rev-parse --short HEAD)
git -C "$APP" pull --ff-only origin "$BRANCH"
echo "   $before -> $(git -C "$APP" rev-parse --short HEAD)"

say "Rebuilding and restarting the backend"
cd "$BACKEND"
"${COMPOSE[@]}" build
chown -R "$(container_uid):$(container_gid)" "$MEDIA"
"${COMPOSE[@]}" run --rm -T django python manage.py migrate --noinput | tail -5
"${COMPOSE[@]}" up -d
docker image prune -f >/dev/null

say "Rebuilding the website"
bash "$APP/deploy/telecloud/frontend.sh" | grep -E 'OK|STOP|!!' || true

say "Status"
bash "$APP/deploy/telecloud/status.sh"
