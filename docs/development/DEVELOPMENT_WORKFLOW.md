# Beersheba Platform Development Workflow

This document outlines the recommended development workflow for the Beersheba platform, emphasizing best practices for code changes, testing, and deployment. Adhering to this workflow ensures consistency, reduces errors, and facilitates collaborative development.

## 1. General Principles

*   **Iterative Development:** Avoid large, monolithic changes. Break down tasks into smaller, manageable iterations.
*   **Test Early, Test Often:** Verify changes frequently to catch issues early in the development cycle.
*   **Documentation as Code:** Treat documentation as an integral part of the codebase, keeping it synchronized with implementation.
*   **Production-Safe Solutions:** Prioritize robust and reliable solutions that are suitable for a production environment.

## 2. Evolved Development Process

The following sequence is recommended for making changes, particularly during significant updates like rebranding:

1.  **Rename First:** If a change involves renaming entities (e.g., variables, components, files), perform the renaming operation first. This helps in clearly delineating changes and avoiding confusion.
2.  **Theme Second:** After structural or naming changes, apply thematic or styling updates. This separation ensures that visual changes are built upon a stable foundation.

**Important:** Avoid rewriting many pages or components in a single session. Instead, follow a granular process for each significant change:

*   **Read File:** Understand the existing code or documentation.
*   **Rewrite File:** Implement the necessary changes.
*   **Build:** Run the project's build process (e.g., `npm run build` for frontend).
*   **Verify:** Thoroughly test the changes to ensure correctness. Remember that a successful build does not guarantee runtime correctness [1].

## 3. Frontend Development Workflow (React/Vite)

### 3.1. Starting the Development Server

To run the frontend development server:

```bash
cd ~/bunna-bridge/bunna-bridge-frontend
screen -dmS vite bash -c 'npm run dev > /tmp/vite.log 2>&1'
```

To view the logs of the running Vite server:

```bash
tail /tmp/vite.log
```

### 3.2. Stopping the Development Server

To kill all active Vite screen sessions:

```bash
screen -ls | grep vite | awk \'{print $1}\' | xargs -I{} screen -S {} -X quit
```

### 3.3. Deploying Frontend to Production

For production deployment of the frontend:

1.  **Build the project:**
    ```bash
    cd ~/bunna-bridge/bunna-bridge-frontend
    npm run build
    ```
2.  **Copy build artifacts:**
    ```bash
    cp -r dist/* /var/www/bunnabridge/
    ```

## 4. Backend Development Workflow (Django)

### 4.1. Managing Dockerized Services

The backend services are managed using Docker Compose. Ensure you are in the `bunna_bridge` directory.

```bash
cd ~/bunna-bridge/bunna_bridge
```

*   **Start services:**
    ```bash
    docker compose -f docker-compose.local.yml up -d
    ```
*   **View Django logs:**
    ```bash
    docker compose -f docker-compose.local.yml logs django --tail=20
    ```
*   **Restart Django service:**
    ```bash
    docker compose -f docker-compose.local.yml restart django
    ```
*   **Run Django management commands:**
    ```bash
    docker compose -f docker-compose.local.yml run --rm django python manage.py <command>
    ```

### 4.2. Adding Python Packages

**Critical:** Always use `uv` for Python package management; **never use `pip`** [1, 2].

1.  **Add package using `uv`:**
    ```bash
    cd ~/bunna-bridge/bunna_bridge && /root/.local/bin/uv add <package>
    ```
2.  **Rebuild Docker image:** After adding new Python packages, the Docker image for the Django service must be rebuilt to include them.
    ```bash
    docker compose -f docker-compose.local.yml build django
    ```

## 5. Git Workflow

The project uses a specific Git workflow, facilitated by custom scripts located in the `scripts/` directory.

*   **Push changes:**
    ```bash
    cd ~/bunna-bridge && ./scripts/push.sh
    ```
*   **Check repository status:**
    ```bash
    cd ~/bunna-bridge && ./scripts/status.sh
    ```
*   **Create and push a new branch:**
    ```bash
    cd ~/bunna-bridge && ./scripts/new-branch.sh
    ```
*   **Rebase with master:**
    ```bash
    cd ~/bunna-bridge && ./scripts/sync.sh
    ```
*   **Undo last commit:**
    ```bash
    cd ~/bunna-bridge && ./scripts/undo.sh
    ```

## References

[1] `pasted_content.txt` - User-provided project brief and AI context.
[2] `HANDOFF.md` - Original AI Agent Handoff Prompt. (Archived in `docs/archive/`)
