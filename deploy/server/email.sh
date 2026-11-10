#!/usr/bin/env bash
# Set up outgoing email over SMTP (e.g. a cPanel mailbox), then send a test message.
#   sudo bash /opt/beersheba/app/deploy/server/email.sh you@example.com
#     you@example.com  = where to send the test email (any inbox you can check)
# Optional, before the command: MAILBOX=beersheba@paperless.et SMTP_HOST=mail.paperless.et SMTP_PORT=465
# The mailbox password is typed in (hidden), stored only in .envs/.server/.django (root-only),
# and never printed. Run it again to change the password.
set -euo pipefail
. "$(dirname "$0")/common.sh"
need_root "$@"
load_conf
TEST_TO=${1:-}
[ -n "$TEST_TO" ] || die "Give an address for the test email, e.g.: sudo bash $0 you@example.com"
MAILBOX=${MAILBOX:-beersheba@paperless.et}
SMTP_HOST=${SMTP_HOST:-mail.paperless.et}
SMTP_PORT=${SMTP_PORT:-465}
DJ="$BACKEND/.envs/.server/.django"
[ -f "$DJ" ] || die "$DJ is missing. Run setup.sh first."

say "Mail server"
timeout 10 bash -c "exec 3<>/dev/tcp/$SMTP_HOST/$SMTP_PORT" 2>/dev/null \
  || die "Cannot reach $SMTP_HOST on port $SMTP_PORT from this server."
ok "$SMTP_HOST:$SMTP_PORT is reachable"

say "Password for $MAILBOX"
read -rsp "   Type the mailbox password (nothing shows while typing), then Enter: " PASS; echo
[ -n "$PASS" ] || die "No password typed."
case "$PASS" in *"'"*) die "The password contains a single quote ('), which the settings file cannot hold. Change the mailbox password in cPanel and run this again.";; esac

say "Saving the settings (password is not shown)"
tmp=$(mktemp)
grep -vE '^(EMAIL_HOST|EMAIL_PORT|EMAIL_HOST_USER|EMAIL_HOST_PASSWORD|EMAIL_USE_SSL|EMAIL_USE_TLS|DJANGO_DEFAULT_FROM_EMAIL|DJANGO_SERVER_EMAIL)=' "$DJ" > "$tmp" || true
{
  echo "EMAIL_HOST=$SMTP_HOST"
  echo "EMAIL_PORT=$SMTP_PORT"
  echo "EMAIL_HOST_USER=$MAILBOX"
  printf "EMAIL_HOST_PASSWORD='%s'\n" "$PASS"
  echo "DJANGO_DEFAULT_FROM_EMAIL=Beersheba <$MAILBOX>"
  echo "DJANGO_SERVER_EMAIL=$MAILBOX"
} >> "$tmp"
cat "$tmp" > "$DJ"; rm -f "$tmp"; unset PASS
chmod 600 "$DJ"
ok "saved in $DJ"

say "Sending a test email to $TEST_TO"
cd "$BACKEND"
"${COMPOSE[@]}" run --rm -T django python manage.py sendtestemail "$TEST_TO" \
  || die "The test email failed. Most often the password is wrong. Run this script again."
ok "sent. Check the inbox (and the spam folder) of $TEST_TO"

say "Restarting the app so it uses the new settings"
"${COMPOSE[@]}" up -d --force-recreate django celeryworker celerybeat
ok "restarted"
say "Done. Paste everything above back to Claude."
