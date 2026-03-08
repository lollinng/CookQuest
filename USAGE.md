# CookQuest — Usage Guide

> Everything you need to run, develop, and deploy CookQuest.
> Readable on your phone via Obsidian.

---

## Quick Start

### Start the App (Local)

```bash
# Start everything (PostgreSQL, Redis, API server)
docker compose up -d

# Start frontend
npm run dev
```

- Frontend: `http://localhost:3002`
- Backend API: `http://localhost:3003/api/v1`
- Admin login: `admin@cookquest.dev` / `Admin123!`

### Reset the Database

```bash
docker compose down -v && docker compose up -d
```

The `-v` flag removes volumes (wipes all data). The API server re-runs migrations and seeds on startup.

---

## Scripts & Commands

### Obsidian Vault Sync

Syncs project docs, task queue, and commands to your Obsidian vault. The vault is a git repo at `~/Documents/CookQuest-Vault` — Obsidian on your iPhone pulls from it.

```bash
# Project → Vault (copy files, render dashboard, git commit + push)
python3 scripts/obsidian-sync.py push

# Vault → Project (git pull, check inbox, sync edits back)
python3 scripts/obsidian-sync.py pull

# Both directions: pull then push
python3 scripts/obsidian-sync.py sync

# Foreground watcher — auto-push on file changes (default: 3s)
python3 scripts/obsidian-sync.py watch

# Custom poll interval in seconds
python3 scripts/obsidian-sync.py watch 5
```

**What syncs where:**

| Project | → Vault |
|---------|---------|
| `CLAUDE.md`, `README.md`, `DEPLOY.md`, `WORKFLOW.md`, etc. | `docs/` |
| `gcp/GCP-DEPLOYMENT.md` | `docs/` |
| `claude-agents/*.json`, `*.md` | `agent-system/` |
| `.claude/commands/*.md` | `commands/` |
| `guidelines/Guidelines.md` | `guidelines/` |
| Auto-generated `Task Dashboard.md` | vault root |

### Inbox Watcher (Autonomous)

A lightweight daemon that watches the vault for new inbox items and spawns Claude Code only when there's work. Zero tokens burned while idle.

```bash
# Run in a separate terminal tab — polls every 60s
python3 scripts/inbox-watcher.py

# Custom interval (every 30 seconds)
python3 scripts/inbox-watcher.py 30

# One-shot check (good for cron jobs)
python3 scripts/inbox-watcher.py --once
```

**How it works:**

1. Pulls the vault git repo
2. Reads `Task Inbox.md` for unprocessed items
3. If items found → spawns `claude --dangerously-skip-permissions -p "/watch-inbox"`
4. Waits for Claude to finish (10 min timeout)
5. Loops back to step 1

**The full flow:**

```
You write idea on iPhone (Task Inbox.md)
  → Obsidian syncs to vault git
  → inbox-watcher.py detects it (git pull + check)
  → Spawns Claude Code with /watch-inbox
  → Claude creates tasks, picks one, runs 6-step pipeline
  → Pushes results back to vault
  → You see progress on your phone
```

### launchd Daemon (Optional)

If you grant Full Disk Access to python3 in System Settings, you can install an auto-sync daemon:

```bash
# Install (watches project files, auto-pushes on change)
python3 scripts/obsidian-sync.py install

# Check status
python3 scripts/obsidian-sync.py status

# Uninstall
python3 scripts/obsidian-sync.py uninstall
```

Note: macOS TCC blocks access to Desktop/Documents without Full Disk Access. The `watch` and `inbox-watcher.py` approaches don't have this problem since they run in your terminal.

---

## Claude Code Slash Commands

Type these in a Claude Code session. They're defined in `.claude/commands/`.

### Everyday Workflow

| Command | What it does |
|---------|-------------|
| `/bootstrap` | Full startup: register agent, check infra, sync vault, read queue, pick task, start pipeline |
| `/pick-task` | Read queue, auto-detect identity (odd/even), assign next task, begin pipeline |
| `/watch-inbox` | Sync vault → process inbox ideas into tasks → auto-pick and implement |
| `/watch-inbox 15` | Same but polls every 15 minutes |
| `/task-status` | Show queue summary (open, in-progress, done, blockers) |
| `/sync-vault` | Just run `obsidian-sync.py push` — quick sync, no agent overhead |

