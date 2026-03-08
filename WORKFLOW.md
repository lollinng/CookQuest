# CookQuest Development Workflow

> How the multi-agent pipeline, task queue, Obsidian sync, and deployment all fit together.
> Read this on your phone — it's designed for that.

---

## The Big Picture

CookQuest uses an autonomous AI development pipeline. You write ideas on your phone (Obsidian), Claude Code agents pick them up, implement them through a 6-step pipeline, and sync results back to your phone.

```
iPhone (Obsidian)
    ↓  write idea in Task Inbox
Obsidian Vault (git repo)
    ↓  obsidian-sync.py pull
Project Repo
    ↓  /watch-inbox or /bootstrap
Claude Code Agent
    ↓  6-step pipeline
Code Changes → git push
    ↓  obsidian-sync.py push
Obsidian Vault → iPhone
```

You can be away from your laptop. The loop is: **idea → task → code → deploy → visible on phone**.

---

## 1. Task Inbox (How Ideas Become Tasks)

### Writing Ideas (iPhone)

Open `Task Inbox.md` in your Obsidian vault. Write below the separator:

```markdown
---
1. Add a weekly meal planner page
2. Fix the streak counter on mobile
3. deploy
```

Numbered lists and bullet lists both work. That's it — save and let Obsidian sync to git.

### Processing Ideas (Claude Code)

When an agent runs `/watch-inbox` or `/bootstrap`, it:

1. Pulls the vault (`git pull`)
2. Reads the inbox
3. Acts as a **Product Manager** — scopes each idea, writes acceptance criteria
4. Creates 1–3 tasks per idea in `tasks.json`
5. Marks processed items with ~~strikethrough~~ or `[x]`
6. Pushes back to vault so you see the update on your phone

Special keyword: writing **"deploy"** in the inbox triggers a deploy gate — it checks if all tasks are done before deploying.

---

## 2. The Task Queue

All work is tracked in `claude-agents/tasks.json`. Each task has:

| Field | Purpose |
|-------|---------|
| `id` | `task_001`, `task_002`, ... |
| `title` | Short description |
| `status` | `todo` → `in_progress` → `done` |
| `priority` | 1 (critical) to 10 (trivial) |
| `type` | `feature`, `bug-fix`, `ui-fix`, `enhancement` |
| `assignedTo` | Which agent is working on it |
| `files` | Which files the task touches |
| `dependencies` | Other task IDs that must finish first |

### Rules

- **Max 10 open tasks** (todo + in_progress) at any time
- Tasks are sorted by priority, then by ID
- Dependencies must be `done` before a task can start
- Agents only touch files listed in their task's `files` array (prevents merge conflicts)

### Two-Agent System

Two agents can work in parallel:

| Agent | Handles | Example IDs |
|-------|---------|-------------|
| `implementer-agent-main` | Odd-numbered tasks | task_001, task_003, task_005 |
| `implementer-agent-2` | Even-numbered tasks | task_002, task_004, task_006 |

Task IDs are allocated alternating even/odd so both agents always have work.

---

## 3. The 6-Step Pipeline

Every feature request goes through this pipeline. No shortcuts. This mimics a real dev team.

### Step 1: Product Manager

- Clarifies the user's request into structured requirements
- Writes acceptance criteria in Given/When/Then format
- Identifies edge cases and scope boundaries
- Output: requirements doc

### Step 2: Software Architect

- Reads the existing codebase to understand patterns
- Designs the solution: which components, hooks, API routes, types
- Lists files to create and files to modify
- Defines TypeScript interfaces and data models
- Output: architecture plan

### Step 3: Test Engineer (TDD)

- Writes tests **before** any implementation
- Playwright E2E tests in `e2e/`
- Covers happy path, error cases, edge cases
- Output: test files that currently fail

### Step 4: Developer

- Implements code to make all tests pass
- Follows project conventions (2-space indent, single quotes, semicolons)
- Uses existing patterns: shadcn/ui, TanStack Query, Zustand, apiClient
- Output: working code

### Step 5: Code Reviewer

- Reviews all changes for correctness, security, performance, accessibility
- Scores quality 0–10 (threshold: 8.0)
- If score < 8.0 → sends back to Step 4 with specific feedback
- Checks for OWASP top 10 vulnerabilities
- Output: approval or revision request

