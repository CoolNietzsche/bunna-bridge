#!/bin/bash
# status.sh - Pretty overview of repo state
set -e
echo "🌿 Branch:  $(git rev-parse --abbrev-ref HEAD)"
echo "📍 Remote:  $(git remote get-url origin)"
echo "📝 Last commit: $(git log -1 --pretty='%h - %s (%cr)')"
echo ""
echo "--- Changes ---"
git status --short
echo ""
echo "--- Unpushed commits ---"
git log origin/$(git rev-parse --abbrev-ref HEAD)..HEAD --oneline 2>/dev/null || echo "None or branch not on remote yet"
