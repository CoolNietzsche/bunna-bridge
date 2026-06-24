# Beersheba

Production Ethiopian specialty coffee D2C export platform and EUDR compliance engine.

Live domain:
https://bunnabridge.pro.et

---

# Stack

- Django 6 + GeoDjango + PostGIS
- React 18 + Vite + TypeScript
- Tailwind v4
- Celery + Redis
- Docker Compose
- Nginx
- Hetzner VPS

---

# Roles

- admin
- exporter
- buyer
- farmer
- qgrader

---

# Core Differentiator

EUDR 2026 compliance automation.

Seven gate validator:

1. GPS mapping
2. ECEX permit validation
3. Phytosanitary certificate
4. Deforestation checks
5. FX declaration validation
6. CTA floor pricing
7. EUDR DDS generation

---

# Critical Architecture Gotchas

- CoffeeLot primary key is UUID.
- There is no Farmer model.
- Farmers are User(role="farmer").
- farm_polygon has been removed.
- Use boundary (PolygonField geography=True).
- DeforstationZone lives in deforestation.py with app_label='lots'.
- Tailwind v4 has no tailwind.config.js.
- Theme tokens live inside index.css.
- Relative /api/ URLs only.
- Use uv, never pip.

---

# Hard Rules

- Preserve business logic.
- Read files before editing.
- Never rewrite multiple pages in one session.
- Always provide complete files.
- Provide exact commands.
- Run npm run build after frontend changes.
- Run uv sync after every uv add.
