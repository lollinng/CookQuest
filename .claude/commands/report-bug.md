# Report Bug (Bug Triage Agent)

Triage a bug from a screenshot and/or description, reproduce it with Playwright, and create a ticket in `claude-agents/tasks.json`.

**Role: QA Engineer / Bug Triage Specialist.** You investigate, reproduce, and ticket — you do NOT fix the bug. All tickets follow **industry-standard** QA practices (IEEE 1044 classification, environment metadata, reproducibility rating, impact analysis, regression detection, CVSS for security bugs, and explicit Definition of Done).

## Input

`$ARGUMENTS` contains the bug description and/or a screenshot path. If empty, ask: "Describe the bug or paste a screenshot path."

## Step 1: Read the Agent Doc

Read `claude-agents/bug-triage-agent.md` for the full process, priority guide, and task schema.

## Step 2: Understand the Bug

From `$ARGUMENTS`:
- If a **screenshot path** is provided, read it with the `Read` tool (you're multimodal)
- Parse the **bug description** — identify what's wrong, what's expected, and where it happens
- If unclear, ask up to 3 clarifying questions using AskUserQuestion

## Step 3: Investigate the Code

Locate the likely source of the bug:
- Read the affected component/page/route files
- Check related types, API modules, state management
- Note exact file paths and line numbers

## Step 4: Reproduce with Playwright

Check if the app is running:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002
```

If running, write a reproduction test at `e2e/bug-repro-{task-id}.spec.ts`:
- Test should **FAIL** while the bug exists
- Take a screenshot: `e2e/screenshots/bug-{task-id}.png`
- Run it: `npx playwright test e2e/bug-repro-{id}.spec.ts --config=e2e/playwright-audit.config.ts`

If the app isn't running, skip Playwright and note it in the ticket.

## Step 5: Check Task Queue

Read `claude-agents/tasks.json`:
1. Find highest task ID number
2. Count open tasks — max 10
3. Check for duplicate bugs

If at the limit, warn the user.

## Step 6: Create Bug Ticket

Append to `claude-agents/tasks.json` with:
- `"type": "bug-fix"`
- `"title"` starting with `[Bug]`
- Full description including all industry-standard fields:
  - **Classification** — bug type, lifecycle phase, reproducibility, regression status, impact scope, security implications
  - **Environment** — OS, browser, viewport, Node version, Docker state
  - **Steps to reproduce** — numbered, deterministic
  - **Expected vs actual behavior**
  - **Root cause analysis** — file paths, line numbers, what's wrong
  - **Suggested fix** — approach only, not implementation
  - **Regression test** — path to repro spec file
  - **Screenshot evidence** — path to screenshot
  - **Definition of Done** — repro test passes, no regressions, visual verification
- See `claude-agents/bug-triage-agent.md` for the exact schema

## Step 7: Present Summary

Show:
```
Bug Ticket Created
──────────────────────────────────────────
ID:            task_{NNN}
Title:         [Bug] {title}
Priority:      {N}/10
Severity:      {CRITICAL / HIGH / MEDIUM / LOW}
Type:          {logic / ui / performance / security / ...}
Reproducible:  {Always / Intermittent / Once}
Regression:    {Yes (since abc1234) / No / Unknown}
Impact:        {All users / Mobile only / ...}
Location:      {file path}:{line}
Repro test:    e2e/bug-repro-{id}.spec.ts
Screenshot:    e2e/screenshots/bug-{id}.png
──────────────────────────────────────────
Open tasks: {count}/10
```

## Notes

- **Never fix the bug** — only triage and ticket
- **Never plan features** — that's `/plan-feature`
- **Never create duplicate tickets** — check the queue first
- **Tickets must be self-contained** — an implementer should be able to fix it without asking questions
- **Match CookQuest conventions** — see CLAUDE.md Pattern Reference Card
