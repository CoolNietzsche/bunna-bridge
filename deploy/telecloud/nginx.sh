#!/usr/bin/env bash
# Step 5 — put Beersheba online at https://DOMAIN.
#   sudo bash /opt/beersheba/app/deploy/telecloud/nginx.sh
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
TEMPLATE="$(dirname "$0")/nginx-beersheba.conf"

render() {  # $1 = full | http
  sed -e "s|__DOMAIN__|$DOMAIN|g" -e "s|__PORT__|$PORT|g" -e "s|__MEDIA__|$MEDIA|g" "$TEMPLATE" > "$SITE.tmp"
  [ "$1" = http ] && sed -i '/#HTTPS-START/,/#HTTPS-END/d' "$SITE.tmp"
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
ip=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)
[ "$ip" = "$SERVER_IP" ] || die "$DOMAIN points to '${ip:-nothing}', not $SERVER_IP. Fix the DNS A record first."
ok "$DOMAIN points at this server"
for f in /etc/nginx/sites-enabled/*; do
  [ "$(readlink -f "$f")" = "$SITE" ] && continue
  grep -qsw "server_name.*$DOMAIN" "$f" && die "$DOMAIN is already used in $f."
done
ok "no other site uses $DOMAIN"
[ -f "$WEB/index.html" ] || die "Website not built yet. Run frontend.sh first."
curl -fs -o /dev/null -H "Host: $DOMAIN" -H 'X-Forwarded-Proto: https' "http://127.0.0.1:$PORT/api/v1/market/articles/" || die "Backend not answering on 127.0.0.1:$PORT. Run setup.sh first."
ok "backend is answering"
install -d -m 755 "$ACME"
[ -f "$SITE" ] && cp -a "$SITE" "$SITE.prev" || true

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
  [ -n "$n" ] && [ "$n" != "_" ] && printf '   %-28s %s\n' "https://$n/" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$n/" || true)"
done
say "Done. Paste everything above back to Claude."
