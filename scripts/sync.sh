#!/bin/bash
# sync.sh - Pull latest changes from main and rebase current branch
set -e
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "🔄 Syncing $BRANCH with origin/main..."
git fetch origin
git rebase origin/main
echo "✅ $BRANCH is up to date with main"
