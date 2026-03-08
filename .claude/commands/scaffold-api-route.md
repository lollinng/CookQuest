# Scaffold API Route

Generate a full-stack API endpoint: backend route + frontend API module + TanStack Query hook.

## Arguments

`$ARGUMENTS` should contain the route name (e.g., "achievements" or "user-stats").
If empty, ask: "What's the route name? (kebab-case, e.g., achievements)"

## Step 1: Backend Route

Create `backend/node-services/api-server/src/routes/{name}.ts`:

```ts
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { DatabaseService } from '../services/database';
import { authMiddleware, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

// GET /api/v1/{name}
router.get('/',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    // IMPORTANT: Use PostgreSQL $1, $2, $N parameterized queries — NEVER use ?
    // Example: DatabaseService.query('SELECT * FROM table WHERE id = $1', [id])

    const response = {
      success: true,
      data: {
        // Always wrap response in { success, data } envelope
      }
    };

    res.json(response);
  })
);

export default router;
```

### Backend conventions:
- Response envelope: `{ success: true, data: {} }` for success, `{ success: false, error: { message } }` for errors
- PostgreSQL parameterized queries: `$1, $2, $N` — **NEVER** use `?` placeholders
- Use `asyncHandler` wrapper on all route handlers
- Use `validateRequest([...validators])` middleware for input validation
- Use `authMiddleware` for protected routes, `optionalAuth` for public-with-optional-auth
- `AuthenticatedRequest` type gives `req.user` with `{ id, email, role }`
- `user_sessions` table uses `session_token` column (not `refresh_token`)

## Step 2: Register Route

Add to `backend/node-services/api-server/src/routes/index.ts`:
```ts
import {name}Router from './{name}';
router.use('/{name}', {name}Router);
```

## Step 3: Frontend API Module

Create `lib/api/{name}.ts`:

```ts
import { apiClient } from './client';

// apiClient automatically unwraps { success, data } envelope
// It returns T directly, NOT { success: true, data: T }

export async function get{PascalName}(): Promise<{ReturnType}> {
  return apiClient<{ReturnType}>('/{name}');
}
```

## Step 4: TanStack Query Hook

Add to `hooks/use-recipes.ts` (or create `hooks/use-{name}.ts` if unrelated to recipes):

```ts
export const {name}Keys = {
  all: ['{name}'] as const,
  detail: (id: string) => [...{name}Keys.all, id] as const,
};

export function use{PascalName}() {
  return useQuery({
    queryKey: {name}Keys.all,
    queryFn: () => get{PascalName}(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
```

## Step 5: E2E Test

Create `e2e/{name}-api.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('{Name} API', () => {
  test('GET /api/v1/{name} returns data', async ({ request }) => {
    const response = await request.get('http://localhost:3003/api/v1/{name}');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
  });
});
```

## Step 6: Summary

List all created/modified files and integration points.
