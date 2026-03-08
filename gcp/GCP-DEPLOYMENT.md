# CookQuest GCP Deployment Reference

## Architecture

```
Browser → Cloud Run (cookquest-api) → Cloud SQL (PostgreSQL 16)
                                    → Cloud Storage (recipe photo uploads)
                                    → In-memory cache (Redis fallback)
```

## Live URLs

| Service | URL |
|---|---|
| API Base | `https://cookquest-api-254570106808.asia-south1.run.app` |
| Health Check | `https://cookquest-api-254570106808.asia-south1.run.app/health` |
| Readiness | `https://cookquest-api-254570106808.asia-south1.run.app/ready` |
| Recipes API | `https://cookquest-api-254570106808.asia-south1.run.app/api/v1/recipes` |

## GCP Resources Created

| Resource | Name/ID | Details |
|---|---|---|
| Project | `cookquest-prod` | Billing: My Billing Account |
| Region | `asia-south1` (Mumbai) | All resources in this region |
| Cloud Run | `cookquest-api` | 512Mi RAM, 1 vCPU, 0-3 instances |
| Cloud SQL | `cookquest-db` | PostgreSQL 16, db-f1-micro, 10GB HDD |
| Cloud Storage | `cookquest-uploads-prod` | Recipe photo uploads |
| Artifact Registry | `cookquest` (in asia-south1) | Docker images |
| Secret Manager | `jwt-secret`, `db-password` | Production secrets |

### Cost Estimate (Free Tier)

| Service | Free Tier | Your Usage |
|---|---|---|
| Cloud Run | 2M requests/month, 360K GB-seconds | Free for low traffic |
| Cloud SQL | **No free tier** | ~$7-9/month (db-f1-micro) |
| Cloud Storage | 5GB standard, 1GB egress | Free for small uploads |
| Artifact Registry | 500MB storage | Free |
| Secret Manager | 6 active versions, 10K access ops | Free |

**Total: ~$7-9/month** (Cloud SQL is the only cost, covered by $300 trial credits for ~3 years)

## How It Was Deployed (Step by Step)

### 1. Project Setup

```bash
# Create project and link billing
gcloud projects create cookquest-prod --name="CookQuest"
gcloud config set project cookquest-prod
gcloud config set compute/region asia-south1
gcloud billing projects link cookquest-prod --billing-account=010518-39B0DE-676E0C

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  vpcaccess.googleapis.com \
  redis.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com \
  servicenetworking.googleapis.com
```

### 2. Create Infrastructure

```bash
# Artifact Registry (Docker image storage)
gcloud artifacts repositories create cookquest \
  --repository-format=docker \
  --location=asia-south1

# Cloud SQL (PostgreSQL)
gcloud sql instances create cookquest-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=asia-south1 \
  --storage-type=HDD \
  --storage-size=10GB \
  --no-storage-auto-increase \
  --availability-type=zonal \
  --edition=enterprise

# Create DB user and database
gcloud sql users create cookquest --instance=cookquest-db --password="YOUR_PASSWORD"
gcloud sql databases create cookquest --instance=cookquest-db

# Cloud Storage bucket
gcloud storage buckets create gs://cookquest-uploads-prod --location=asia-south1 --uniform-bucket-level-access
```

### 3. Store Secrets

```bash
# Generate secrets
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')

# Store in Secret Manager (use printf, NOT echo, to avoid trailing newline)
printf '%s' "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=-
printf '%s' "$DB_PASSWORD" | gcloud secrets create db-password --data-file=-

# Set the DB user password to match
gcloud sql users set-password cookquest --instance=cookquest-db --password="$DB_PASSWORD"
```

### 4. Grant IAM Permissions

```bash
SA="254570106808-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding cookquest-prod \
  --member="serviceAccount:$SA" --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding cookquest-prod \
  --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding cookquest-prod \
  --member="serviceAccount:$SA" --role="roles/storage.objectAdmin"
```

### 5. Build and Push Docker Image

