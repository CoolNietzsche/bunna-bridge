# Beersheba Platform Documentation System

Welcome to the Beersheba platform documentation. This system has been evolved from the legacy Bunna Bridge documentation to provide a comprehensive, structured, and production-ready reference for the Beersheba platform, a D2C specialty coffee export compliance marketplace.

## Documentation Structure

The documentation is organized into logical subdirectories, each focusing on a specific aspect of the platform.

### 1. Architecture (`docs/architecture/`)

*   **[DOMAIN_MODEL.md](architecture/DOMAIN_MODEL.md)**: Detailed overview of the core entities, their attributes, relationships, and key business logic.
*   **[REBRANDING.md](architecture/REBRANDING.md)**: Guide to the rebranding initiative, including design philosophy, visual identity (colors, typography), and technical implementation for theming.
*   **[API_CONVENTIONS.md](architecture/API_CONVENTIONS.md)**: Conventions for interacting with the platform API, including authentication, endpoint groups, and data formats.
*   **[DATA_MODEL_GOTCHAS.md](architecture/DATA_MODEL_GOTCHAS.md)**: Highlights critical design decisions, potential pitfalls, and implementation details that require special attention.

### 2. Development (`docs/development/`)

*   **[DEVELOPMENT_WORKFLOW.md](development/DEVELOPMENT_WORKFLOW.md)**: Recommended workflows for code changes, managing Dockerized services, and using Git scripts.
*   **[FEATURE_ROADMAP.md](development/FEATURE_ROADMAP.md)**: Comprehensive overview of implemented features and the historical development phases of the marketplace.
*   **[DEPLOYMENT.md](development/DEPLOYMENT.md)**: (Moved from root) Details the deployment process and environment configuration.

### 3. Business & Compliance (`docs/business/`)

*   **[EUDR_COMPLIANCE.md](business/EUDR_COMPLIANCE.md)**: In-depth explanation of the 7-gate EUDR compliance engine, its business logic, and enforcement mechanisms.
*   **[USER_ROLES.md](business/USER_ROLES.md)**: Defines the platform's user roles and their associated permissions and access levels.

### 4. Audits (`docs/audits/`)

*   **[TECHNICAL_AUDIT.md](audits/TECHNICAL_AUDIT.md)**: Integrated technical audit of both backend and frontend, highlighting implementation status and areas for improvement.
*   **[BACKEND_AUDIT.md](audits/BACKEND_AUDIT.md)**: Specific technical audit of the Django/DRF backend architecture.
*   **[FRONTEND_AUDIT.md](audits/FRONTEND_AUDIT.md)**: Specific technical audit of the React/Vite frontend architecture.

### 5. AI Assistant Context (`docs/ai/`)

*   **[AI_WORKFLOW.md](ai/AI_WORKFLOW.md)**: Comprehensive guide for AI assistants, consolidating critical context, technical rules, and interaction protocols.
*   **[AI_SESSION_TEMPLATE.md](ai/AI_SESSION_TEMPLATE.md)**: (Moved from root) Template for initiating new AI development sessions.

### 6. Archive (`docs/archive/`)

Contains the original, legacy documentation files from the Bunna Bridge era for historical reference.

---

## Evolution from Legacy Documentation

This system represents a significant evolution from the original `AI_CONTEXT.md` and other legacy files:

*   **Structured Organization**: Information is now logically categorized, making it easier to find and maintain.
*   **Code-Synchronized**: The documentation has been cross-referenced with the actual implementation to ensure accuracy and address stale information.
*   **Enhanced Detail**: New documents provide deeper insights into critical areas like the EUDR compliance engine, rebranding strategy, and technical audits.
*   **AI-Optimized**: Dedicated documentation for AI assistants ensures more efficient and accurate collaboration in the future.

Treat this documentation as an integral part of the Beersheba codebase. Keep it updated as the platform continues to evolve.
