# CookQuest

[![CI](https://github.com/lollinng/CookQuest/actions/workflows/ci.yml/badge.svg)](https://github.com/lollinng/CookQuest/actions/workflows/ci.yml)
[![Deploy](https://github.com/lollinng/CookQuest/actions/workflows/deploy.yml/badge.svg)](https://github.com/lollinng/CookQuest/actions/workflows/deploy.yml)

A gamified cooking skill learning app — **Strava + Duolingo for cooking**. Track progress across 5 skill trees, complete recipes, upload food photos, earn XP, and level up.

## Features

- **5 Skill Trees** — Basic Cooking, Heat Control, Flavor Building, Air Fryer, Indian Cuisine
- **Cook-to-Unlock Progression** — Complete recipes and post photos to unlock the next ones
- **XP, Levels & Badges** — Earn experience, maintain streaks, collect achievement badges
- **Photo Verification** — Computer vision validates food photos (color, texture, plating analysis)
- **Social Feed** — Follow other cooks, share completions, comment and like posts
- **Leaderboard** — Compete on recipes completed
- **5-Week Indian Cuisine Plan** — Structured curriculum with weekly goals
- **Guided Onboarding** — Mascot-led tutorial and skill assessment
- **PWA Support** — Installable on mobile as a native-like app
- **Admin Dashboard** — Photo moderation, appeal management, user stats
- **Waitlist with Email Verification** — Gmail SMTP signup flow with disposable email blocking

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 15, React 18, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query v5, Zustand |
| **Backend** | Node.js 20+, Express 4, PostgreSQL 16, Redis 7 |
| **Email** | Nodemailer + Gmail SMTP (waitlist verification) |
| **Storage** | Google Cloud Storage (production), local filesystem (dev) |
| **Infra** | Docker Compose, GitHub Actions CI/CD, Vercel (frontend), GCP Cloud Run (backend) |

## Quick Start

```bash
# 1. Copy env file and set secrets
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET (generate with: openssl rand -base64 64)

# 2. Start everything
docker compose up

# Frontend: http://localhost:3000
# API:      http://localhost:3003/api/v1
```

The database schema, migrations, and seed data are applied automatically on first boot.

**Seeded admin account**: `admin@cookquest.dev` / `Admin123!`

## Development (frontend hot reload)

```bash
# Start backend services only
docker compose up postgres redis cookquest-api

# In another terminal — run Next.js dev server
npm install
npm run dev
# Opens http://localhost:3000 with Turbopack
```

## Project Structure

```
app/                          Next.js 15 App Router (16 routes)
  ├── page.tsx                Dashboard — skills, daily quests, XP
  ├── skill/[skillId]/        Skill detail — learning path, cookbook mode
  ├── recipe/[recipeId]/      Full recipe — ingredients, instructions, photos
  ├── recipes/                Browse & filter all recipes
  ├── favorites/              Saved recipes
  ├── feed/                   Social activity feed
  ├── people/                 User search & discovery
  ├── profile/[userId]/       Public profiles with trophies
  ├── leaderboard/            Global rankings
  ├── notifications/          Follow/like/comment notifications
  ├── indian-cooking/         5-week structured curriculum
  ├── admin/                  Admin dashboard
  ├── onboarding/             Guided first-time flow
  ├── waitlist/               Email-verified waitlist signup
  └── waitlist/verify/        Email verification landing page

components/                   41 custom React components
  ├── auth/                   Login, register, user menu dialogs
  ├── onboarding/             Mascot, tutorial, skill assessment
  └── ui/                     52 shadcn/ui primitives

hooks/                        Custom React hooks
  ├── use-recipes.ts          Recipes, skills, tips, photos (TanStack Query)
  ├── use-social.ts           Feed, profiles, follows, posts
  ├── use-progression.ts      Recipe gating & XP tracking
  ├── use-core-loop.ts        Gamification state
  ├── use-admin.ts            Admin dashboard queries
  ├── use-appeals.ts          Photo verification appeals
  ├── use-onboarding.ts       Onboarding flow state
  ├── use-pwa-install.ts      PWA install prompt
  └── use-platform.ts         Platform detection

lib/
  ├── api/                    16 API client modules
  ├── stores/                 Zustand stores (recipes, onboarding)
  ├── types.ts                TypeScript interfaces
  ├── auth-context.tsx        Auth state provider
  ├── constants.ts            Shared constants
  └── validation.ts           Input validation

backend/node-services/api-server/
  └── src/
      ├── routes/             17 route modules (auth, recipes, social, waitlist...)
      ├── services/           8 services (database, email, photo-cv, redis, storage...)
      ├── middleware/          Auth, error handling, validation
      └── utils/              Email validation, response helpers, progression calc

backend/shared/               PostgreSQL schema & seed data
scripts/                      Deployment & backup scripts
```

## API Overview

**Public endpoints** (no auth):
- `POST /api/v1/auth/register` — User registration
- `POST /api/v1/auth/login` — Login (JWT + httpOnly cookie)
- `GET /api/v1/recipes` — Browse recipes (filters: skill, difficulty, search)
- `GET /api/v1/skills` — List all 5 skill trees
- `GET /api/v1/tips/daily` — Daily cooking tip
- `POST /api/v1/waitlist/signup` — Waitlist with email verification

**Protected endpoints** (auth required):
- `POST /api/v1/recipes/:id/photos` — Upload recipe photo (with CV verification)
- `GET /api/v1/progression/skills/:skillId` — Skill unlock progress
- `POST /api/v1/users/:id/follow` — Follow a user
- `GET /api/v1/feed` — Social feed from followed users
- `POST /api/v1/posts` — Create a social post
- `GET /api/v1/users/me/favorites` — Favorited recipes

**Admin endpoints** (admin only):
- `GET /api/v1/admin/verification-stats` — Photo verification analytics
- `PATCH /api/v1/admin/appeals/:id` — Rule on photo appeals

Full API docs: `GET /api/v1`

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
| `EMAIL_USER` | Gmail address for sending verification emails | — |
| `EMAIL_APP_PASSWORD` | Gmail App Password ([create one](https://myaccount.google.com/apppasswords)) | — |
| `APP_URL` | Frontend URL (used in email links) | `http://localhost:3000` |

## Docker Services

| Service | Port | Description |
|---|---|---|
| `cookquest-web` | 3000 | Next.js 15 frontend (standalone) |
| `cookquest-api` | 3003 | Express API server |
| `postgres` | 5432 | PostgreSQL 16 with auto-migrations |
| `redis` | — | Redis 7 (internal caching) |

Reset the database: `docker compose down -v && docker compose up`

## Available Scripts

```bash
# Frontend
npm run dev              # Next.js dev server with Turbopack
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript strict check

# Backend (from backend/node-services/api-server/)
npm run dev              # Express dev server with hot reload
npm run build            # TypeScript compilation
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed demo data
npm run db:reset         # Reset database
```

## Deployment

| Component | Platform | Config |
|-----------|----------|--------|
| Frontend | Vercel | Auto-deployed from `main` |
| Backend | GCP Cloud Run | `gcp/` config + GitHub Actions |
| Database | Cloud SQL PostgreSQL | Managed instance |
| Storage | Google Cloud Storage | User photo uploads |

## License

MIT
