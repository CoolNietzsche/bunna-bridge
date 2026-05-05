#!/bin/bash
# undo.sh - Undo the last commit (keeps changes staged)
set -e
echo "⚠️  This will undo your last commit (changes stay staged)."
read -p "Are you sure? (y/N): " confirm
if [ "$confirm" != "y" ]; then echo "Aborted."; exit 0; fi
git reset --soft HEAD~1
echo "✅ Last commit undone. Changes are still staged."
