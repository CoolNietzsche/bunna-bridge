#!/usr/bin/env bash
# Step 2 — install Docker from Ubuntu's own packages, only if it is missing.
#   sudo bash /opt/beersheba/app/deploy/telecloud/install-docker.sh
#
# Safe for the call centre:
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
apt-get install -s --no-upgrade docker.io docker-compose-v2 docker-buildx | grep -E '^(Inst|Conf)' | grep '^Inst' | sed 's/^/   /'
if apt-get install -s --no-upgrade docker.io docker-compose-v2 docker-buildx | grep '^Inst' | grep -q '\['; then
  die "apt wants to UPGRADE an existing package (shown in [brackets] above). Not installing."
fi

say "Installing Docker"
DEBIAN_FRONTEND=noninteractive apt-get install -y -q --no-upgrade docker.io docker-compose-v2 docker-buildx
systemctl enable --now docker

say "Check"
docker --version; docker compose version; docker buildx version
systemctl is-active docker
systemctl is-active nginx | sed 's/^/nginx: /'
say "Memory after"
mem_report
say "Done. Paste everything above back to Claude."
