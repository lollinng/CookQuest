import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'nginx-proxy.spec.ts',
  projects: [{ name: 'chromium' }],
});
