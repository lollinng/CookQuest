# CookQuest Deployment Guide

## Prerequisites

- Docker & Docker Compose v2
- A server with at least 2GB RAM
- A domain name (for SSL)

## Quick Start (Development)

```bash
# Start core services (postgres, redis, api, web)
JWT_SECRET=your-dev-secret docker compose up
```

## Production Deployment

### 1. Configure Environment

Copy the production template and fill in all values:

```bash
cp .env.production.example .env
```

**Required variables** (the app will refuse to start without these):

| Variable | Example | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | `$(openssl rand -base64 32)` | Database password |
| `REDIS_PASSWORD` | `$(openssl rand -base64 32)` | Cache password |
| `JWT_SECRET` | `$(openssl rand -base64 64)` | Must be 32+ chars |
| `DOMAIN` | `cookquest.app` | Used by nginx for SSL |
| `FRONTEND_URL` | `https://cookquest.app` | CORS + CSRF origin |
| `NEXT_PUBLIC_API_URL` | `https://cookquest.app/api/v1` | Baked into client JS at build time |
| `ALLOWED_ORIGINS` | `https://cookquest.app` | Comma-separated CORS origins |
| `NODE_ENV` | `production` | Enables security checks |

**Important:** `NEXT_PUBLIC_API_URL` is embedded in the Next.js client bundle at **build time**. If you change it, you must rebuild the frontend image:

```bash
docker compose build cookquest-web
```

### 2. Initialize SSL (First Time Only)

```bash
./scripts/init-ssl.sh yourdomain.com your@email.com
```

### 3. Start All Services

Use both compose files — the base config plus the production override:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod up -d
```

This starts: postgres, redis, api, web, nginx, certbot, and backup.

The production override (`docker-compose.prod.yml`) adds:
- **No exposed ports** for postgres, web, or API — only nginx serves 80/443
- **Required env vars** — fails fast if secrets are missing
- **Log rotation** — all services limited to 10MB x 3 files (prevents disk fill)
- **`restart: always`** — services auto-recover after crashes

**Tip:** Create a shell alias to avoid typing both files every time:

```bash
alias dc-prod='docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile prod'
# Then: dc-prod up -d, dc-prod logs -f, dc-prod down
```

### 4. Verify

```bash
curl -sf https://yourdomain.com/api/v1/ready
# Should return: {"status":"ok"}
```

## Database Backups

### Automated Backups (Production)

The `backup` service runs automatically with the `prod` profile:

- **Schedule:** Every 24 hours (runs immediately on start, then daily)
- **Location:** `./backups/` on the host
- **Format:** `cookquest_YYYYMMDD_HHMMSS.sql.gz`
- **Retention:** 7 days (configurable via `BACKUP_RETAIN_DAYS` env var)

### Manual Backup (From Host)

```bash
# Using the host-side script (requires running Docker containers)
./scripts/backup-postgres.sh
```

### Restore from Backup

```bash
# Using the restore script (interactive, with confirmation prompt)
./scripts/restore-postgres.sh ./backups/cookquest_20260308_120000.sql.gz
```

Or manually:

```bash
gunzip -c backups/cookquest_20260308_120000.sql.gz | \
  docker compose exec -T postgres psql -U cookquest cookquest
```

### Check Backup Status

```bash
# List recent backups
ls -lah backups/

# Check backup service logs
dc-prod logs backup --tail 20
```

## Monitoring

### Endpoints

| Endpoint | Purpose | Response |
|---|---|---|
| `GET /health` | Liveness probe — is the process alive? | `{ status: "ok", uptime }` |
| `GET /ready` | Readiness probe — DB + Redis connected? | `{ status: "ready", checks: { database, redis } }` |
| `GET /metrics` | Server stats for dashboards | `{ uptime, requests_total, errors_total, db_pool, memory }` |

### Health Check Script

```bash
# One-shot check (exits 0=healthy, 1=unhealthy)
./scripts/health-check.sh

# Check a custom URL
./scripts/health-check.sh https://cookquest.app/ready

# Set up cron to check every 5 minutes
*/5 * * * * /opt/cookquest/scripts/health-check.sh https://cookquest.app/ready >> /var/log/cookquest-health.log 2>&1
```

### Metrics Endpoint

`GET /metrics` returns:

```json
{
  "uptime": 3600,
  "requests_total": 1234,
  "errors_total": 5,
  "db_pool": { "totalCount": 10, "idleCount": 8, "waitingCount": 0 },
  "memory": { "rss": 52428800, "heapUsed": 30000000, "heapTotal": 40000000 },
  "node_version": "v20.10.0",
  "env": "production"
}
```

### Logging

- **Production:** JSON-formatted logs (machine-readable, suitable for log aggregation)
- **Development:** Pretty-printed colored logs via `pino-pretty`
- **Sensitive fields** are automatically redacted: `Authorization`, `cookie`, `password`, `token`
- Health check requests (`/health`) are excluded from access logs to reduce noise

### Quick Check Commands

```bash
# API readiness
curl http://localhost:3003/ready

# Server metrics
curl http://localhost:3003/metrics

# From outside (via nginx)
curl https://yourdomain.com/ready
curl https://yourdomain.com/metrics
```

## CI/CD Pipeline

### How It Works

Pushes to `main` trigger the deploy workflow (`.github/workflows/deploy.yml`):

1. **Wait for CI** — ensures lint, build, and E2E tests pass first
2. **Build & Push** — builds Docker images and pushes to GitHub Container Registry (GHCR)
3. **Deploy** — SSHs into the VPS, pulls new images, restarts services

Manual deploys are also supported via GitHub Actions → "Run workflow" button.

### Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret | Description | Example |
|---|---|---|
| `DEPLOY_HOST` | VPS IP address or hostname | `203.0.113.42` |
| `DEPLOY_USER` | SSH username on the server | `deploy` |
| `DEPLOY_SSH_KEY` | SSH private key (ed25519 recommended) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

### Required GitHub Variables

Configure in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API URL baked into the frontend build | `https://cookquest.app/api/v1` |

### Server Prerequisites

On the VPS, ensure:

```bash
# 1. Docker & Compose are installed
docker --version && docker compose version

# 2. Project is cloned to /opt/cookquest
git clone https://github.com/lollinng/CookQuest.git /opt/cookquest

# 3. .env file is configured with production secrets
cp /opt/cookquest/.env.production.example /opt/cookquest/.env
# Edit .env with real values (see "Configure Environment" above)

# 4. Deploy user can run docker without sudo
sudo usermod -aG docker deploy

# 5. GHCR login (one-time, or use a PAT)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### Manual Deploy (Hotfix)

To deploy without waiting for CI:

1. Go to **Actions → Deploy → Run workflow**
2. Check **"Skip waiting for CI"**
3. Click **Run workflow**

### Docker Image Tags

Images are pushed with two tags:
- `latest` — always points to the most recent build
- `<sha-short>` — 7-char commit SHA for rollback (e.g., `ghcr.io/lollinng/cookquest-web:a1b2c3d`)

### Rollback

```bash
# SSH into the server
ssh deploy@your-server

# Roll back to a specific commit
cd /opt/cookquest
docker compose pull cookquest-web:a1b2c3d cookquest-api:a1b2c3d
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  --profile prod up -d --remove-orphans
```

## Useful Commands

```bash
# View logs
dc-prod logs -f

# Restart a specific service
dc-prod restart cookquest-api

# Reset database (DESTRUCTIVE — removes all data)
dc-prod down -v && dc-prod up -d

# Scale down
dc-prod down
```
