#!/usr/bin/env bash
# Step 5 — put Beersheba online.
#   sudo bash /opt/beersheba/app/deploy/telecloud/nginx.sh
#
# Test mode (setup.sh was given the server's IP): serves the site over plain
# HTTP on its own port, http://<IP>:8090/ — no certificate, and ports 80/443
# are not touched. Open TCP 8090 in the Telecloud security group to reach it.
# Later, run setup.sh with the domain and then this script again: the same
# file switches to HTTPS on 443 and port 8090 is no longer used.
#
# Adds ONE new nginx file (/etc/nginx/sites-available/beersheba) and one
# certificate for DOMAIN. Existing sites and the 03:15 renewal job are not
# edited. nginx is only *reloaded* (graceful: open connections finish, nothing
# restarts), and only after `nginx -t` passes. Two reloads in total.
set -euo pipefail
. "$(dirname "$0")/common.sh"
need_root
load_conf
SERVER_IP=196.189.51.169
SCHEME=https; is_ip "$DOMAIN" && SCHEME=http
TEMPLATE="$(dirname "$0")/nginx-beersheba.conf"

render() {  # $1 = full | http | iptest
  sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__PORT__|$PORT|g" -e "s|__MEDIA__|$MEDIA|g" "$TEMPLATE" > "$SITE.tmp"
  [ "$1" = http ] && sed -i '/#HTTPS-START/,/#HTTPS-END/d' "$SITE.tmp"
  if [ "$1" = iptest ]; then  # the full site on its own test port, without certificate or HSTS
    awk '/^server \{/ && !seen {skip=1; seen=1} /^#HTTPS-START/ {skip=0} !skip' "$SITE.tmp" > "$SITE.tmp2"
    sed -e "s/listen 443 ssl;/listen $WEBPORT;/" -e "s/listen \[::\]:443 ssl;/listen [::]:$WEBPORT;/" \
        -e '/ssl_certificate/d' -e '/Strict-Transport-Security/d' "$SITE.tmp2" > "$SITE.tmp"
    rm -f "$SITE.tmp2"
  fi
  grep -rqs '\[::\]:' /etc/nginx/sites-enabled/ || sed -i '/\[::\]/d' "$SITE.tmp"   # match the server's IPv6 use
  mv "$SITE.tmp" "$SITE"
}
safe_reload() {  # test first; on failure put back the previous file and do NOT reload
  if nginx -t 2>/tmp/beersheba-nginx-test.txt; then
    systemctl reload nginx; ok "nginx reloaded (config test passed)"
  else
    cat /tmp/beersheba-nginx-test.txt
    if [ -f "$SITE.prev" ]; then mv "$SITE.prev" "$SITE"; else rm -f "$SITE_LINK" "$SITE"; fi
    die "nginx config test failed; the Beersheba file was rolled back and nginx was NOT reloaded."
  fi
}

say "Pre-checks"
nginx -t 2>/dev/null || die "The existing nginx config already fails its own test. Not touching nginx."
ok "existing nginx config is valid"
if is_ip "$DOMAIN"; then
  [ "$DOMAIN" = "$SERVER_IP" ] || die "Test mode needs this server's public IP ($SERVER_IP), not $DOMAIN."
  ok "test mode: plain HTTP on http://$DOMAIN:$WEBPORT/"
  if ss -ltnH | awk '{print $4}' | grep -qE "[:.]$WEBPORT\$" && ! grep -qs "listen $WEBPORT;" "$SITE"; then
    die "Port $WEBPORT is already used by another program."
  fi
  ok "port $WEBPORT is free (or already Beersheba's)"
else
  ip=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)
  [ "$ip" = "$SERVER_IP" ] || die "$DOMAIN points to '${ip:-nothing}', not $SERVER_IP. Fix the DNS A record first."
  ok "$DOMAIN points at this server"