```bash
# IMPORTANT: Must build for linux/amd64 (Cloud Run doesn't support ARM)
# Build from project root using the Cloud Run-specific Dockerfile
docker buildx build \
  --platform linux/amd64 \
  -f gcp/Dockerfile.api \
  -t asia-south1-docker.pkg.dev/cookquest-prod/cookquest/api:latest \
  --push \
  .
```

### 6. Deploy to Cloud Run

```bash
gcloud run deploy cookquest-api \
  --image=asia-south1-docker.pkg.dev/cookquest-prod/cookquest/api:latest \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=3003 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --add-cloudsql-instances=cookquest-prod:asia-south1:cookquest-db \
  --set-env-vars="NODE_ENV=production,INSTANCE_CONNECTION_NAME=cookquest-prod:asia-south1:cookquest-db,DB_USER=cookquest,DB_NAME=cookquest,GCS_BUCKET=cookquest-uploads-prod,GCS_PROJECT_ID=cookquest-prod,FRONTEND_URL=*,ALLOWED_ORIGINS=*,SHARED_DIR=/app/shared" \
  --set-secrets="JWT_SECRET=jwt-secret:latest,DB_PASSWORD=db-password:latest" \
  --project=cookquest-prod
```

## Code Changes Made for GCP

| File | What Changed |
|---|---|
| `backend/.../services/storage.ts` | **New** — Abstraction layer: GCS in production (`GCS_BUCKET` set), local disk in dev |
| `backend/.../routes/photos.ts` | Uses `memoryStorage()` + StorageService instead of Multer disk |
| `backend/.../services/database.ts` | Supports `INSTANCE_CONNECTION_NAME` for Cloud SQL Unix socket connection |
| `backend/.../services/redis.ts` | Falls back to in-memory cache when `REDIS_URL` is not set (any environment) |
| `backend/.../src/index.ts` | Accepts `INSTANCE_CONNECTION_NAME` as alternative to `DATABASE_URL` in production validation |
| `gcp/Dockerfile.api` | Cloud Run Dockerfile — builds from project root, includes `backend/shared/` SQL files |
| `gcp/Dockerfile.api.dockerignore` | Allows `backend/` in Docker build context (root `.dockerignore` excludes it) |

## Environment Variables on Cloud Run

| Variable | Value | How Set |
|---|---|---|
| `NODE_ENV` | `production` | env var |
| `INSTANCE_CONNECTION_NAME` | `cookquest-prod:asia-south1:cookquest-db` | env var |
| `DB_USER` | `cookquest` | env var |
| `DB_NAME` | `cookquest` | env var |
| `DB_PASSWORD` | (from Secret Manager) | `--set-secrets` |
| `JWT_SECRET` | (from Secret Manager) | `--set-secrets` |
| `GCS_BUCKET` | `cookquest-uploads-prod` | env var |
| `GCS_PROJECT_ID` | `cookquest-prod` | env var |
| `FRONTEND_URL` | `*` | env var (set to your domain later) |
| `ALLOWED_ORIGINS` | `*` | env var (set to your domain later) |
| `SHARED_DIR` | `/app/shared` | env var |
| `PORT` | `3003` | set via `--port` flag (Cloud Run injects it) |

## Common Operations

### Redeploy After Code Changes

```bash
# 1. Rebuild and push image
docker buildx build \
  --platform linux/amd64 \
  -f gcp/Dockerfile.api \
  -t asia-south1-docker.pkg.dev/cookquest-prod/cookquest/api:latest \
  --push .

# 2. Deploy new revision
gcloud run deploy cookquest-api \
  --image=asia-south1-docker.pkg.dev/cookquest-prod/cookquest/api:latest \
  --region=asia-south1 \
  --project=cookquest-prod
```

### View Logs

```bash
# Recent logs
gcloud run services logs read cookquest-api --region=asia-south1 --limit=50

# Stream live logs
gcloud run services logs tail cookquest-api --region=asia-south1

# Filter errors only
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=cookquest-api AND severity>=ERROR" \
  --project=cookquest-prod --limit=20
```

### Update Environment Variables

```bash
gcloud run services update cookquest-api \
  --region=asia-south1 \
  --update-env-vars="FRONTEND_URL=https://cookquest.app,ALLOWED_ORIGINS=https://cookquest.app"
```

### Rotate Secrets

