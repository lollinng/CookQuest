# CookQuest - Claude Code Instructions

## Project Overview
CookQuest is a gamified cooking skill learning app built with Next.js 15, React 18, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query, and Zustand. Backend: Node.js + Express on port 3003, PostgreSQL 16, Redis 7. Infrastructure: Docker Compose.

**Admin login** (seeded): `admin@cookquest.dev` / `Admin123!`

## Agent Quick-Start (READ ON EVERY NEW SESSION)

When starting a new session as an implementer agent:
1. Read `claude-agents/tasks.json` to see the task queue
2. Pick the next available task (status: `"todo"`, unassigned)
   - **Even-numbered tasks** (task_002, task_004, ...) → `implementer-agent-2`
   - **Odd-numbered tasks** (task_001, task_003, ...) → `implementer-agent-main`
3. Assign yourself: set `assignedTo` to your agent name, `assignedAt` to now, `status` → `"in_progress"`
4. Follow the 6-step pipeline for feature tasks (PM → Architect → Test → Dev → Review → DevOps)
5. Mark task as `"done"` with `completedAt` when finished
6. Pick the next task and repeat

If no tasks are available, tell the user and wait for instructions.

## Multi-Agent Pipeline Workflow (MANDATORY — READ FIRST)

**CRITICAL: Before doing ANYTHING with a user request, you MUST determine if it is a feature request. If it is, you MUST follow the 6-step pipeline below. Do NOT skip this check. Do NOT jump straight into coding.**

This project uses a multi-agent development pipeline defined in `claude-agents/`. When a user requests a **new feature, enhancement, infrastructure change, or any new deliverable**, follow this 6-step pipeline. ONLY skip to normal workflow for explicit bug fixes, refactors, or questions.

### How to Detect Feature Requests (BROAD MATCHING)
**Default rule: When in doubt, USE THE PIPELINE.** Only skip the pipeline if the request is clearly a bug fix, refactor, explanation, or question.

Trigger the pipeline when the user's request matches ANY of these patterns or intent:
- **Action verbs**: "make", "build", "create", "add", "implement", "develop", "set up", "setup", "configure", "enable", "integrate", "introduce", "write", "generate", "produce", "prepare", "establish"
- **Feature phrases**: "add feature", "new feature", "create feature", "feature request", "enhancement", "add functionality"
- **Infrastructure/DevOps**: "docker", "containerize", "deploy", "CI/CD", "pipeline", "kubernetes", "compose", "dockerfile", "hosting", "server setup", "make run", "make it run"
- **User stories**: "as a user", "I want", "I need", "should be able to", "users can", "user story"
- **Specification**: "requirements", "specification", "acceptance criteria"
- **Implicit creation**: Any request that asks you to produce NEW files, NEW configuration, NEW infrastructure, or NEW functionality that doesn't already exist

**Examples that MUST trigger the pipeline:**
- "make docker run which runs both frontend and backend" → YES (creating new infrastructure)
- "add authentication" → YES (new feature)
- "set up CI/CD" → YES (new infrastructure)
- "create a login page" → YES (new feature)
- "make the app deployable" → YES (new infrastructure)
- "build an API endpoint for X" → YES (new feature)

For these keywords, use **normal workflow** instead (ONLY these):
- "explain", "how does", "what is", "why", "help", "show me", "find", "search"
- "debug", "fix bug", "fix error", "error", "issue", "broken", "not working"
- "refactor", "optimize", "clean up", "documentation", "rename"

### Pipeline Steps (for feature requests — MUST follow in order)

**Step 1: Product Manager** - Requirements & Specification
- Clarify the user's request into structured requirements
- Write a feature specification with title, description, scope
- Define acceptance criteria using Given/When/Then format
- Identify any clarifying questions and ask the user before proceeding
- Output: requirements doc, acceptance criteria, questions

**Step 2: Software Architect** - System Design
- Analyze existing codebase to understand patterns and conventions
- Design the architecture (components, hooks, API routes, types)
- Identify files to create and files to modify
- Define interfaces and data models
- Output: architecture plan, file list, interfaces

**Step 3: Developer** - Implementation
- Follow existing code style (2-space indent, single quotes, semicolons)
- Follow patterns: DRY, SOLID, composition over inheritance
- Ensure security and performance
- Output: implementation files

**Step 4: Code Reviewer** - Quality Assurance
- Review all changes for correctness, security, performance, accessibility
- Score code quality (0-10, threshold: 8.0)
- If score < 8.0, loop back to Step 4 with specific feedback
- Check for OWASP vulnerabilities
- Output: review comments, quality score, approval

**Step 5: DevOps Engineer** - Deployment Prep
- Verify build succeeds (`npm run build`)
- Summarize changes for PR description
- Output: build status, deployment notes

### Pipeline Configuration
See `claude-agents/agent-config.json` for thresholds and settings.

### Task Tracking
- Use `TaskCreate` to create tasks for each pipeline step
- Update task status as you progress through steps
- Reference `claude-agents/tasks.json` for existing task queue

## UI/UX Auditor Agent

When the user asks to run a UI/UX audit, review the app visually, or create improvement tasks:

1. **Read** `claude-agents/on-demand/ui-ux-auditor-agent.md` — it contains the full process, checklists, quality bar, and task format
2. **Follow** the infinite loop defined there: screenshot → review → write tasks to `claude-agents/tasks.json`
3. **Max 10 open tasks** in the queue at any time
4. Tasks use the schema defined in `claude-agents/task-queue.js` (see `addTask()` method)
5. The app's identity is **Strava + Duolingo for cooking** — never kill this vibe

