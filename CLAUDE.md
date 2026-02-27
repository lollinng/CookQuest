# CookQuest - Claude Code Instructions

## Project Overview
CookQuest is a gamified cooking skill learning app built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, and Zustand. Backend API runs on localhost:3003.

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

**Step 3: Test Engineer** - Write Tests First (TDD)
- Write tests BEFORE implementation
- Create unit tests (Jest/Vitest), integration tests (Testing Library), E2E tests (Playwright)
- Cover edge cases and error scenarios
- Target 90%+ coverage
- Output: test files

**Step 4: Developer** - Implementation
- Implement code to pass all tests from Step 3
- Follow existing code style (2-space indent, single quotes, semicolons)
- Follow patterns: DRY, SOLID, composition over inheritance
- Ensure security and performance
- Output: implementation files

**Step 5: Code Reviewer** - Quality Assurance
- Review all changes for correctness, security, performance, accessibility
- Score code quality (0-10, threshold: 8.0)
- If score < 8.0, loop back to Step 4 with specific feedback
- Check for OWASP vulnerabilities
- Output: review comments, quality score, approval

**Step 6: DevOps Engineer** - Deployment Prep
- Verify build succeeds (`npm run build`)
- Run full test suite
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

1. **Read** `claude-agents/ui-ux-auditor-agent.md` — it contains the full process, checklists, quality bar, and task format
2. **Follow** the infinite loop defined there: screenshot → review → write tasks to `claude-agents/tasks.json`
3. **Max 10 open tasks** in the queue at any time
4. Tasks use the schema defined in `claude-agents/task-queue.js` (see `addTask()` method)
5. **Playwright audit**: run `npx playwright test e2e/ui-audit.spec.ts --config=e2e/playwright-audit.config.ts`
6. **Screenshots** land in `e2e/screenshots/` — read them visually (Claude is multimodal)
7. The app's identity is **Strava + Duolingo for cooking** — never kill this vibe

**Trigger phrases:** "run UI audit", "check the UI", "UX improvements", "make it more professional", "ui/ux agent", "visual review", "screenshot audit"

## Normal Workflow (ONLY for bugs, refactors, questions — NOT for new features)
**Only use this workflow when the request is clearly NOT a new feature/deliverable.**
- Read the relevant code first before making changes
- Fix the issue directly without the full pipeline
- Run tests after changes if test files exist

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
backend/          - Node.js API server
__tests__/        - Test files
e2e/              - Playwright E2E tests
claude-agents/    - Multi-agent pipeline system
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
