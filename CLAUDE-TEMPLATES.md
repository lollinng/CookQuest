# CookQuest Pattern Reference Card

## Adding a frontend feature (end-to-end checklist)
1. Define types in `lib/types.ts`
2. Create API module in `lib/api/{name}.ts` using `apiClient` wrapper
3. Create TanStack Query hook in `hooks/use-{name}.ts` (or add to `hooks/use-recipes.ts`)
4. Create component in `components/{kebab-name}.tsx`
5. Integrate into page in `app/` directory

## Adding a backend endpoint (end-to-end checklist)
1. Create route in `backend/node-services/api-server/src/routes/{name}.ts`
2. Register in `backend/node-services/api-server/src/routes/index.ts`
3. Add DB queries to `backend/node-services/api-server/src/services/database.ts`
4. Add schema changes to `backend/shared/schema-pg.sql` + migration in database.ts
5. Response format: `{ success: true, data: {} }` or `{ success: false, error: { message } }`

## Component template
```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MyComponentProps {
  title: string;
}

export function MyComponent({ title }: MyComponentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* content */}
      </CardContent>
    </Card>
  );
}
```

## Query hook template
```ts
export const myKeys = {
  all: ['my-resource'] as const,
  detail: (id: string) => [...myKeys.all, id] as const,
};

export function useMyResource() {
  return useQuery({
    queryKey: myKeys.all,
    queryFn: () => getMyResource(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
```

## API module template
```ts
import { apiClient } from './client';

// apiClient unwraps the envelope — returns T, not { success, data: T }
export async function getMyResource(): Promise<MyType[]> {
  return apiClient<MyType[]>('/my-resource');
}
```
