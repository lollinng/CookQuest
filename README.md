# CookQuest

[![CI](https://github.com/lollinng/CookQuest/actions/workflows/ci.yml/badge.svg)](https://github.com/lollinng/CookQuest/actions/workflows/ci.yml)
[![Deploy](https://github.com/lollinng/CookQuest/actions/workflows/deploy.yml/badge.svg)](https://github.com/lollinng/CookQuest/actions/workflows/deploy.yml)

A gamified cooking skill learning app — Strava + Duolingo for cooking. Track progress across 5 skill trees, complete recipes, earn XP, and level up.

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query, Zustand
- **Backend**: Node.js + Express, PostgreSQL 16, Redis 7
- **Testing**: Playwright (E2E)
- **Infrastructure**: Docker Compose (4 services: postgres, redis, cookquest-api, cookquest-web)

## Quick Start

```bash
# 1. Copy env file and set JWT_SECRET
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET (generate with: openssl rand -base64 64)

# 2. Start everything
docker compose up

# Frontend: http://localhost:3000
# API:      http://localhost:3003/api/v1
```

The database schema and seed data are applied automatically on first boot.

**Seeded admin account**: `admin@cookquest.dev` / `Admin123!`

## Development (frontend only)

If you want to iterate on the frontend with hot reload while the backend runs in Docker:

```bash
# Start backend services only
docker compose up postgres redis cookquest-api

# In another terminal — run Next.js dev server
npm install
npm run dev
# Opens http://localhost:3000 with Turbopack
```

## Available Scripts

```bash
npm run dev              # Next.js dev server with Turbopack
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm run type-check       # TypeScript type checking

# E2E tests (requires app running)
npm run test:e2e         # Run Playwright tests
npm run test:e2e:headed  # Run with browser visible
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:debug   # Debug mode
npm run playwright:install  # Install browser binaries
```

## Project Structure

```
app/                  Next.js pages and layouts
components/           React components (recipe-card, skill-card, cooking-tip, auth/)
components/ui/        shadcn/ui primitives
lib/                  Utilities, types, API clients, stores
lib/api/              API modules (recipes, skills, tips, auth, progress)
lib/stores/           Zustand stores
hooks/                Custom React hooks (use-recipes.ts)
backend/              Node.js API server + shared SQL
  node-services/      Express API server source
  shared/             schema-pg.sql, seed-data-pg.sql
e2e/                  Playwright E2E tests + screenshots
claude-agents/        Multi-agent pipeline system (task queue, configs)
```

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Description | Default |
|---|---|---|
| `JWT_SECRET` | **Required** — signing key for auth tokens | — |
| `POSTGRES_USER` | PostgreSQL username | `cookquest` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `cookquest` |
| `POSTGRES_DB` | Database name | `cookquest` |
| `REDIS_PASSWORD` | Redis password | `cookquest_redis` |
| `NEXT_PUBLIC_API_URL` | API URL for frontend | `http://localhost:3003/api/v1` |

## Docker Services

| Service | Port | Description |
|---|---|---|
| `cookquest-web` | 3000 | Next.js frontend |
| `cookquest-api` | 3003 | Express API server |
| `postgres` | 5432 | PostgreSQL 16 |
| `redis` | — | Redis 7 (internal only) |

Reset the database: `docker compose down -v && docker compose up`

## Skills

The app has 5 cooking skill trees: `basic-cooking`, `heat-control`, `flavor-building`, `air-fryer`, `indian-cuisine`.

## License

MIT
