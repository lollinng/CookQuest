# Watch Inbox — Autonomous Task Pipeline

Sync the Obsidian vault, process inbox ideas into tasks, then auto-pick and implement. **No confirmation prompts — fully autonomous.**

## Step 1: Sync Vault

```bash
python3 scripts/obsidian-sync.py sync 2>/dev/null || true
```

Show: "Vault synced."

## Step 2: Read Inbox

Read `claude-agents/task-inbox.md`. Find content below the `---` separator.

Parse each line as an inbox item. Skip items that are already processed:
- Lines starting with `- [x]` → already processed, skip
- Lines with `~~strikethrough~~` → already processed, skip
- Empty lines or comment lines (`<!-- ... -->`) → skip

If no unprocessed items found, show "Inbox empty — nothing to process." and skip to Step 5.

## Step 3: Create Tasks from Inbox Items

Read `claude-agents/tasks.json` to find the highest existing task ID number.

For each unprocessed inbox item:

1. **Check open task limit**: Count tasks with status `"todo"` or `"in_progress"`. If >= 10, show "Open task limit reached (10). Deferring remaining inbox items." and stop processing more items.

2. **Act as PM**: Interpret the idea, analyze the codebase to understand scope, and create 1–3 tasks per inbox item depending on complexity.

3. **Allocate task IDs**: Sequential from highest existing + 1. Alternate even/odd so both agents get work.

4. **Task format** (append to tasks.json array):
```json
{
  "id": "task_NNN",
  "title": "Short descriptive title",
  "description": "Detailed description with acceptance criteria",
  "type": "feature",
  "priority": 3,
  "status": "todo",
  "assignedTo": null,
  "assignedAt": null,
  "completedAt": null,
  "dependencies": [],
  "files": ["list/of/files/to/touch.ts"],
  "createdAt": "ISO timestamp",
  "source": "inbox"
}
```

5. **Mark inbox item as processed** in `claude-agents/task-inbox.md`:
   - Change `- idea text` to `- [x] idea text (→ task_NNN, task_NNN)`

## Step 4: Push Updates

```bash
python3 scripts/obsidian-sync.py push 2>/dev/null || true
```

Show summary:
```
Inbox processed:
  Items: {N} processed, {M} deferred
  Tasks created: task_{X} through task_{Y}
  Open tasks: {count}/10
```

## Step 5: Auto-Pick Task

Immediately invoke `/pick-task` (no arguments needed — it auto-detects identity from roster).

This will assign the next available task and begin the 6-step implementation pipeline autonomously.

## Step 6: Polling Mode (Optional)

If `$ARGUMENTS` contains a number (e.g., `/watch-inbox 15`), treat it as a polling interval in minutes.

After completing one full cycle (Steps 1–5 + pipeline), show:
```
Cycle complete. Next check in {N} minutes.
```

Then wait the specified interval and repeat from Step 1.

If `$ARGUMENTS` contains "once" or no number is specified, run a single cycle and stop.
