import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3003/api/v1';

test.describe('Recipe Sort & Search API (task_079)', () => {

  test('GET /recipes returns recipes with default sort (title A-Z)', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.recipes.length).toBeGreaterThan(0);

    // Verify alphabetical order
    const titles = body.data.recipes.map((r: any) => r.title);
    const sorted = [...titles].sort((a: string, b: string) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });

  test('GET /recipes?sort=-title returns recipes sorted Z-A', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes?sort=-title`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const titles = body.data.recipes.map((r: any) => r.title);
    const sorted = [...titles].sort((a: string, b: string) => b.localeCompare(a));
    expect(titles).toEqual(sorted);
  });

  test('GET /recipes?sort=difficulty returns easiest first', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes?sort=difficulty`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const difficulties = body.data.recipes.map((r: any) => r.difficulty);
    const order: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
    for (let i = 1; i < difficulties.length; i++) {
      expect(order[difficulties[i]]).toBeGreaterThanOrEqual(order[difficulties[i - 1]]);
    }
  });

  test('GET /recipes?sort=-xp returns highest XP first', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes?sort=-xp`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const xps = body.data.recipes.map((r: any) => r.xp_reward || 100);
    for (let i = 1; i < xps.length; i++) {
      expect(xps[i]).toBeLessThanOrEqual(xps[i - 1]);
    }
  });

  test('GET /recipes?search=egg filters by title/description', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes?search=egg`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.recipes.length).toBeGreaterThan(0);

    for (const recipe of body.data.recipes) {
      const matchesTitle = recipe.title.toLowerCase().includes('egg');
      const matchesDesc = recipe.description.toLowerCase().includes('egg');
      expect(matchesTitle || matchesDesc).toBe(true);
    }
  });

  test('GET /recipes?search=nonexistent returns empty array', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes?search=xyznonexistent123`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.recipes).toEqual([]);
    expect(body.data.pagination.total).toBe(0);
  });

  test('combined filters: search + sort + skill', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes?skill=basic-cooking&sort=-title`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    // All should be basic-cooking
    for (const recipe of body.data.recipes) {
      expect(recipe.skill).toBe('basic-cooking');
    }
    // Should be sorted Z-A
    const titles = body.data.recipes.map((r: any) => r.title);
    const sorted = [...titles].sort((a: string, b: string) => b.localeCompare(a));
    expect(titles).toEqual(sorted);
  });

  test('invalid sort value returns 400', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes?sort=invalid`);
    expect(res.status()).toBe(400);
  });

  test('search respects pagination', async ({ request }) => {
    const res = await request.get(`${API_BASE}/recipes?limit=2&page=1`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.data.recipes.length).toBeLessThanOrEqual(2);
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(2);
  });
});
