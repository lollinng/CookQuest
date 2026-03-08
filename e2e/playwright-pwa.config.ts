import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'pwa-og-meta.spec.ts',
  projects: [{ name: 'chromium' }],
});
