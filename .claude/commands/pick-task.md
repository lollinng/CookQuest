# Pick Next Task

Read the task queue and assign yourself the next available task. **Fully autonomous — no confirmation prompts.**

## Step 1: Read Queue

Read `claude-agents/tasks.json`. Filter to tasks where:
- `status` is `"todo"`
- `assignedTo` is null or empty string

## Step 2: Detect Identity (Auto)

Priority order:
1. If `$ARGUMENTS` contains "main" or "odd" → filter to **odd**-numbered task IDs
2. If `$ARGUMENTS` contains "2" or "even" → filter to **even**-numbered task IDs
3. If `$ARGUMENTS` is empty → read `claude-agents/agent-roster.json`, use the `current` agent's `handles` field (odd or even)
4. Fallback (no roster or `current` is null) → default to `implementer-agent-main` (odd)

The numeric suffix determines even/odd: `task_052` → 52 → even → agent 2.

Show: "Auto-detected: **{agent-name}** → {odd|even} tasks" (informational only, no prompt)

## Step 3: Select & Assign Task

From the filtered list:
1. Sort by `priority` ascending (lower = higher priority)
2. Tiebreak: lowest task ID number
3. Check `dependencies` — skip tasks whose dependencies aren't `"done"`

Show the selected task:
```
Task: {id} — {title}
Priority: {priority}
Type: {type}
Description: (first 200 chars)
Files: {files list}
Dependencies: {dependencies or "none"}
```

**Immediately assign** — update `claude-agents/tasks.json`:
```json
{
  "assignedTo": "{your-agent-name}",
  "assignedAt": "{ISO timestamp}",
  "status": "in_progress"
}
```

If no eligible tasks found, show "No available tasks for {odd|even} queue." and stop.

## Step 4: Begin Pipeline

Immediately start the 6-step pipeline (PM → Architect → Test → Dev → Review → DevOps) as defined in CLAUDE.md.

## Step 5: Sync Dashboard (post-assign)

Run: `python3 scripts/obsidian-sync.py push 2>/dev/null || true`

## Step 6: Sync Dashboard (post-completion)

After the 6-step pipeline completes and the task is marked `"done"` in `claude-agents/tasks.json`:

1. Set `completedAt` to current ISO timestamp
2. Run: `python3 scripts/obsidian-sync.py push 2>/dev/null || true`

This ensures the Obsidian Task Dashboard reflects the completed status immediately.
