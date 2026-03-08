import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  projects: [{ name: 'chromium' }],
  // No webServer — these are API-only tests against the Docker backend
});