fi
for f in /etc/nginx/sites-enabled/*; do
  [ "$(readlink -f "$f")" = "$SITE" ] && continue
  grep -qsw "server_name.*$DOMAIN" "$f" && die "$DOMAIN is already used in $f."
done
ok "no other site uses $DOMAIN"
[ -f "$WEB/index.html" ] || die "Website not built yet. Run frontend.sh first."
curl -fs -o /dev/null -H "Host: $DOMAIN" -H "X-Forwarded-Proto: $SCHEME" "http://127.0.0.1:$PORT/api/v1/market/articles/" || die "Backend not answering on 127.0.0.1:$PORT. Run setup.sh first."
ok "backend is answering"
install -d -m 755 "$ACME"
[ -f "$SITE" ] && cp -a "$SITE" "$SITE.prev" || true

if is_ip "$DOMAIN"; then
  say "Test site over plain HTTP"
  render iptest
  ln -sf "$SITE" "$SITE_LINK"
  safe_reload
  rm -f "$SITE.prev"
  say "Checks"
  sleep 2
  for path in / /learn /api/v1/market/articles/; do
    printf '   %-40s %s\n' "http://$DOMAIN:$WEBPORT$path" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -H "Host: $DOMAIN:$WEBPORT" "http://127.0.0.1:$WEBPORT$path" || true)"
  done
  printf '   %-40s %s (should be 404)\n' "private document path" "$(curl -s -o /dev/null -w '%{http_code}' -H "Host: $DOMAIN:$WEBPORT" "http://127.0.0.1:$WEBPORT/media/lots/phyto/x.pdf" || true)"
  echo "   other sites on this server (should be unchanged):"
  for s in /etc/nginx/sites-enabled/*; do
    n=$(grep -m1 -ow 'server_name[^;]*' "$s" | awk '{print $2}' || true)
    [ -n "$n" ] && [ "$n" != "_" ] && [ "$n" != "$DOMAIN" ] && printf '   %-40s %s\n' "https://$n/" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$n:443:127.0.0.1" "https://$n/" || true)"
  done
  say "Done. Open TCP $WEBPORT in the Telecloud security group, then http://$DOMAIN:$WEBPORT/ in a browser. Paste everything above back to Claude."
  exit 0
fi

if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  say "1/2 Temporary HTTP-only site, so the certificate can be issued"
  render http
  ln -sf "$SITE" "$SITE_LINK"
  safe_reload
  echo ok > "$ACME/beersheba-check"
  mkdir -p "$ACME/.well-known/acme-challenge" && mv "$ACME/beersheba-check" "$ACME/.well-known/acme-challenge/"
  curl -fs "http://$DOMAIN/.well-known/acme-challenge/beersheba-check" >/dev/null \
    || die "http://$DOMAIN is not reachable from the server itself. Check port 80 in the Telecloud security group."
  rm -f "$ACME/.well-known/acme-challenge/beersheba-check"
  say "Requesting the certificate for $DOMAIN only"
  certbot certonly --webroot -w "$ACME" -d "$DOMAIN" --non-interactive --agree-tos \
    --register-unsafely-without-email --deploy-hook "systemctl reload nginx" \
    || die "certbot could not issue the certificate. The site stays HTTP-only (it just redirects). Paste this back."
  ok "certificate issued; the nightly renewal job will renew it like the others"
else
  ok "certificate for $DOMAIN already exists"
fi

say "2/2 Full HTTPS site"
cp -a "$SITE" "$SITE.prev"
render full
ln -sf "$SITE" "$SITE_LINK"
safe_reload
rm -f "$SITE.prev"

say "Checks"
sleep 2
for path in / /api/v1/market/articles/ /learn; do
  printf '   %-28s %s\n' "https://$DOMAIN$path" "$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN$path")"
done
printf '   %-28s %s (should be 404)\n' "private document path" "$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN/media/lots/phyto/x.pdf")"
certbot renew --dry-run --cert-name "$DOMAIN" 2>&1 | grep -iE 'success|fail' | head -2 | sed 's/^/   renewal test: /' || true
echo "   other sites on this server (should be unchanged):"
for s in /etc/nginx/sites-enabled/*; do
  n=$(grep -m1 -ow 'server_name[^;]*' "$s" | awk '{print $2}' || true)
  [ -n "$n" ] && [ "$n" != "_" ] && printf '   %-28s %s\n' "https://$n/" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$n:443:127.0.0.1" "https://$n/" || true)"
done
say "Done. Paste everything above back to Claude."
