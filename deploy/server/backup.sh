#!/usr/bin/env bash
# Nightly backup of the Beersheba database and uploaded files, kept 14 days.
#   sudo bash /opt/beersheba/app/deploy/server/backup.sh            # run once now
#   sudo bash /opt/beersheba/app/deploy/server/backup.sh --install  # schedule nightly at 02:40
# The schedule is its own file (/etc/cron.d/beersheba-backup); no other cron job is touched.
set -euo pipefail
. "$(dirname "$0")/common.sh"
need_root

if [ "${1:-}" = "--install" ]; then
  cat > /etc/cron.d/beersheba-backup <<EOF
# Beersheba nightly backup (database + uploads), 14 days kept in $BACKUPS
40 2 * * * root bash $APP/deploy/server/backup.sh >> /var/log/beersheba-backup.log 2>&1
EOF
  chmod 644 /etc/cron.d/beersheba-backup
  ok "nightly backup scheduled at 02:40 (log: /var/log/beersheba-backup.log)"
fi

stamp=$(date +%Y%m%d-%H%M)
install -d -m 700 "$BACKUPS"
cd "$BACKEND"
"${COMPOSE[@]}" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$BACKUPS/db-$stamp.dump"
tar -czf "$BACKUPS/media-$stamp.tar.gz" -C "$ROOT" media
chmod 600 "$BACKUPS"/*
find "$BACKUPS" -type f -mtime +14 -delete
ok "$(date '+%F %T') backup: $(du -h "$BACKUPS/db-$stamp.dump" | cut -f1) database, $(du -h "$BACKUPS/media-$stamp.tar.gz" | cut -f1) files"
echo "   Kept on the same disk. Copy $BACKUPS off the server from time to time."
