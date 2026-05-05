#!/bin/bash
# new-branch.sh - Create and switch to a new branch
set -e
read -p "🌿 Branch name: " branch
if [ -z "$branch" ]; then echo "❌ Branch name cannot be empty"; exit 1; fi
git checkout -b "$branch"
git push -u origin "$branch"
echo "✅ Created and pushed branch: $branch"
