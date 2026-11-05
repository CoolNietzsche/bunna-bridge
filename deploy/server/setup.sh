#!/usr/bin/env bash
# Step 3 — first-time setup of the Beersheba backend (Docker only).
#   sudo bash /opt/beersheba/app/deploy/server/setup.sh your-domain
#   sudo bash /opt/beersheba/app/deploy/server/setup.sh <server-ip>      # test mode: http://IP:8090
#
# Run it again with the real domain later: the address settings are updated,
# the secrets are kept, and the containers restart with the new address.
#
# Creates secret settings ON THE SERVER (they are never printed), builds the
# images, creates the database and starts the containers. The web port is
# bound to 127.0.0.1 only. Safe to run again: existing settings are kept.
set -euo pipefail
. "$(dirname "$0")/common.sh"
need_root "$@"
DOMAIN=${1:-}
[ -n "$DOMAIN" ] || die "Give the domain, e.g.: sudo bash $0 beersheba.example.com"
PORT=8100
SCHEME=https; SSL_REDIRECT=True; WEBPORT=443; ORIGIN="https://$DOMAIN"
if is_ip "$DOMAIN"; then SCHEME=http; SSL_REDIRECT=False; WEBPORT=${2:-8090}; ORIGIN="http://$DOMAIN:$WEBPORT"; fi
BRANCH=$(git -C "$APP" rev-parse --abbrev-ref HEAD)

say "Memory before"
mem_report
[ "$(mem_available_mb)" -ge 1200 ] || die "Less than 1.2 GB memory available — building now could slow the other sites on this server."
command -v docker >/dev/null || die "Docker is not installed. Run install-docker.sh first."
if ss -ltnH | awk '{print $4}' | grep -qE "[:.]$PORT\$" && ! docker ps --format '{{.Names}}' | grep -q '^beersheba-django'; then
  die "Port $PORT is already used by another program."
fi

say "Folders"
install -d -m 755 "$ROOT" "$MEDIA" "$BACKUPS"
install -d -m 700 "$BACKEND/.envs/.server"
printf 'DOMAIN=%s\nPORT=%s\nWEBPORT=%s\nBRANCH=%s\n' "$DOMAIN" "$PORT" "$WEBPORT" "$BRANCH" > "$CONF"
printf 'BEERSHEBA_MEDIA_DIR=%s\nBEERSHEBA_PORT=%s\n' "$MEDIA" "$PORT" > "$BACKEND/.env"
ok "$ROOT (app, media, backups)"

say "Secret settings (created once, never printed)"
rand() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c "$1"; }
DJ="$BACKEND/.envs/.server/.django"; PG="$BACKEND/.envs/.server/.postgres"
if [ ! -f "$PG" ]; then
  cat > "$PG" <<EOF
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=beersheba
POSTGRES_USER=beersheba
POSTGRES_PASSWORD=$(rand 32)
EOF
  ok "created database settings"
else ok "kept existing database settings"; fi
if [ ! -f "$DJ" ]; then
  cat > "$DJ" <<EOF
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=$(rand 60)
# Admin lives at https://$DOMAIN/manage-<random>/ ; nginx forwards /manage-* to Django.
DJANGO_ADMIN_URL=manage-$(rand 12)/
DJANGO_ALLOWED_HOSTS=$DOMAIN
CORS_ALLOWED_ORIGINS=https://$DOMAIN
DJANGO_SECURE_SSL_REDIRECT=True
DJANGO_SECURE_HSTS_PRELOAD=False
REDIS_URL=redis://redis:6379/0
DJANGO_DEFAULT_FROM_EMAIL=Beersheba <noreply@$DOMAIN>
# Add when ready: MAILGUN_API_KEY, MAILGUN_DOMAIN, SMS_ENABLED=True + SMS_* keys, NBE_DEFAULT_FX_RATE
EOF
  ok "created app settings"
else ok "kept existing app settings"; fi
set_key() {  # replace KEY=... in the settings file, or add it
  if grep -q "^$1=" "$DJ"; then sed -i "s|^$1=.*|$1=$2|" "$DJ"; else echo "$1=$2" >> "$DJ"; fi
}
set_key DJANGO_ALLOWED_HOSTS "$DOMAIN"
set_key CORS_ALLOWED_ORIGINS "$ORIGIN"
set_key DJANGO_SECURE_SSL_REDIRECT "$SSL_REDIRECT"
set_key DJANGO_DEFAULT_FROM_EMAIL "Beersheba <noreply@$DOMAIN>"
chmod 600 "$DJ" "$PG"
ok "address: $ORIGIN"
is_ip "$DOMAIN" && warn "test mode: plain HTTP, so use test passwords only until HTTPS is set up"

say "Building images (10-20 minutes the first time)"
cd "$BACKEND"
"${COMPOSE[@]}" build
uid=$(container_uid); gid=$(container_gid)
[ -n "$uid" ] || die "Could not read the app user from the image."
chown -R "$uid:$gid" "$MEDIA"
ok "uploads folder owned by the app user ($uid:$gid)"

say "Database"
"${COMPOSE[@]}" up -d postgres redis
sleep 8
"${COMPOSE[@]}" run --rm -T django python manage.py migrate --noinput | tail -5

say "Starting Beersheba"
"${COMPOSE[@]}" up -d
sleep 12
"${COMPOSE[@]}" ps --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}'
code=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN" -H "X-Forwarded-Proto: $SCHEME" "http://127.0.0.1:$PORT/api/v1/market/articles/" || true)
[ "$code" = "200" ] && ok "API answers on 127.0.0.1:$PORT" || warn "API answered $code (expected 200) — paste the output back"
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}'

say "Memory after"
mem_report
systemctl is-active nginx | sed 's/^/nginx: /' || true
say "Done. Paste everything above back to Claude."
