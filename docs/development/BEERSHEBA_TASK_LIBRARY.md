# Beersheba Task Library (Termius Quick-Reference)

This library contains common, complex command sequences formatted for easy copy-pasting from your phone, followed by the active task roadmap.

## 1. Common Operations

### Rebuild and Restart Django
```bash
cd ~/bunna-bridge/bunna_bridge && \
docker compose -f docker-compose.local.yml down && \
docker compose -f docker-compose.local.yml build django && \
docker compose -f docker-compose.local.yml up -d
```

### Run Migrations
```bash
cd ~/bunna-bridge/bunna_bridge && \
docker compose -f docker-compose.local.yml run --rm django python manage.py makemigrations lots && \
docker compose -f docker-compose.local.yml run --rm django python manage.py migrate
```

### Add a Python Package (via UV)
```bash
cd ~/bunna-bridge/bunna_bridge && \
/root/.local/bin/uv add <package_name> && \
/root/.local/bin/uv sync && \
docker compose -f docker-compose.local.yml build django
```

### Full Frontend Build and Deploy
```bash
cd ~/bunna-bridge/bunna-bridge-frontend && \
npm run build && \
sudo rm -rf /var/www/bunnabridge/* && \
sudo cp -r dist/* /var/www/bunnabridge/ && \
sudo chown -R www-data:www-data /var/www/bunnabridge && \
echo "✅ Deployed to https://bunnabridge.pro.et"
```

## 2. Active Task Roadmap

| Task | Description | Priority |
| :--- | :---------- | :------- |
| **Task 1** | Gate 2 and Gate 7 implementation and fixes. | High |
| **Task 2** | Settlement and NBE rates: SiteConfig model for admin-configurable rates. | High |
| **Task 3** | Dashboard polish: Visual and functional enhancements. | Medium |
| **Task 4** | Phytosanitary uploads: Ensuring robust file handling. | Medium |
| **Task 5** | Auth: Password reset and email verification workflow. | Medium |
| **Task 6** | EUDR: Real Hansen Global Forest Change integration. | High |
| **Task 7** | UI/UX: Mobile responsiveness improvements. | Medium |
| **Task 8** | Compliance: CTA floor price validation integration. | High |
| **Task 9** | Branding: Beersheba migration (Rename -> Theme -> Verify). | High |

**Branding Migration Order:**
1. Dashboard
2. Lots
3. Marketplace
4. LotDetail
5. LotPipeline
6. SampleRequests