```bash
# Generate new password
NEW_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')

# Update in Secret Manager
printf '%s' "$NEW_PASSWORD" | gcloud secrets versions add db-password --data-file=-

# Update in Cloud SQL
gcloud sql users set-password cookquest --instance=cookquest-db --password="$NEW_PASSWORD"

# Redeploy Cloud Run to pick up new secret version
gcloud run deploy cookquest-api \
  --image=asia-south1-docker.pkg.dev/cookquest-prod/cookquest/api:latest \
  --region=asia-south1
```

### Connect to Cloud SQL Directly (for debugging)

```bash
# Via Cloud SQL Proxy (install: https://cloud.google.com/sql/docs/postgres/sql-proxy)
cloud-sql-proxy cookquest-prod:asia-south1:cookquest-db &
psql -h 127.0.0.1 -U cookquest -d cookquest

# Or via gcloud
gcloud sql connect cookquest-db --user=cookquest --database=cookquest
```

### Scale Configuration

```bash
# Always keep 1 instance warm (avoids cold starts, costs more)
gcloud run services update cookquest-api --min-instances=1 --region=asia-south1

# Scale back to zero when idle (free tier friendly)
gcloud run services update cookquest-api --min-instances=0 --region=asia-south1

# Increase max instances for more traffic
gcloud run services update cookquest-api --max-instances=10 --region=asia-south1
```

## Gotchas and Lessons Learned

| Issue | Solution |
|---|---|
| Docker image built on Mac ARM doesn't work on Cloud Run | Always build with `--platform linux/amd64` |
| Root `.dockerignore` excludes `backend/` | Created `gcp/Dockerfile.api.dockerignore` to override |
| `echo` adds trailing newline to secrets | Use `printf '%s'` when writing to Secret Manager |
| `PORT` env var is reserved on Cloud Run | Don't set it manually — Cloud Run injects it. Use `--port` flag instead |
| `DATABASE_URL` required in production validation | Updated `index.ts` to accept `INSTANCE_CONNECTION_NAME` as alternative |
| Redis tries localhost:6379 in production | Updated `redis.ts` to use in-memory cache when `REDIS_URL` is not set |
| Cloud SQL takes 5-10 minutes to create | Be patient. Check status: `gcloud sql instances describe cookquest-db --format="value(state)"` |

## Things You'll Need in the Future

### When You Add a Custom Domain
```bash
# Map domain to Cloud Run
gcloud run domain-mappings create --service=cookquest-api --domain=api.cookquest.app --region=asia-south1

# Then update CORS:
gcloud run services update cookquest-api \
  --update-env-vars="FRONTEND_URL=https://cookquest.app,ALLOWED_ORIGINS=https://cookquest.app"
```

### When You Deploy the Frontend
- Set `NEXT_PUBLIC_API_URL=https://cookquest-api-254570106808.asia-south1.run.app/api/v1` at build time
- Or use a custom domain and point to that

### When You Need Redis (Memorystore)
- Requires a VPC connector (~$7/month minimum)
- Not worth it for small scale — in-memory cache works fine
- Only add Memorystore if you need shared cache across multiple instances

### When You Need Database Backups
```bash
# Cloud SQL has automatic backups enabled by default
# Manual backup:
gcloud sql backups create --instance=cookquest-db

# List backups:
gcloud sql backups list --instance=cookquest-db
```

### When You Want CI/CD Auto-Deploy
- Create `.github/workflows/deploy-gcp.yml`
- Use Workload Identity Federation (no service account keys)
- Trigger on push to main: build → push → deploy

### To Delete Everything (Teardown)

```bash
# Delete Cloud Run service
gcloud run services delete cookquest-api --region=asia-south1

# Delete Cloud SQL (DESTROYS ALL DATA)
gcloud sql instances delete cookquest-db

# Delete storage bucket
gcloud storage rm -r gs://cookquest-uploads-prod

# Delete Artifact Registry
gcloud artifacts repositories delete cookquest --location=asia-south1

# Delete secrets
gcloud secrets delete jwt-secret
gcloud secrets delete db-password

# Delete project (nuclear option — deletes everything)
gcloud projects delete cookquest-prod
```
