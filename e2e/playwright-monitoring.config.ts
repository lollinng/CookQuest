import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'monitoring.spec.ts',
  projects: [{ name: 'chromium' }],
});
