#!/usr/bin/env bash
# Step 2 — install Docker from Ubuntu's own packages, only if it is missing.
#   sudo bash /opt/beersheba/app/deploy/server/install-docker.sh
#
# Safe for the other sites on this server:
#   - `--no-upgrade`: apt installs only new packages and refuses to upgrade any
#     package that is already installed (nginx, openssl, node ... stay as they are).
#     If Docker would need an upgrade of something existing, apt stops instead.
#   - no `apt upgrade`, no reboot, nothing under /var/www/mereq_*, PM2 or nginx.
#   - Beersheba containers publish nothing to the internet (127.0.0.1 only).
set -euo pipefail
. "$(dirname "$0")/common.sh"
need_root

say "Memory before"
mem_report
if command -v docker >/dev/null && docker compose version >/dev/null 2>&1 && docker buildx version >/dev/null 2>&1; then
  ok "Docker, Compose and Buildx are already installed — nothing to do."
  docker --version; docker compose version
  exit 0
fi

say "Refreshing the package list (does not upgrade anything)"
apt-get update -q

say "What apt would install (dry run)"
PKGS=(docker.io docker-compose-v2 docker-buildx)
# --no-install-recommends: only Docker and what it strictly needs (no ubuntu-fan, dnsmasq-base, ...).
APT_OPTS=(--no-upgrade --no-install-recommends)
apt-get install -s "${APT_OPTS[@]}" "${PKGS[@]}" | grep '^Inst' | sed 's/^/   /' || true
# A NEW package looks like:   Inst name (version ...)
# An UPGRADE looks like:      Inst name [installed-version] (new-version ...)
if apt-get install -s "${APT_OPTS[@]}" "${PKGS[@]}" | grep -qE '^Inst [^ ]+ \['; then
  die "apt wants to UPGRADE an existing package (shown in [brackets] above). Not installing."
fi

say "Installing Docker"
ok "only new packages; nothing already installed is upgraded"
DEBIAN_FRONTEND=noninteractive apt-get install -y -q "${APT_OPTS[@]}" "${PKGS[@]}"
systemctl enable --now docker

say "Check"
docker --version; docker compose version; docker buildx version
systemctl is-active docker || true
systemctl is-active nginx | sed 's/^/nginx: /' || true
say "Memory after"
mem_report
say "Done. Paste everything above back to Claude."
