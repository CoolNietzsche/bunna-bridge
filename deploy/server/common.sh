# Shared settings for the Beersheba deploy scripts (any Ubuntu server with nginx in front).
# Sourced by the other scripts; not run on its own.

ROOT=/opt/beersheba                 # everything Beersheba owns on this server
APP=$ROOT/app                       # git checkout
BACKEND=$APP/bunna_bridge           # docker compose project
MEDIA=$ROOT/media                   # uploaded files (lot photos, documents)
BACKUPS=$ROOT/backups               # nightly database + media backups
WEB=/var/www/beersheba              # built website served by nginx
ACME=/var/www/beersheba-acme        # certbot challenge files for our domain only
SITE=/etc/nginx/sites-available/beersheba
SITE_LINK=/etc/nginx/sites-enabled/beersheba
CONF=$ROOT/beersheba.conf           # DOMAIN, PORT, BRANCH chosen at setup
COMPOSE=(docker compose -f "$BACKEND/docker-compose.server.yml")

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok()   { printf '   OK  %s\n' "$*"; }
warn() { printf '   !!  %s\n' "$*"; }
die()  { printf '\n   STOP: %s\n   Nothing else was changed. Paste this output back.\n' "$*"; exit 1; }

# Any failing command stops the script with a clear message instead of silently.
trap 'die "The command on line $LINENO of $(basename "$0") failed (see the lines just above)."' ERR

# Some servers have two certbots (Ubuntu package and snap) and one of them can be broken
# (e.g. the apt one crashing on a newer pyOpenSSL). Use the first one that actually runs.
certbot() {
  local c
  for c in /snap/bin/certbot /usr/bin/certbot; do
    if [ -x "$c" ] && "$c" --version >/dev/null 2>&1; then "$c" "$@"; return; fi
  done
  command certbot "$@"
}

need_root() { [ "$(id -u)" -eq 0 ] || die "Run this with sudo: sudo bash $0 $*"; }

load_conf() {
  [ -f "$CONF" ] || die "$CONF is missing. Run setup.sh first."
  # shellcheck disable=SC1090
  . "$CONF"
}

mem_report() { free -m | awk 'NR==1 || /^Mem|^Swap/'; }

mem_available_mb() { awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo; }

# The uid the app runs as inside the container (owns uploaded files).
container_uid() { "${COMPOSE[@]}" run --rm --no-deps -T --entrypoint id django -u 2>/dev/null | tail -1 | tr -dc '0-9'; }
container_gid() { "${COMPOSE[@]}" run --rm --no-deps -T --entrypoint id django -g 2>/dev/null | tail -1 | tr -dc '0-9'; }

# Test mode: Beersheba is set up on the server's IP address over plain HTTP until a domain exists.
is_ip() { [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; }

# This server's addresses: the ones on its network cards plus the public one seen from outside
# (they differ behind cloud NAT). Used to check that the domain or IP really is this server.
server_ips() {
  { hostname -I 2>/dev/null; curl -s --max-time 5 https://api.ipify.org 2>/dev/null; } \
    | tr ' ' '\n' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | sort -u || true
}
is_this_server() { server_ips | grep -qx "$1"; }
