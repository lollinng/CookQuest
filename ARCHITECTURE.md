# CookQuest Architecture

> Strava + Duolingo for cooking. Gamified skill trees, social feed, streaks, and a structured Indian cuisine curriculum.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema](#database-schema)
6. [Authentication & Security](#authentication--security)
7. [API Reference](#api-reference)
8. [Gamification System](#gamification-system)
9. [Infrastructure & Deployment](#infrastructure--deployment)
10. [Agent Pipeline](#agent-pipeline)
11. [Data Flow Examples](#data-flow-examples)
12. [Conventions & Patterns](#conventions--patterns)

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                       CLIENTS                           │
│  Browser (Next.js 15)  ·  Mobile (future)               │
└──────────────┬──────────────────────────────┬───────────┘
               │ HTTPS                        │ HTTPS
               ▼                              ▼
┌──────────────────────┐       ┌──────────────────────────┐
│   Vercel (Frontend)  │       │  GCP Cloud Run (Backend)  │
│   Next.js 15 SSR     │──────▶│  Express + Node.js 20     │
│   Port 3000          │ REST  │  Port 3003                │
└──────────────────────┘       └──────┬──────────┬─────────┘
                                      │          │
                               ┌──────▼──┐  ┌───▼────────┐
                               │ Postgres │  │   Redis 7   │
                               │   16     │  │  (cache)    │
                               └──────────┘  └────────────┘
```

**Production URLs:**
- Frontend: `https://cook-quest-six.vercel.app`
- Backend: `https://cookquest-api-254570106808.asia-south1.run.app`
- API base: `/api/v1`

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 15.1.3 |
| **Language** | TypeScript (strict) | 5.7 |
| **UI** | Tailwind CSS + shadcn/ui (30+ Radix primitives) | 4.1.12 |
| **Data Fetching** | TanStack Query | 5.62.7 |
| **Client State** | Zustand (persisted to localStorage) | 5.0.2 |
| **Icons** | Lucide React | 0.487 |
| **Charts** | Recharts | - |
| **Server** | Express.js | 4.x |
| **Database** | PostgreSQL | 16 |
| **Cache** | Redis (with in-memory fallback) | 7 |
| **Auth** | JWT (HS256) + httpOnly cookies + bcryptjs (12 rounds) | - |
| **File Storage** | GCS (prod) / local disk (dev) | - |
| **Infra** | Docker Compose, GCP Cloud Run, Vercel | - |

---

## Frontend Architecture

### Directory Structure

```
app/                                # Next.js 15 App Router
├── layout.tsx                      # Root: Providers → TopNav → ErrorBoundary
├── page.tsx                        # Dashboard (skills, recipes, daily quest)
├── middleware.ts                   # Auth redirects, security headers
├── api/health/                     # Liveness probe
├── skill/[skillId]/page.tsx        # Skill detail (learn / cookbook toggle)
├── recipe/[recipeId]/page.tsx      # Full recipe view
├── recipes/page.tsx                # Browse + filter all recipes
├── favorites/page.tsx              # User's saved recipes
├── indian-cooking/page.tsx         # 5-week Indian cuisine plan
├── feed/page.tsx                   # Social activity feed (world + following)
├── people/page.tsx                 # User search + leaderboard
├── profile/[userId]/page.tsx       # Public profiles
├── notifications/page.tsx          # Notification center
└── admin/page.tsx                  # Admin dashboard

components/
├── ui/                             # shadcn/ui primitives (button, card, dialog, etc.)
├── top-nav.tsx                     # Header navigation
├── skill-card.tsx                  # Skill progress card with unlock state
├── recipe-card.tsx                 # Recipe preview tile
├── learning-path.tsx               # Winding node-path visualization
├── photo-node.tsx                  # Cookbook node with photo upload
├── favorite-button.tsx             # Heart toggle (optimistic)
├── feed-post-card.tsx              # Social post rendering
├── post-comments.tsx               # Comment thread
├── daily-quest-card.tsx            # Daily challenge widget
├── cooking-tip.tsx                 # Chef Bot tip display
├── core-loop-hero-card.tsx         # Main dashboard hero
├── error-boundary.tsx              # Catch-all error fallback
└── ...                             # ~20 total components

lib/
├── types.ts                        # 46+ TypeScript interfaces
├── api/
│   ├── client.ts                   # Core fetch wrapper (auth, token refresh, envelope unwrap)
│   ├── auth.ts                     # login, register, logout, getCurrentUser
│   ├── recipes.ts                  # getRecipes, getRecipeById, getRecipesBySkill
│   ├── skills.ts                   # getSkills, getSkillById
│   ├── progress.ts                 # completeRecipe, uncompleteRecipe
│   ├── tips.ts                     # getRandomTip, getDailyTip
│   ├── favorites.ts                # addFavorite, removeFavorite
│   ├── social.ts                   # follow, feed, posts, comments, notifications
│   └── admin.ts                    # Admin CRUD operations
├── stores/
│   └── recipe-store.ts             # Zustand: completedRecipes, streaks, SKILL_RECIPES map
├── auth-context.tsx                # React Context: user, isAuthenticated, login/logout
├── validation.ts                   # Input sanitization, recipe ID regex, rate limiter
├── indian-plan-data.ts             # 5-week curriculum (35 days, 35 recipes)
└── utils.ts                        # General utilities

hooks/
├── use-recipes.ts                  # TanStack Query hooks: recipes, skills, favorites, photos
├── use-social.ts                   # Follow, feed, posts, comments, notifications
├── use-core-loop.ts                # Gamification state (XP, level, streak)
└── use-admin.ts                    # Admin operations
```

### Data Flow

```
User Action → Component → Hook (TanStack mutation)
    → API Module (lib/api/*) → apiClient (fetch + auth header)
    → Backend (Express) → Response { success, data }
    → apiClient unwraps envelope → Hook invalidates cache
    → Component re-renders
```

### State Management

| Concern | Tool | Persistence |
|---------|------|-------------|
| Server data (recipes, skills, feed) | TanStack Query | In-memory cache (stale/gc times) |
| Local progress (completions, streaks) | Zustand | localStorage (`completed-recipes`) |
| Auth state (user, token) | React Context | localStorage + httpOnly cookie |
| UI state (modals, filters) | React useState | None |

### Key Query Cache Settings

| Hook | Stale Time | GC Time |
|------|-----------|---------|
| `useRecipes()` | 5 min | 10 min |
| `useRecipeDetail(id)` | 10 min | 30 min |
| `useSkills()` | 10 min | 30 min |
| `useFavoriteRecipes()` | 2 min | 10 min |
| `useUserPhotos()` | 2 min | 10 min |

---

## Backend Architecture

### Directory Structure

```
backend/node-services/api-server/
├── src/
│   ├── index.ts                    # Server entry, middleware stack, graceful shutdown
│   ├── routes/
│   │   ├── index.ts                # Route registration + /api/docs
│   │   ├── auth.ts                 # Register, login, logout, refresh, /me
│   │   ├── recipes.ts              # CRUD + filtering + photos
│   │   ├── skills.ts               # Skill listing + detail
│   │   ├── progress.ts             # Recipe completion tracking
│   │   ├── tips.ts                 # Daily tips (cached 1hr)
│   │   ├── favorites.ts            # Favorite toggle
│   │   ├── social.ts               # Follow, feed, posts, comments, likes, notifications
│   │   ├── photos.ts               # Upload + serving
│   │   ├── ingredients.ts          # Normalized ingredient queries
│   │   └── admin.ts                # Admin-only endpoints
│   ├── middleware/
│   │   ├── auth.ts                 # authMiddleware, optionalAuth, allowedMiddleware, adminMiddleware
│   │   ├── error-handler.ts        # Global error handler + asyncHandler
│   │   └── validation.ts           # express-validator wrapper
│   └── services/
│       ├── database.ts             # pg.Pool, all queries, migration runner
│       ├── redis.ts                # Redis client + in-memory fallback
│       ├── storage.ts              # GCS (prod) / local disk (dev) abstraction
│       └── logger.ts               # Pino structured logging
├── dist/                           # Compiled JS output
└── uploads/                        # Local file storage (dev only)

backend/shared/
├── schema-pg.sql                   # Full PostgreSQL schema
└── seed-data-pg.sql                # Initial recipes, skills, tips
```

### Middleware Stack (order matters)

```
Request
  │
  ├─ 1. Request counter (metrics)
  ├─ 2. Static file server (/uploads)
  ├─ 3. Helmet (security headers)
  ├─ 4. CORS (dynamic origin allowlist)
  ├─ 5. Rate limiter (500/15min prod, 2000 dev)
  ├─ 6. CSRF check (Origin header on POST/PUT/DELETE)
  ├─ 7. Body parser (JSON + URL-encoded, 1MB limit)
  ├─ 8. Pino request logger
  ├─ 9. Route handlers
  ├─ 10. Global error handler
  └─ 11. 404 fallback
```

### Services

**DatabaseService** — Static class wrapping `pg.Pool`
- All queries parameterized (`$1, $2, $N`)
- Migration runner with `_migrations` tracking table
- Automatic schema + seed + incremental migrations on startup
- Session cleanup cron (every hour)

**RedisService** — Optional caching layer
- Falls back to in-memory `Map` if `REDIS_URL` not set
- TTL-based caching (`setEx`)
- Pattern-based cache invalidation

**StorageService** — File upload abstraction
- **Production**: `@google-cloud/storage` (GCS bucket)
- **Development**: `fs.writeFile` to `/uploads`
- 5MB file size limit, image MIME type whitelist

---

## Database Schema

### Entity Relationship

```
users ──┬── user_sessions
        ├── user_recipe_progress ──── recipes ──── skills
        ├── user_recipe_photos  ──── recipes
        ├── user_favorites ───────── recipes
        ├── user_follows (self-join)
        ├── user_posts ──┬── post_comments
        │                ├── post_likes
        │                └── comment_likes
        └── notifications
```

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Accounts | uuid, email, username, password_hash, is_allowed, is_admin |
| `user_sessions` | Active sessions | session_token, user_id, expires_at, ip_address |
| `skills` | 5 cooking skills | id (text PK), name, required_skill_id, required_recipes_completed |
| `recipes` | All recipes (~60+) | id (text PK), skill_id (FK), difficulty, ingredients (JSONB), instructions (JSONB) |
| `user_recipe_progress` | Completion tracking | user_id, recipe_id, status, completed_at |
| `user_recipe_photos` | Cookbook photos | user_id, recipe_id, photo_url, storage_key |
| `user_favorites` | Saved recipes | user_id, recipe_id |
| `user_follows` | Social graph | follower_id, following_id |
| `user_posts` | Activity feed | user_id, post_type, recipe_id, likes_count, comments_count |
| `post_comments` | Comments | post_id, user_id, content (500 chars) |
| `post_likes` / `comment_likes` | Engagement | post_id/comment_id, user_id |
| `notifications` | User notifications | user_id, actor_id, type, is_read |
| `ingredients` | Normalized ingredient list | name, category |
| `recipe_ingredients` | Recipe-ingredient join | recipe_id, ingredient_id, amount, unit |
| `_migrations` | Migration tracking | name (unique), applied_at |

### Migrations

Managed in `database.ts` `initialize()`, tracked via `_migrations` table:

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema` | Core tables from `schema-pg.sql` |
| `002_seed_data` | Recipes, skills, tips from `seed-data-pg.sql` |
| `003_user_recipe_photos` | Photo upload table |
| `004_fix_recipe_photos` | Schema corrections |
| `005` – `016` | Social features, follows, posts, comments, likes, notifications |
| `017_indian_plan_week1_2` | Seed 12 Indian cuisine plan recipes (Weeks 1-2) |
| `018_indian_plan_week3` | Seed 7 Week 3 recipes |
| `019_indian_plan_week4` | Seed 7 Week 4 recipes |
| `020_indian_plan_week5` | Seed 7 Week 5 recipes |

All migrations are idempotent (use `ON CONFLICT DO NOTHING`).

---

## Authentication & Security

### Auth Flow

```
1. Login/Register
   POST /auth/login → validates credentials → returns JWT + httpOnly cookie

2. Persistent Session
   Page load → AuthProvider → GET /auth/me (cookie auto-included)
   Falls back to localStorage cache for instant UI

3. Protected Requests
   apiClient reads token from localStorage → Authorization: Bearer <token>
   Backend validates JWT (HS256, issuer: cookquest-api, audience: cookquest-web)
   Backend checks session_token in user_sessions table

4. Token Refresh
   On 401 → apiClient calls POST /auth/refresh (de-duplicated)
   Success → retry original request
   Failure → clear token, redirect to login
```

### Security Measures

| Layer | Measure |
|-------|---------|
| **Passwords** | bcryptjs, 12 salt rounds, min 8 chars + uppercase + lowercase + number |
| **JWT** | HS256, 7-day expiry, issuer/audience validation, 64+ char secret |
| **Sessions** | httpOnly cookies, session_token in DB, IP/user-agent logged |
| **CORS** | Dynamic origin allowlist from `ALLOWED_ORIGINS` env |
| **CSRF** | Origin/Referer header validation on state-changing requests |
| **Rate Limiting** | 500 req/15min (general), 15 req/15min (auth endpoints) |
| **Headers** | Helmet: CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff |
| **Input** | express-validator on all endpoints, `sanitizeInput()` on frontend |
| **Files** | 5MB limit, image MIME whitelist, GCS signed URLs in production |

---

## API Reference

### Auth (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | - | Create account |
| POST | `/login` | - | Email + password login |
| POST | `/logout` | Yes | Invalidate session |
| POST | `/refresh` | Cookie | Refresh JWT |
| GET | `/me` | Yes | Current user profile |

### Recipes (`/api/v1/recipes`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/recipes` | Optional | List with filters (skill, difficulty, search, pagination) |
| GET | `/recipes/:id` | Optional | Detail + user progress |
| POST | `/recipes/:id/photos` | Yes + Allowed | Upload recipe photo |
| POST | `/recipes/:id/favorite` | Yes | Add to favorites |
| DELETE | `/recipes/:id/favorite` | Yes | Remove from favorites |

### Skills (`/api/v1/skills`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/skills` | - | All 5 skills |
| GET | `/skills/:id` | - | Skill detail + recipes |

### Progress (`/api/v1/progress`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/progress/recipes/:recipeId` | Yes + Allowed | Mark complete/incomplete |
| GET | `/progress` | Yes | User summary (level, XP, skills) |

### Social (`/api/v1`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/users/:id/follow` | Yes | Follow user |
| DELETE | `/users/:id/follow` | Yes | Unfollow user |
| GET | `/users/:id` | Optional | Public profile |
| GET | `/users/search?q=` | Optional | Search users |
| GET | `/feed` | Yes | Following feed |
| GET | `/feed/world` | Optional | Global feed |
| POST | `/posts` | Yes | Create post |
| POST | `/posts/:id/comments` | Yes | Add comment |
| POST | `/posts/:id/like` | Yes | Like post |
| GET | `/notifications` | Yes | User notifications |
| GET | `/leaderboard/world` | - | Global leaderboard |

### Admin (`/api/v1/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/users` | Admin | List all users |
| PATCH | `/admin/users/:id` | Admin | Update user flags |
| POST | `/admin/recipes` | Admin | Create recipe |
| PUT | `/admin/recipes/:id` | Admin | Update recipe |
| DELETE | `/admin/recipes/:id` | Admin | Delete recipe |

### Health & Ops

| Endpoint | Purpose |
|----------|---------|
| `/health` | Liveness (always 200) |
| `/ready` | Readiness (db + redis check) |
| `/metrics` | Uptime, requests, errors, memory |

---

## Gamification System

### 5 Cooking Skills

```
basic-cooking (3 recipes)         ← Entry point, no prerequisites
    │
    ├── heat-control (5 recipes)       ← Requires basic-cooking ≥ 3
    ├── flavor-building (7 recipes)    ← Requires basic-cooking ≥ 3
    ├── air-fryer (6 recipes)          ← Requires basic-cooking ≥ 3
    └── indian-cuisine (40 recipes)    ← Requires basic-cooking ≥ 3
```

### XP & Leveling

- **100 XP** per standard recipe
- **150 XP** for weekly thali (assembly) recipes
- **200 XP** for the grand finale thali
- **Level** = `floor(totalXP / 1000) + 1`

### Streaks

- Counted as consecutive calendar days with at least one recipe completed
- Tracked via `completionDates` in Zustand store
- Displayed on dashboard and profile

### Indian Cuisine Curriculum (5 Weeks, 35 Days)

| Week | Focus | Days | Recipes |
|------|-------|------|---------|
| 1 | Absolute Basics | 1-7 | Knife skills, boiling, rice, dal, aloo sabzi |
| 2 | Core Skills | 8-14 | Roti, masala base, egg bhurji, upma, chana masala |
| 3 | Foundation & Flavours | 15-21 | Paneer, pulao, bhindi, masoor dal |
| 4 | Deeper Techniques | 22-28 | Paratha, tikka, rajma, kadhi, khichdi |
| 5 | Culmination & Feast | 29-35 | Puri, biryani, paneer butter masala, grand thali |

Each week ends with an Assembly Day (thali) that combines the week's dishes.

### SKILL_RECIPES Registry

Located in `lib/stores/recipe-store.ts`. Maps each `SkillType` to its recipe IDs:

| Skill | Recipe Count |
|-------|-------------|
| basic-cooking | 3 |
| heat-control | 5 |
| flavor-building | 7 |
| air-fryer | 6 |
| indian-cuisine | 40 (7 original + 12 weeks 1-2 + 21 weeks 3-5) |

---

## Infrastructure & Deployment

### Docker Compose (Local Development)

```yaml
services:
  postgres:     # Port 5432, pgdata volume
  redis:        # Port 6379, maxmemory 128mb
  cookquest-api:  # Port 3003, mounts ./backend/shared:/shared
  cookquest-web:  # Port 3000, depends on api
```

```bash
# Start everything
docker compose up

# Reset database (drops volumes)
docker compose down -v && docker compose up
```

### Production Docker Compose

Adds `nginx` (reverse proxy + TLS), `certbot` (Let's Encrypt), and `backup` (daily pg_dump).

### Deployment Targets

| Component | Target | Trigger |
|-----------|--------|---------|
| Frontend | Vercel | Auto-deploy on push to `main` |
| Backend | GCP Cloud Run (`asia-south1`) | Manual: `gcloud run deploy` |
| Database | Cloud SQL (PostgreSQL 16) | Managed by GCP |
| Cache | Redis (in-memory fallback if unavailable) | Managed or self-hosted |

### Deploy Commands

```bash
# Frontend (auto on git push, or manual)
vercel --prod

# Backend
docker buildx build --platform linux/amd64 \
  -f gcp/Dockerfile.api \
  -t asia-south1-docker.pkg.dev/cookquest-prod/cookquest/api:latest \
  --push .

gcloud run deploy cookquest-api \
  --image=asia-south1-docker.pkg.dev/cookquest-prod/cookquest/api:latest \
  --region=asia-south1 --project=cookquest-prod
```

### Monitoring

| Endpoint | Purpose |
|----------|---------|
| `/health` | Liveness probe (container alive) |
| `/ready` | Readiness probe (db: ok, redis: ok) |
| `/metrics` | Uptime, request count, error count, memory |

---

## Agent Pipeline

CookQuest uses a multi-agent development pipeline managed in `claude-agents/`.

### 6-Step Feature Pipeline

```
1. Product Manager    → Requirements + acceptance criteria
2. Software Architect → System design + file list
3. Developer          → Implementation
4. Code Reviewer      → Quality gate (threshold: 8.0/10)
5. DevOps Engineer    → Build verification
6. Deploy             → Push to production
```

### Task Queue

- **Active tasks**: `claude-agents/tasks.json`
- **Archive**: `claude-agents/tasks-archive.json`
- **Assignment**: Even-numbered tasks → `implementer-agent-2`, Odd → `implementer-agent-main`
- **Schema**: `{ id, title, status, priority, type, description, files, assignedTo, ... }`

### On-Demand Agents

| Agent | Trigger | Purpose |
|-------|---------|---------|
| UI/UX Auditor | `/ui-audit` | Screenshot → review → create improvement tasks |
| Bug Triage | `/report-bug` | Investigate → pinpoint source → create ticket |

---

## Data Flow Examples

### Recipe Completion (end-to-end)

```
User clicks "Mark Complete"
  → useCompleteRecipe() mutation fires
  → lib/api/progress.ts → apiClient POST /progress/recipes/:id
  → apiClient adds Authorization header
  → Express: authMiddleware → allowedMiddleware → route handler
  → DatabaseService.completeRecipe(userId, recipeId)
  → INSERT INTO user_recipe_progress ... ON CONFLICT UPDATE
  → Response: { success: true, data: { completed: true } }
  → apiClient unwraps envelope → returns data
  → Hook invalidates ['recipes'] + ['progress'] query keys
  → Component re-renders with updated progress
  → Toast: "Recipe completed! +100 XP"
```

### Social Feed

```
User opens /feed
  → useQuery(['feed']) → GET /feed?limit=30
  → Backend: JOIN user_posts + users WHERE user_id IN (following)
  → Returns posts with author profile, like/comment counts
  → Renders FeedPostCard for each post
  → User likes a post → POST /posts/:id/like
  → Optimistic update in React Query cache
  → Backend: INSERT post_likes + UPDATE posts SET likes_count++
  → Creates notification for post author
```

---

## Conventions & Patterns

### Code Style

- 2-space indentation, single quotes, semicolons
- PascalCase components, kebab-case files
- `@/*` path aliases for imports
- `'use client'` directive on all components with hooks/state/events

### Component Template

```tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';

interface Props { id: string; }

export function MyComponent({ id }: Props) {
  const { data, isLoading } = useMyQuery(id);
  if (isLoading) return <Skeleton />;
  return <Card><CardContent>{data.name}</CardContent></Card>;
}
```

### Hook Template

```ts
export const myKeys = {
  all: ['my-resource'] as const,
  detail: (id: string) => [...myKeys.all, id] as const,
};

export function useMyResource(id: string) {
  return useQuery({
    queryKey: myKeys.detail(id),
    queryFn: () => getMyResource(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
```

### Backend Route Template

```ts
router.post('/endpoint',
  authMiddleware,
  validateRequest([body('field').isString()]),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await DatabaseService.doThing(req.body.field);
    res.json({ success: true, data: result });
  })
);
```

### Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| SQL placeholders | PostgreSQL: `$1, $2, $N` — never `?` |
| Hydration mismatch | Check `useStoreHydrated()` before reading Zustand |
| Missing `'use client'` | Required on all components with hooks/state |
| `cacheTime` | Deprecated in TanStack Query v5 — use `gcTime` |
| API envelope | `apiClient` auto-unwraps `{ success, data }` → returns `T` |
| Session column | `user_sessions.session_token` — not `refresh_token` |
| Docker DB reset | `docker compose down -v && docker compose up` |

---

*Last updated: 2026-03-09 · Generated from codebase analysis*
