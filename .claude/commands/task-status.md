# Task Queue Status

Show the current state of the CookQuest task queue.

## Instructions

Read `claude-agents/tasks.json` and produce the following report.

### Summary Table

```
Queue Summary
─────────────────────
Todo:        X tasks
In Progress: X tasks
Done:        X tasks
Total:       X tasks
```

### Non-Done Tasks (sorted by priority)

Show a table of all tasks that are NOT `"done"`:

| ID | Title | Priority | Status | Assignee | Dependencies |
|----|-------|----------|--------|----------|--------------|

For each task:
- Flag if `status` is `"in_progress"` and `assignedAt` is more than 24 hours ago — mark as **STALE**
- Flag if dependencies exist that aren't `"done"` — mark as **BLOCKED**

### Single Task Detail

If `$ARGUMENTS` contains a task ID (e.g., "task_052"), show that task's full details:
- All fields from the JSON
- Full description
- Files to modify
- Dependencies and their statuses
- Assignment history

### Agent Workload

Show how many tasks each agent currently has `in_progress`:
```
Agent Workload
──────────────────────────
implementer-agent-main: X in_progress
implementer-agent-2:    X in_progress
unassigned todo:        X
```