**Trigger phrases:** "run UI audit", "check the UI", "UX improvements", "make it more professional", "ui/ux agent", "visual review", "screenshot audit"

## Bug Triage Agent

When the user reports a bug, provides a screenshot of an issue, or asks to file a bug ticket:

1. **Read** `claude-agents/on-demand/bug-triage-agent.md` — it contains the full triage process, priority guide, and task schema
2. **Investigate** the code to pinpoint the likely source (file paths, line numbers)
3. **Create ticket** in `claude-agents/tasks.json` with type `"bug-fix"` and title starting with `[Bug]`
6. **Do NOT fix the bug** — only triage and ticket. Implementer agents handle fixes.

**Trigger phrases:** "report bug", "file a bug", "bug report", "found a bug", "this is broken", "screenshot bug", "triage bug", "/report-bug"

## Normal Workflow (ONLY for bugs, refactors, questions — NOT for new features)
**Only use this workflow when the request is clearly NOT a new feature/deliverable.**
- Read the relevant code first before making changes
- Fix the issue directly without the full pipeline

## Project Conventions

### File Structure
```
app/              - Next.js pages and layouts
components/       - React components (cooking-tip, recipe-card, skill-card, auth/)
components/ui/    - shadcn/ui primitives
lib/              - Utilities, types, API clients, stores
lib/api/          - API modules (recipes, skills, tips, auth, progress)
lib/stores/       - Zustand stores
hooks/            - Custom React hooks (use-recipes.ts)
backend/          - Node.js API server + shared SQL
claude-agents/    - Multi-agent pipeline system (tasks.json, configs)
```

### Code Style
- TypeScript strict mode
- 2-space indentation
- Single quotes
- Semicolons
- PascalCase for components, kebab-case for files
- Use shadcn/ui components from `components/ui/`
- Use TanStack Query for data fetching (see `hooks/use-recipes.ts`)
- Use Zustand for client state (see `lib/stores/recipe-store.ts`)
- API base URL: `http://localhost:3003/api/v1`

### Key Patterns
- API client wrapper with auth token management: `lib/api/client.ts`
- Query hooks with proper cache times: `hooks/use-recipes.ts`
- Hydration-safe components: check `useStoreHydrated()` before accessing store
- Fallback patterns: API data → local fallback (see `components/cooking-tip.tsx`)

### Pattern Reference Card
**See `CLAUDE-TEMPLATES.md`** for component, hook, API module, and route templates.

### Common Pitfalls & Gotchas

| Pitfall | Correct approach |
|---------|-----------------|
| SQL placeholders | PostgreSQL uses `$1, $2, $N` — **NEVER** use `?` |
| Session column name | `user_sessions.session_token` — not `refresh_token` |
| Hydration mismatch | Always check `useStoreHydrated()` before reading Zustand store values |
| Client components | `'use client'` directive required on ALL components using hooks, state, or event handlers |
| apiClient return type | Returns unwrapped `T` directly — not `{ success, data: T }` |
| SKILL_RECIPES map | Located in `lib/stores/recipe-store.ts` — update it when adding new skills |
| Docker DB reset | `docker compose down -v && docker compose up` (the `-v` removes volumes) |
| Concurrent agents | Agents should only touch files listed in their task's `files` array to avoid merge conflicts |
| Query cache times | Use `gcTime` (not `cacheTime` which is deprecated in TanStack Query v5) |
| Backend response envelope | Backend sends `{ success: true, data: {} }` — `apiClient` strips this, but raw `fetch` doesn't |
| Migration tracking | `_migrations` table tracks applied migrations — migrations are idempotent |

### Spawning Sub-Tasks

Use the Task tool with `subagent_type: "general-purpose"` to delegate specialized work:

**Code reviewer sub-task:**
```
Review the following files for correctness, security, performance, and accessibility: {file list}.
Check for: OWASP top 10, proper error handling, TypeScript strict compliance, accessibility (WCAG 2.1 AA).
Score 0-10 (threshold: 8.0). If below 8.0, list specific fixes needed.
CookQuest conventions: 2-space indent, single quotes, semicolons, shadcn/ui, Tailwind only.
```

## Slash Commands Reference

These commands are available via `/command-name` in Claude Code:

| Command | Purpose |
|---------|---------|
| `/bootstrap` | Full session startup: check infra, read queue, pick task, begin pipeline |
| `/pick-task` | Read tasks.json, filter by even/odd identity, assign highest-priority task |
| `/task-status` | Show queue summary — open, in-progress, done, blockers |
| `/scaffold-component` | Generate a React component following CookQuest patterns |
| `/scaffold-api-route` | Generate backend route + frontend API module + hook |
| `/verify-build` | TypeScript type-check + Next.js build + lint |
| `/deploy` | Deploy to production — Frontend (Vercel) + Backend (GCP Cloud Run) |
| `/ui-audit` | Run UI/UX auditor workflow (screenshots, review, create tasks) |
| `/plan-feature` | PM agent: take a requirement, break it into tasks, write to tasks.json |
| `/report-bug` | Bug triage: screenshot + description → investigate, reproduce, create ticket |
| `/watch-inbox` | Sync vault, process inbox ideas into tasks, auto-pick and implement |