### Planning & Quality

| Command | What it does |
|---------|-------------|
| `/plan-feature <desc>` | PM agent: scope a requirement into tasks, write to queue |
| `/report-bug` | Bug triage: investigate, reproduce with Playwright, create ticket (doesn't fix it) |
| `/ui-audit` | Screenshot every page, review as UX expert, create improvement tasks |

### Building

| Command | What it does |
|---------|-------------|
| `/scaffold-component` | Generate a React component following CookQuest patterns |
| `/scaffold-api-route` | Generate backend route + API module + query hook |
| `/run-e2e` | Run Playwright tests with failure analysis |
| `/verify-build` | TypeScript type-check + Next.js production build |

### Deploying

| Command | What it does |
|---------|-------------|
| `/deploy` | Auto-detect changes, build, push, deploy frontend (Vercel) + backend (GCP Cloud Run) |

---

## The 6-Step Pipeline

Every feature goes through this. Triggered automatically when you request new functionality.

```
Step 1: Product Manager
  → Clarify requirements, write acceptance criteria (Given/When/Then)

Step 2: Software Architect
  → Design solution, list files to create/modify, define interfaces

Step 3: Test Engineer (TDD)
  → Write Playwright E2E tests BEFORE implementation

Step 4: Developer
  → Implement code to make tests pass

Step 5: Code Reviewer
  → Review for quality (threshold: 8.0/10). If < 8.0 → back to Step 4

Step 6: DevOps Engineer
  → Type-check, build, run tests, summarize for PR
```

### What Triggers the Pipeline

**These trigger it** (action verbs, new functionality):
- "add authentication", "build a dashboard", "create a meal planner"
- "set up CI/CD", "make docker run both frontend and backend"
- "implement user profiles", "add a recipe sharing feature"

**These skip it** (fixes, questions, refactors):
- "fix this bug", "explain how X works", "refactor the auth module"
- "why is this broken", "optimize the query", "rename this variable"

---

## Two-Agent System

Two Claude Code agents can work in parallel without merge conflicts.

| Agent | Handles | How to start |
|-------|---------|-------------|
| `implementer-agent-main` | Odd task IDs (001, 003, 005...) | `/bootstrap main` or `/bootstrap` |
| `implementer-agent-2` | Even task IDs (002, 004, 006...) | `/bootstrap 2` |

Each agent only touches files listed in their task's `files` array. Task IDs alternate even/odd so both agents always have work.

The roster is tracked in `claude-agents/agent-roster.json`.

---

## Task Queue

All work lives in `claude-agents/tasks.json`.

### Task Lifecycle

```
todo → in_progress → done
         ↓
    (if review fails)
         ↓
      back to dev step, still in_progress
```

### Rules

- Max **10 open tasks** (todo + in_progress) at any time
- Sorted by priority (1 = critical, 10 = trivial)
- Dependencies must be `done` before a task can start
- `source: "inbox"` means it came from your phone

### Priority Guide

| Priority | Meaning | Example |
|----------|---------|---------|
| 1–3 | Critical | App crashes, data loss, auth broken |
| 4–6 | High | Core feature, noticeable gap |
| 7–8 | Medium | Enhancement, polish |
| 9–10 | Low | Nice-to-have, trivial |

---

## Deployment

### Infrastructure

| Service | Local | Production |
|---------|-------|------------|
| Frontend | `localhost:3002` | Vercel (`cook-quest-six.vercel.app`) |
| Backend | `localhost:3003` | GCP Cloud Run (`asia-south1`) |
| Database | Docker PostgreSQL 16 | Cloud SQL PostgreSQL 16 |
| Storage | Local disk | Cloud Storage (`cookquest-uploads-prod`) |
| Cache | Docker Redis 7 | In-memory (Redis optional) |

### Deploy Manually

```bash
# Frontend — just push to main (Vercel auto-deploys)
git push origin main

# Backend — build + deploy to Cloud Run
docker buildx build --platform linux/amd64 \
  -f gcp/Dockerfile.api \
  -t asia-south1-docker.pkg.dev/cookquest-prod/cookquest/api:latest \
  --push .

gcloud run deploy cookquest-api \
  --image=asia-south1-docker.pkg.dev/cookquest-prod/cookquest/api:latest \
  --region=asia-south1 --project=cookquest-prod
```

### Check Health

```bash
# Backend (production)
curl https://cookquest-api-254570106808.asia-south1.run.app/ready

# Backend (local)
curl http://localhost:3003/api/v1/health

# Frontend (production)
curl https://cook-quest-six.vercel.app
```

### View Logs

```bash
# Cloud Run logs
gcloud run services logs read cookquest-api --region=asia-south1 --limit=50

# Stream live
gcloud run services logs tail cookquest-api --region=asia-south1
```

### Rollback

```bash
# Frontend — promote a previous Vercel deployment
vercel ls --prod
vercel promote <previous-url>

# Backend — shift traffic to previous revision
gcloud run revisions list --service=cookquest-api --region=asia-south1
gcloud run services update-traffic cookquest-api \
  --to-revisions=REVISION_NAME=100 --region=asia-south1
```

### Cost

- Cloud SQL: ~$7–9/month (covered by $300 trial credits)
- Everything else: free tier

---

## Project Structure

```
app/                    Next.js pages and layouts
components/             React components (skill-card, recipe-card, etc.)
components/ui/          shadcn/ui primitives
lib/                    Types, API clients, stores
lib/api/                API modules (recipes, skills, auth, tips, progress)
lib/stores/             Zustand stores
hooks/                  TanStack Query hooks
backend/                Node.js Express API server
backend/shared/         SQL schema + seed data
e2e/                    Playwright E2E tests + screenshots
claude-agents/          Agent system (tasks.json, configs, agent docs)
.claude/commands/       Slash command definitions
scripts/                obsidian-sync.py, inbox-watcher.py
gcp/                    Cloud Run Dockerfile + deployment docs
guidelines/             Design guidelines
```

### Key Files

| Purpose | File |
|---------|------|
| TypeScript types | `lib/types.ts` |
| API client wrapper | `lib/api/client.ts` |
| Query hooks | `hooks/use-recipes.ts` |
| Zustand store | `lib/stores/recipe-store.ts` |
| Auth context | `lib/auth-context.tsx` |
| Backend routes | `backend/node-services/api-server/src/routes/` |
| DB service + migrations | `backend/node-services/api-server/src/services/database.ts` |
| Schema SQL | `backend/shared/schema-pg.sql` |
| Seed data | `backend/shared/seed-data-pg.sql` |
| Agent config | `claude-agents/agent-config.json` |
| Task queue | `claude-agents/tasks.json` |

---

## Common Gotchas

| Pitfall | Fix |
|---------|-----|
| SQL uses `?` placeholders | PostgreSQL uses `$1, $2, $N` — never `?` |
| `apiClient` returns `{ success, data }` | No — it unwraps and returns `T` directly |
| Hydration mismatch | Check `useStoreHydrated()` before reading Zustand stores |
| Component missing `'use client'` | Required on ALL components using hooks, state, or event handlers |
| Docker image fails on Cloud Run | Must build with `--platform linux/amd64` |
| DB won't reset | `docker compose down -v` (the `-v` removes volumes) |
| `cacheTime` in TanStack Query | Renamed to `gcTime` in v5 |
| Session column name wrong | It's `session_token`, not `refresh_token` |
| Playwright tests fail | Check `baseURL` in config — app might be on port 3000, 3001, or 3002 |

---

## Typical Day

### Active development (at laptop)

1. Open terminal, run `python3 scripts/inbox-watcher.py` in a background tab
2. Open Claude Code: `/bootstrap` — it syncs vault, picks a task, starts working
3. Or: write ideas on phone → inbox watcher auto-spawns Claude to process them
4. `/sync-vault` anytime to push latest state to phone

### Away from laptop

1. Write ideas in Obsidian's `Task Inbox.md` on your phone
2. If `inbox-watcher.py` is running → auto-processed
3. If not → next `/bootstrap` or `/watch-inbox` session picks them up
4. Check `Task Dashboard.md` on phone to see progress

### Deploy day

1. `/deploy` in Claude Code — auto-detects what changed, builds, ships
2. Or write "deploy" in Task Inbox → deploy gate checks all tasks done first

---

*Last updated: 2026-03-08*
