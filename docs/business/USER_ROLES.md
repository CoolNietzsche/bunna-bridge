# Beersheba Platform User Roles and Permissions

This document defines the user roles within the Beersheba platform and outlines the specific permissions and access levels associated with each role. The platform utilizes a role-based access control (RBAC) system to ensure data security and appropriate user experiences.

## 1. Role Definitions

The Beersheba platform defines five distinct user roles, implemented within the `User` model (`bunna_bridge/bunna_bridge/users/models.py`) [1, 2].

| Role       | Identifier | Description                                                                                                                               |
| :--------- | :--------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin**  | `admin`    | Platform administrators with full access to all data and system settings.                                                                 |
| **Exporter**| `exporter` | Licensed Ethiopian coffee exporters who manage coffee lots, respond to sample requests, and handle compliance documentation.              |
| **Buyer**  | `buyer`    | Global specialty coffee roasters or importers who browse the marketplace, request samples, and make offers on coffee lots.                |
| **Farmer** | `farmer`   | Ethiopian smallholder coffee farmers. Their profiles contain crucial farm and geospatial data used for EUDR compliance.                   |
| **Q-Grader**| `qgrader`  | Certified coffee quality graders who evaluate coffee lots and submit official SCA cupping scores.                                         |

## 2. Permissions and Access Levels

Permissions are enforced both at the API level (backend) and the UI level (frontend navigation and component visibility).

### 2.1. Admin (`admin`)

*   **API Access:** Unrestricted access to all API endpoints. Can view, create, update, and delete any resource.
*   **Frontend Navigation:** Access to all links and sections of the application, including administrative dashboards and user management interfaces.

### 2.2. Exporter (`exporter`)

*   **API Access:**
    *   **Lots:** Can create new coffee lots. Can view, update, and manage only their own lots (CRUD operations restricted to owned lots).
    *   **Sample Requests:** Can view and respond to sample requests specifically for their lots.
    *   **Offers:** Can view and respond to offers made on their lots.
*   **Frontend Navigation:**
    *   Dashboard (Exporter specific)
    *   Lots (Registry of their own lots)
    *   Lot Pipeline (Kanban board for their lots)
    *   Samples (Inbox for sample requests on their lots)
    *   Offers (Inbox for offers on their lots)
    *   Compliance (Management of compliance documents for their lots)
    *   Lot Map (Viewing their own lot boundaries)

### 2.3. Buyer (`buyer`)

*   **API Access:**
    *   **Lots:** Read-only access to lots that are in `listed`, `contracted`, or `exported` status. Cannot view `draft` lots.
    *   **Sample Requests:** Can create sample requests for visible lots. Can view only their own sample requests.
    *   **Offers:** Can create offers on visible lots. Can view only their own offers.
*   **Frontend Navigation:**
    *   Marketplace (Browsing available lots)
    *   Samples (Tracking their own sample requests)
    *   My Offers (Tracking their own offers)
    *   Watchlist (Managing saved lots)

### 2.4. Farmer (`farmer`)

*   **API Access:**
    *   **Profile:** Can view and update their own farmer profile information, including farm details and geospatial boundaries.
    *   **Lots:** Read-only access to lots that are linked to them (typically via region/kebele matching, as there is no direct foreign key from `CoffeeLot` to `Farmer`).
*   **Frontend Navigation:**
    *   My Farm (Managing profile and boundary)
    *   Lot Map (Viewing boundaries of linked lots)

### 2.5. Q-Grader (`qgrader`)

*   **API Access:**
    *   **Lots:** Read-only access to all lots for evaluation purposes.
    *   **Cupping Scores:** Can submit new cupping scores for any lot. Can confirm their own submitted scores.
*   **Frontend Navigation:**
    *   Lots (Registry of all lots for evaluation)
    *   Lot Map (Viewing lot locations)
    *   Cupping Form (Interface for submitting SCA scores)

## 3. Implementation Details

*   **Backend Enforcement:** Permissions are primarily enforced in Django views (e.g., `bunna_bridge/bunna_bridge/lots/views.py`) by filtering querysets based on `request.user.role` and `request.user.id`.
*   **Frontend Enforcement:** The React frontend uses a `ProtectedRoute` component and conditional rendering based on the user's role (stored in `AuthContext`) to control access to routes and UI elements [1].

## References

[1] `pasted_content.txt` - User-provided project brief and AI context.
[2] `bunna_bridge/bunna_bridge/users/models.py` - User model definition, including role choices.
