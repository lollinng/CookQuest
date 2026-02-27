import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3003';

test.describe('Security Headers — Backend (Express/Helmet)', () => {

  test('API responses include X-Frame-Options: DENY', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    expect(res.headers()['x-frame-options']).toBe('DENY');
  });

  test('API responses include X-Content-Type-Options: nosniff', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('API responses include Referrer-Policy', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    expect(res.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('API responses include Strict-Transport-Security (HSTS)', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    const hsts = res.headers()['strict-transport-security'];
    expect(hsts).toBeTruthy();
    expect(hsts).toContain('max-age=31536000');
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).toContain('preload');
  });

  test('API responses include Content-Security-Policy', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    const csp = res.headers()['content-security-policy'];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain('images.unsplash.com');
  });

  test('API does not expose X-Powered-By header', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health`);
    expect(res.headers()['x-powered-by']).toBeUndefined();
  });
});

test.describe('Security Headers — Frontend (Next.js)', () => {

  test('Frontend responses include X-Frame-Options: DENY', async ({ page }) => {
    const response = await page.goto('http://localhost:3000');
    if (response) {
      expect(response.headers()['x-frame-options']).toBe('DENY');
    }
  });

  test('Frontend responses include X-Content-Type-Options', async ({ page }) => {
    const response = await page.goto('http://localhost:3000');
    if (response) {
      expect(response.headers()['x-content-type-options']).toBe('nosniff');
    }
  });

  test('Frontend responses include Referrer-Policy', async ({ page }) => {
    const response = await page.goto('http://localhost:3000');
    if (response) {
      expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
    }
  });

  test('Frontend responses include Permissions-Policy', async ({ page }) => {
    const response = await page.goto('http://localhost:3000');
    if (response) {
      expect(response.headers()['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    }
  });
});
