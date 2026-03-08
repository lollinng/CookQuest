# Run E2E Tests

Run Playwright E2E tests with pre-flight checks and failure analysis.

## Step 1: Pre-flight Checks

Check that required services are running (in parallel):

```bash
# Frontend — check common dev ports
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || \
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 || \
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002

# Backend
curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/api/v1/health
```

If frontend is not running: "Frontend not detected on ports 3000-3002. Run `npm run dev` first."
If backend is not running: "Backend not detected on port 3003. Run `docker compose up -d` first."

## Step 2: Run Tests

If `$ARGUMENTS` contains a file path or test name:
```bash
npx playwright test $ARGUMENTS --reporter=list
```

If `$ARGUMENTS` is empty, run all tests:
```bash
npx playwright test --reporter=list
```

**Note:** Playwright baseURL defaults to `http://localhost:3002` (configured in `playwright.config.ts`).

## Step 3: Analyze Failures

For each failed test:
1. **Test name and file** — exact path and line number
2. **Error message** — the assertion or error that failed
3. **Relevant code** — read the test file around the failure line
4. **Screenshot** — if Playwright captured a screenshot (check `test-results/`), read it visually
5. **Suggested fix** — specific code change to resolve the failure

## Step 4: Summary

```
E2E Results
────────────────
Passed:  X
Failed:  X
Skipped: X
Total:   X

Failures:
1. {test name} — {one-line reason}
2. {test name} — {one-line reason}
```

If all tests pass, report success.
