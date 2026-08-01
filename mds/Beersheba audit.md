Got it — the prompts should instruct the agent to **write the findings directly into an md file** as output. Here are the revised prompts:

---

## Prompt 1 — Security & Authentication

```
You are a senior security engineer auditing Bunna Bridge, an Ethiopian specialty coffee export compliance platform.

Stack: Django 6 + DRF + JWT (simplejwt) + django-allauth backend, React 18 + TypeScript frontend.

I am uploading the full project zip. Analyze ONLY these files:
- bunna_bridge/config/settings/
- bunna_bridge/bunna_bridge/users/views.py
- bunna_bridge/bunna_bridge/users/serializers.py
- bunna_bridge/bunna_bridge/lots/views.py
- bunna_bridge/bunna_bridge/lots/urls.py
- bunna_bridge/bunna_bridge/users/api_urls.py
- bunna-bridge-frontend/src/api/
- bunna-bridge-frontend/src/context/AuthContext.tsx

Check for:
1. Exposed secrets or credentials in settings files
2. Missing IsAuthenticated or role-based permission classes on any API view
3. IDOR vulnerabilities — can buyer A access buyer B's offers? Can exporter A edit exporter B's lots?
4. JWT issues — token expiry, rotation, blacklisting on logout
5. Sensitive data exposure in serializers (password hashes, ECTA files to wrong roles)
6. Missing rate limiting on /api/auth/token/
7. CORS configuration — is it too permissive?
8. File upload endpoints — unrestricted file types, no size limits?
9. Access tokens in localStorage vs httpOnly cookies — current approach and risk

When you are done, produce your output as a single markdown document with this exact structure:

---
# Audit 1 — Security & Authentication
_Date: [today's date]_

## Findings

For each issue use this format:

### [SEVERITY] Issue Title
**File:** `path/to/file.py` (line N)
**Severity:** Critical / High / Medium / Low
**Problem:** Plain English explanation of what is wrong and why it matters.
**Fix:**
\```python
# exact corrected code here
\```

---

## Summary Table

| Severity | Count |
|----------|-------|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |
| **Total** | **N** |

## Top 5 Urgent Fixes
1. 
2. 
3. 
4. 
5. 

## Fix Log
_To be filled in as fixes are applied._
---

Output nothing except this markdown document. Do not add preamble or explanation outside the document.
```

---

## Prompt 2 — Django Backend Quality & Performance

```
You are a senior Django engineer auditing Bunna Bridge, an Ethiopian specialty coffee export compliance platform.

Stack: Django 6 + GeoDjango + PostGIS + DRF. Package manager is uv.

I am uploading the full project zip. Analyze ONLY these files:
- bunna_bridge/bunna_bridge/lots/models.py
- bunna_bridge/bunna_bridge/lots/views.py
- bunna_bridge/bunna_bridge/lots/serializers.py
- bunna_bridge/bunna_bridge/users/models.py
- bunna_bridge/bunna_bridge/users/views.py
- bunna_bridge/bunna_bridge/users/serializers.py
- bunna_bridge/bunna_bridge/compliance/models.py (if exists)

Check for:
1. N+1 query problems — missing select_related / prefetch_related
2. Missing database indexes on frequently filtered fields (status, region, exporter, role)
3. Serializers returning more data than needed per role
4. Business logic in views that belongs in model methods or service layer
5. Missing __str__ methods on models
6. Raw SQL queries without parameterization
7. Fields that should have db_index=True but don't
8. Missing Meta ordering on models queried in a specific order
9. Any use of shell=True, eval(), or exec()
10. Dead code — unused imports, unreachable functions, commented-out blocks

When you are done, produce your output as a single markdown document with this exact structure:

---
# Audit 2 — Django Backend Quality & Performance
_Date: [today's date]_

## Findings

For each issue use this format:

### [SEVERITY] Issue Title
**File:** `path/to/file.py` (line N)
**Severity:** Critical / High / Medium / Low
**Problem:** Plain English explanation of what is wrong and why it matters.
**Fix:**
\```python
# exact corrected code here
\```

---

## Summary Table

| Severity | Count |
|----------|-------|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |
| **Total** | **N** |

## Top 5 Urgent Fixes
1. 
2. 
3. 
4. 
5. 

## Fix Log
_To be filled in as fixes are applied._
---

Output nothing except this markdown document. Do not add preamble or explanation outside the document.
```

---

## Prompt 3 — API Design & Business Logic

