# Beersheba Platform Frontend Audit

This document provides a technical audit of the Beersheba platform's frontend architecture, focusing on the React/Vite setup, state management, routing, and adherence to the new brand design guidelines.

## 1. Architecture and Tooling

*   **Framework**: React 18 with TypeScript.
*   **Build Tool**: Vite 8, providing fast HMR and optimized production builds.
*   **Routing**: `react-router-dom` v6 is used for client-side routing, managed centrally in `App.tsx`.
*   **State Management**:
    *   **Server State**: `@tanstack/react-query` is utilized for fetching, caching, and updating asynchronous data from the backend API.
    *   **Client State**: React Context (`AuthContext.tsx`) is used for global authentication state and user role management. Local component state (`useState`, `useReducer`) handles UI-specific interactions.
    *   **Persistent State**: `localStorage` is used for ephemeral user preferences, such as the buyer watchlist (`useWatchlist.ts`).
*   **API Client**: Axios is configured in `src/api/client.ts` with a base URL of `/api/` (proxied by Vite during development) and interceptors to automatically attach JWT tokens from `localStorage`.

## 2. Key Components and Pages

*   **Routing (`App.tsx`)**: Manages access to pages based on authentication status and user roles using the `ProtectedRoute` component.
*   **Layout (`AppLayout.tsx`, `Sidebar.tsx`, `TopBar.tsx`)**: Provides the core application shell, including responsive navigation and role-aware menus.
*   **Complex Widgets**:
    *   `PolygonCaptureWidget.tsx`: Integrates Leaflet for capturing geospatial boundaries (click, walk, import modes).
    *   `SettlementWidget.tsx`: Handles the reactive calculation of the NBE 50/50 ETB/USD split.
    *   `CuppingForm.tsx`: Implements the complex SCA 10-attribute scoring interface with sliders and live totals.
*   **Marketplace & Discovery**:
    *   `Marketplace.tsx`: Renders the rich card grid for buyers.
    *   `MarketplaceLotDetail.tsx`: The detailed product page for a specific lot.
    *   `BuyerWatchlist.tsx`: Displays lots saved by the buyer.

## 3. Brand Architectural & Design Style Compliance

The frontend is currently undergoing a rebranding transition from "Bunna Bridge" to "Beersheba," shifting from a dark espresso palette to a light premium agricultural identity.

*   **Theming Strategy**: Tailwind CSS v4 is used. Crucially, there is **no `tailwind.config.js`**. All theme tokens (colors, typography) are defined as CSS variables within the `@theme` block of `src/index.css`.
*   **Core Palette Implementation**:
    *   The new palette (Forest, Coffee, Linen, Stone) is defined in `index.css`.
    *   Tailwind utility classes are used for layout, while brand colors are applied via the defined CSS variables.
*   **Leaflet Exceptions**: Leaflet components (`PolygonCaptureWidget`, `FarmMapDisplay`) render outside the React DOM tree and cannot directly use Tailwind utility classes. They correctly use inline styles referencing the CSS variables (e.g., `style={{ color: "var(--color-forest)" }}`).
*   **Audit Findings (Legacy Colors)**:
    *   The application still contains remnants of the old "Dark Roast" palette (e.g., `#1E1208`, `#4A2515`, `#C1440E`).
    *   A systematic review of all components is required to replace legacy color hex codes or Tailwind classes with the new Beersheba theme variables defined in `index.css`. The "Migration Rule" (one page per session) should be strictly followed during this process.

## 4. Identified Technical Debt and Refactoring Needs

1.  **Incomplete Rebranding**: The UI overhaul is still in progress. Many pages and components may still rely on old inline styles or legacy color definitions. A comprehensive pass is needed to ensure full compliance with the new Beersheba design system.
2.  **API Error Handling**: While Axios interceptors handle token injection, a standardized approach to displaying API errors (e.g., using toast notifications or form-level error messages) across all components should be verified and enforced.
3.  **Type Safety**: Ensure that all API responses are strictly typed using TypeScript interfaces (e.g., `CoffeeLot`, `Offer`, `User`) to leverage the full benefits of the language and prevent runtime errors. The fix applied to `getOffers` (returning `Offer[]` instead of `{ results: Offer[] }`) highlights the importance of accurate typing.
4.  **Leaflet Marker Icons**: A known issue with Vite and Leaflet marker icons requires a specific fix (`delete L.Icon.Default.prototype._getIconUrl`). Ensure this fix is consistently applied wherever maps are rendered.
