# Pick Next Task

Read the task queue and assign yourself the next available task.

## Step 1: Read Queue

Read `claude-agents/tasks.json`. Filter to tasks where:
- `status` is `"todo"`
- `assignedTo` is null or empty string

## Step 2: Apply Even/Odd Rule

If `$ARGUMENTS` contains "main" or "odd", filter to odd-numbered task IDs (task_001, task_003, task_005, ...).
If `$ARGUMENTS` contains "2" or "even", filter to even-numbered task IDs (task_002, task_004, task_006, ...).
If `$ARGUMENTS` is empty, ask: "Which agent are you? (main/odd or 2/even)"

The numeric suffix determines even/odd: `task_052` → 52 → even → agent 2.

## Step 3: Select Task

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

Ask: "Assign this task to myself and begin? (y/n)"

## Step 4: Assign

If confirmed, update `claude-agents/tasks.json`:
```json
{
  "assignedTo": "{your-agent-name}",
  "assignedAt": "{ISO timestamp}",
  "status": "in_progress"
}
```

Then begin the 6-step pipeline from CLAUDE.md.