### Step 6: DevOps Engineer

- Runs `npx tsc --noEmit` (type check)
- Runs `npm run build` (production build)
- Runs the full test suite
- Summarizes changes for a PR description
- Output: build status, deployment readiness

After pipeline completion, the task is marked `done` and the dashboard syncs to your phone.

---

## 4. Slash Commands

These are shortcuts you type in Claude Code to trigger specific workflows.

### Core Workflow

| Command | What it does |
|---------|-------------|
| `/bootstrap` | Full startup: register agent, check infra, sync vault, read queue, pick task, start pipeline |
| `/pick-task` | Read queue, auto-detect agent identity (odd/even), assign highest-priority task, begin pipeline |
| `/watch-inbox` | Sync vault, process inbox → tasks, auto-pick and implement. Add a number for polling: `/watch-inbox 15` checks every 15 min |
| `/task-status` | Show queue summary — open, in-progress, done, blockers |

### Planning & Triage

| Command | What it does |
|---------|-------------|
| `/plan-feature` | PM agent: take a requirement, analyze codebase, break into tasks, write to queue |
| `/report-bug` | Bug triage: investigate, reproduce with Playwright, create ticket. Does NOT fix the bug |
| `/ui-audit` | Screenshot every page, review as UX expert, create improvement tasks |

### Building & Deploying

| Command | What it does |
|---------|-------------|
| `/scaffold-component` | Generate a React component following CookQuest patterns |
| `/scaffold-api-route` | Generate backend route + frontend API module + query hook |
| `/run-e2e` | Run Playwright tests with pre-flight checks and failure analysis |
| `/verify-build` | TypeScript type-check + Next.js production build + lint |
| `/deploy` | Deploy frontend (Vercel) + backend (GCP Cloud Run) with pre-flight checks |

---

## 5. Obsidian Vault Sync

The vault is a git repo at `~/Documents/CookQuest-Vault`. It syncs bidirectionally with the project.

### What Syncs

| Project | Vault |
|---------|-------|
| `CLAUDE.md`, `README.md`, `DEPLOY.md`, etc. | `docs/` |
| `claude-agents/tasks.json`, `agent-config.json`, etc. | `agent-system/` |
| `.claude/commands/*.md` | `commands/` |
| `guidelines/Guidelines.md` | `guidelines/` |
| Generated `Task Dashboard.md` | vault root |
| `Task Inbox.md` | vault root (user writes here) |

### Commands

```bash
# Project → Vault (copies files, renders dashboard, git commit + push)
python3 scripts/obsidian-sync.py push

# Vault → Project (git pull, check inbox, sync edits back)
python3 scripts/obsidian-sync.py pull

# Both directions: pull then push
python3 scripts/obsidian-sync.py sync

# Foreground watcher: auto-push every 3 seconds on file changes
python3 scripts/obsidian-sync.py watch

# Custom interval (5 seconds)
python3 scripts/obsidian-sync.py watch 5
```

### When Sync Happens

- `/bootstrap` runs `sync` (pull + push) at startup
- `/pick-task` runs `push` after assigning a task and after completing it
- `/watch-inbox` runs `sync` at start, `push` after processing inbox
- `/deploy` runs `push` after deployment
- `watch` mode auto-pushes whenever you or an agent changes a tracked file

### Task Dashboard

`Task Dashboard.md` is auto-generated on every push. It shows:
- Summary table (todo / in-progress / done counts)
- Active tasks sorted by priority
- Recent completed tasks
- Agent workload

This is read-only — don't edit it in Obsidian.

---

## 6. Specialized Agents

### UI/UX Auditor

Triggered by: `/ui-audit`, "check the UI", "make it more professional"

1. Runs Playwright to screenshot every page at desktop, tablet, and mobile viewports
2. Reads each screenshot visually (Claude is multimodal)
3. Evaluates against a quality checklist: broken images, layout, typography, gamification elements, mobile responsiveness
4. Creates improvement tasks in the queue
5. Loops infinitely until everything looks perfect

The quality bar is **Strava + Duolingo for cooking** — warm, gamified, encouraging.

### Bug Triage Agent

Triggered by: `/report-bug`, "found a bug", screenshot of an issue

