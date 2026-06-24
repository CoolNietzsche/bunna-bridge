#!/bin/bash

# Beersheba AI Handoff Helper
# This script generates a quick status summary to help a new AI agent get up to speed.

echo "--- BEERSHEBA CURRENT STATUS SUMMARY ---"
echo "Date: $(date)"
echo ""

echo "1. RECENT COMMITS/CHANGES:"
git log -n 3 --oneline
echo ""

echo "2. ACTIVE BRANCH:"
git branch --show-current
echo ""

echo "3. RECENT DOCS UPDATED:"
ls -lt docs/architecture/ docs/development/ | head -n 5
echo ""

echo "4. BACKEND STATUS (DOCKER):"
cd bunna_bridge && docker compose -f docker-compose.local.yml ps
echo ""

echo "5. FRONTEND BUILD CHECK:"
cd ../bunna-bridge-frontend && [ -d "dist" ] && echo "Dist folder exists (Last build: $(stat -c %y dist))" || echo "No dist folder found."

echo ""
echo "--- END OF STATUS SUMMARY ---"
