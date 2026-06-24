# Beersheba Platform API Conventions

This document outlines the conventions and best practices for interacting with the Beersheba platform API. Adhering to these guidelines ensures consistent, predictable, and efficient communication with the backend services.

## 1. Base URL and Versioning

All API endpoints are prefixed with `/api/v1/` to indicate the API version. This allows for future versioning without breaking existing client implementations.

**Example:** `https://bunnabridge.pro.et/api/v1/lots/`

## 2. Authentication

The Beersheba API uses JSON Web Tokens (JWT) for authentication. Clients must obtain an access token and include it in the `Authorization` header of all subsequent requests.

### 2.1. Authentication Flow

1.  **Login:** A `POST` request to `/api/auth/token/` with user credentials (email, password) returns `access` and `refresh` tokens, along with the user object.
2.  **Token Refresh:** The `refresh` token can be used to obtain a new `access` token by sending a `POST` request to `/api/auth/token/refresh/`.
3.  **Authorized Requests:** The `access` token must be included in the `Authorization` header as a Bearer token for all protected endpoints.

**Example (Frontend Client):**

```typescript
// bunna-bridge-frontend/src/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/', // Proxied to backend by Vite
  headers: {
    'Content-Type': 'application/json',
  },
});

apient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
```

## 3. API Endpoints and Resources

API endpoints are organized logically by resource. The primary resources include `auth`, `lots`, and `sample-requests`.

### 3.1. User and Authentication Endpoints (`/api/v1/auth/`)

| Method | Endpoint                          | Description                                                                  |
| :----- | :-------------------------------- | :--------------------------------------------------------------------------- |
| `POST` | `/register/`                      | Creates a new user account with a specified role.                            |
| `POST` | `/token/`                         | Authenticates a user and returns JWT tokens.                                 |
| `POST` | `/token/refresh/`                 | Refreshes an expired access token using a refresh token.                     |
| `GET`  | `/me/`                            | Retrieves the profile of the currently authenticated user.                   |
| `PATCH`| `/me/`                            | Updates the profile of the currently authenticated user.                     |
| `GET`  | `/users/`                         | Lists all users (Admin only).                                                |
| `GET`  | `/farmer/profile/`                | Retrieves the profile of the authenticated farmer.                           |
| `PATCH`| `/farmer/profile/`                | Updates the profile of the authenticated farmer.                             |
| `GET`  | `/farmer/lots/`                   | Lists lots associated with the authenticated farmer.                         |
| `GET`  | `/exporters/<id>/`                | Retrieves public profile of a specific exporter.                             |
| `GET`  | `/exporters/<id>/lots/`           | Lists active lots for a specific exporter.                                   |

### 3.2. Coffee Lot Endpoints (`/api/v1/lots/`)

| Method | Endpoint                                  | Description                                                                  |
| :----- | :---------------------------------------- | :--------------------------------------------------------------------------- |
| `GET`  | `/`                                       | Lists coffee lots, filtered by user role and permissions.                    |
| `POST` | `/`                                       | Creates a new coffee lot (Exporter only).                                    |
| `GET`  | `/{id}/`                                  | Retrieves detailed information for a specific lot, including GeoJSON data.   |
| `PATCH`| `/{id}/`                                  | Updates an existing coffee lot.                                              |
| `DELETE`|`/{id}/`                                  | Deletes a coffee lot.                                                        |
| `GET`  | `/{id}/compliance-check/`                 | Returns the real-time status of the 7-gate EUDR compliance checks.           |
| `GET`  | `/{id}/cupping-scores/`                   | Lists all cupping scores for a specific lot.                                 |
| `POST` | `/{id}/cupping-scores/`                   | Submits a new cupping score for a lot (Q-Grader only).                       |
| `POST` | `/{id}/cupping-scores/{score_id}/confirm/`| Confirms a cupping score, locking it and updating the lot.                   |
| `POST` | `/{id}/settlement/`                       | Calculates the NBE 50/50 USD/ETB settlement for a lot.                       |
| `PATCH`| `/{id}/status/`                           | Updates the status of a lot in the pipeline (`draft` → `listed`, etc.).      |
| `GET`  | `/{id}/eudr-dds/`                         | Generates and allows download of the EUDR Due Diligence Statement PDF.       |
| `PATCH`| `/{id}/boundary/`                         | Saves or updates the geospatial boundary polygon for a lot.                  |
| `POST` | `/{id}/boundary/inherit/`                 | Inherits the boundary polygon from the linked farmer profile.                |
| `GET`  | `/{id}/spec-sheet/`                       | Generates and allows download of the lot Spec Sheet PDF.                     |

### 3.3. Sample Request Endpoints (`/api/v1/sample-requests/`)

| Method | Endpoint                          | Description                                                                  |
| :----- | :-------------------------------- | :--------------------------------------------------------------------------- |
| `GET`  | `/`                               | Lists sample requests (filtered by user role).                               |
| `POST` | `/`                               | Creates a new sample request (Buyer only).                                   |
| `POST` | `/{id}/respond/`                  | Exporter responds to a sample request (approve, reject, ship).               |

## 4. Data Formats

*   **Requests:** All request bodies should be JSON (`Content-Type: application/json`).
*   **Responses:** All successful responses return JSON. Error responses also return JSON with appropriate status codes and error messages.
*   **Geospatial Data:** Lot detail endpoints (`GET /lots/{id}/`) return GeoJSON Feature objects for geospatial data. Boundary updates (`PATCH /lots/{id}/boundary/`) expect GeoJSON `Polygon` or `MultiPolygon` geometries.

## 5. Error Handling

API errors are returned with standard HTTP status codes (e.g., 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error) and a JSON body containing an `error` message or `details` object.

## 6. Relative URLs

All API calls from the frontend **must use relative URLs** (e.g., `/api/v1/lots/` instead of `https://bunnabridge.pro.et/api/v1/lots/`). The Vite development server is configured to proxy `/api` requests to the backend, ensuring environment flexibility [1].

## References

[1] `pasted_content.txt` - User-provided project brief and AI context.
[2] `bunna-bridge-frontend/src/api/client.ts` - Frontend Axios API client configuration.
[3] `bunna_bridge/bunna_bridge/lots/urls.py` - Django backend URL configuration for lots.
[4] `bunna_bridge/bunna_bridge/users/api_urls.py` - Django backend URL configuration for authentication and users.
[5] `bunna_bridge/bunna_bridge/lots/views.py` - Django backend views for lot-related operations.