1. Reads the bug screenshot / description
2. Investigates the codebase to find root cause (file paths, line numbers)
3. Classifies the bug (type, severity, reproducibility, regression status)
4. Writes a Playwright test that **fails** on the bug
5. Creates a detailed ticket in the queue with industry-standard format (IEEE 1044)
6. Does **NOT** fix the bug — implementer agents handle that

---

## 7. Deployment

### Infrastructure

| Service | Local | Production |
|---------|-------|------------|
| Frontend | `localhost:3002` (Next.js dev) | Vercel (`cook-quest-six.vercel.app`) |
| Backend API | `localhost:3003` (Express) | GCP Cloud Run (`asia-south1`) |
| Database | Docker PostgreSQL 16 | Cloud SQL PostgreSQL |
| Cache | Docker Redis 7 | Cloud Memorystore |

### Deploy Flow

The `/deploy` command:

1. Detects what changed (frontend / backend / both)
2. Runs type check + production build
3. Commits and pushes to `main`
4. Frontend: Vercel auto-deploys on push (or `vercel --prod`)
5. Backend: builds Docker image → pushes to Artifact Registry → deploys to Cloud Run
6. Verifies health endpoints
7. Shows summary with URLs

### Rollback

Frontend: `vercel promote <previous-url>`
Backend: `gcloud run services update-traffic` to shift to a previous revision

---

## 8. Development Patterns

Quick reference for how code is structured.

### Adding a Frontend Feature

1. Types in `lib/types.ts`
2. API module in `lib/api/{name}.ts` (uses `apiClient` wrapper)
3. TanStack Query hook in `hooks/use-{name}.ts`
4. Component in `components/{kebab-name}.tsx` (shadcn/ui + Tailwind)
5. Wire into page in `app/`
6. E2E test in `e2e/`

### Adding a Backend Endpoint

1. Route in `backend/node-services/api-server/src/routes/{name}.ts`
2. Register in `routes/index.ts`
3. DB queries in `services/database.ts`
4. Schema changes in `backend/shared/schema-pg.sql` + migration
5. Response format: `{ success: true, data: {} }`
6. E2E test in `e2e/`

### Key Gotchas

- PostgreSQL uses `$1, $2, $N` — never `?`
- `apiClient` unwraps the `{ success, data }` envelope — returns `T` directly
- All components using hooks/state need `'use client'` directive
- Check `useStoreHydrated()` before reading Zustand stores
- Use `gcTime` not `cacheTime` (TanStack Query v5)
- Session column is `session_token`, not `refresh_token`

---

## 9. Project File Map

```
app/                    Next.js pages and layouts
components/             React components
components/ui/          shadcn/ui primitives
lib/                    Utilities, types, API clients
lib/api/                API modules (recipes, skills, auth, etc.)
lib/stores/             Zustand stores
hooks/                  TanStack Query hooks
backend/                Node.js API server
backend/shared/         SQL schema and seed data
e2e/                    Playwright E2E tests + screenshots
claude-agents/          Agent system (tasks, config, agent docs)
.claude/commands/       Slash command definitions
scripts/                Obsidian sync, utilities
gcp/                    Cloud Run Dockerfile and deployment config
```

---

## 10. Typical Session Flow

Here's what a typical autonomous session looks like:

```
1. You write "add weekly meal planner" in Task Inbox on iPhone
2. Obsidian syncs to vault git repo
3. Claude Code runs /watch-inbox
4. Agent pulls vault, finds your idea
5. PM step: scopes it into 2 tasks (task_075, task_076)
6. Marks inbox item as processed, pushes to vault
7. You see "→ task_075, task_076" on your phone
8. Agent picks task_075 (odd → agent main)
9. Runs 6-step pipeline: PM → Architect → Test → Dev → Review → DevOps
10. Marks task_075 done, pushes dashboard to vault
11. You see "Done" on your phone's Task Dashboard
12. Agent picks next task and continues
```

You can also interact directly:
- `/plan-feature add a recipe sharing system` — creates tasks without implementing
- `/report-bug` + paste a screenshot — creates a bug ticket
- `/deploy` — ships everything to production
- `/ui-audit` — visual review of the whole app

---

*Last updated: 2026-03-08*
