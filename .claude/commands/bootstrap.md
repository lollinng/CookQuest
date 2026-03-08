# Bootstrap Agent Session

You are starting a new CookQuest agent session. Follow these steps exactly. **Fully autonomous — no confirmation prompts.**

## Step 1: Register Identity (Auto)

Priority order:
1. If `$ARGUMENTS` contains "main" or "1" → you are `implementer-agent-main` (odd tasks)
2. If `$ARGUMENTS` contains "2" → you are `implementer-agent-2` (even tasks)
3. If `$ARGUMENTS` is empty → read `claude-agents/agent-roster.json`. If `current` is non-null, use that identity. If null, default to `implementer-agent-main`.

**No prompt.** Write your identity to `claude-agents/agent-roster.json`:
- Set `current` to your agent name (e.g., `"implementer-agent-main"`)
- Set `lastSessionStart` to current ISO timestamp

Show: "Registered as **{agent-name}** ({odd|even} tasks)"

## Step 2: Check Infrastructure

Run these health checks in parallel:
- `docker compose ps` — confirm `postgres`, `redis`, and `api-server` are running
- `curl -s http://localhost:3003/api/v1/health` — backend health
- `curl -s http://localhost:3000` or `http://localhost:3002` — frontend running

If any service is down, tell the user and suggest `docker compose up -d` or `npm run dev`.

## Step 2.5: Sync Obsidian Vault

Run: `python3 scripts/obsidian-sync.py sync 2>/dev/null || true`

Read `claude-agents/task-inbox.md`. If it has content below the separator (not just the template/comments):
1. For each task idea, run the PM pipeline: clarify, scope, write task spec
2. Append formatted tasks to `claude-agents/tasks.json`
3. Clear `claude-agents/task-inbox.md` (reset to template with just the header and separator)
4. Run `python3 scripts/obsidian-sync.py push 2>/dev/null || true`

Show: "Processed {N} inbox items → added task_{X} through task_{Y}" (or "Inbox empty" if nothing to process)

## Step 3: Read Task Queue

Read `claude-agents/tasks.json`. Produce a summary:
- Total tasks, how many `todo`, `in_progress`, `done`
- List non-done tasks with ID, title, priority, status, assignee

## Step 4: Pick Your Task

Filter tasks by:
1. Status = `"todo"` and `assignedTo` is null/empty
2. Even/odd rule: if you are `implementer-agent-main`, pick odd-numbered task IDs (task_001, task_003, ...). If `implementer-agent-2`, pick even-numbered (task_002, task_004, ...).
3. Highest priority first (lower number = higher priority). Tiebreak: lowest task ID.

Show the selected task details, then **immediately assign and begin** — no "Proceed?" prompt.

## Step 5: Assign & Begin Pipeline

Update `claude-agents/tasks.json`:
- Set `assignedTo` to your agent name
- Set `assignedAt` to current ISO timestamp
- Set `status` to `"in_progress"`

Then begin the 6-step pipeline (PM → Architect → Test → Dev → Review → DevOps) as defined in CLAUDE.md.

## Key File Reference

Keep these paths handy during implementation:

| Purpose | File |
|---------|------|
| TypeScript types | `lib/types.ts` |
| API client | `lib/api/client.ts` |
| API modules | `lib/api/recipes.ts`, `lib/api/skills.ts`, `lib/api/tips.ts`, `lib/api/auth.ts`, `lib/api/progress.ts` |
| TanStack Query hooks | `hooks/use-recipes.ts` |
| Zustand store | `lib/stores/recipe-store.ts` |
| Backend routes | `backend/node-services/api-server/src/routes/` |
| Database service | `backend/node-services/api-server/src/services/database.ts` |
| Schema SQL | `backend/shared/schema-pg.sql` |
| Seed data SQL | `backend/shared/seed-data-pg.sql` |
| E2E tests | `e2e/` |
| Agent config | `claude-agents/agent-config.json` |
