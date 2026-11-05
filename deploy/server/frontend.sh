#!/usr/bin/env bash
# Step 4 — build the website inside a throw-away Node container and publish it
# to /var/www/beersheba. Does not use or change the server's own Node or PM2.
#   sudo bash /opt/beersheba/app/deploy/server/frontend.sh
set -euo pipefail
. "$(dirname "$0")/common.sh"
need_root

say "Memory before"
mem_report
[ "$(mem_available_mb)" -ge 1400 ] || die "Less than 1.4 GB memory available — the build could slow the other sites on this server."

say "Building the website (capped at 1.2 GB memory, about 2 minutes)"
docker run --rm -m 1200m --memory-swap 1200m -e NODE_OPTIONS=--max-old-space-size=900 -e npm_config_update_notifier=false \
  -v "$APP/bunna-bridge-frontend":/src -w /src docker.io/library/node:22-alpine \
  sh -c "npm ci --no-audit --no-fund --loglevel=error && npm run build" | tail -4
[ -f "$APP/bunna-bridge-frontend/dist/index.html" ] || die "Build did not produce dist/index.html."

say "Publishing to $WEB"
install -d -m 755 "$(dirname "$WEB")"
rm -rf "$WEB.new"
cp -a "$APP/bunna-bridge-frontend/dist" "$WEB.new"
chown -R root:root "$WEB.new"; chmod -R a+rX "$WEB.new"
if [ -d "$WEB" ]; then rm -rf "$WEB.old"; mv "$WEB" "$WEB.old"; fi
mv "$WEB.new" "$WEB"
ok "$(find "$WEB" -type f | wc -l) files published (previous version kept in $WEB.old)"

say "Memory after"
mem_report
say "Done. Paste everything above back to Claude."
