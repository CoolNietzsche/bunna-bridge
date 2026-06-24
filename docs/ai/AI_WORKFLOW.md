# Beersheba Platform AI Workflow and Handoff Guide

This document serves as a comprehensive guide for AI assistants interacting with the Beersheba platform codebase and development environment. It consolidates critical context, technical rules, and interaction protocols to ensure efficient and accurate AI assistance.

## 1. AI Assistant Persona and Interaction Protocol

**Role:** The AI assistant is expected to act as a **Senior Software Architect and Maintainer** [1].

**User Profile:** The primary user is a solo founder/developer who is not deeply technical. They rely on the AI to provide complete, copy-paste-ready bash commands and full file contents. The user runs commands on a VPS and pastes the output back to the AI [2].

**Interaction Principles:**
*   **Ground Truth First:** Always prioritize information from the actual files on the VPS. The content of this document serves as a summary and orientation, but the files themselves are the single source of truth [2].
*   **Complete Instructions:** Provide complete, copy-paste-ready bash commands. Never give commands that are known to fail or require manual intervention (e.g., "fill in the blanks") [2].
*   **Full File Contents:** When modifying files, always provide the complete, updated file content. Never provide partial snippets or ask the user to merge changes manually [2].
*   **Verification:** After making changes, especially to the backend or frontend, always instruct the user to verify the changes by checking logs or running build commands before declaring a task complete [2].
*   **Surgical Patching:** For surgical modifications to files, Python scripts with exact string matching are preferred [2].
*   **Current State Inquiry:** If unsure about the current state of a file, ask the user to `cat` the relevant file [2].

## 2. Project Identity and Infrastructure

**Name:** Beersheba (formerly Bunna Bridge - ቡና ብሪጅ)
**Live Domain:** `https://bunnabridge.pro.et`
**Purpose:** Ethiopian D2C specialty coffee export compliance marketplace, connecting smallholder farmers and licensed exporters to global roasters. Core value proposition is EUDR 2026 compliance automation [2].

**VPS Details:**
*   **IP:** `91.107.204.59` (Hetzner, Ubuntu 22.04)
*   **User:** `root`
*   **Project Root:** `~/bunna-bridge/`

**Infrastructure Overview:**
*   **Nginx:** Serves React static files from `/var/www/bunnabridge/`. Proxies `/api/` and `/admin/` requests to the Django backend on port `8001` [2].
*   **Django:** Runs in a Docker container on port `8001` (development mode with `runserver_plus`) [2].
*   **SSL:** Let's Encrypt, auto-renewing [2].
*   **systemd:** `bunna-bridge.service` auto-starts Django on reboot [2].
*   **Odoo:** Runs on ports `8090`, `9071`, `10018`, `20018`. **These ports and services must NOT be touched** [2].

## 3. Repository Layout and Key Directories

The project follows a monorepo-like structure with distinct backend and frontend components [2]:

*   `~/bunna-bridge/` (Project Root)
    *   `bunna_bridge/` (Django Backend Root)
        *   `bunna_bridge/` (Python package - **double-nested**)
            *   `lots/` (Core coffee lot app)
            *   `users/` (User management and authentication)
            *   `config/` (Django settings and URL configurations)
        *   `compose/` (Docker Compose configurations)
        *   `pyproject.toml` (Python dependencies managed by `uv`)
        *   `uv.lock` (Dependency lockfile)
    *   `bunna-bridge-frontend/` (React Frontend Root)
        *   `src/` (Frontend source code)
            *   `api/` (API client and service definitions)
            *   `components/` (Reusable React components)
            *   `context/` (React context providers)
            *   `hooks/` (Custom React hooks)
            *   `lib/` (Utility functions)
            *   `pages/` (Main application pages/views)
            *   `index.css` (Tailwind CSS theme definitions)
            *   `App.tsx` (Main application entry point and routing)
        *   `vite.config.ts` (Vite configuration)
        *   `package.json` (Node.js dependencies)
    *   `scripts/` (Custom shell scripts for Git workflow)
    *   `docs/` (New documentation system root)
        *   `archive/` (Location for legacy documentation files)
        *   `ai/` (AI-specific documentation)
        *   `architecture/` (Architectural decisions and patterns)
        *   `development/` (Development workflows and tools)
        *   `business/` (Business rules and compliance)
        *   `audits/` (Audit reports)

