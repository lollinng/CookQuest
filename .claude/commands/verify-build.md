# Verify Build

Run TypeScript type-check, Next.js build, and lint. Report errors with specific fixes.

## Step 1: TypeScript Type-Check

```bash
npx tsc --noEmit
```

For each error:
- File path and line number
- Error code and message
- Specific fix (show the code change)

## Step 2: Next.js Build

```bash
npm run build
```

For each error:
- Build phase (compile, collect pages, generate static)
- File and line
- Specific fix

### Common CookQuest Build Issues

Check for these specifically:
- Missing `'use client'` on components that use hooks/state/event handlers
- Importing server-only code in client components
- `next/image` missing width/height or using unsized images
- Dynamic imports without proper loading states
- Environment variables not prefixed with `NEXT_PUBLIC_` when used client-side

## Step 3: Lint

```bash
npm run lint
```

For each error:
- Rule name
- File and line
- Auto-fixable? If yes, suggest `npm run lint -- --fix`

## Step 4: Summary

```
Build Verification
──────────────────────
TypeScript:  PASS / FAIL (X errors)
Build:       PASS / FAIL (X errors)
Lint:        PASS / FAIL (X warnings, X errors)
──────────────────────
Overall:     PASS / FAIL
```

If all three pass, the code is ready for commit/deploy.
If any fail, list the errors grouped by file with specific fixes.
