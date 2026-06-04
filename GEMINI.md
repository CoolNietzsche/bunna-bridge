# Bunna Bridge Workspace Context

## Project Structure
- Django Backend Core: `./bunna_bridge/`
- React Frontend (Vite): `./bunna-bridge-frontend/`

## Active Engineering Documentation
@./HANDOFF.md
@./IMPLEMENTED_FEATURES.md
@./TECHNICAL_AUDIT.md

## Brand Design Guardrails
- Dark Roast Palette: Espresso (#1A0F07), Dark Roast (#2C1810), Deeper Roast (#1E1208), Mahogany (#4A2515)
- Text/Accents: Terracotta (#C1440E), Amber (#D4824A), Gold (#C9952A), Forest (#1E3A2F), Cream (#F5EDD8), Parchment (#EDE0C4)
- Note: Rely on index.css variables or direct inline styling matching this palette.

## Critical Technical Rules
1. Package Management: ALWAYS use `/root/.local/bin/uv add <package>` for Python dependencies. NEVER use pip. Rebuild the container afterward.
2. Models Guard: `lot.farmer` does NOT exist. `CoffeeLot` references `exporter` (ForeignKey to User).
3. Spatial Engine: `DeforestationZone` is located in `bunna_bridge.lots.deforestation`, NOT `lots.models`.
4. API Standards: Use relative paths (`/api/...`). Ensure Views expected to handle file uploads support appropriate MultiPartParsers alongside JSON.
