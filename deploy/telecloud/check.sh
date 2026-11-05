#!/usr/bin/env bash
# Step 1 — READ-ONLY look at the server. Changes nothing, prints no secrets.
#   sudo bash /opt/beersheba/app/deploy/telecloud/check.sh [your-domain]
set -uo pipefail
. "$(dirname "$0")/common.sh"
DOMAIN=${1:-}
PORT=8100

say "Server"
hostname; . /etc/os-release && echo "$PRETTY_NAME"; uname -r; nproc | sed 's/$/ CPUs/'
say "Memory (MB)"
mem_report
say "Disk"
df -h / | tail -1
say "Listening TCP ports (port + program only)"
ss -ltnpH 2>/dev/null | awk '{split($4,a,":"); port=a[length(a)]; match($0,/users:\(\("[^"]+"/); prog=substr($0,RSTART+9,RLENGTH-10); print port, prog}' | sort -n -u
if ss -ltnH | awk '{print $4}' | grep -qE "[:.]$PORT\$"; then warn "port $PORT is IN USE — tell Claude"; else ok "port $PORT is free for Beersheba"; fi
say "Databases on the host"
for s in postgresql mysql mariadb mongod redis-server; do printf '   %-14s %s\n' "$s" "$(systemctl is-active "$s" 2>/dev/null || true)"; done
say "Docker"
if command -v docker >/dev/null; then docker --version; docker compose version 2>/dev/null || warn "docker compose plugin missing"; systemctl is-active docker; docker ps --format '   {{.Names}}  {{.Image}}  {{.Status}}' 2>/dev/null
else echo "   not installed"; fi
say "nginx"
nginx -v 2>&1; systemctl is-active nginx
if nginx -t >/dev/null 2>&1; then ok "current nginx config is valid"; else warn "current nginx config FAILS its own test — do not continue"; fi
echo "   sites enabled:"; ls -1 /etc/nginx/sites-enabled/ | sed 's/^/     /'
[ -e "$SITE" ] && warn "$SITE already exists" || ok "no Beersheba nginx file yet"
say "Certificates and renewal (names only)"
command -v certbot >/dev/null && certbot --version 2>&1
ls -1 /etc/letsencrypt/live 2>/dev/null | grep -v README | sed 's/^/   cert: /'
systemctl list-timers --all 2>/dev/null | grep -i certbot | awk '{print "   timer:", $(NF-1), $NF}'
grep -rhs certbot /etc/cron.d /etc/crontab 2>/dev/null | sed 's/^/   cron: /'
crontab -l 2>/dev/null | grep -i certbot | sed 's/^/   root crontab: /'
say "Firewall on the server"
command -v ufw >/dev/null && ufw status | head -3 || echo "   ufw not installed"
systemctl is-active fail2ban | sed 's/^/   fail2ban: /'
say "Tools"
for t in git curl openssl rsync; do printf '   %-8s %s\n' "$t" "$(command -v $t || echo MISSING)"; done
if [ -n "$DOMAIN" ]; then
  say "DNS for $DOMAIN"
  ip=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)
  echo "   $DOMAIN -> ${ip:-no address}"
  [ "$ip" = "196.189.51.169" ] && ok "points at this server" || warn "does not point at 196.189.51.169 yet"
  grep -rlw "server_name.*$DOMAIN" /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/   !! already used by nginx file: /'
fi
say "Done. Nothing was changed. Paste everything above back to Claude."
