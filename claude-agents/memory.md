# Agent System Memory

This file tracks learnings and insights from completed tasks to improve future performance.

## Agent Conventions
- **Even/odd task split**: Even-numbered tasks → `implementer-agent-2`, odd-numbered → `implementer-agent-main`
- **Self-start**: New sessions should read `tasks.json`, pick an available task, assign themselves, and begin the 6-step pipeline without waiting for user prompting
- **Task lifecycle**: `todo` → `in_progress` (set `assignedTo`, `assignedAt`) → `done` (set `completedAt`)

## Testing
- Playwright E2E only — no unit test framework installed
- Tests live in `e2e/`, screenshots in `e2e/screenshots/`
- Run: `npm run test:e2e`

## Infrastructure
- Docker Compose: 4 services (postgres, redis, cookquest-api, cookquest-web)
- DB reset: `docker compose down -v && docker compose up`
- Schema/seed applied automatically on first boot via migration tracking (`_migrations` table)

## Completed Work
- 2026-02-24: Queue-based agent system implemented, task management and assignment active
