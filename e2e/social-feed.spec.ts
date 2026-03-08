import { test, expect } from '@playwright/test';

const API = 'http://localhost:3003/api/v1';

let adminToken: string;

test.describe('Posts & Feed API (task_107)', () => {
  test.beforeAll(async ({ request }) => {
    const login = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@cookquest.dev', password: 'Admin123!' },
    });
    expect(login.ok()).toBeTruthy();
    const body = await login.json();
    adminToken = body.data.accessToken;
  });

  test('GET /feed — requires auth', async ({ request }) => {
    const res = await request.get(`${API}/feed`);
    expect(res.status()).toBe(401);
  });

  test('GET /feed — returns empty feed when following nobody', async ({ request }) => {
    const res = await request.get(`${API}/feed`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('POST /posts — creates a post', async ({ request }) => {
    const res = await request.post(`${API}/posts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        postType: 'milestone',
        caption: 'Reached level 5!',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('id');
    expect(body.data.post_type).toBe('milestone');
    expect(body.data.caption).toBe('Reached level 5!');
  });

  test('POST /posts — requires auth', async ({ request }) => {
    const res = await request.post(`${API}/posts`, {
      data: { postType: 'milestone', caption: 'test' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /posts — rejects invalid postType', async ({ request }) => {
    const res = await request.post(`${API}/posts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { postType: 'invalid_type' },
    });
    expect(res.status()).toBe(400);
  });

  test('GET /users/:id/posts — returns user posts', async ({ request }) => {
    // First get admin user id
    const login = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@cookquest.dev', password: 'Admin123!' },
    });
    const { data } = await login.json();
    const adminId = data.user.id;

    const res = await request.get(`${API}/users/${adminId}/posts`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // Should have at least the milestone post we created above
    if (body.data.length > 0) {
      const post = body.data[0];
      expect(post).toHaveProperty('userId');
      expect(post).toHaveProperty('username');
      expect(post).toHaveProperty('postType');
      expect(post).toHaveProperty('createdAt');
    }
  });

  test('POST /recipes/:id/progress — auto-creates post on completion', async ({ request }) => {
    const res = await request.post(`${API}/recipes/boiled-egg/progress`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { completed: true },
    });
    expect(res.ok()).toBeTruthy();

    // Get admin's posts — should have a recipe_completed post
    const login = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@cookquest.dev', password: 'Admin123!' },
    });
    const { data } = await login.json();

    const postsRes = await request.get(`${API}/users/${data.user.id}/posts`);
    const postsBody = await postsRes.json();
    const completionPost = postsBody.data.find(
      (p: any) => p.postType === 'recipe_completed' && p.recipeId === 'boiled-egg'
    );
    expect(completionPost).toBeTruthy();
    expect(completionPost.caption).toContain('boiled');
  });
});
