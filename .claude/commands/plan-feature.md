# Plan Feature (Product Manager)

Take a user requirement and break it into structured, actionable tasks in `claude-agents/tasks.json`.

**Role: Product Manager.** You clarify requirements, define scope, write acceptance criteria, and produce implementation-ready task specs.

## Input

`$ARGUMENTS` contains the user's feature request or requirement. If empty, ask: "What feature or requirement would you like me to plan?"

## Step 1: Understand the Requirement

Parse `$ARGUMENTS` and identify:
- **What** the user wants (feature, enhancement, infrastructure, fix)
- **Why** it matters (user value, business goal)
- **Scope** — what's in and what's out

If the requirement is ambiguous, ask up to 3 clarifying questions before proceeding. Use the AskUserQuestion tool.

## Step 2: Analyze the Codebase

Read relevant files to understand:
- Existing patterns and conventions (see CLAUDE.md Pattern Reference Card)
- What already exists (don't duplicate)
- What needs to change vs. what needs to be created
- Dependencies on existing or in-progress tasks

Key files to scan:
- `lib/types.ts` — existing TypeScript interfaces
- `app/` — existing pages and routes
- `components/` — existing components
- `backend/node-services/api-server/src/routes/` — existing API routes
- `backend/node-services/api-server/src/services/database.ts` — DB schema and migrations

## Step 3: Read Current Task Queue

Read `claude-agents/tasks.json` to:
1. Find the **highest existing task ID number** (e.g., `task_074` → 74)
2. Count open tasks (`status` is `"todo"` or `"in_progress"`) — **max 10 open tasks**
3. Identify dependencies — which existing tasks does this feature depend on?

If at the 10-task open limit, warn the user and suggest completing existing tasks first.

## Step 4: Break Down into Tasks

Split the requirement into **implementation-sized tasks** (each task = 1-3 files, completable in one session). Follow these rules:

- **One concern per task** — don't mix backend + frontend in the same task
- **Dependency order** — DB migration → backend service → API route → frontend type → frontend component
- **Task IDs** — sequential from the highest existing ID (task_075, task_076, ...)
- **Alternate even/odd** — pair tasks so both agents have work:
  - Even IDs (task_076, task_078) → agent 2
  - Odd IDs (task_075, task_077) → agent main
- **Cross-lane independence (CRITICAL)** — Even tasks MUST NEVER depend on odd tasks, and odd tasks MUST NEVER depend on even tasks. This allows both agents to work fully in parallel without blocking each other.
  - ✅ Even → Even dependency is OK (task_078 depends on task_076)
  - ✅ Odd → Odd dependency is OK (task_077 depends on task_075)
  - ❌ Even → Odd dependency is FORBIDDEN (task_078 must NOT depend on task_075)
  - ❌ Odd → Even dependency is FORBIDDEN (task_077 must NOT depend on task_076)
  - To achieve this, split work so each lane (even/odd) has a self-contained vertical slice. For example: if backend is odd and frontend is even, make sure the frontend task doesn't depend on the backend task — instead, have the frontend task define its own API contract/types and handle the case where the backend isn't ready yet.

## Step 5: Write Task Specs

For each task, produce this JSON structure:
```json
{
  "id": "task_{NNN}",
  "title": "[{Category}] {Descriptive title}",
  "status": "todo",
  "priority": {1-10},
  "type": "{enhancement|ui-fix|bug-fix|infrastructure}",
  "description": "## {SEVERITY} — {One-line problem statement}\n\n### What's wrong\n{Current state and why it's a problem}\n\n### What to build/fix\n{Detailed specification with code examples, interfaces, SQL, etc.}\n\n### Subtasks\n{Numbered checklist}\n\n### Depends on\n{task IDs or 'none'}\n\n### Acceptance criteria\n{Given/When/Then format}\n\n### Files to create/modify\n{File list with annotations}",
  "files": ["path/to/file1.ts", "path/to/file2.tsx"],
  "createdAt": "{ISO timestamp}",
  "assignedTo": null,
  "assignedAt": null,
  "completedAt": null,
  "retryCount": 0,
  "maxRetries": 3
}
```

### Priority guide
| Priority | Meaning |
|----------|---------|
| 1-3 | Critical — blocks other work or app is broken |
| 4-6 | High — core feature, noticeable gap |
| 7-8 | Medium — important enhancement |
| 9-10 | Low — polish, nice-to-have |

### Description quality bar
- Include **code snippets** (TypeScript interfaces, SQL, component JSX) wherever possible
- Include **API response shapes** for backend tasks
- Include **design guidance** (Tailwind classes, colors, spacing) for frontend tasks
- Reference **existing patterns** by file path (e.g., "follow the pattern in `hooks/use-recipes.ts`")
- List **edge cases** to handle
- Note **what NOT to do** (common pitfalls from CLAUDE.md)

## Step 6: Present Plan to User

Show a summary table:
```
| # | Task ID | Title | Priority | Type | Depends On |
|---|---------|-------|----------|------|------------|
| 1 | task_075 | ... | 8 | enhancement | none |
| 2 | task_076 | ... | 7 | enhancement | task_075 |
```

Then show the full description for each task.

Ask: "Add these {N} tasks to the queue? (y/n, or give feedback to revise)"

## Step 7: Write to Task Queue

If confirmed, read `claude-agents/tasks.json`, append the new tasks to the array, and write back.

After writing, show:
```
Added {N} tasks to queue (task_{start} → task_{end}).
Open tasks: {count}/10
Next available: task_{first_unblocked} ({even|odd} → agent {name})
```

## Notes

- **Never overwrite existing tasks** — only append new ones
- **Never change task status** — that's the implementer's job
- **Keep descriptions self-contained** — an implementer agent should be able to complete the task without asking questions
- **Match CookQuest conventions** — 2-space indent, single quotes, semicolons, shadcn/ui, Tailwind, PostgreSQL `$N` params

## Step 8: Sync Dashboard

Run: `python3 scripts/obsidian-sync.py push 2>/dev/null || true`
