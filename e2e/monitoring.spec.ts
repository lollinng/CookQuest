import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const API_BASE = 'http://localhost:3003';

test.describe('Production Monitoring — /metrics endpoint', () => {

  test('GET /metrics returns 200 with required fields', async ({ request }) => {
    const res = await request.get(`${API_BASE}/metrics`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.uptime).toBeDefined();
    expect(typeof data.uptime).toBe('number');
    expect(data.requests_total).toBeDefined();
    expect(typeof data.requests_total).toBe('number');
    expect(data.errors_total).toBeDefined();
    expect(typeof data.errors_total).toBe('number');
  });

  test('GET /metrics includes memory stats', async ({ request }) => {
    const res = await request.get(`${API_BASE}/metrics`);
    const data = await res.json();
    expect(data.memory).toBeDefined();
    expect(data.memory.rss).toBeDefined();
    expect(data.memory.heapUsed).toBeDefined();
    expect(data.memory.heapTotal).toBeDefined();
  });

  test('GET /metrics includes db_pool stats', async ({ request }) => {
    const res = await request.get(`${API_BASE}/metrics`);
    const data = await res.json();
    expect(data.db_pool).toBeDefined();
    expect(data.db_pool.totalCount).toBeDefined();
    expect(data.db_pool.idleCount).toBeDefined();
    expect(data.db_pool.waitingCount).toBeDefined();
  });

  test('GET /metrics requests_total increments', async ({ request }) => {
    const res1 = await request.get(`${API_BASE}/metrics`);
    const data1 = await res1.json();

    // Make a few requests
    await request.get(`${API_BASE}/health`);
    await request.get(`${API_BASE}/health`);

    const res2 = await request.get(`${API_BASE}/metrics`);
    const data2 = await res2.json();

    expect(data2.requests_total).toBeGreaterThan(data1.requests_total);
  });

  test('GET /metrics includes node and env info', async ({ request }) => {
    const res = await request.get(`${API_BASE}/metrics`);
    const data = await res.json();
    expect(data.node_version).toBeDefined();
    expect(data.env).toBeDefined();
  });
});

test.describe('Production Monitoring — Static file checks', () => {

  test('scripts/health-check.sh exists and is executable-ready', () => {
    const scriptPath = resolve(ROOT, 'scripts/health-check.sh');
    expect(existsSync(scriptPath)).toBe(true);
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('#!/bin/bash');
    expect(content).toContain('/ready');
    expect(content).toContain('curl');
  });

  test('DEPLOY.md exists and has monitoring section', () => {
    const deployPath = resolve(ROOT, 'DEPLOY.md');
    expect(existsSync(deployPath)).toBe(true);
    const content = readFileSync(deployPath, 'utf-8');
    expect(content.toLowerCase()).toContain('monitor');
    expect(content).toContain('/metrics');
    expect(content).toContain('health-check');
  });

  test('pino-pretty is devDependency only (not in production)', () => {
    const pkgPath = resolve(ROOT, 'backend/node-services/api-server/package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    // Must NOT be in dependencies
    expect(pkg.dependencies?.['pino-pretty']).toBeUndefined();
    // Should be in devDependencies
    expect(pkg.devDependencies?.['pino-pretty']).toBeDefined();
  });

  test('logger uses JSON output in production mode', () => {
    const loggerPath = resolve(ROOT, 'backend/node-services/api-server/src/services/logger.ts');
    const content = readFileSync(loggerPath, 'utf-8');
    // In production, no transport should be configured (defaults to JSON)
    expect(content).toContain('isProduction');
    expect(content).toContain('pino-pretty');
    // pino-pretty should only be in the non-production branch
    expect(content).toMatch(/isProduction\s*\?\s*\{\}/);
  });
});
