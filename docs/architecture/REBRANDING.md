# Beersheba Platform Rebranding Guide

This document details the rebranding initiative from "Bunna Bridge" to "Beersheba," outlining the new design philosophy, visual identity, and technical implementation considerations. The rebrand is comprehensive, extending beyond cosmetic changes to influence documentation, AI workflows, and future development practices.

## 1. Rebrand Overview

**Previous Brand Name:** Bunna Bridge (ቡና ብሪጅ)
**New Brand Name:** Beersheba

The rebranding signifies an evolution of the platform, moving from its original identity to a more refined and premium agricultural aesthetic. This shift is intended to better reflect the platform's focus on high-quality Ethiopian specialty coffee and its commitment to EUDR compliance.

## 2. Design Philosophy

The core design philosophy has transitioned from a dark, espresso-themed palette to a **light, premium agricultural identity** [1]. This change was primarily dictated by the new Beersheba logo, which serves as the foundation for the updated design system.

## 3. Visual Identity

### 3.1. Color Palette

The new color palette reflects the agricultural and natural themes associated with coffee production, moving away from the previous dark tones. These colors are defined as CSS variables within the `@theme` block of `index.css` [2].

| Color Name | Hex Code | Role(s)                                          | Description                                      |
| :--------- | :------- | :----------------------------------------------- | :----------------------------------------------- |
| Forest     | `#1B4D35`| Actions, Sidebar, Success                        | Primary deep green, representing nature and growth. |
| Coffee     | `#8B5E3C`| Prices, SCA Scores                               | Warm brown, reflecting coffee beans and earth.   |
| Linen      | `#F7F5F0`| Page Backgrounds                                 | Light, neutral background color.                 |
| Stone      | `#F0EDE6`| Cards                                            | Off-white, providing a clean and subtle contrast. |
| Ink        | `#1C1C1A`| -                                                | Dark, almost black, for text or strong contrast. |
| Slate      | `#4A4A45`| -                                                | Dark grey, for secondary text or subtle elements. |

### 3.2. Typography

The selection of typefaces aims to convey a sense of premium quality, readability, and modern elegance.

| Usage             | Font Family       | Description                                                  |
| :---------------- | :---------------- | :----------------------------------------------------------- |
| Display           | Cormorant Garamond| Used for prominent headings and titles.                      |
| Labels and Data   | DM Mono           | Monospaced font for technical details, labels, and data.     |
| Body Text         | Instrument Sans   | Clean and highly readable for general body copy.             |
| Logo Wordmark     | Playfair Display  | Distinctive font used specifically for the Beersheba logo.   |

### 3.3. Brand Assets

Key visual assets for the Beersheba brand include:

*   **Expanded Sidebar Logo:** `logo-full.png`
*   **Collapsed Sidebar Logo:** `logo-icon.png`
*   **Favicon:** `favicon.png`

**Important Note:** The word "Beersheba" should **never be hardcoded** directly beside the logos in the UI [1]. The logo assets are designed to be self-sufficient.

## 4. Technical Implementation for Theming

### 4.1. Tailwind CSS v4 Integration

The platform utilizes Tailwind CSS v4, with a critical architectural decision regarding its configuration:

*   There is **no `tailwind.config.js` file** [1, 2].
*   All theme tokens (colors, spacing, etc.) are defined as **CSS variables** within the `@theme` block of `bunna-bridge-frontend/src/index.css` [2].
*   Tailwind utilities are primarily used for layout and structural styling, while brand-specific colors and typography are managed via CSS variables.

### 4.2. Theme Architecture Flow

The theming architecture follows a clear cascade:

1.  `index.css` `@theme` block (defines CSS variables)
2.  CSS variables (consumed by components)
3.  Tailwind utilities (for layout and generic styling)
4.  Leaflet inline styles (for specific mapping components)

### 4.3. Leaflet Exceptions

Due to Leaflet rendering outside the React component tree, certain components like `PolygonCaptureWidget` and `FarmMapDisplay` may use inline styles to apply CSS variables directly (e.g., `style={{ color: 
"var(--color-forest)" }}`), as Tailwind utilities are not directly available in this context [1].

## 5. Evolved Development Process

The rebranding process emphasizes a structured approach to development, often referred to as the "Migration Rule" [1]:

1.  **Rename First:** Prioritize renaming existing elements to reflect the new brand. This helps in clearly delineating changes and avoiding confusion.
2.  **Theme Second:** Apply the new visual identity after renaming is complete.

**Important:** Avoid rewriting many pages or components in a single session. Instead, follow a granular process for each significant change, focusing on one page at a time [1]:

*   **Read File:** Understand the existing code or documentation.
*   **Rewrite File:** Implement the necessary changes.
*   **Build:** Run the project\'s build process (e.g., `npm run build` for frontend).
*   **Verify:** Thoroughly test the changes to ensure correctness. Remember that a successful build does not guarantee runtime correctness [1].

**Recommended Page Migration Order:**

1.  Dashboard
2.  Lots
3.  Marketplace
4.  LotDetail
5.  LotPipeline
6.  SampleRequests

After each page migration, ensure to build and verify before proceeding to the next [1].

## References

[1] `pasted_content.txt` - User-provided project brief and AI context.
[2] `bunna-bridge-frontend/src/index.css` - Frontend stylesheet defining theme tokens.
