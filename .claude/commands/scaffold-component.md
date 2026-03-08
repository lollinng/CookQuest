# Scaffold CookQuest Component

Generate a new React component following CookQuest's exact patterns and conventions.

## Arguments

`$ARGUMENTS` should contain the component name in PascalCase (e.g., "DailyQuestCard").
If empty, ask: "What should the component be called? (PascalCase, e.g., DailyQuestCard)"

## Step 1: Create Component File

Create `components/{kebab-case-name}.tsx` using this template:

```tsx
'use client';

import { /* relevant shadcn imports */ } from '@/components/ui/{component}';

interface {ComponentName}Props {
  // Define props based on the component's purpose
}

export function {ComponentName}({ ...props }: {ComponentName}Props) {
  return (
    <div>
      {/* Implementation */}
    </div>
  );
}
```

### Conventions to follow:
- `'use client'` directive at top (required for any component using hooks, state, or event handlers)
- Named export (not default)
- Props interface defined in same file, named `{ComponentName}Props`
- Use shadcn/ui components from `components/ui/` — available: `Card`, `Button`, `Badge`, `Progress`, `Dialog`, `Tabs`, `Tooltip`, `Avatar`, `Separator`
- Tailwind CSS classes only (no CSS modules, no styled-components)
- 2-space indentation, single quotes, semicolons
- Brand colors: amber/orange for primary actions, emerald/green for success/completion, slate for text

### If component fetches data:
- Create a TanStack Query hook in `hooks/use-recipes.ts` (or a new hooks file if unrelated to recipes)
- Follow the query key factory pattern:
```tsx
export const {name}Keys = {
  all: ['{name}'] as const,
  detail: (id: string) => [...{name}Keys.all, id] as const,
};
```
- Use `staleTime` and `gcTime` (never `cacheTime`)
- Use `enabled` flag for conditional queries

### If component needs client state:
- Add to existing Zustand store in `lib/stores/recipe-store.ts` OR create a new store in `lib/stores/`
- Always check `useStoreHydrated()` before reading store values to avoid hydration mismatch

## Step 2: Create E2E Test

Create `e2e/{kebab-case-name}.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('{ComponentName}', () => {
  test('renders correctly', async ({ page }) => {
    await page.goto('/');  // or the page where this component appears
    // Add assertions
  });
});
```

## Step 3: Summary

After creating, list:
- Component file path
- Test file path
- Any hooks or store changes needed
- Where to integrate (which page/layout)
