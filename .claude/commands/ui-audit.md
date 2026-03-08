# UI/UX Audit

Run the CookQuest UI/UX auditor workflow: screenshot, review, create improvement tasks.

**Brand identity: Strava + Duolingo for cooking.** Never kill this vibe.

## Step 1: Pre-flight

Check frontend is running on ports 3000-3002:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002
```

If not running, tell the user to start it.

## Step 2: Read Auditor Guide

Read `claude-agents/ui-ux-auditor-agent.md` for the full process, checklists, and quality bar. Follow it exactly.

## Step 3: Take Screenshots

Run the Playwright audit suite:
```bash
npx playwright test e2e/ui-audit.spec.ts --config=e2e/playwright-audit.config.ts
```

If the audit spec doesn't exist, take screenshots manually:
```bash
npx playwright test --project=chromium --headed=false
```

Screenshots land in `e2e/screenshots/`.

## Step 4: Visual Review

Read each screenshot visually (Claude is multimodal). Evaluate against:

- **Layout**: spacing, alignment, visual hierarchy, responsive behavior
- **Typography**: font sizes, weights, contrast, readability
- **Colors**: brand consistency (amber/orange primary, emerald success, slate text)
- **Components**: shadcn/ui usage, consistent styling, proper states
- **Interactions**: hover/focus/active states, loading states, error states
- **Accessibility**: contrast ratios, focus indicators, semantic markup
- **Mobile**: 390px viewport looks good, touch targets >= 44px

## Step 5: Check Task Queue

Read `claude-agents/tasks.json`. Count tasks with status `"todo"` or `"in_progress"`.
**Max 10 open tasks** at any time. If at limit, do not create more — prioritize existing ones.

## Step 6: Create Improvement Tasks

For each issue found, create a task in `claude-agents/tasks.json` with:
- `id`: next sequential task ID
- `title`: `[UI] {descriptive title}`
- `status`: `"todo"`
- `priority`: 1-10 (1 = critical visual bug, 10 = nice-to-have polish)
- `type`: `"ui-fix"`
- `description`: What's wrong, what it should look like, specific CSS/component changes
- `files`: Which files to modify

## Step 7: Verify Completed Fixes

If `$ARGUMENTS` contains "verify", re-screenshot and check that previously completed UI tasks actually look correct. Flag any regressions.
