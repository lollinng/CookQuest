# CookQuest Vercel Frontend Deployment

## Architecture

```
Browser → Vercel (Next.js frontend) → Cloud Run (cookquest-api) → Cloud SQL (PostgreSQL 16)
                                                                 → Cloud Storage (photo uploads)
```

## Live URLs

| Service | URL |
|---|---|
| Frontend (Production) | `https://cook-quest-six.vercel.app` |
| Frontend (Deployment) | `https://cook-quest-oqhdewami-lollinngs-projects.vercel.app` |
| Backend API | `https://cookquest-api-254570106808.asia-south1.run.app/api/v1` |
| Health Check | `https://cook-quest-six.vercel.app/api/health` |

## Vercel Project

| Field | Value |
|---|---|
| Project Name | `cook-quest` |
| Team | `lollinngs-projects` |
| Framework | Next.js (auto-detected) |
| Node.js | 20.x |
| Build Command | `npm run build` (default) |
| Output Directory | Auto (Next.js default) |
| Region | Washington, D.C. (iad1) — auto-selected |

## Environment Variables (Production)

| Variable | Value | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://cookquest-api-254570106808.asia-south1.run.app/api/v1` | Backend API URL baked into client bundle at build time |

Set via: `vercel env add NEXT_PUBLIC_API_URL production`

## How It Was Deployed

### Prerequisites
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login
```

### 1. Link Project (first time only)
```bash
# From project root — follow prompts to create/link project
vercel link
```

### 2. Set Environment Variable
```bash
# NEXT_PUBLIC_API_URL must be set BEFORE building (it's inlined at build time)
printf 'https://cookquest-api-254570106808.asia-south1.run.app/api/v1' | vercel env add NEXT_PUBLIC_API_URL production
```

### 3. Deploy to Production
```bash
vercel --prod
```

### 4. Update Backend CORS (GCP Cloud Run)
```bash
# Allow the Vercel frontend origin in the backend CORS config
gcloud run services update cookquest-api \
  --region=asia-south1 \
  --update-env-vars="^||^FRONTEND_URL=https://cook-quest-six.vercel.app||ALLOWED_ORIGINS=https://cook-quest-six.vercel.app" \
  --project=cookquest-prod
```

## Code Changes for Vercel

| File | What Changed |
|---|---|
| `next.config.ts` | `output: 'standalone'` is now conditional — skipped on Vercel (`process.env.VERCEL`) for edge optimizations, kept for Docker |

## Common Operations

### Redeploy After Code Changes
```bash
# Production deploy (uses latest code + existing env vars)
vercel --prod
```

### Preview Deploy (non-production)
```bash
# Creates a unique preview URL without affecting production
vercel
```

### Update Environment Variables
```bash
# Remove old value
vercel env rm NEXT_PUBLIC_API_URL production

# Add new value
printf 'https://new-api-url.example.com/api/v1' | vercel env add NEXT_PUBLIC_API_URL production

# Redeploy to pick up the change (NEXT_PUBLIC_ vars are build-time)
vercel --prod
```

### View Deployment Logs
```bash
# List recent deployments
vercel ls --prod

# Inspect a specific deployment
vercel inspect <deployment-url> --logs
```

### Rollback to Previous Deployment
```bash
# List deployments, then promote a previous one
vercel ls --prod
vercel promote <deployment-url>
```

### Check Project Info
```bash
vercel env ls production    # List env vars
vercel ls --prod            # List production deployments
vercel whoami               # Check logged-in user
```

## CORS Configuration

The GCP backend (`cookquest-api`) has CORS configured to accept requests from the Vercel frontend:

- `FRONTEND_URL` = `https://cook-quest-six.vercel.app`
- `ALLOWED_ORIGINS` = `https://cook-quest-six.vercel.app`

If you add a custom domain, update both:
```bash
gcloud run services update cookquest-api \
  --region=asia-south1 \
  --update-env-vars="^||^FRONTEND_URL=https://cookquest.app||ALLOWED_ORIGINS=https://cookquest.app,https://cook-quest-six.vercel.app" \
  --project=cookquest-prod
```

## Cost

Vercel Hobby plan: **Free** — includes:
- 100 GB bandwidth/month
- Serverless function execution
- Automatic HTTPS
- Preview deployments on every push
- Edge network CDN

## When You Add a Custom Domain

```bash
# Add domain in Vercel
vercel domains add cookquest.app

# Point your DNS:
# - A record: 76.76.21.21
# - Or CNAME: cname.vercel-dns.com

# Update backend CORS to accept the new domain
gcloud run services update cookquest-api \
  --region=asia-south1 \
  --update-env-vars="^||^FRONTEND_URL=https://cookquest.app||ALLOWED_ORIGINS=https://cookquest.app,https://cook-quest-six.vercel.app" \
  --project=cookquest-prod
```

## When You Want Auto-Deploy on Git Push

Connect the GitHub repo in the Vercel dashboard:
1. Go to https://vercel.com/lollinngs-projects/cook-quest/settings/git
2. Connect your GitHub repository
3. Vercel will auto-deploy on every push to `main`

Or use GitHub Actions — see `.github/workflows/` for CI config.

## Gotchas

| Issue | Solution |
|---|---|
| `NEXT_PUBLIC_API_URL` not working after change | Must redeploy — it's baked in at build time, not runtime |
| `output: 'standalone'` in next.config.ts | Conditionally skipped on Vercel via `process.env.VERCEL` check |
| CORS errors in browser | Update `ALLOWED_ORIGINS` on Cloud Run to include Vercel URL |
| Previous deployments errored | They were before `NEXT_PUBLIC_API_URL` was set — the build validation in `next.config.ts` requires it |
| Preview deploys can't reach backend | CORS must include the preview URL, or set `ALLOWED_ORIGINS=*` temporarily |