```
You are a senior API architect auditing Bunna Bridge, an Ethiopian specialty coffee export compliance platform.

Stack: Django 6 + DRF backend, React 18 frontend.

I am uploading the full project zip. Analyze ONLY these files:
- bunna_bridge/bunna_bridge/lots/views.py
- bunna_bridge/bunna_bridge/lots/urls.py
- bunna_bridge/bunna_bridge/lots/serializers.py
- bunna_bridge/bunna_bridge/lots/offer_views.py (if exists)
- bunna_bridge/bunna_bridge/users/api_urls.py

Check for:
1. Endpoints returning full model data when only a subset is needed
2. Missing pagination on list endpoints
3. Inconsistent error response formats across views
4. Lot status transitions — are invalid transitions blocked server-side?
5. Offer race conditions — can two buyers both get an accepted offer on the same lot?
6. Duplicate offer validation — can a buyer submit multiple offers on the same lot?
7. EUDR gates — can any gate be set to True by a non-admin/non-exporter?
8. Is export_ready computed or manually settable by the exporter?
9. NBE settlement calculation — server-side or advisory only?
10. Spec sheet PDF — does it expose DDS-restricted data?

When you are done, produce your output as a single markdown document with this exact structure:

---
# Audit 3 — API Design & Business Logic
_Date: [today's date]_

## Findings

For each issue use this format:

### [SEVERITY] Issue Title
**File:** `path/to/file.py` (line N)
**Severity:** Critical / High / Medium / Low
**Problem:** Plain English explanation of what is wrong and why it matters.
**Fix:**
\```python
# exact corrected code here
\```

---

## Summary Table

| Severity | Count |
|----------|-------|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |
| **Total** | **N** |

## Top 5 Urgent Fixes
1. 
2. 
3. 
4. 
5. 

## Fix Log
_To be filled in as fixes are applied._
---

Output nothing except this markdown document. Do not add preamble or explanation outside the document.
```

---

## Prompt 4 — React/TypeScript Frontend

```
You are a senior React/TypeScript engineer auditing Bunna Bridge, an Ethiopian specialty coffee export compliance platform.

Stack: React 18 + TypeScript + Vite 8 + Tailwind v4 + TanStack Query.

I am uploading the full project zip. Analyze ONLY these files:
- bunna-bridge-frontend/src/api/
- bunna-bridge-frontend/src/pages/
- bunna-bridge-frontend/src/components/
- bunna-bridge-frontend/src/hooks/
- bunna-bridge-frontend/src/context/

Check for:
1. Unchecked any types where proper TypeScript interfaces should exist
2. API calls with no error handling — no try/catch, no onError in useMutation/useQuery
3. Components that crash if API returns unexpected shape — missing null checks
4. Missing loading states before data arrives
5. Missing error states when queries fail
6. Console.log statements left in production code
7. Hardcoded URLs or values that should be environment variables
8. Missing key props in .map() renders
9. Memory leaks — uncleared intervals, event listeners, subscriptions
10. XSS risk from dangerouslySetInnerHTML or unescaped user content
11. useEffect with missing or incorrect dependency arrays
12. Components over 300 lines that should be split
13. Prop drilling more than 2 levels deep that should use context

When you are done, produce your output as a single markdown document with this exact structure:

---
# Audit 4 — React/TypeScript Frontend
_Date: [today's date]_

## Findings

For each issue use this format:

### [SEVERITY] Issue Title
**File:** `path/to/file.tsx` (line N)
**Severity:** Critical / High / Medium / Low
**Problem:** Plain English explanation of what is wrong and why it matters.
**Fix:**
\```tsx
// exact corrected code here
\```

---

## Summary Table

| Severity | Count |
|----------|-------|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |
| **Total** | **N** |

## Top 5 Urgent Fixes
1. 
2. 
3. 
4. 
5. 

## Fix Log
_To be filled in as fixes are applied._
---

Output nothing except this markdown document. Do not add preamble or explanation outside the document.
```

---

## Prompt 5 — Infrastructure & Deployment

```
You are a senior DevOps engineer auditing Bunna Bridge, an Ethiopian specialty coffee export compliance platform.

Deployment: Ubuntu 22.04 VPS, Nginx reverse proxy, Docker Compose, PostgreSQL + PostGIS.

I am uploading the full project zip. Analyze ONLY these files:
- bunna_bridge/docker-compose.local.yml
- bunna_bridge/docker-compose.yml (if exists)
- bunna_bridge/config/settings/local.py
- bunna_bridge/config/settings/base.py
- bunna_bridge/config/settings/production.py (if exists)
- Any .env or .env.example files
- Any Dockerfile(s)

Also consider this Nginx config for bunnabridge.pro.et:
    location / { serve frontend static files }
    location /api/ { proxy_pass http://127.0.0.1:8001 }
    location /admin/ { proxy_pass http://127.0.0.1:8001 }
    location /static/ { proxy_pass http://127.0.0.1:8001 }

Check for:
1. DEBUG=True potentially active in production
2. SECRET_KEY hardcoded or weak
3. Database credentials exposed in code or docker-compose
4. Docker ports unnecessarily exposed to host
5. Nginx serving media/upload files without authentication
6. Missing security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
7. No HTTPS redirect enforcement in Nginx
8. Django serving static/media in production instead of Nginx
9. Missing ALLOWED_HOSTS restriction
10. Containers running as root
11. No Docker resource limits
12. No database backup strategy visible
13. No log rotation configured

When you are done, produce your output as a single markdown document with this exact structure:

---
# Audit 5 — Infrastructure & Deployment
_Date: [today's date]_

## Findings

For each issue use this format:

### [SEVERITY] Issue Title
**File/Location:** `path/to/file` (line N)
**Severity:** Critical / High / Medium / Low
**Problem:** Plain English explanation of what is wrong and why it matters.
**Fix:**
\```yaml
# exact corrected config here
\```

---

## Summary Table

| Severity | Count |
|----------|-------|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |
| **Total** | **N** |

## Top 5 Urgent Fixes
1. 
2. 
3. 
4. 
5. 

## Fix Log
_To be filled in as fixes are applied._
---

Output nothing except this markdown document. Do not add preamble or explanation outside the document.
```

