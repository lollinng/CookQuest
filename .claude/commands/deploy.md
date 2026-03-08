# Deploy to Production

Deploy the latest changes to production. Frontend → Vercel, Backend → GCP Cloud Run.

## Step 0: Pre-flight — What Changed?

Run `git status` and `git diff --name-only HEAD` to determine what changed.

Categorize changes:
- **Frontend-only**: files in `app/`, `components/`, `hooks/`, `lib/`, `public/`, `package.json`, `next.config.ts`, `tailwind.config.ts`, `globals.css`
- **Backend-only**: files in `backend/`
- **Both**: changes in both categories
- **Infra/config-only**: files in `gcp/`, `docker-compose*`, `.github/`, `scripts/` — inform user, no deploy needed

Tell the user what will be deployed:
```
Deploy Summary
──────────────────────
Frontend (Vercel):    YES / NO / SKIP
Backend (Cloud Run):  YES / NO / SKIP
──────────────────────
```

Ask: "Proceed with deployment? (y/n)" — wait for confirmation before continuing.

## Step 1: Verify Build

Before deploying, ensure the code builds cleanly.

### Frontend (if deploying frontend)
```bash
npx tsc --noEmit && npm run build
```

If build fails, stop and show errors. Do NOT deploy broken code.

### Backend (if deploying backend)
```bash
cd backend/node-services/api-server && npx tsc --noEmit && npm run build
```

If build fails, stop and show errors.

## Step 2: Git — Commit & Push

Check if there are uncommitted changes:

```bash
git status
```

If there are uncommitted changes:
1. Show the user what's uncommitted
2. Ask: "Commit these changes before deploying? (y/n)"
3. If yes, stage relevant files and create a commit with a descriptive message
4. Push to `main`: `git push origin main`

If already clean and pushed, skip this step.

**IMPORTANT**: Always push to `main` before deploying — Vercel deploys from the git repo.

## Step 3: Deploy Frontend (Vercel)

Only run if frontend changes were detected.

```bash
vercel --prod
```

Expected output: a production URL like `https://cook-quest-six.vercel.app`

If Vercel is connected to GitHub (auto-deploy), the push in Step 2 already triggered it. In that case, tell the user:
> "Vercel auto-deploys on push to main. Your frontend deployment was triggered by the git push. Check status at: https://vercel.com/lollinngs-projects/cook-quest"

### Verify frontend
```bash
curl -sf https://cook-quest-six.vercel.app/api/health
```

## Step 4: Deploy Backend (GCP Cloud Run)

Only run if backend changes were detected.

### 4a. Build and push Docker image
```bash
docker buildx build \
  --platform linux/amd64 \
  -f gcp/Dockerfile.api \
  -t asia-south1-docker.pkg.dev/cookquest-prod/cookquest/api:latest \
  --push \
  .
```

**IMPORTANT**: Must build from the project root (not from `backend/`), and must use `--platform linux/amd64` (Cloud Run doesn't support ARM).

If `docker buildx` fails with auth errors:
```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev
```
Then retry the build.

### 4b. Deploy new revision to Cloud Run
```bash
gcloud run deploy cookquest-api \
  --image=asia-south1-docker.pkg.dev/cookquest-prod/cookquest/api:latest \
  --region=asia-south1 \
  --project=cookquest-prod
```

### 4c. Verify backend
```bash
curl -sf https://cookquest-api-254570106808.asia-south1.run.app/ready
```

Expected: `{"status":"ready",...}`

If the health check fails, check logs:
```bash
gcloud run services logs read cookquest-api --region=asia-south1 --limit=20
```

## Step 5: Post-Deploy Summary

```
Deployment Complete
──────────────────────────────────────────
Frontend:  ✅ / ❌ / ⏭️ SKIPPED
  URL:     https://cook-quest-six.vercel.app
Backend:   ✅ / ❌ / ⏭️ SKIPPED
  URL:     https://cookquest-api-254570106808.asia-south1.run.app
  API:     https://cookquest-api-254570106808.asia-south1.run.app/api/v1
Commit:    <short sha> — <commit message>
──────────────────────────────────────────
```

If any step failed, show the error and suggest next steps.

## Reference

- Frontend docs: `VERCEL-DEPLOYMENT.md`
- Backend docs: `gcp/GCP-DEPLOYMENT.md`
- Full infra docs: `DEPLOY.md`

### Rollback Commands

**Frontend:**
```bash
vercel ls --prod          # List deployments
vercel promote <url>      # Promote a previous deployment
```

**Backend:**
```bash
gcloud run services describe cookquest-api --region=asia-south1 --format="value(status.traffic)"
gcloud run revisions list --service=cookquest-api --region=asia-south1
gcloud run services update-traffic cookquest-api --to-revisions=REVISION=100 --region=asia-south1
```
