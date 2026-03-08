import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3003/api/v1';

test.describe('Favorites API', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Login as admin to get auth token
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: 'admin@cookquest.dev', password: 'Admin123!' }
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    authToken = loginData.data?.token || loginData.token;
    expect(authToken).toBeTruthy();
  });

  test('POST /recipes/:id/favorite — adds recipe to favorites', async ({ request }) => {
    const res = await request.post(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.favorited).toBe(true);
    expect(body.data.recipe_id).toBe('boiled-egg');
  });

  test('POST /recipes/:id/favorite — idempotent (no error on duplicate)', async ({ request }) => {
    // Favorite the same recipe twice
    await request.post(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const res = await request.post(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.favorited).toBe(true);
  });

  test('GET /users/me/favorites — returns favorited recipes', async ({ request }) => {
    // Ensure at least one favorite exists
    await request.post(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const res = await request.get(`${API_BASE}/users/me/favorites`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.recipes)).toBe(true);
    expect(body.data.recipes.length).toBeGreaterThanOrEqual(1);

    const boiledEgg = body.data.recipes.find((r: any) => r.id === 'boiled-egg');
    expect(boiledEgg).toBeTruthy();
    expect(boiledEgg.title).toBeTruthy();
  });

  test('DELETE /recipes/:id/favorite — removes from favorites', async ({ request }) => {
    // Ensure favorite exists first
    await request.post(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const res = await request.delete(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.favorited).toBe(false);

    // Verify it's gone from the list
    const listRes = await request.get(`${API_BASE}/users/me/favorites`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const listBody = await listRes.json();
    const boiledEgg = listBody.data.recipes.find((r: any) => r.id === 'boiled-egg');
    expect(boiledEgg).toBeUndefined();
  });

  test('DELETE /recipes/:id/favorite — idempotent (no error on non-favorite)', async ({ request }) => {
    // Remove any existing favorite first
    await request.delete(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    // Delete again — should succeed
    const res = await request.delete(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.favorited).toBe(false);
  });

  test('POST /recipes/:id/favorite — 404 for non-existent recipe', async ({ request }) => {
    const res = await request.post(`${API_BASE}/recipes/does-not-exist/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(res.status()).toBe(404);
  });

  test('POST /recipes/:id/favorite — 401 without auth', async ({ request }) => {
    const res = await request.post(`${API_BASE}/recipes/boiled-egg/favorite`);
    expect(res.status()).toBe(401);
  });

  test('GET /users/me/favorites — 401 without auth', async ({ request }) => {
    const res = await request.get(`${API_BASE}/users/me/favorites`);
    expect(res.status()).toBe(401);
  });

  test('GET /recipes includes is_favorited when authenticated', async ({ request }) => {
    // Add a favorite
    await request.post(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const res = await request.get(`${API_BASE}/recipes`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const recipes = body.data.recipes;

    const boiledEgg = recipes.find((r: any) => r.id === 'boiled-egg');
    expect(boiledEgg).toBeTruthy();
    expect(boiledEgg.is_favorited).toBe(true);

    // A non-favorited recipe should have is_favorited = false
    const other = recipes.find((r: any) => r.id !== 'boiled-egg');
    if (other) {
      expect(other.is_favorited).toBe(false);
    }

    // Cleanup
    await request.delete(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });

  test('GET /recipes does NOT include is_favorited without auth', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const recipe = body.data.recipes[0];
    expect(recipe.is_favorited).toBeUndefined();
  });

  test('GET /recipes/:id includes is_favorited when authenticated', async ({ request }) => {
    await request.post(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const res = await request.get(`${API_BASE}/recipes/boiled-egg`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.recipe.is_favorited).toBe(true);

    // Cleanup
    await request.delete(`${API_BASE}/recipes/boiled-egg/favorite`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
  });
});
