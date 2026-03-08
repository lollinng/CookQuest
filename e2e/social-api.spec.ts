import { test, expect } from '@playwright/test';

const API = 'http://localhost:3003/api/v1';

let adminToken: string;
let adminId: number;

test.describe('Social API (task_105)', () => {
  test.beforeAll(async ({ request }) => {
    const login = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@cookquest.dev', password: 'Admin123!' },
    });
    expect(login.ok()).toBeTruthy();
    const body = await login.json();
    adminToken = body.data.accessToken;
    adminId = body.data.user.id;
  });

  test('GET /users/search?q=admin — finds admin user', async ({ request }) => {
    const res = await request.get(`${API}/users/search?q=admin`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toHaveProperty('username');
    expect(body.data[0]).toHaveProperty('displayName');
  });

  test('GET /users/search?q=admin — with auth includes isFollowing', async ({ request }) => {
    const res = await request.get(`${API}/users/search?q=admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const body = await res.json();
    expect(body.data[0]).toHaveProperty('isFollowing');
  });

  test('GET /users/:id — public profile', async ({ request }) => {
    const res = await request.get(`${API}/users/${adminId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('username');
    expect(body.data).toHaveProperty('followersCount');
    expect(body.data).toHaveProperty('followingCount');
    expect(body.data).toHaveProperty('totalRecipesCompleted');
  });

  test('GET /users/999999 — returns 404', async ({ request }) => {
    const res = await request.get(`${API}/users/999999`);
    expect(res.status()).toBe(404);
  });

  test('POST /users/:id/follow — self-follow returns 400', async ({ request }) => {
    const res = await request.post(`${API}/users/${adminId}/follow`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('yourself');
  });

  test('POST /users/:id/follow — without auth returns 401', async ({ request }) => {
    const res = await request.post(`${API}/users/${adminId}/follow`);
    expect(res.status()).toBe(401);
  });

  test('GET /users/:id/followers — empty list initially', async ({ request }) => {
    const res = await request.get(`${API}/users/${adminId}/followers`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('GET /users/:id/following — empty list initially', async ({ request }) => {
    const res = await request.get(`${API}/users/${adminId}/following`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('DELETE /users/:id/follow — not following returns 404', async ({ request }) => {
    const res = await request.delete(`${API}/users/999/follow`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(404);
  });

  test('GET /users/search — empty query returns validation error', async ({ request }) => {
    const res = await request.get(`${API}/users/search`);
    expect(res.status()).toBe(400);
  });
});
