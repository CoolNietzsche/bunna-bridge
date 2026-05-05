#!/bin/bash
# push.sh - Stage, commit, and push changes
set -e
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📦 Current branch: $BRANCH"
git status --short
echo ""
read -p "📝 Commit message: " msg
if [ -z "$msg" ]; then echo "❌ Commit message cannot be empty"; exit 1; fi
git add .
git commit -m "$msg"
git push origin "$BRANCH"
echo "✅ Pushed to $BRANCH"