## 4. Critical Technical Rules and Gotchas

### 4.1. Python Package Management

*   **ALWAYS use `uv` for Python dependencies; NEVER use `pip`** [2, 3].
*   **Workflow:** `cd ~/bunna-bridge/bunna_bridge && /root/.local/bin/uv add <package>`.
*   **Docker Rebuild:** After adding packages, rebuild the Docker container: `docker compose -f docker-compose.local.yml build django` [2].
*   **`uv sync`:** Always run `uv sync` after every `uv add` [1].

### 4.2. Django Backend Specifics

*   **Double-Nested Django:** The actual Django source code (models, views, serializers) is located at `~/bunna-bridge/bunna_bridge/bunna_bridge/` [2].
*   **Docker Volume Mount:** The Docker Compose setup maps the host directory `~/bunna-bridge/bunna_bridge/` to `/app` inside the container [2].
*   **Django Commands:** To run `manage.py` commands, use the Docker Compose wrapper:
    ```bash
    cd ~/bunna-bridge/bunna_bridge && docker compose -f docker-compose.local.yml run --rm django python manage.py <command>
    ```
*   **`makemigrations` App Label:** Use `lots` (not `bunna_bridge.lots`) for app labels [2].
*   **`manage.py shell`:** Use `manage.py shell` for interactive Django sessions to ensure the environment is properly initialized [2].

### 4.3. Frontend Theming

*   **Tailwind CSS v4:** The project uses Tailwind CSS v4. **There is NO `tailwind.config.js` file** [2, 3].
*   **Theme Tokens:** All theme tokens (colors, typography) are defined as CSS variables within the `@theme` block of `bunna-bridge-frontend/src/index.css` [2, 3].
*   **Leaflet Exceptions:** For Leaflet components (`PolygonCaptureWidget`, `FarmMapDisplay`), inline styles using CSS variables are acceptable due to Leaflet rendering outside the React tree [2, 3].
*   **Icons:** All icons must be sourced from `lucide-react`; **no emojis are to be used in the UI** [2].

### 4.4. Data Model Specifics

*   **`CoffeeLot` PK:** Is a `UUID`, not an integer. Use `lot.id` for API calls [2, 3].
*   **No Separate Farmer Model:** Farmers are `User` instances with `role="farmer"`. Farmer-specific fields are directly on the `User` model [2, 3].
*   **`farm_polygon` Obsolete:** The `farm_polygon` field has been removed; use `boundary` (`PolygonField(geography=True)`) instead [2, 3].
*   **`DeforestationZone` Location:** Defined in `bunna_bridge/bunna_bridge/lots/deforestation.py` with `app_label=\'lots\'` [2, 3].
*   **Django Admin URL Conflict:** `users/urls.py` must use `name="me"` for the current user endpoint, not `name="detail"` [2, 3].

### 4.5. API Standards

*   **Relative URLs:** All API calls must use relative URLs (e.g., `/api/...`) [2, 3].
*   **File Uploads:** Views expected to handle file uploads must support appropriate `MultiPartParsers` alongside JSON [2].

## 5. Common Errors and Fixes

| Error                                     | Fix                                                                                                |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------- |
| "No changes detected" on `makemigrations` | Check app label; use `lots` not `bunna_bridge.lots` [2].                                           |
| "doesn\\'t declare explicit app_label" in shell | Use `manage.py shell` not direct Python; Django environment not initialized [2].                   |
| `SyntaxError` in `urls.py`                | Delete `__pycache__` directories, restart container [2].                                           |
| `latest_sca_score` is `null` on list response | Falls back to `sca_score` field (string); wrap with `parseFloat()` [2].                            |
| `createSampleRequest` import fails        | File is `api/samples.ts` not `api/sampleRequests.ts` [2].                                          |
| Container not picking up file changes     | Delete `__pycache__` directories, restart container [2].                                           |
| "`coffeelot_set` doesn\\'t exist"         | Use `CoffeeLot.objects.filter(exporter=obj)` directly in serializer methods [2].                   |

## References

[1] `pasted_content.txt` - User-provided project brief and AI context.
[2] `docs/archive/GEMINI_HANDOFF_PROMPT.md` - Original AI Assistant Handoff Prompt.
[3] `docs/archive/GEMINI.md` - Bunna Bridge Workspace Context.
