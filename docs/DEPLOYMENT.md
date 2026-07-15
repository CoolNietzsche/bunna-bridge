# Backend

After adding packages:

docker compose -f docker-compose.local.yml run --rm django uv add PACKAGE

docker compose -f docker-compose.local.yml run --rm django uv sync

docker compose build backend

docker compose up -d backend

---

# Frontend

npm run build

docker compose build frontend

docker compose up -d frontend
