#!/usr/bin/env bash
# Read-only health check of Beersheba. Changes nothing.
#   sudo bash /opt/beersheba/app/deploy/server/status.sh
set -uo pipefail
. "$(dirname "$0")/common.sh"
trap - ERR   # read-only report: keep going past checks that "fail"
need_root
load_conf

say "Containers"
cd "$BACKEND" && "${COMPOSE[@]}" ps --format 'table {{.Service}}\t{{.Status}}'
say "Memory"
mem_report
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}'
say "Disk"
df -h / | tail -1
du -sh "$MEDIA" "$BACKUPS" 2>/dev/null
say "Website"
for path in / /api/v1/market/articles/; do
  if is_ip "$DOMAIN"; then url="http://127.0.0.1:${WEBPORT:-8090}$path"; hdr="Host: $DOMAIN:${WEBPORT:-8090}"
  else url="https://$DOMAIN$path"; hdr="X-Beersheba: status"; fi
  printf '   %-40s %s\n' "$path" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -H "$hdr" "$url")"
done
say "Latest backup"
ls -1t "$BACKUPS" 2>/dev/null | head -2 | sed 's/^/   /'
say "Recent errors (last 30 minutes)"
"${COMPOSE[@]}" logs --since 30m django celeryworker celerybeat 2>&1 | grep -E 'ERROR|CRITICAL|Traceback' | tail -5 || true
echo "   (none shown = none found)"