---

## Prompt 6 — Compliance & Business Rules

```
You are a senior compliance engineer auditing Bunna Bridge, an Ethiopian specialty coffee export compliance platform handling EUDR due diligence, NBE FX declarations, CTA floor pricing, and ECTA export licensing.

I am uploading the full project zip. Analyze ONLY these files:
- bunna_bridge/bunna_bridge/lots/models.py
- bunna_bridge/bunna_bridge/lots/views.py
- bunna_bridge/bunna_bridge/compliance/ (all files)
- bunna_bridge/bunna_bridge/lots/spec_sheet.py
- bunna_bridge/bunna_bridge/lots/serializers.py
- bunna-bridge-frontend/src/pages/MarketplaceLotDetail.tsx
- bunna-bridge-frontend/src/pages/LotDetail.tsx

Check for:
1. Are all 7 EUDR gates enforced server-side or can they be bypassed via API?
2. Is deforestation_free computed from PostGIS spatial data or just a manually settable boolean?
3. Can an exporter mark their own lot export_ready without passing all 7 gates?
4. Is CTA floor price check automated against a stored rate or just a boolean flag?
5. Is the NBE 50/50 FX split enforced or advisory only?
6. Can EUDR DDS PDF be generated on an incomplete/non-compliant lot?
7. Does the spec sheet expose data restricted to post-contract only?
8. Are audit trails maintained for compliance gate changes?
9. Is there a mechanism to expire compliance flags when licenses expire?
10. Can a buyer access compliance documents (phyto cert, ECTA file) they shouldn't?

When you are done, produce your output as a single markdown document with this exact structure:

---
# Audit 6 — Compliance & Business Rules
_Date: [today's date]_

## Findings

For each issue use this format:

### [SEVERITY] Issue Title
**File:** `path/to/file.py` (line N)
**Severity:** Critical / High / Medium / Low
**Problem:** Plain English explanation of the compliance or business risk.
**Fix:**
\```python
# exact corrected code here
\```

---

## Summary Table

| Severity | Count |
|----------|-------|
| Critical | N |
| High | N |
| Medium | N |
| Low | N |
| **Total** | **N** |

## Top 5 Compliance Gaps
1. 
2. 
3. 
4. 
5. 

## Fix Log
_To be filled in as fixes are applied._
---

Output nothing except this markdown document. Do not add preamble or explanation outside the document.
```

---

## Prompt 7 — Final Synthesis

```
You are a senior engineering lead doing a final synthesis of a Bunna Bridge security and code audit.

I will paste the findings from 6 completed audit passes below. Each is already in markdown format.

[PASTE CONTENTS OF 01_security_auth.md HERE]
[PASTE CONTENTS OF 02_django_backend.md HERE]
[PASTE CONTENTS OF 03_api_business_logic.md HERE]
[PASTE CONTENTS OF 04_frontend.md HERE]
[PASTE CONTENTS OF 05_infrastructure.md HERE]
[PASTE CONTENTS OF 06_compliance.md HERE]

When you are done, produce your output as a single markdown document with this exact structure:

---
# Audit 7 — Final Synthesis & Sprint Plan
_Date: [today's date]_

## Systemic Patterns
_Patterns that appear across multiple audit areas._

## Master Issue List
_De-duplicated, consistently severity-rated._

| # | Issue | Area | File | Severity |
|---|-------|------|------|----------|

## Sprint Plan

### Sprint 1 — Before Any Real Transactions
_Critical + High security/compliance issues. Must fix before onboarding real exporters or buyers._

| # | Issue | File | Severity | Owner | Done |
|---|-------|------|----------|-------|------|

### Sprint 2 — Before Public Launch
_High + Medium quality/performance issues._

| # | Issue | File | Severity | Owner | Done |
|---|-------|------|----------|-------|------|

### Sprint 3 — Ongoing Improvement
_Low/Medium